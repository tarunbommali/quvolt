const mongoose = require('mongoose');
const Payment = require('../../models/Payment');
const HostAccount = require('../../models/HostAccount');
const logger = require('../../utils/logger');

async function upsertHostAccountData(hostUserId, accountData) {
  const { linkedAccountId, accountStatus, settlementMode, bankLast4, ifsc } = accountData;

  if (!linkedAccountId || !String(linkedAccountId).trim()) {
    const error = new Error('linkedAccountId is required');
    error.code = 'VALIDATION_ERROR';
    error.status = 400;
    throw error;
  }

  const update = {
    linkedAccountId: String(linkedAccountId).trim(),
    accountStatus: accountStatus || 'pending',
    settlementMode: settlementMode || 'scheduled',
    bankLast4: bankLast4 || '',
    ifsc: ifsc || '',
  };

  const hostAccount = await HostAccount.findOneAndUpdate(
    { hostUserId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return hostAccount;
}

async function getHostAccountData(hostUserId) {
  return HostAccount.findOne({ hostUserId }).lean();
}

async function getHostPayoutSummaryData(hostUserId) {
  const summary = await Payment.aggregate([
    {
      $match: {
        hostUserId: new mongoose.Types.ObjectId(hostUserId),
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$payoutStatus',
        total: { $sum: '$hostAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const totals = {
    pending: 0,
    processing: 0,
    transferred: 0,
    blocked_kyc: 0,
    reversed: 0,
    failed: 0,
  };

  summary.forEach((item) => {
    if (totals[item._id] !== undefined) totals[item._id] = Number(item.total.toFixed(2));
  });

  const recent = await Payment.find({ hostUserId, status: 'completed' })
    .sort({ updatedAt: -1 })
    .limit(25)
    .select('quizId amount hostAmount platformFeeAmount payoutMode payoutStatus updatedAt')
    .lean();

  return { totals, recent };
}

module.exports = {
  upsertHostAccountData,
  getHostAccountData,
  getHostPayoutSummaryData,
};
