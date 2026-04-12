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
