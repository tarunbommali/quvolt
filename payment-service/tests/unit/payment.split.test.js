const { computeSplit, toPaise, toRupees } = require('../../services/payment/split.service');

describe('Payment Split Unit Tests', () => {
  describe('toPaise', () => {
    test('converts rupees to paise correctly', () => {
      expect(toPaise(100)).toBe(10000);
      expect(toPaise(49.90)).toBe(4990);
      expect(toPaise(999.99)).toBe(99999);
      expect(toPaise(0)).toBe(0);
    });

    test('handles floating point precision', () => {
      // 1.15 * 100 is 114.99999999999999 in JS without Math.round
      expect(toPaise(1.15)).toBe(115);
    });
  });

  describe('toRupees', () => {
    test('converts paise to rupees correctly', () => {
      expect(toRupees(10000)).toBe(100);
      expect(toRupees(4990)).toBe(49.9);
      expect(toRupees(115)).toBe(1.15);
      expect(toRupees(0)).toBe(0);
    });
  });

  describe('computeSplit', () => {
    test('calculates 25% commission for FREE plan', () => {
      const amount = 100;
      const commission = 25;
      const result = computeSplit(amount, commission);

      expect(result.grossPaise).toBe(10000);
      expect(result.platformFeePaise).toBe(2500);
      expect(result.hostPaise).toBe(7500);
      expect(result.platformFeeAmount).toBe(25);
      expect(result.hostAmount).toBe(75);
    });

    test('calculates 10% commission for CREATOR plan', () => {
      const amount = 499;
      const commission = 10;
      const result = computeSplit(amount, commission);

      expect(result.grossPaise).toBe(49900);
      expect(result.platformFeePaise).toBe(4990);
      expect(result.hostPaise).toBe(44910);
      expect(result.platformFeeAmount).toBe(49.9);
      expect(result.hostAmount).toBe(449.1);
    });

    test('calculates 5% commission for TEAMS plan', () => {
      const amount = 999;
      const commission = 5;
      const result = computeSplit(amount, commission);

      expect(result.grossPaise).toBe(99900);
      expect(result.platformFeePaise).toBe(4995);
      expect(result.hostPaise).toBe(94905);
      expect(result.platformFeeAmount).toBe(49.95);
      expect(result.hostAmount).toBe(949.05);
    });

    test('handles zero amount', () => {
      const result = computeSplit(0, 10);
      expect(result.grossPaise).toBe(0);
      expect(result.platformFeePaise).toBe(0);
      expect(result.hostPaise).toBe(0);
    });
  });
});
