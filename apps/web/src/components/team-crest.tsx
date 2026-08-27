import Image from 'next/image';
import { crestFor, initialsOf } from '@/lib/crests';

/**
 * A club's own badge. Clubs we have no badge for show their initials rather
 * than a placeholder crest — a plausible-looking wrong badge would misidentify
 * the fixture being priced.
 */
export function TeamCrest({ team, size = 20 }: { team: string; size?: number }) {
  const src = crestFor(team);

  if (src === null) {
    return (
      <span
        title={team}
        style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.36)) }}
        className="inline-flex shrink-0 items-center justify-center rounded-[5px] border border-edge bg-btn font-mono font-medium leading-none text-ink-3"
      >
        {initialsOf(team)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      title={team}
      width={size}
      height={size}
      className="shrink-0 object-contain"
    />
  );
}
