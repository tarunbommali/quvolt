const payoutService = require('../services/payout/payout.service');
const logger = require('../utils/logger');

const upsertHostAccount = async (req, res) => {
  try {
    const hostUserId = req.user._id;
    const accountData = req.body;
    
    const hostAccount = await payoutService.upsertHostAccountData(hostUserId, accountData);

    return res.status(200).json({
      success: true,
      data: hostAccount,
    });
  } catch (error) {
    const status = error.status || 500;
    const code = error.code || 'SERVER_ERROR';
    logger.error('Upsert host account error', { error: error.message, stack: error.stack });
    return res.status(status).json({
      error: { code, message: error.message || 'Unable to save host account' }
    });
  }
};

const getMyHostAccount = async (req, res) => {
  try {
    const hostAccount = await payoutService.getHostAccountData(req.user._id);
    return res.status(200).json({
      success: true,
      data: hostAccount || null,
    });
  } catch (error) {
    logger.error('Get host account error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Unable to fetch host account' }
    });
  }
};

const getHostPayoutSummary = async (req, res) => {
  try {
    const summary = await payoutService.getHostPayoutSummaryData(req.user._id);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Get host payout summary error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Unable to fetch payout summary' }
    });
  }
};

module.exports = {
  upsertHostAccount,
  getMyHostAccount,
  getHostPayoutSummary,
};
