#!/usr/bin/env node
/**
 * Downloads club badges into apps/web/public/crests and writes the name → file
 * registry the app reads.
 *
 * Badges are fetched once and served from our own origin — never hotlinked. A
 * third-party image CDN moving a path should not blank out the board. They are
 * the clubs' own marks, shown to identify whose match is being priced; nothing
 * here is redrawn, recoloured or generated.
 *
 * TheSportsDB's free key returns canned data from its per-league endpoints, so
 * the rosters are listed here and each badge is looked up by name. A club that
 * cannot be matched is reported and simply has no badge: the app falls back to
 * the club's initials rather than showing an invented one.
 *
 * Usage: node scripts/fetch-crests.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(here, '../apps/web/public/crests');
const REGISTRY = resolve(here, '../apps/web/src/lib/crests.generated.ts');
const RESOLVED = resolve(here, '../apps/web/public/crests/resolved.json');
const API = 'https://www.thesportsdb.com/api/v1/json/3';
/** Cloudflare starts returning 1015 well before the documented limit. */
const GAP_MS = 3000;

const ROSTERS = {
  EPL: [
    'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton and Hove Albion',
    'Burnley', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham',
    'Leeds United', 'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle United',
    'Nottingham Forest', 'Sunderland', 'Tottenham Hotspur', 'West Ham United', 'Wolverhampton Wanderers',
  ],
  LALIGA: [
    'Athletic Bilbao', 'Atletico Madrid', 'Barcelona', 'Real Betis', 'Celta Vigo',
    'Elche', 'Espanyol', 'Getafe', 'Girona', 'Levante',
    'Mallorca', 'Osasuna', 'Rayo Vallecano', 'Real Madrid', 'Real Oviedo',
    'Real Sociedad', 'Sevilla', 'Valencia', 'Villarreal', 'Deportivo Alaves',
  ],
};

/** Names the odds feed uses that differ from the roster spelling above. */
const ALIASES = {
  'brighton and hove albion': ['Brighton', 'Brighton & Hove Albion'],
  'wolverhampton wanderers': ['Wolves'],
  'tottenham hotspur': ['Tottenham', 'Spurs'],
  'manchester united': ['Man United', 'Man Utd'],
  'manchester city': ['Man City'],
  'newcastle united': ['Newcastle'],
  'nottingham forest': ["Nott'm Forest"],
  'west ham united': ['West Ham'],
  'leeds united': ['Leeds'],
  'atletico madrid': ['Atlético Madrid', 'Atletico de Madrid'],
  'athletic bilbao': ['Athletic Club'],
  'deportivo alaves': ['Alaves', 'Deportivo Alavés'],
  'celta vigo': ['Celta de Vigo', 'RC Celta'],
  'real betis': ['Betis'],
  'rayo vallecano': ['Rayo'],
};

const slug = (name) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * What has already been fetched. The free tier rate limits hard (Cloudflare
 * 1015), so a run that gets cut off must be resumable: re-running only asks
 * for what is still missing instead of burning the allowance on badges that
 * are already on disk.
 */
const loadResolved = async () => {
  try {
    return JSON.parse(await readFile(RESOLVED, 'utf8'));
  } catch {
    return {};
  }
};

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const resolved = await loadResolved();
  const missing = [];
  let fetched = 0;

  for (const [code, roster] of Object.entries(ROSTERS)) {
    for (const name of roster) {
      const key = slug(name);
      if (resolved[key]) continue;

      await sleep(GAP_MS);
      const response = await fetch(`${API}/searchteams.php?t=${encodeURIComponent(name)}`);
      const payload = response.ok ? await response.text() : '';
      let found = [];
      try {
        found = JSON.parse(payload).teams ?? [];
      } catch {
        missing.push(`${code}: ${name} (rate limited)`);
        continue;
      }
      const team = found.find((t) => (t.strBadge ?? t.strTeamBadge) && t.strSport === 'Soccer');
      if (!team) {
        missing.push(`${code}: ${name} (no match)`);
        continue;
      }

      const image = await fetch(`${team.strBadge ?? team.strTeamBadge}/preview`);
      if (!image.ok) {
        missing.push(`${code}: ${name} (badge ${image.status})`);
        continue;
      }
      const file = `${key}.png`;
      await writeFile(resolve(OUT_DIR, file), Buffer.from(await image.arrayBuffer()));
      resolved[key] = { file, apiName: team.strTeam };
      fetched += 1;
      await writeFile(RESOLVED, JSON.stringify(resolved, null, 2), 'utf8');
      process.stdout.write(`${code} ${name} → ${team.strTeam}\n`);
    }
  }

  const teams = {};
  for (const [key, entry] of Object.entries(resolved)) {
    teams[key] = entry.file;
    teams[slug(entry.apiName)] = entry.file;
    for (const alias of ALIASES[key] ?? []) teams[slug(alias)] = entry.file;
  }

  const body = `// Generated by scripts/fetch-crests.mjs — do not edit by hand.
// Club badges, fetched once and served from our own origin. A club absent from
// this map renders as its initials, never as an invented badge.

export const TEAM_CRESTS: Readonly<Record<string, string>> = ${JSON.stringify(teams, null, 2)};
`;
  await writeFile(REGISTRY, body, 'utf8');

  process.stdout.write(
    `
${Object.keys(resolved).length} escudos en disco, ${Object.keys(teams).length} claves, ${fetched} nuevos
`,
  );
  if (missing.length) process.stdout.write(`sin escudo:\n  ${missing.join('\n  ')}\n`);
};

await main();
