import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure-math profit calculation extracted from profit.service.ts
// This avoids importing the service (which depends on Prisma/API calls).
// ---------------------------------------------------------------------------

interface ProfitInput {
  purchasePrice: number;
  sellingPrice: number;
  shippingIn: number;
  shippingOut: number;
  packaging: number;
  marketplaceFee: number;
  otherCosts: number;
}

interface ProfitResult {
  totalCost: number;
  sellingPrice: number;
  netRevenue: number;
  profit: number;
  marginPercent: number;
  roi: number;
  recommendation: string;
}

function calculateProfitPure(input: ProfitInput): ProfitResult {
  const totalCost =
    input.purchasePrice +
    input.shippingIn +
    input.shippingOut +
    input.packaging +
    input.otherCosts;

  const feeAmount = (input.marketplaceFee / 100) * input.sellingPrice;
  const netRevenue = Math.round((input.sellingPrice - feeAmount) * 100) / 100;
  const profit = Math.round((netRevenue - totalCost) * 100) / 100;
  const marginPercent =
    input.sellingPrice > 0
      ? Math.round((profit / input.sellingPrice) * 10000) / 100
      : 0;
  const roi =
    totalCost > 0
      ? Math.round((profit / totalCost) * 10000) / 100
      : 0;

  let recommendation: string;
  if (marginPercent >= 25) {
    recommendation = 'Excelente negocio';
  } else if (marginPercent >= 15) {
    recommendation = 'Bom negocio';
  } else if (marginPercent >= 5) {
    recommendation = 'Negocio razoavel';
  } else if (marginPercent >= 0) {
    recommendation = 'Margem muito baixa - avalie os custos';
  } else {
    recommendation = 'Prejuizo - nao recomendado';
  }

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    sellingPrice: input.sellingPrice,
    netRevenue,
    profit,
    marginPercent,
    roi,
    recommendation,
  };
}

function makeInput(overrides: Partial<ProfitInput> = {}): ProfitInput {
  return {
    purchasePrice: 3000,
    sellingPrice: 5000,
    shippingIn: 0,
    shippingOut: 0,
    packaging: 0,
    marketplaceFee: 0,
    otherCosts: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateProfitPure', () => {
  describe('positive profit', () => {
    it('computes profit when selling price exceeds costs', () => {
      const result = calculateProfitPure(makeInput());
      expect(result.profit).toBe(2000);
      expect(result.marginPercent).toBe(40);
      expect(result.roi).toBeCloseTo(66.67, 1);
    });
  });

  describe('negative profit (loss)', () => {
    it('computes negative profit when cost exceeds revenue', () => {
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 6000, sellingPrice: 5000 })
      );
      expect(result.profit).toBe(-1000);
      expect(result.marginPercent).toBe(-20);
      expect(result.roi).toBeCloseTo(-16.67, 1);
    });
  });

  describe('zero profit', () => {
    it('computes zero when cost equals revenue', () => {
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 5000, sellingPrice: 5000 })
      );
      expect(result.profit).toBe(0);
      expect(result.marginPercent).toBe(0);
      expect(result.roi).toBe(0);
    });
  });

  describe('with marketplace fee', () => {
    it('deducts fee from selling price', () => {
      // 10% fee on 5000 = 500; netRevenue = 4500; profit = 4500 - 3000 = 1500
      const result = calculateProfitPure(makeInput({ marketplaceFee: 10 }));
      expect(result.netRevenue).toBe(4500);
      expect(result.profit).toBe(1500);
      expect(result.marginPercent).toBe(30);
    });

    it('handles 100% fee resulting in zero net revenue', () => {
      const result = calculateProfitPure(makeInput({ marketplaceFee: 100 }));
      expect(result.netRevenue).toBe(0);
      expect(result.profit).toBe(-3000);
    });
  });

  describe('with all costs', () => {
    it('sums all cost components correctly', () => {
      const input = makeInput({
        purchasePrice: 3000,
        shippingIn: 50,
        shippingOut: 80,
        packaging: 20,
        otherCosts: 30,
        marketplaceFee: 12,
        sellingPrice: 5000,
      });
      const result = calculateProfitPure(input);

      // totalCost = 3000 + 50 + 80 + 20 + 30 = 3180
      expect(result.totalCost).toBe(3180);

      // feeAmount = 0.12 * 5000 = 600
      // netRevenue = 5000 - 600 = 4400
      expect(result.netRevenue).toBe(4400);

      // profit = 4400 - 3180 = 1220
      expect(result.profit).toBe(1220);

      // marginPercent = (1220 / 5000) * 100 = 24.4%
      expect(result.marginPercent).toBe(24.4);

      // roi = (1220 / 3180) * 100 = 38.36%
      expect(result.roi).toBeCloseTo(38.36, 1);
    });
  });

  describe('recommendation thresholds', () => {
    it('returns "Excelente negocio" for margin >= 25%', () => {
      // margin = (2000/5000)*100 = 40%
      const result = calculateProfitPure(makeInput());
      expect(result.recommendation).toBe('Excelente negocio');
    });

    it('returns "Bom negocio" for margin >= 15% and < 25%', () => {
      // Need margin ~20%: profit = 1000, selling = 5000 => margin = 20%
      // totalCost should be 4000 => purchasePrice = 4000
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 4000, sellingPrice: 5000 })
      );
      expect(result.marginPercent).toBe(20);
      expect(result.recommendation).toBe('Bom negocio');
    });

    it('returns "Negocio razoavel" for margin >= 5% and < 15%', () => {
      // Need margin ~10%: profit = 500, selling = 5000
      // totalCost = 4500 => purchasePrice = 4500
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 4500, sellingPrice: 5000 })
      );
      expect(result.marginPercent).toBe(10);
      expect(result.recommendation).toBe('Negocio razoavel');
    });

    it('returns "Margem muito baixa" for margin >= 0% and < 5%', () => {
      // Need margin ~2%: profit = 100, selling = 5000
      // totalCost = 4900 => purchasePrice = 4900
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 4900, sellingPrice: 5000 })
      );
      expect(result.marginPercent).toBe(2);
      expect(result.recommendation).toBe('Margem muito baixa - avalie os custos');
    });

    it('returns "Prejuizo - nao recomendado" for margin < 0%', () => {
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 6000, sellingPrice: 5000 })
      );
      expect(result.marginPercent).toBeLessThan(0);
      expect(result.recommendation).toBe('Prejuizo - nao recomendado');
    });

    it('returns "Excelente negocio" at exactly 25% margin', () => {
      // profit = 1250, selling = 5000 => margin = 25%
      // totalCost = 3750
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 3750, sellingPrice: 5000 })
      );
      expect(result.marginPercent).toBe(25);
      expect(result.recommendation).toBe('Excelente negocio');
    });

    it('returns "Bom negocio" at exactly 15% margin', () => {
      // profit = 750, selling = 5000 => margin = 15%
      // totalCost = 4250
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 4250, sellingPrice: 5000 })
      );
      expect(result.marginPercent).toBe(15);
      expect(result.recommendation).toBe('Bom negocio');
    });

    it('returns "Negocio razoavel" at exactly 5% margin', () => {
      // profit = 250, selling = 5000 => margin = 5%
      // totalCost = 4750
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 4750, sellingPrice: 5000 })
      );
      expect(result.marginPercent).toBe(5);
      expect(result.recommendation).toBe('Negocio razoavel');
    });

    it('returns "Margem muito baixa" at exactly 0% margin', () => {
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 5000, sellingPrice: 5000 })
      );
      expect(result.marginPercent).toBe(0);
      expect(result.recommendation).toBe('Margem muito baixa - avalie os custos');
    });
  });

  describe('formula correctness', () => {
    it('totalCost = purchasePrice + shippingIn + shippingOut + packaging + otherCosts', () => {
      const result = calculateProfitPure(
        makeInput({
          purchasePrice: 1000,
          shippingIn: 100,
          shippingOut: 200,
          packaging: 50,
          otherCosts: 75,
        })
      );
      expect(result.totalCost).toBe(1425);
    });

    it('feeAmount = (marketplaceFee / 100) * sellingPrice', () => {
      // 15% of 4000 = 600; netRevenue = 4000 - 600 = 3400
      const result = calculateProfitPure(
        makeInput({ sellingPrice: 4000, marketplaceFee: 15 })
      );
      expect(result.netRevenue).toBe(3400);
    });

    it('marginPercent = (profit / sellingPrice) * 100', () => {
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 2000, sellingPrice: 4000 })
      );
      // profit = 4000 - 2000 = 2000; margin = 2000/4000 * 100 = 50%
      expect(result.marginPercent).toBe(50);
    });

    it('roi = (profit / totalCost) * 100', () => {
      const result = calculateProfitPure(
        makeInput({ purchasePrice: 2000, sellingPrice: 4000 })
      );
      // profit = 2000; roi = 2000/2000 * 100 = 100%
      expect(result.roi).toBe(100);
    });
  });
});
