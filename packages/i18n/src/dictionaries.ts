import type { Locale } from './locales.js';

/** Every UI string. Adding a key without translating it is a type error. */
export interface Dictionary {
  readonly nav: { engine: string; proof: string; pricing: string; whiteLabel: string; console: string };
  readonly panelNav: { builder: string; scanner: string; backtest: string; bankroll: string };
  readonly feedLive: string;
  readonly feedDemo: string;
  readonly bankrollLabel: string;
  readonly hero: { badge: string; h1a: string; h1b: string; body: string; ctaPrimary: string; ctaSecondary: string };
  readonly metrics: ReadonlyArray<{ value: string; label: string; accent: boolean }>;
  readonly heroCard: {
    readonly title: string;
    readonly disclaimer: string;
    readonly legs: ReadonlyArray<{ label: string; price: number; p: number }>;
    readonly survival: (v: string) => string;
    readonly statPrice: string;
    readonly statFair: string;
    readonly statKelly: string;
    readonly simLabel: string;
    readonly simHit: (v: string) => string;
  };
  readonly engine: {
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
    readonly modules: ReadonlyArray<{ file: string; title: string; body: string; detail: string }>;
  };
  readonly proof: { kicker: string; title: string; body: string; points: ReadonlyArray<string> };
  readonly pricing: {
    readonly kicker: string;
    readonly title: string;
    readonly note: string;
    readonly plans: ReadonlyArray<{
      name: string; tag: string; price: string; period: string; blurb: string;
      features: ReadonlyArray<string>; cta: string; highlight: boolean; b2b: boolean;
    }>;
  };
  readonly license: { title: string; body: string; cta: string; ctaAlt: string };
  readonly ticket: {
    title: string; empty: string; clear: string; stake: string; correlation: string;
    legs: (n: number) => string; emptyLegs: string;
  };
  readonly stats: {
    combinedPrice: string; fairPrice: string; expectedValue: string; kelly: string;
    joint: (v: string) => string; perUnit: (v: string) => string; ofBankroll: (v: string) => string; noLegs: string;
  };
  readonly sim: {
    title: string; hit: (v: string) => string;
    p05: (v: string) => string; median: (v: string) => string; p95: (v: string) => string;
  };
  readonly board: {
    title: string; subtitle: (method: string) => string; switchModel: string; autoTicket: string;
    kpiScanned: string; kpiValueFound: string; kpiAvgMargin: string; kpiModel: string;
    margin: (v: string) => string; detail: (fair: string, edge: string) => string;
    books: (n: number) => string;
  };
  readonly methods: { shin: string; multiplicative: string; additive: string };
  readonly verdict: {
    positive: (edge: string) => string; heavy: (hit: string) => string; sized: string;
    negative: (hold: string) => string; idle: string;
  };
  readonly help: {
    readonly open: string;
    readonly title: string;
    readonly close: string;
    readonly steps: ReadonlyArray<{ title: string; body: string }>;
    readonly combined: string;
    readonly fair: string;
    readonly ev: string;
    readonly kelly: string;
    readonly corr: string;
    readonly mc: string;
    readonly margin: string;
    readonly manualPrice: string;
    readonly manualTag: string;
  };
  readonly scan: {
    readonly title: string;
    readonly subtitle: string;
    readonly upload: string;
    readonly dropHint: string;
    readonly analyzing: string;
    readonly errorGeneric: string;
    readonly errorNoKey: string;
    readonly errorNoLegs: string;
    readonly extracted: (n: number) => string;
    readonly colSelection: string;
    readonly colPrice: string;
    readonly stake: string;
    readonly vig: string;
    readonly vigHelp: string;
    readonly paid: string;
    readonly fairRange: string;
    readonly probPaid: string;
    readonly probReal: string;
    readonly evRange: string;
    readonly houseTake: string;
    readonly verdict: (holdPct: string, holdMoney: string) => string;
    readonly verdictPositive: string;
    readonly matchNote: string;
    readonly again: string;
    readonly toPanel: string;
    readonly disclaimer: string;
  };
  readonly footer: { legal: string };
}

const es: Dictionary = {
  nav: { engine: 'Motor', proof: 'Pruebas', pricing: 'Precios', whiteLabel: 'Marca blanca', console: 'Abrir el panel' },
  panelNav: { builder: 'Constructor', scanner: 'Escáner de valor', backtest: 'Backtests', bankroll: 'Capital' },
  feedLive: 'SEÑAL EN VIVO · THE ODDS API',
  feedDemo: 'DATOS DE DEMO',
  bankrollLabel: 'capital',
  hero: {
    badge: 'MÉTODO DE SHIN · 10.000 SIMULACIONES POR BOLETO',
    h1a: 'La casa ya cobró',
    h1b: 'antes del saque inicial.',
    body: 'Cada cuota que aceptas lleva dentro la comisión de la casa. Devigo la arranca con el método de Shin, reconstruye la línea real y liquida tu combinada 10.000 veces antes de que arriesgues un euro.',
    ctaPrimary: 'Construir un boleto', ctaSecondary: 'Leer la especificación',
  },
  metrics: [
    { value: '3', label: 'modelos de eliminación de margen: Shin, proporcional y aditivo', accent: false },
    { value: '10.000', label: 'simulaciones Montecarlo por boleto, con semilla reproducible', accent: false },
    { value: '100%', label: 'cobertura de tests en el núcleo, barrera que tumba la compilación', accent: true },
  ],
  heroCard: {
    title: 'BOLETO DE EJEMPLO',
    disclaimer: 'Escenario hipotético · cálculo real de @devigo/core',
    legs: [
      { label: 'Arsenal gana', price: 1.72, p: 0.595 },
      { label: 'Nuggets -3,5', price: 1.95, p: 0.525 },
      { label: 'Más de 2,5 · Girona', price: 1.83, p: 0.56 },
      { label: 'Sinner en 2 sets', price: 2.26, p: 0.455 },
    ],
    survival: (v) => 'vivo ' + v,
    statPrice: 'Cuota', statFair: 'Justa', statKelly: 'Kelly',
    simLabel: 'MONTECARLO · 10.000 TIRADAS', simHit: (v) => 'acierto ' + v,
  },
  engine: {
    kicker: '01 — EL MOTOR',
    title: 'Cinco modelos en un solo paquete de TypeScript puro',
    body: 'Cero dependencias en tiempo de ejecución, semillas deterministas y una barrera de cobertura del 100%. @devigo/core es el corazón auditable de la plataforma, y lo que un comprador adquiere de verdad.',
    modules: [
      { file: 'odds.ts', title: 'Álgebra de cuotas', body: 'Conversión decimal, americana y fraccionaria con validación en cada frontera, más el margen de la casa en cualquier mercado completo.', detail: '7 tests · 100% de ramas' },
      { file: 'vig.ts', title: 'Eliminación del margen', body: 'Multiplicativo, aditivo y método de Shin. Shin resuelve la proporción de información privilegiada z de forma iterativa, así el no favorito deja de pagar el impuesto del favorito.', detail: 'z converge < 1e-12' },
      { file: 'parlay.ts', title: 'Probabilidad conjunta', body: 'Acumulación consciente de la matriz de correlación, con validación de simetría y rango, y curva de supervivencia selección a selección.', detail: 'covarianza por pares' },
      { file: 'value.ts', title: 'Valor esperado y Kelly', body: 'Valor esperado, ventaja sobre la línea justa, Kelly fraccionado con suelo en cero, y un escáner que ordena una casa entera por ventaja.', detail: 'Kelly ¼ por defecto' },
      { file: 'monte-carlo.ts', title: 'Informe de varianza', body: '10.000 liquidaciones con semilla por boleto y sorteo de correlación por factor latente. Devuelve tasa de acierto, percentiles, caída máxima y decaimiento.', detail: 'xorshift128 determinista' },
    ],
  },
  proof: {
    kicker: '02 — AUDITABILIDAD',
    title: 'Cada número se puede reproducir',
    body: 'Las simulaciones corren sobre un generador xorshift con semilla, así que el mismo boleto devuelve el mismo informe de varianza en tu máquina, en CI y en una due diligence. Sin modelo oculto y sin viaje al servidor.',
    points: [
      'Solo funciones puras: nada de entrada/salida, variables globales ni dependencia del reloj dentro de @devigo/core.',
      'Configuración estricta de TS: noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax.',
      'Los conectores de datos son una interfaz, así que cambiar de casa nunca toca las matemáticas.',
      'Los umbrales de cobertura tumban la compilación por debajo del 100% en líneas, ramas y funciones.',
    ],
  },
  pricing: {
    kicker: '03 — ACCESO',
    title: 'Se paga por la ventaja, no por asiento',
    note: '14 días de prueba · cancelas en un clic',
    plans: [
      { name: 'Explorador', tag: 'GRATIS', price: '0 €', period: '/mes', blurb: 'Quita el margen de cualquier mercado y mira la línea real antes de apostar.',
        features: ['3 modelos de eliminación de margen', '5 boletos al día', 'Señal con 60 s de retraso', 'Lecturas de valor esperado y Kelly'], cta: 'Empezar gratis', highlight: false, b2b: false },
      { name: 'Cuantitativo', tag: 'MÁS ELEGIDO', price: '79 €', period: '/mes', blurb: 'El panel completo: señal en vivo, correlación modelada y simulación sin límite.',
        features: ['Señal en tiempo real de 14 casas', 'Montecarlo de 10.000 tiradas sin límite', 'Editor de matriz de correlación', 'Seguimiento de CLV y libro de capital', 'Acceso por API a @devigo/core'], cta: 'Probar 14 días', highlight: true, b2b: false },
      { name: 'Sindicato', tag: 'B2B', price: 'A medida', period: 'licencia', blurb: 'Licencia del código, interfaz de marca blanca y tus propios conectores.',
        features: ['Licencia del monorepo completo', 'Capa de tematización de marca blanca', 'Desarrollo de conectores a medida', 'Dosier de auditoría y documentación del modelo', 'Soporte prioritario de ingeniería'], cta: 'Hablar con ingeniería', highlight: false, b2b: true },
    ],
  },
  license: {
    title: 'Lleva todo el motor bajo tu marca',
    body: 'Turborepo, TypeScript estricto, interfaces de conector para cualquier proveedor de cuotas y un paquete matemático con barrera de cobertura al 100%. Licencia del código o conversación de adquisición: las dos empiezan igual.',
    cta: 'Pedir el dosier de auditoría', ctaAlt: 'Verlo funcionando',
  },
  ticket: {
    title: 'Boleto',
    empty: 'Añade líneas desde el tablero. La probabilidad conjunta, la correlación y la varianza se recalculan en cada clic.',
    clear: 'VACIAR', stake: 'Importe', correlation: 'Correl.',
    legs: (n) => n + (n === 1 ? ' selección' : ' selecciones'),
    emptyLegs: 'vacío',
  },
  stats: {
    combinedPrice: 'Cuota combinada', fairPrice: 'Cuota justa', expectedValue: 'Valor esperado', kelly: 'Kelly',
    joint: (v) => 'conjunta ' + v, perUnit: (v) => v + ' por unidad', ofBankroll: (v) => v + ' del capital',
    noLegs: 'sin selecciones',
  },
  sim: {
    title: 'Montecarlo · 10.000 tiradas', hit: (v) => 'acierto ' + v,
    p05: (v) => v + ' p05', median: (v) => 'mediana ' + v, p95: (v) => 'p95 ' + v,
  },
  board: {
    title: 'Tablero de mercados', subtitle: (m) => 'cuotas justas calculadas con ' + m,
    switchModel: 'CAMBIAR MODELO', autoTicket: 'BOLETO +EV AUTO',
    kpiScanned: 'Líneas escaneadas', kpiValueFound: 'Con valor', kpiAvgMargin: 'Margen medio', kpiModel: 'Modelo',
    margin: (v) => 'margen ' + v,
    detail: (fair, edgeStr) => 'justa ' + fair + ' · ' + edgeStr,
    books: (n) => n + (n === 1 ? ' casa' : ' casas'),
  },
  methods: { shin: 'el método de Shin', multiplicative: 'reparto proporcional', additive: 'reparto aditivo' },
  verdict: {
    positive: (edgeStr) => 'Expectativa positiva: ' + edgeStr + ' de ventaja sobre la línea justa.',
    heavy: (hit) => ' La varianza es alta: solo ' + hit + ' de los boletos simulados cobran. No superes el importe de Kelly.',
    sized: ' El importe de Kelly mantiene la caída máxima dentro de tu tolerancia.',
    negative: (hold) => 'Expectativa negativa: la casa se queda con ' + hold + ' en esta combinación. Quita la selección más débil o espera mejor línea.',
    idle: 'El deslizador de correlación modela selecciones que comparten desenlace. Todo el cálculo corre sobre probabilidades justas, nunca sobre la cuota de la casa.',
  },
  help: {
    open: '¿Cómo leer el panel?',
    title: 'Cómo leer el panel',
    close: 'Entendido',
    steps: [
      { title: 'Toda cuota esconde una comisión', body: 'La casa infla las probabilidades para cobrar su margen. Devigo se lo quita a cada casa, promedia las probabilidades de hasta 10 casas y reconstruye la cuota justa: lo que pagaría un mercado sin comisión.' },
      { title: 'Verde = valor real', body: 'Cada botón muestra la mejor cuota del mercado (neta de comisión de exchange), la justa y tu ventaja. Verde significa que te pagan más de lo que la probabilidad real justifica. Es raro: apreciarlo es el producto.' },
      { title: 'Arma el boleto y ajusta', body: 'Clic para añadir selecciones, o BOLETO +EV AUTO. Puedes tocar la cuota de cada selección y escribir la que te ofrece TU casa (p. ej. Supermatch) para medirla contra el consenso.' },
      { title: 'Lee el veredicto, apuesta Kelly', body: 'El valor esperado te dice cuánto ganas o pierdes en promedio. Kelly ¼ es el importe máximo racional para tu capital. El histograma son 10.000 simulaciones del boleto: la varianza real, no la promesa.' },
    ],
    combined: 'Producto de las cuotas de tus selecciones: lo que te paga la casa si aciertas todo.',
    fair: 'Cuota que pagaría un mercado sin comisión, según el consenso de casas. Si la combinada está por debajo, la diferencia es el margen de la casa.',
    ev: 'Ganancia o pérdida promedio de este boleto por cada vez que lo jugaras. Positivo (verde) = apuesta con valor; negativo (rojo) = regalas dinero.',
    kelly: 'Importe óptimo según el criterio de Kelly (fraccionado ¼ por prudencia). Apostar más que esto destruye capital a largo plazo aunque tengas ventaja.',
    corr: 'Si tus selecciones comparten desenlace (mismo partido, misma narrativa), no son independientes. Sube el deslizador y la probabilidad conjunta se ajusta.',
    mc: 'El boleto se liquida 10.000 veces con un generador reproducible. p05/mediana/p95: el rango realista de resultados, no el premio del folleto.',
    margin: 'Comisión que la casa esconde en las cuotas de este mercado. Media de las casas cotizadas.',
    manualPrice: 'Escribe la cuota que te ofrece tu casa para compararla contra el consenso',
    manualTag: 'MANUAL',
  },
  scan: {
    title: 'Escáner de boletos',
    subtitle: 'Sube la captura de cualquier boleto y mira cuánto paga de verdad — y cuánto se queda la casa.',
    upload: 'Subir captura',
    dropHint: 'Arrastra la imagen, pégala (Ctrl+V) o toca para elegir el archivo',
    analyzing: 'Leyendo el boleto…',
    errorGeneric: 'No se pudo analizar la imagen. Prueba con una captura más nítida.',
    errorNoKey: 'El escáner no está configurado en este servidor (falta ANTHROPIC_API_KEY).',
    errorNoLegs: 'No se encontraron selecciones en la imagen. Prueba con una captura del boleto completo.',
    extracted: (n) => n + (n === 1 ? ' línea extraída' : ' líneas extraídas'),
    colSelection: 'Selección',
    colPrice: 'Cuota',
    stake: 'Importe',
    vig: 'Margen por línea',
    vigHelp: 'Comisión que la casa esconde en cada cuota. En cuotas cortas de combinada suele ser 2–4% por lado. Mueve el deslizador para ver el rango.',
    paid: 'Te pagan',
    fairRange: 'Cuota justa',
    probPaid: 'Prob. que te pagan',
    probReal: 'Prob. real estimada',
    evRange: 'Valor esperado',
    houseTake: 'Se queda la casa',
    verdict: (holdPct, holdMoney) => 'La casa se queda ' + holdPct + ' del valor de este boleto (' + holdMoney + ' de expectativa). El margen de cada línea se multiplica: cuantas más selecciones, más grande el impuesto invisible.',
    verdictPositive: 'Este boleto tiene expectativa positiva bajo el margen asumido — raro en combinadas: verifica las cuotas contra el consenso en el panel.',
    matchNote: 'Cálculo con el motor @devigo/core sobre las líneas extraídas. Ajusta cuotas o borra líneas si la lectura falló.',
    again: 'Escanear otro',
    toPanel: 'Abrir el panel',
    disclaimer: 'La justa exacta requiere el mercado completo de cada línea; el rango usa el margen por línea del deslizador.',
  },
  footer: { legal: '© 2026 Devigo. Herramienta de modelado, no consejo de apuestas. +18.' },
};

const en: Dictionary = {
  nav: { engine: 'Engine', proof: 'Proof', pricing: 'Pricing', whiteLabel: 'White-label', console: 'Open the console' },
  panelNav: { builder: 'Ticket builder', scanner: 'Value scanner', backtest: 'Backtests', bankroll: 'Bankroll' },
  feedLive: 'FEED LIVE · THE ODDS API',
  feedDemo: 'DEMO DATA',
  bankrollLabel: 'bankroll',
  hero: {
    badge: 'SHIN DE-VIG · 10,000 SIMULATIONS PER TICKET',
    h1a: 'The book got paid',
    h1b: 'before kickoff.',
    body: "Every price you take has the book's commission buried inside it. Devigo strips it with Shin's method, rebuilds the real line, and settles your parlay 10,000 times before you risk a cent.",
    ctaPrimary: 'Build a ticket', ctaSecondary: 'Read the engine spec',
  },
  metrics: [
    { value: '3', label: 'de-vig models: Shin, proportional and additive', accent: false },
    { value: '10,000', label: 'seeded Monte Carlo settlements per ticket, fully reproducible', accent: false },
    { value: '100%', label: 'unit-test coverage on core — the gate fails the build below it', accent: true },
  ],
  heroCard: {
    title: 'SAMPLE TICKET',
    disclaimer: 'Hypothetical scenario · real @devigo/core maths',
    legs: [
      { label: 'Arsenal ML', price: 1.72, p: 0.595 },
      { label: 'Nuggets -3.5', price: 1.95, p: 0.525 },
      { label: 'Over 2.5 · Girona', price: 1.83, p: 0.56 },
      { label: 'Sinner in 2 sets', price: 2.26, p: 0.455 },
    ],
    survival: (v) => 'live ' + v,
    statPrice: 'Price', statFair: 'Fair', statKelly: 'Kelly',
    simLabel: 'MONTE CARLO · 10,000 RUNS', simHit: (v) => 'hit ' + v,
  },
  engine: {
    kicker: '01 — THE ENGINE',
    title: 'Five models, one pure TypeScript package',
    body: 'Zero runtime dependencies, deterministic seeds, and a 100% coverage gate. @devigo/core is the auditable heart of the platform — and the thing an acquirer actually buys.',
    modules: [
      { file: 'odds.ts', title: 'Odds algebra', body: 'Decimal, American and fractional conversion with validation at every boundary, plus book margin across any complete market.', detail: '7 tests · 100% branches' },
      { file: 'vig.ts', title: 'Margin removal', body: "Multiplicative, additive and Shin's method. Shin solves the insider-proportion z iteratively, so longshots stop paying the favourite's tax.", detail: 'z converges < 1e-12' },
      { file: 'parlay.ts', title: 'Joint probability', body: 'Correlation-matrix-aware accumulation with symmetry and range validation, and a survival curve for leg-by-leg decay.', detail: 'pairwise covariance lift' },
      { file: 'value.ts', title: 'EV & Kelly', body: 'Expected value, edge over fair, fractional Kelly floored at zero, and a scanner that ranks a whole book by edge.', detail: 'default ¼ Kelly' },
      { file: 'monte-carlo.ts', title: 'Variance report', body: '10,000 seeded settlements per ticket with a latent-factor correlation draw. Returns hit rate, percentiles, drawdown and decay.', detail: 'deterministic xorshift128' },
    ],
  },
  proof: {
    kicker: '02 — AUDITABILITY',
    title: 'Every number is reproducible',
    body: 'Simulations run on a seeded xorshift PRNG, so the same ticket returns the same variance report on your machine, on CI, and in a due-diligence review. No hidden model, no server round-trip.',
    points: [
      'Pure functions only — no I/O, no globals, no clock dependence inside @devigo/core.',
      'Strict TS config: noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax.',
      'Feed adapters are an interface, so a book swap never touches the maths.',
      'Coverage thresholds fail the build below 100% on lines, branches and functions.',
    ],
  },
  pricing: {
    kicker: '03 — ACCESS',
    title: 'Priced per edge, not per seat',
    note: '14-day trial · cancel in one click',
    plans: [
      { name: 'Scout', tag: 'FREE', price: '$0', period: '/mo', blurb: 'De-vig any market and read the real line before you place a bet.',
        features: ['3 de-vig models', '5 tickets per day', 'Delayed feed (60s)', 'EV and Kelly readouts'], cta: 'Start free', highlight: false, b2b: false },
      { name: 'Quant', tag: 'MOST PICKED', price: '$79', period: '/mo', blurb: 'The full console: live feed, correlation modelling, and unlimited simulation.',
        features: ['Real-time feed across 14 books', 'Unlimited 10k Monte Carlo runs', 'Correlation matrix editor', 'CLV tracking and bankroll ledger', 'API access to @devigo/core'], cta: 'Start 14-day trial', highlight: true, b2b: false },
      { name: 'Syndicate', tag: 'B2B', price: 'Custom', period: 'licensed', blurb: 'Source licence, white-label UI, and your own feed adapters.',
        features: ['Full monorepo source licence', 'White-label theming layer', 'Custom adapter development', 'Audit pack and model documentation', 'Priority engineering support'], cta: 'Talk to engineering', highlight: false, b2b: true },
    ],
  },
  license: {
    title: 'Run the whole engine under your own brand',
    body: 'Turborepo, strict TypeScript, adapter interfaces for any odds feed, and a maths package with a 100% coverage gate. Licensed source, or an acquisition conversation — both start the same way.',
    cta: 'Request the audit pack', ctaAlt: 'See it running',
  },
  ticket: {
    title: 'Ticket',
    empty: 'Add lines from the board. Joint probability, correlation and variance recompute on every click.',
    clear: 'CLEAR', stake: 'Stake', correlation: 'Corr.',
    legs: (n) => n + (n === 1 ? ' leg' : ' legs'),
    emptyLegs: 'empty',
  },
  stats: {
    combinedPrice: 'Combined price', fairPrice: 'Fair price', expectedValue: 'Expected value', kelly: 'Kelly',
    joint: (v) => 'joint ' + v, perUnit: (v) => v + ' per unit', ofBankroll: (v) => v + ' of bankroll',
    noLegs: 'no legs',
  },
  sim: {
    title: 'Monte Carlo · 10,000 runs', hit: (v) => 'hit ' + v,
    p05: (v) => v + ' p05', median: (v) => 'median ' + v, p95: (v) => 'p95 ' + v,
  },
  board: {
    title: 'Market board', subtitle: (m) => 'fair prices de-vigged with ' + m,
    switchModel: 'SWITCH MODEL', autoTicket: 'AUTO +EV TICKET',
    kpiScanned: 'Scanned lines', kpiValueFound: '+EV found', kpiAvgMargin: 'Avg book margin', kpiModel: 'De-vig model',
    margin: (v) => 'margin ' + v,
    detail: (fair, edgeStr) => 'fair ' + fair + ' · ' + edgeStr,
    books: (n) => n + (n === 1 ? ' book' : ' books'),
  },
  methods: { shin: "Shin's method", multiplicative: 'proportional de-vig', additive: 'additive de-vig' },
  verdict: {
    positive: (edgeStr) => 'Positive expectation: ' + edgeStr + ' edge over the fair line.',
    heavy: (hit) => ' Variance is heavy: only ' + hit + ' of simulated tickets cash. Stake at or below the Kelly figure.',
    sized: ' A Kelly-sized stake keeps drawdown inside tolerance.',
    negative: (hold) => 'Negative expectation: the book holds ' + hold + ' on this combination. Drop the weakest leg or wait for a better line.',
    idle: 'The correlation slider models legs that share an outcome. All maths runs on fair de-vigged probabilities, never on the book price.',
  },
  help: {
    open: 'How to read the panel',
    title: 'How to read the panel',
    close: 'Got it',
    steps: [
      { title: 'Every price hides a commission', body: "Books inflate probabilities to charge their margin. Devigo strips it from each book, averages up to 10 books' probabilities and rebuilds the fair price: what a commission-free market would pay." },
      { title: 'Green = real value', body: 'Each button shows the best market price (net of exchange commission), the fair price and your edge. Green means the payout beats the real probability. It is rare — spotting it is the product.' },
      { title: 'Build the ticket, adjust', body: 'Click to add selections, or AUTO +EV TICKET. You can tap any leg price and type the odds YOUR book offers (e.g. a local book) to measure it against the consensus.' },
      { title: 'Read the verdict, stake Kelly', body: 'Expected value is your average win or loss per play. Quarter Kelly is the rational maximum stake for your bankroll. The histogram is 10,000 simulated settlements: real variance, not the flyer promise.' },
    ],
    combined: 'Product of your leg prices: what the book pays if every leg lands.',
    fair: 'What a commission-free market would pay, per the cross-book consensus. The gap below your combined price is the house margin.',
    ev: 'Average profit or loss of this ticket per play. Positive (green) = value bet; negative (red) = giving money away.',
    kelly: 'Optimal stake per the Kelly criterion (quarter-sized for prudence). Staking more destroys bankroll long-term even with an edge.',
    corr: 'Legs that share an outcome (same match, same script) are not independent. Raise the slider and the joint probability adjusts.',
    mc: 'The ticket is settled 10,000 times with a reproducible generator. p05/median/p95: the realistic range of outcomes, not the flyer prize.',
    margin: 'Commission the book hides inside this market’s prices. Average across quoted books.',
    manualPrice: 'Type the odds your book offers to compare them against the consensus',
    manualTag: 'MANUAL',
  },
  scan: {
    title: 'Ticket scanner',
    subtitle: 'Upload a screenshot of any bet slip and see what it really pays — and what the house keeps.',
    upload: 'Upload screenshot',
    dropHint: 'Drag the image, paste it (Ctrl+V) or tap to pick a file',
    analyzing: 'Reading the slip…',
    errorGeneric: 'Could not analyze the image. Try a sharper screenshot.',
    errorNoKey: 'The scanner is not configured on this server (ANTHROPIC_API_KEY missing).',
    errorNoLegs: 'No selections found in the image. Try a screenshot of the full slip.',
    extracted: (n) => n + (n === 1 ? ' leg extracted' : ' legs extracted'),
    colSelection: 'Selection',
    colPrice: 'Odds',
    stake: 'Stake',
    vig: 'Margin per leg',
    vigHelp: 'Commission the book hides in each price. On short parlay prices it is typically 2–4% per side. Move the slider to see the range.',
    paid: 'You are paid',
    fairRange: 'Fair odds',
    probPaid: 'Implied probability',
    probReal: 'Estimated real probability',
    evRange: 'Expected value',
    houseTake: 'House keeps',
    verdict: (holdPct, holdMoney) => 'The house keeps ' + holdPct + ' of this ticket (' + holdMoney + ' of expectation). Each leg compounds the margin: the more selections, the bigger the invisible tax.',
    verdictPositive: 'This slip has positive expectation under the assumed margin — rare for parlays: verify the prices against the consensus in the panel.',
    matchNote: 'Computed by the @devigo/core engine over the extracted legs. Edit odds or delete legs if the reading missed.',
    again: 'Scan another',
    toPanel: 'Open the console',
    disclaimer: 'Exact fair odds need each leg’s full market; the range uses the per-leg margin from the slider.',
  },
  footer: { legal: '© 2026 Devigo. Modelling tool, not betting advice. 18+.' },
};

export const DICTIONARIES: Record<Locale, Dictionary> = { es, en };
