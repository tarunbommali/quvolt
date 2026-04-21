const adminService = require('../../services/admin/admin.service');
const logger = require('../../utils/logger');

exports.getPlans = async (req, res) => {
  try {
    const plans = await adminService.getAdminPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    logger.error('Error fetching admin plans', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const updateData = req.body;
    const plan = await adminService.updatePlanConfig(planId, updateData);
    res.json({ success: true, data: plan });
  } catch (error) {
    logger.error('Error updating plan', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update plan' });
  }
};

exports.createOffer = async (req, res) => {
  try {
    const offer = await adminService.createOffer(req.body);
    res.json({ success: true, data: offer });
  } catch (error) {
    logger.error('Error creating offer', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to create offer' });
  }
};

exports.getOffers = async (req, res) => {
  try {
    const offers = await adminService.getActiveOffers();
    res.json({ success: true, data: offers });
  } catch (error) {
    logger.error('Error fetching offers', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
};

exports.validateOffer = async (req, res) => {
  try {
    const { code, planId } = req.body;
    const offer = await adminService.validateOffer(code, planId);
    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
