const mongoose = require('mongoose');
const Payment = require('../../models/Payment');
const logger = require('../../utils/logger');

const buildMatchFilter = (quizIds, user) => {
  const match = { status: 'completed' };

  if (user?.role !== 'admin') {
    match.hostUserId = new mongoose.Types.ObjectId(user._id);
  }

  if (Array.isArray(quizIds) && quizIds.length > 0) {
    const objectIds = quizIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length > 0) {
      match.quizId = { $in: objectIds };
    }
  }

  return match;
};

const getTotalRevenue = async ({ quizIds, user }) => {
  const match = buildMatchFilter(quizIds, user);

  const result = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        platformRevenue: { $sum: '$platformFeeAmount' },
        hostPayoutAmount: { $sum: '$hostAmount' }
      }
    }
  ]);

  return {
    totalRevenue: result.length > 0 ? result[0].totalRevenue : 0,
    platformRevenue: result.length > 0 ? result[0].platformRevenue : 0,
    hostPayoutAmount: result.length > 0 ? result[0].hostPayoutAmount : 0,
    currency: 'INR'
  };
};

const getRevenueByQuiz = async ({ quizIds, user }) => {
  const match = buildMatchFilter(quizIds, user);

  const result = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$quizId',
        revenue: { $sum: '$amount' },
        platformRevenue: { $sum: '$platformFeeAmount' },
        hostPayoutAmount: { $sum: '$hostAmount' },
        participantCount: { $sum: 1 }
      }
    }
  ]);

  return result.map(item => ({
    quizId: item._id.toString(),
    revenue: item.revenue,
    platformRevenue: item.platformRevenue || 0,
    hostPayoutAmount: item.hostPayoutAmount || 0,
    participantCount: item.participantCount
  }));
};

const getRevenueByPeriod = async ({ quizIds, user, period }) => {
  const match = buildMatchFilter(quizIds, user);

  let dateFormat;
  switch (period) {
    case 'daily': dateFormat = '%Y-%m-%d'; break;
    case 'weekly': dateFormat = '%Y-W%V'; break;
    case 'monthly': dateFormat = '%Y-%m'; break;
    default: dateFormat = '%Y-%m-%d';
  }

  const result = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        platformRevenue: { $sum: '$platformFeeAmount' },
        hostPayoutAmount: { $sum: '$hostAmount' },
        paymentCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return result.map(item => ({
    period: item._id,
    revenue: item.revenue,
    platformRevenue: item.platformRevenue || 0,
    hostPayoutAmount: item.hostPayoutAmount || 0,
    paymentCount: item.paymentCount
  }));
};

const getTransactionHistory = async ({ userId, page = 1, limit = 20, status, gatewayUsed, usedFallback }) => {
  const filter = { userId: new mongoose.Types.ObjectId(userId) };

  if (status) filter.status = status;
  if (gatewayUsed) filter.gatewayUsed = gatewayUsed;
  if (usedFallback === 'true') filter.fallbackReason = { $ne: null };
  else if (usedFallback === 'false') filter.fallbackReason = null;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [transactions, total] = await Promise.all([
    Payment.find(filter)
      .select('quizId amount currency status gatewayUsed attemptCount fallbackReason routingMetadata createdAt updatedAt')
      .populate('quizId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Payment.countDocuments(filter)
  ]);

  return {
    transactions: transactions.map(tx => ({
      id: tx._id,
      quizId: tx.quizId?._id,
      quizTitle: tx.quizId?.title || 'Unknown Quiz',
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      gatewayUsed: tx.gatewayUsed,
      attemptCount: tx.attemptCount,
      usedFallback: tx.fallbackReason !== null,
      fallbackReason: tx.fallbackReason,
      routingMetadata: tx.routingMetadata,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

const getRevenueByGateway = async ({ quizIds, user, startDate, endDate }) => {
  const match = buildMatchFilter(quizIds, user);
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  match.gatewayUsed = { $ne: null };

  const result = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$gatewayUsed',
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
        platformRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$platformFeeAmount', 0] } },
        hostPayoutAmount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$hostAmount', 0] } },
        transactionCount: { $sum: 1 },
        successfulTransactions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        fallbackTransactions: { $sum: { $cond: [{ $ne: ['$fallbackReason', null] }, 1, 0] } },
        totalLatency: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$routingMetadata.latency', 0] }, 0] } }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  return result.map(item => {
    const successRate = item.transactionCount > 0
      ? ((item.successfulTransactions / item.transactionCount) * 100).toFixed(2)
      : 0;
    
    const avgResponseTime = item.successfulTransactions > 0
      ? Math.round(item.totalLatency / item.successfulTransactions)
      : null;

    return {
      gateway: item._id,
      revenue: item.revenue,
      platformRevenue: item.platformRevenue || 0,
      hostPayoutAmount: item.hostPayoutAmount || 0,
      transactionCount: item.transactionCount,
      successfulTransactions: item.successfulTransactions,
      fallbackTransactions: item.fallbackTransactions,
      successRate: `${successRate}%`,
      avgResponseTime
    };
  });
};

const getRevenueAnalytics = async ({ quizIds, user, startDate, endDate }) => {
  const match = buildMatchFilter(quizIds, user);
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const overallResult = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
        platformRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$platformFeeAmount', 0] } },
        hostPayoutAmount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$hostAmount', 0] } },
        transactionCount: { $sum: 1 }
      }
    }
  ]);

  const gatewayMatch = { ...match, gatewayUsed: { $ne: null } };
  const gatewayResult = await Payment.aggregate([
    { $match: gatewayMatch },
    {
      $group: {
        _id: '$gatewayUsed',
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
        transactionCount: { $sum: 1 },
        successfulTransactions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        fallbackTransactions: { $sum: { $cond: [{ $ne: ['$fallbackReason', null] }, 1, 0] } },
        avgLatency: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$routingMetadata.latency', 0] }, null] } }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  const overall = overallResult.length > 0 ? overallResult[0] : { totalRevenue: 0, platformRevenue: 0, hostPayoutAmount: 0, transactionCount: 0 };

  const gatewayBreakdown = gatewayResult.map(item => {
    const successRate = item.transactionCount > 0 ? ((item.successfulTransactions / item.transactionCount) * 100).toFixed(2) : 0;
    return {
      gateway: item._id,
      revenue: item.revenue,
      transactionCount: item.transactionCount,
      successfulTransactions: item.successfulTransactions,
      fallbackTransactions: item.fallbackTransactions,
      successRate: `${successRate}%`,
      avgResponseTime: Math.round(item.avgLatency)
    };
  });

  return {
    overall: {
      totalRevenue: overall.totalRevenue,
      platformRevenue: overall.platformRevenue,
      hostPayoutAmount: overall.hostPayoutAmount,
      transactionCount: overall.transactionCount
    },
    gatewayBreakdown,
    period: { startDate: startDate || null, endDate: endDate || null },
    currency: 'INR'
  };
};

module.exports = {
  getTotalRevenue,
  getRevenueByQuiz,
  getRevenueByPeriod,
  getTransactionHistory,
  getRevenueByGateway,
  getRevenueAnalytics
};
