const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

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

/**
 * Calculate total revenue for given quiz IDs
 * POST /payment/revenue/total
 */
exports.getTotalRevenue = async (req, res) => {
  try {
    const { quizIds } = req.body;

    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'quizIds must be an array when provided'
      });
    }

    const match = buildMatchFilter(quizIds, req.user);

    // Calculate total revenue from completed payments
    const result = await Payment.aggregate([
      {
        $match: match
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          platformRevenue: { $sum: '$platformFeeAmount' },
          hostPayoutAmount: { $sum: '$hostAmount' }
        }
      }
    ]);

    const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;
    const platformRevenue = result.length > 0 ? result[0].platformRevenue : 0;
    const hostPayoutAmount = result.length > 0 ? result[0].hostPayoutAmount : 0;

    res.json({
      totalRevenue,
      platformRevenue,
      hostPayoutAmount,
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Error calculating total revenue', { error: error.message });
    res.status(500).json({
      error: 'Failed to calculate total revenue',
      message: error.message
    });
  }
};

/**
 * Get revenue breakdown by quiz
 * POST /payment/revenue/by-quiz
 */
exports.getRevenueByQuiz = async (req, res) => {
  try {
    const { quizIds } = req.body;

    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'quizIds must be an array when provided'
      });
    }

    const match = buildMatchFilter(quizIds, req.user);

    // Calculate revenue per quiz
    const result = await Payment.aggregate([
      {
        $match: match
      },
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

    // Format response
    const quizzes = result.map(item => ({
      quizId: item._id.toString(),
      revenue: item.revenue,
      platformRevenue: item.platformRevenue || 0,
      hostPayoutAmount: item.hostPayoutAmount || 0,
      participantCount: item.participantCount
    }));

    res.json({
      quizzes,
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Error calculating revenue by quiz', { error: error.message });
    res.status(500).json({
      error: 'Failed to calculate revenue by quiz',
      message: error.message
    });
  }
};

/**
 * Get revenue by time period
 * POST /payment/revenue/by-period
 */
exports.getRevenueByPeriod = async (req, res) => {
  try {
    const { quizIds, period } = req.body;

    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'quizIds must be an array when provided'
      });
    }

    if (!period || !['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        error: 'Invalid period',
        message: 'Period must be one of: daily, weekly, monthly'
      });
    }

    const match = buildMatchFilter(quizIds, req.user);

    // Determine date grouping format based on period
    let dateFormat;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-W%V'; // ISO week
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        break;
    }

    // Calculate revenue by period
    const result = await Payment.aggregate([
      {
        $match: match
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$amount' },
          platformRevenue: { $sum: '$platformFeeAmount' },
          hostPayoutAmount: { $sum: '$hostAmount' },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Format response
    const data = result.map(item => ({
      period: item._id,
      revenue: item.revenue,
      platformRevenue: item.platformRevenue || 0,
      hostPayoutAmount: item.hostPayoutAmount || 0,
      paymentCount: item.paymentCount
    }));

    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

    res.json({
      data,
      totalRevenue,
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Error calculating revenue by period', { error: error.message });
    res.status(500).json({
      error: 'Failed to calculate revenue by period',
      message: error.message
    });
  }
};

/**
 * Get transaction history with gateway information
 * GET /payment/transactions/:userId
 * Requirements: 6.3
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status, gatewayUsed, usedFallback } = req.query;

    // Validate userId BEFORE authorization checks
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
    }

    // Authorization: users can only view their own transactions, admins can view any
    if (req.user?.role !== 'admin' && req.user?._id.toString() !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own transaction history'
      });
    }

    // Build filter
    const filter = { userId: new mongoose.Types.ObjectId(userId) };

    if (status) {
      filter.status = status;
    }

    if (gatewayUsed) {
      filter.gatewayUsed = gatewayUsed;
    }

    // Filter for fallback transactions
    if (usedFallback === 'true') {
      filter.fallbackReason = { $ne: null };
    } else if (usedFallback === 'false') {
      filter.fallbackReason = null;
    }

    // Pagination with proper defaults for invalid values
    const rawPage = parseInt(page);
    const rawLimit = parseInt(limit);
    const pageNum = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const limitNum = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const skip = (pageNum - 1) * limitNum;

    // Get transactions with pagination
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

    // Format response
    const formattedTransactions = transactions.map(tx => ({
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
    }));

    res.json({
      transactions: formattedTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching transaction history', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch transaction history',
      message: error.message
    });
  }
};

/**
 * Get revenue breakdown by gateway
 * POST /payment/revenue/by-gateway
 * Requirements: 6.3, 6.5, 6.6
 */
exports.getRevenueByGateway = async (req, res) => {
  try {
    const { quizIds, startDate, endDate } = req.body;

    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'quizIds must be an array when provided'
      });
    }

    const match = buildMatchFilter(quizIds, req.user);
    
    // Add date range filter if provided
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) {
        match.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        match.createdAt.$lte = new Date(endDate);
      }
    }

    // Only include payments with gateway information
    match.gatewayUsed = { $ne: null };

    // Calculate revenue per gateway - include ALL transactions (not just completed)
    const result = await Payment.aggregate([
      {
        $match: match
      },
      {
        $group: {
          _id: '$gatewayUsed',
          revenue: { 
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          platformRevenue: { 
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$platformFeeAmount', 0]
            }
          },
          hostPayoutAmount: { 
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$hostAmount', 0]
            }
          },
          transactionCount: { $sum: 1 }, // Count ALL transactions
          successfulTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          fallbackTransactions: {
            $sum: {
              $cond: [{ $ne: ['$fallbackReason', null] }, 1, 0]
            }
          },
          totalLatency: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $ifNull: ['$routingMetadata.latency', 0] },
                0
              ]
            }
          }
        }
      },
      {
        $sort: { revenue: -1 }
      }
    ]);

    // Format response with performance metrics
    const gateways = result.map(item => {
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

    const totalRevenue = gateways.reduce((sum, item) => sum + item.revenue, 0);
    const totalTransactions = gateways.reduce((sum, item) => sum + item.transactionCount, 0);

    res.json({
      gateways,
      summary: {
        totalRevenue,
        totalTransactions,
        gatewayCount: gateways.length
      },
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Error calculating revenue by gateway', { error: error.message });
    res.status(500).json({
      error: 'Failed to calculate revenue by gateway',
      message: error.message
    });
  }
};

/**
 * Get comprehensive revenue analytics with gateway breakdown
 * POST /payment/revenue/analytics
 * Requirements: 6.3, 6.5, 6.6
 */
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { quizIds, startDate, endDate } = req.body;

    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'quizIds must be an array when provided'
      });
    }

    const match = buildMatchFilter(quizIds, req.user);
    
    // Add date range filter if provided
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) {
        match.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        match.createdAt.$lte = new Date(endDate);
      }
    }

    // Get overall revenue summary - count ALL transactions
    const overallResult = await Payment.aggregate([
      {
        $match: match
      },
      {
        $group: {
          _id: null,
          totalRevenue: { 
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          platformRevenue: { 
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$platformFeeAmount', 0]
            }
          },
          hostPayoutAmount: { 
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$hostAmount', 0]
            }
          },
          transactionCount: { $sum: 1 } // Count ALL transactions
        }
      }
    ]);

    // Get gateway breakdown - include ALL transactions
    const gatewayMatch = { ...match, gatewayUsed: { $ne: null } };
    const gatewayResult = await Payment.aggregate([
      {
        $match: gatewayMatch
      },
      {
        $group: {
          _id: '$gatewayUsed',
          revenue: { 
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          transactionCount: { $sum: 1 }, // Count ALL transactions
          successfulTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          fallbackTransactions: {
            $sum: {
              $cond: [{ $ne: ['$fallbackReason', null] }, 1, 0]
            }
          },
          avgLatency: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $ifNull: ['$routingMetadata.latency', 0] },
                null
              ]
            }
          }
        }
      },
      {
        $sort: { revenue: -1 }
      }
    ]);

    const overall = overallResult.length > 0 ? overallResult[0] : {
      totalRevenue: 0,
      platformRevenue: 0,
      hostPayoutAmount: 0,
      transactionCount: 0
    };

    const gatewayBreakdown = gatewayResult.map(item => {
      const successRate = item.transactionCount > 0
        ? ((item.successfulTransactions / item.transactionCount) * 100).toFixed(2)
        : 0;

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

    res.json({
      overall: {
        totalRevenue: overall.totalRevenue,
        platformRevenue: overall.platformRevenue,
        hostPayoutAmount: overall.hostPayoutAmount,
        transactionCount: overall.transactionCount
      },
      gatewayBreakdown,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Error calculating revenue analytics', { error: error.message });
    res.status(500).json({
      error: 'Failed to calculate revenue analytics',
      message: error.message
    });
  }
};
