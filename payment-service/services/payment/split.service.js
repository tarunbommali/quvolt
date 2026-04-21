const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 20);

const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise) => Number((Number(paise || 0) / 100).toFixed(2));

const computeSplit = (amountRupees, commissionPercent = PLATFORM_FEE_PERCENT) => {
  const grossPaise = toPaise(amountRupees);
  const platformFeePaise = Math.round((grossPaise * commissionPercent) / 100);
  const hostPaise = Math.max(0, grossPaise - platformFeePaise);

  return {
    grossPaise,
    platformFeePaise,
    hostPaise,
    grossAmount: toRupees(grossPaise),
    platformFeeAmount: toRupees(platformFeePaise),
    hostAmount: toRupees(hostPaise),
    commissionPercent,
  };
};

module.exports = {
  toPaise,
  toRupees,
  computeSplit,
  PLATFORM_FEE_PERCENT,
};
