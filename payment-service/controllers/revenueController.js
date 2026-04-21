const revenueService = require('../services/payment/revenue.service');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

exports.getTotalRevenue = async (req, res) => {
  try {
    const { quizIds } = req.body;
    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({ error: 'Invalid request', message: 'quizIds must be an array when provided' });
    }
    const result = await revenueService.getTotalRevenue({ quizIds, user: req.user });
    res.json(result);
  } catch (error) {
    logger.error('Error calculating total revenue', { error: error.message });
    res.status(500).json({ error: 'Failed to calculate total revenue', message: error.message });
  }
};

exports.getRevenueByQuiz = async (req, res) => {
  try {
    const { quizIds } = req.body;
    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({ error: 'Invalid request', message: 'quizIds must be an array when provided' });
    }
    const quizzes = await revenueService.getRevenueByQuiz({ quizIds, user: req.user });
    res.json({ quizzes, currency: 'INR' });
  } catch (error) {
    logger.error('Error calculating revenue by quiz', { error: error.message });
    res.status(500).json({ error: 'Failed to calculate revenue by quiz', message: error.message });
  }
};

exports.getRevenueByPeriod = async (req, res) => {
  try {
    const { quizIds, period } = req.body;
    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({ error: 'Invalid request', message: 'quizIds must be an array when provided' });
    }
    if (!period || !['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period', message: 'Period must be one of: daily, weekly, monthly' });
    }
    const data = await revenueService.getRevenueByPeriod({ quizIds, user: req.user, period });
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    res.json({ data, totalRevenue, currency: 'INR' });
  } catch (error) {
    logger.error('Error calculating revenue by period', { error: error.message });
    res.status(500).json({ error: 'Failed to calculate revenue by period', message: error.message });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid user ID' });
    }
    if (req.user?.role !== 'admin' && req.user?._id.toString() !== userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only view your own transaction history' });
    }
    const result = await revenueService.getTransactionHistory({ userId, ...req.query });
    res.json(result);
  } catch (error) {
    logger.error('Error fetching transaction history', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch transaction history', message: error.message });
  }
};

exports.getRevenueByGateway = async (req, res) => {
  try {
    const { quizIds, startDate, endDate } = req.body;
    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({ error: 'Invalid request', message: 'quizIds must be an array when provided' });
    }
    const gateways = await revenueService.getRevenueByGateway({ quizIds, user: req.user, startDate, endDate });
    const totalRevenue = gateways.reduce((sum, item) => sum + item.revenue, 0);
    const totalTransactions = gateways.reduce((sum, item) => sum + item.transactionCount, 0);
    res.json({ gateways, summary: { totalRevenue, totalTransactions, gatewayCount: gateways.length }, currency: 'INR' });
  } catch (error) {
    logger.error('Error calculating revenue by gateway', { error: error.message });
    res.status(500).json({ error: 'Failed to calculate revenue by gateway', message: error.message });
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { quizIds, startDate, endDate } = req.body;
    if (quizIds !== undefined && !Array.isArray(quizIds)) {
      return res.status(400).json({ error: 'Invalid request', message: 'quizIds must be an array when provided' });
    }
    const result = await revenueService.getRevenueAnalytics({ quizIds, user: req.user, startDate, endDate });
    res.json(result);
  } catch (error) {
    logger.error('Error calculating revenue analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to calculate revenue analytics', message: error.message });
  }
};
