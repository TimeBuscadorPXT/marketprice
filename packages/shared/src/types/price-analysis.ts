export interface PriceRange {
  min: number;
  max: number;
}

/** Analise de preco com media, mediana e faixa */
export interface PriceAnalysis {
  modelId: string;
  sampleSize: number;
  average: number;
  median: number;
  standardDeviation: number;
  range: PriceRange;
  percentile25: number;
  percentile75: number;
  outlierThreshold: PriceRange;
  currency: string;
  analyzedAt: string;
}
