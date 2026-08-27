import { TEAM_CRESTS } from './crests.generated';

const slug = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Path to a club's own badge, or null when we do not have it. Null means the
 * caller shows the club's initials — never a stand-in badge. A wrong crest on
 * a betting board is worse than no crest: it misidentifies the fixture whose
 * price is being quoted.
 */
export const crestFor = (team: string): string | null => {
  const file = TEAM_CRESTS[slug(team)];
  return file === undefined ? null : `/crests/${file}`;
};

/** Typographic stand-in: initials for a multi-word name, a stem for one word. */
export const initialsOf = (team: string): string => {
  const words = team.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return (words[0] as string).slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => (word[0] as string).toUpperCase())
    .join('');
};
