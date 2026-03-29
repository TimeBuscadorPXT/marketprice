interface FlagAnalysis {
  healthScore: number;
  flagLevel: 'clean' | 'warning' | 'danger';
  redFlags: string[];
  yellowFlags: string[];
  greenFlags: string[];
  valueReduction: number;
  summary: string;
}

interface FlagRule {
  keywords: string[];
  label: string;
  scoreImpact: number;
  valueReduction: number;
}

const RED_FLAG_RULES: FlagRule[] = [
  { keywords: ['tela trocada', 'tela paralela', 'display trocado', 'tela não original', 'tela premium', 'lcd trocado'], label: 'Tela não original', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['bateria trocada', 'bateria ruim', 'bateria viciada'], label: 'Bateria com problema', scoreImpact: -15, valueReduction: 15 },
  { keywords: ['face id não funciona', 'sem face id', 'face id queimado'], label: 'Face ID com defeito', scoreImpact: -25, valueReduction: 30 },
  { keywords: ['câmera com defeito', 'câmera tremendo', 'câmera embaçada', 'camera com defeito', 'camera tremendo', 'camera embaçada'], label: 'Câmera com defeito', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['caiu na água', 'entrou água', 'oxidado', 'entrou agua', 'caiu na agua'], label: 'Dano por água/oxidação', scoreImpact: -25, valueReduction: 35 },
  { keywords: ['com defeito', 'não liga', 'nao liga', 'travando', 'fantasma', 'ghost touch', 'mancha na tela'], label: 'Defeito grave', scoreImpact: -25, valueReduction: 40 },
  { keywords: ['bloqueado', 'icloud ativo', 'conta vinculada'], label: 'Bloqueio de conta', scoreImpact: -25, valueReduction: 40 },
];

const YELLOW_FLAG_RULES: FlagRule[] = [
  { keywords: ['tela trocada por original'], label: 'Tela trocada (original)', scoreImpact: -5, valueReduction: 5 },
  { keywords: ['bateria 80', 'bateria 85'], label: 'Bateria com saúde mediana', scoreImpact: -5, valueReduction: 5 },
  { keywords: ['arranhão', 'arranhao', 'marca de uso'], label: 'Marcas de uso', scoreImpact: -5, valueReduction: 8 },
  { keywords: ['trinco', 'trinca', 'trincado', 'trincada', 'rachado', 'rachada', 'rachadura'], label: 'Trinco/rachado na tela', scoreImpact: -10, valueReduction: 15 },
  { keywords: ['sem caixa', 'sem acessórios', 'sem acessorios'], label: 'Sem acessórios/caixa', scoreImpact: -5, valueReduction: 5 },
  { keywords: ['vendo urgente'], label: 'Venda urgente', scoreImpact: -10, valueReduction: 10 },
];

const GREEN_FLAG_RULES: FlagRule[] = [
  { keywords: ['garantia apple', 'garantia até', 'garantia ate', 'na garantia'], label: 'Com garantia', scoreImpact: 10, valueReduction: -5 },
  { keywords: ['bateria 100%', 'bateria 100'], label: 'Bateria 100%', scoreImpact: 10, valueReduction: -3 },
  { keywords: ['nota fiscal', 'com nota'], label: 'Com nota fiscal', scoreImpact: 5, valueReduction: -2 },
  { keywords: ['lacrado', 'novo na caixa'], label: 'Lacrado/novo', scoreImpact: 10, valueReduction: -5 },
  { keywords: ['tudo original', 'nunca aberto', 'sem reparo'], label: 'Nunca reparado', scoreImpact: 8, valueReduction: -3 },
];

const CONSOLE_RED_FLAGS: FlagRule[] = [
  { keywords: ['drift', 'controle com drift', 'analógico com problema'], label: 'Controle com drift', scoreImpact: -15, valueReduction: 15 },
  { keywords: ['leitor não funciona', 'sem leitor', 'leitor quebrado'], label: 'Leitor de disco com defeito', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['banido', 'ban', 'conta banida'], label: 'Console banido', scoreImpact: -25, valueReduction: 40 },
  { keywords: ['superaquecendo', 'esquentando muito', 'desliga sozinho'], label: 'Superaquecimento', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['hdmi quebrado', 'sem hdmi', 'hdmi com defeito'], label: 'HDMI com defeito', scoreImpact: -20, valueReduction: 30 },
];
const CONSOLE_GREEN_FLAGS: FlagRule[] = [
  { keywords: ['na caixa', 'caixa original'], label: 'Na caixa', scoreImpact: 8, valueReduction: -3 },
  { keywords: ['2 controles', 'dois controles'], label: '2 controles', scoreImpact: 5, valueReduction: -2 },
  { keywords: ['com jogos', 'jogos inclusos'], label: 'Com jogos', scoreImpact: 3, valueReduction: -1 },
  { keywords: ['garantia', 'na garantia'], label: 'Com garantia', scoreImpact: 10, valueReduction: -5 },
];

const VEHICLE_RED_FLAGS: FlagRule[] = [
  { keywords: ['motor fundido', 'motor batendo'], label: 'Motor com problema grave', scoreImpact: -25, valueReduction: 40 },
  { keywords: ['batido', 'batida', 'sinistro', 'sinistrado'], label: 'Veículo batido/sinistrado', scoreImpact: -25, valueReduction: 35 },
  { keywords: ['leilão', 'leilao', 'de leilão'], label: 'Veículo de leilão', scoreImpact: -20, valueReduction: 30 },
  { keywords: ['enchente', 'alagamento', 'entrou água'], label: 'Dano por enchente', scoreImpact: -25, valueReduction: 40 },
  { keywords: ['sem documento', 'documento atrasado', 'sem doc'], label: 'Documentação irregular', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['câmbio com problema', 'cambio com problema', 'marcha dura'], label: 'Câmbio com problema', scoreImpact: -20, valueReduction: 25 },
];
const VEHICLE_GREEN_FLAGS: FlagRule[] = [
  { keywords: ['documentação ok', 'documentacao ok', 'doc ok', 'ipva pago'], label: 'Documentação em dia', scoreImpact: 8, valueReduction: -3 },
  { keywords: ['único dono', 'unico dono', '1 dono'], label: 'Único dono', scoreImpact: 8, valueReduction: -3 },
  { keywords: ['baixa km', 'baixa quilometragem', 'pouco rodado'], label: 'Baixa quilometragem', scoreImpact: 5, valueReduction: -2 },
  { keywords: ['revisão em dia', 'revisao em dia'], label: 'Revisões em dia', scoreImpact: 5, valueReduction: -2 },
];

const NOTEBOOK_RED_FLAGS: FlagRule[] = [
  { keywords: ['tela quebrada', 'display quebrado'], label: 'Tela quebrada', scoreImpact: -20, valueReduction: 25 },
  { keywords: ['não liga', 'nao liga', 'placa queimada'], label: 'Defeito grave', scoreImpact: -25, valueReduction: 40 },
  { keywords: ['teclado não funciona', 'teclado com defeito'], label: 'Teclado com defeito', scoreImpact: -15, valueReduction: 15 },
  { keywords: ['dobradiça quebrada', 'dobradica quebrada'], label: 'Dobradiça quebrada', scoreImpact: -15, valueReduction: 20 },
];
const NOTEBOOK_GREEN_FLAGS: FlagRule[] = [
  { keywords: ['na caixa', 'lacrado'], label: 'Na caixa/lacrado', scoreImpact: 10, valueReduction: -5 },
  { keywords: ['garantia', 'na garantia'], label: 'Com garantia', scoreImpact: 10, valueReduction: -5 },
  { keywords: ['bateria nova', 'bateria 100'], label: 'Bateria nova', scoreImpact: 8, valueReduction: -3 },
  { keywords: ['ssd', 'nvme'], label: 'SSD', scoreImpact: 3, valueReduction: -1 },
];

const BATTERY_HIGH_REGEX = /bateria 9\d%/i;

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

export function analyzeListingText(title: string, description?: string | null, category?: string): FlagAnalysis {
  const text = `${title} ${description ?? ''}`.toLowerCase();

  let activeRedRules = RED_FLAG_RULES;
  let activeYellowRules = YELLOW_FLAG_RULES;
  let activeGreenRules = GREEN_FLAG_RULES;

  if (category === 'console') {
    activeRedRules = CONSOLE_RED_FLAGS;
    activeYellowRules = [];
    activeGreenRules = CONSOLE_GREEN_FLAGS;
  } else if (category === 'motorcycle' || category === 'car') {
    activeRedRules = VEHICLE_RED_FLAGS;
    activeYellowRules = [];
    activeGreenRules = VEHICLE_GREEN_FLAGS;
  } else if (category === 'notebook') {
    activeRedRules = NOTEBOOK_RED_FLAGS;
    activeYellowRules = [];
    activeGreenRules = NOTEBOOK_GREEN_FLAGS;
  }
  // phone: uses existing rules (default)

  const redFlags: string[] = [];
  const yellowFlags: string[] = [];
  const greenFlags: string[] = [];

  let healthScore = 80;
  let valueReduction = 0;

  // Track which parts of text were matched by yellow flags to prevent red flag overlap
  const yellowMatchedKeywords: string[] = [];

  // 1) Check YELLOW flags FIRST
  for (const rule of activeYellowRules) {
    if (matchesAny(text, rule.keywords)) {
      yellowFlags.push(rule.label);
      healthScore += rule.scoreImpact;
      valueReduction += rule.valueReduction;
      yellowMatchedKeywords.push(...rule.keywords.filter((kw) => text.includes(kw)));
    }
  }

  // 2) Check RED flags, but skip if a yellow flag already matched (e.g. "tela trocada por original")
  for (const rule of activeRedRules) {
    const matchingKeywords = rule.keywords.filter((kw) => text.includes(kw));
    if (matchingKeywords.length === 0) continue;

    // Skip if every matching keyword is a substring of an already-matched yellow keyword
    const allCoveredByYellow = matchingKeywords.every((mk) =>
      yellowMatchedKeywords.some((yk) => yk.includes(mk))
    );
    if (allCoveredByYellow) continue;

    redFlags.push(rule.label);
    healthScore += rule.scoreImpact;
    valueReduction += rule.valueReduction;
  }

  // 3) Check GREEN flags
  for (const rule of activeGreenRules) {
    if (matchesAny(text, rule.keywords)) {
      greenFlags.push(rule.label);
      healthScore += rule.scoreImpact;
      valueReduction += rule.valueReduction; // negative = adds value
    }
  }

  // Regex for battery 90-99%
  if (BATTERY_HIGH_REGEX.test(text)) {
    if (!greenFlags.includes('Bateria 100%')) {
      greenFlags.push('Bateria excelente (90%+)');
      healthScore += 8;
      valueReduction -= 2;
    }
  }

  // Clamp
  healthScore = Math.min(100, Math.max(0, healthScore));
  valueReduction = Math.min(50, Math.max(0, valueReduction));

  // Flag level
  let flagLevel: 'clean' | 'warning' | 'danger' = 'clean';
  if (redFlags.length > 0) flagLevel = 'danger';
  else if (yellowFlags.length > 0) flagLevel = 'warning';

  // Summary
  let summary: string;
  if (flagLevel === 'danger') {
    summary = `Anúncio com ${redFlags.length} alerta(s) grave(s): ${redFlags.join(', ')} — redução estimada de ${valueReduction}% no valor.`;
  } else if (flagLevel === 'warning') {
    summary = `Anúncio com ${yellowFlags.length} ponto(s) de atenção: ${yellowFlags.join(', ')} — redução estimada de ${valueReduction}% no valor.`;
  } else if (greenFlags.length > 0) {
    summary = `Anúncio saudável com ${greenFlags.length} ponto(s) positivo(s): ${greenFlags.join(', ')}.`;
  } else {
    summary = 'Anúncio sem alertas identificados. Verifique pessoalmente antes de comprar.';
  }

  return {
    healthScore,
    flagLevel,
    redFlags,
    yellowFlags,
    greenFlags,
    valueReduction,
    summary,
  };
}
