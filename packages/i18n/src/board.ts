import type { Locale } from './locales.js';

/**
 * Copy for the match board and the builder. Kept apart from the main
 * dictionary because it is one screen's vocabulary, and that screen is the
 * product — it will change more often than everything else combined.
 */
export interface BoardCopy {
  readonly pick: string;
  readonly pickedCount: (n: number) => string;
  readonly search: string;
  readonly windows: { today: string; tomorrow: string; threeDays: string; all: string };
  readonly take: string;
  readonly takeHelp: string;
  readonly books: (n: number) => string;
  readonly noModel: string;

  readonly specialsTitle: string;
  readonly specialsSubtitle: string;
  readonly colSpecial: string;
  readonly colWorth: string;
  readonly colTakeIf: string;
  readonly specialsFooter: string;
  readonly together: string;
  readonly against: string;
  readonly onlyResult: string;

  readonly objectives: Readonly<Record<'cobrar' | 'valor' | 'pagar', { label: string; hint: string }>>;
  readonly ticketTitle: string;
  readonly withStake: (stake: string) => string;
  readonly pays: string;
  readonly worth: string;
  readonly inFavour: string;
  readonly against_: string;
  readonly cashesOne: string;
  readonly cashesEvery: (n: string) => string;
  readonly suggested: string;
  readonly kellyNote: (bankroll: string) => string;
  readonly overStake: (times: string) => string;
  readonly noStake: string;
  readonly verdictGood: string;
  readonly verdictThin: string;
  readonly verdictBad: (take: string) => string;
  readonly singlesTitle: string;
  readonly singlesBody: string;
  readonly save: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
}

const es: BoardCopy = {
  pick: 'Elegí los partidos',
  pickedCount: (n) => (n === 1 ? '1 elegido' : `${n} elegidos`),
  search: 'Buscar equipo o liga',
  windows: { today: 'Hoy', tomorrow: 'Mañana', threeDays: '3 días', all: 'Todo' },
  take: 'se lleva',
  takeHelp:
    '«Se lleva» es el margen de la casa en ese partido, ya comparando todas las casas. Cuanto más bajo, más barato te sale jugarlo.',
  books: (n) => (n === 1 ? '1 casa' : `${n} casas`),
  noModel: 'Sin modelo: falta el 1X2 de este partido.',

  specialsTitle: 'Lo que vale cada especial',
  specialsSubtitle: 'Calculado con el 1X2 y los totales del partido, antes de mirar tu casa.',
  colSpecial: 'ESPECIAL',
  colWorth: 'VALE',
  colTakeIf: 'TOMALA SI PAGA',
  specialsFooter:
    'Abrí tu casa y fijate si alguno paga más que la columna verde. Si no, no hay nada acá.',
  together: 'suben juntas',
  against: 'se estorban',
  onlyResult: 'resultado exacto',

  objectives: {
    cobrar: { label: 'Cobrar seguido', hint: 'La combinada más probable que igual valga la pena.' },
    valor: { label: 'Máximo valor', hint: 'La que más paga por encima de lo que vale.' },
    pagar: { label: 'Máximo pago', hint: 'La que más plata deja si entra. Casi nunca entra.' },
  },
  ticketTitle: 'Tu combinada',
  withStake: (stake) => `Con ${stake} cobrás`,
  pays: 'Te paga',
  worth: 'Vale',
  inFavour: 'A tu favor',
  against_: 'En tu contra',
  cashesOne: 'Cobrás',
  cashesEvery: (n) => `1 de cada ${n} veces`,
  suggested: 'Apuesta sugerida',
  kellyNote: (bankroll) => `¼ de Kelly sobre una banca de ${bankroll}.`,
  overStake: (times) => `Estás apostando ${times} veces eso.`,
  noStake: 'Con esta ventaja y este riesgo, el modelo no recomienda apostarla.',
  verdictGood: 'Esta combinada paga más de lo que vale.',
  verdictThin: 'Paga algo más de lo que vale, pero la ventaja es demasiado chica para el riesgo que corrés. Apostarla no está mal; esperar tampoco.',
  verdictBad: (take) => `Ninguna combinada de estos partidos tiene valor. Ésta es la menos mala: la casa se lleva ${take}.`,
  singlesTitle: 'Si en cambio las jugás sueltas',
  singlesBody: 'Menos ventaja, pero cobrás mucho más seguido. Combinar sube el pago y la varianza a la vez.',
  save: 'Guardar en el historial',
  emptyTitle: 'Elegí un partido para empezar',
  emptyBody: 'Marcá los que te interesan y el motor busca la mejor combinación entre ellos.',
};

const en: BoardCopy = {
  pick: 'Pick your matches',
  pickedCount: (n) => (n === 1 ? '1 picked' : `${n} picked`),
  search: 'Search team or league',
  windows: { today: 'Today', tomorrow: 'Tomorrow', threeDays: '3 days', all: 'All' },
  take: "book's cut",
  takeHelp:
    "The book's cut on this match, after shopping every book quoting it. The lower it is, the cheaper the match is to play.",
  books: (n) => (n === 1 ? '1 book' : `${n} books`),
  noModel: 'No model: this match has no result market.',

  specialsTitle: 'What each special is worth',
  specialsSubtitle: "Computed from the match's own 1X2 and totals, before looking at your book.",
  colSpecial: 'SPECIAL',
  colWorth: 'WORTH',
  colTakeIf: 'TAKE IT AT',
  specialsFooter: 'Open your book and see whether anything beats the green column. If not, there is nothing here.',
  together: 'move together',
  against: 'fight each other',
  onlyResult: 'exact score',

  objectives: {
    cobrar: { label: 'Cash often', hint: 'The likeliest parlay that is still worth entering.' },
    valor: { label: 'Most value', hint: 'The one paying furthest above what it is worth.' },
    pagar: { label: 'Biggest payout', hint: 'The one paying most if it lands. It rarely lands.' },
  },
  ticketTitle: 'Your parlay',
  withStake: (stake) => `${stake} returns`,
  pays: 'Pays',
  worth: 'Worth',
  inFavour: 'In your favour',
  against_: 'Against you',
  cashesOne: 'Lands',
  cashesEvery: (n) => `1 time in ${n}`,
  suggested: 'Suggested stake',
  kellyNote: (bankroll) => `Quarter Kelly on a ${bankroll} bankroll.`,
  overStake: (times) => `You are staking ${times} times that.`,
  noStake: 'At this edge and this risk, the model does not recommend betting it.',
  verdictGood: 'This parlay pays more than it is worth.',
  verdictThin: 'It pays a little more than it is worth, but the edge is too thin for the risk you are taking. Betting it is not wrong; nor is waiting.',
  verdictBad: (take) => `Nothing from these matches has value. This is the least bad: the book takes ${take}.`,
  singlesTitle: 'Played as singles instead',
  singlesBody: 'Less edge, but it lands far more often. Combining raises the payout and the variance together.',
  save: 'Save to history',
  emptyTitle: 'Pick a match to start',
  emptyBody: 'Tick the ones you care about and the engine finds the best combination among them.',
};

export const BOARD_COPY: Readonly<Record<Locale, BoardCopy>> = { es, en };

export const getBoardCopy = (locale: Locale): BoardCopy => BOARD_COPY[locale];
