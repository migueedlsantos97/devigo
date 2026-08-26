import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

export interface ScanLeg {
  readonly event: string;
  readonly market: string;
  readonly selection: string;
  readonly price: number;
}

export interface ScanResult {
  readonly legs: ReadonlyArray<ScanLeg>;
  readonly stake: number | null;
  readonly currency: string | null;
  readonly totalOdds: number | null;
}

const EXTRACTION_PROMPT = `You are reading a screenshot of a sports betting slip (any bookmaker, any language).
Extract every selection (leg) with its decimal odds.

Return ONLY a JSON object, no commentary, with exactly this shape:
{
  "stake": <number or null, the amount wagered>,
  "currency": <string or null, e.g. "UYU", "EUR", "$">,
  "totalOdds": <number or null, the combined/total odds if printed on the slip>,
  "legs": [
    { "event": <string, the match/fixture>, "market": <string, market name as printed>, "selection": <string, the picked outcome>, "price": <number, decimal odds> }
  ]
}

Rules:
- Decimal odds as numbers (comma decimals like "1,08" become 1.08).
- One entry per leg, in the order printed.
- If a field is not visible, use null (or best-effort strings for event/market).
- Never invent legs that are not on the slip.`;

const parseResult = (raw: string): ScanResult | null => {
  const jsonMatch = /\{[\s\S]*\}/.exec(raw);
  if (!jsonMatch) return null;
  try {
    const data = JSON.parse(jsonMatch[0]) as {
      stake?: unknown; currency?: unknown; totalOdds?: unknown; legs?: unknown;
    };
    if (!Array.isArray(data.legs)) return null;
    const legs: ScanLeg[] = [];
    for (const leg of data.legs as ReadonlyArray<Record<string, unknown>>) {
      const price = Number(leg['price']);
      if (!Number.isFinite(price) || price <= 1 || price > 1000) continue;
      legs.push({
        event: String(leg['event'] ?? ''),
        market: String(leg['market'] ?? ''),
        selection: String(leg['selection'] ?? ''),
        price,
      });
    }
    const num = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    return {
      legs,
      stake: num(data.stake),
      currency: data.currency ? String(data.currency) : null,
      totalOdds: num(data.totalOdds),
    };
  } catch {
    return null;
  }
};

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    return Response.json({ error: 'not_configured' }, { status: 501 });
  }

  let body: { data?: string; mediaType?: string };
  try {
    body = (await request.json()) as { data?: string; mediaType?: string };
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const data = body.data ?? '';
  const mediaType = (body.mediaType ?? 'image/jpeg') as MediaType;
  if (!data || data.length > 8_000_000 || !MEDIA_TYPES.includes(mediaType)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'extraction_failed' }, { status: 422 });
    }
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    const result = parseResult(text);
    if (!result) return Response.json({ error: 'extraction_failed' }, { status: 422 });
    if (result.legs.length === 0) return Response.json({ error: 'no_legs' }, { status: 422 });
    return Response.json(result);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'rate_limited' }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: 'extraction_failed' }, { status: 502 });
    }
    throw error;
  }
}
