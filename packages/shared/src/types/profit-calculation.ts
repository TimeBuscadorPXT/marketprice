/** Calculo de lucro */
export interface ProfitCalculation {
  listingId: string;
  modelId: string;
  purchasePrice: number;
  estimatedSellingPrice: number;
  platformFees: number;
  shippingCost: number;
  otherCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMarginPercent: number;
  currency: string;
  calculatedAt: string;
}
