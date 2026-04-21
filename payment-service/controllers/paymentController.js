const { paymentService } = require('../modules');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

/**
 * Payment Controller (OOP Refactored)
 * Routes HTTP requests to the refactored PaymentService class.
 */
class PaymentController {
  /**
   * Create a payment order for a quiz
   */
  async createOrder(req, res) {
    try {
      const { quizId } = req.body;
      if (!quizId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'quizId is required' } });
      }

      const result = await paymentService.createQuizOrder({ 
        quizId, 
        userId: req.user._id 
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const status = error.status || 500;
      logger.error('Create order controller error', { error: error.message });
      res.status(status).json({ 
        error: { code: error.code || 'SERVER_ERROR', message: error.message } 
      });
    }
  }

  /**
   * Verify a quiz payment
   */
  async verifyPayment(req, res) {
    try {
      const { orderId, paymentId, signature } = req.body;
      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing payment proof' } });
      }

      const payment = await paymentService.verifyQuizPayment({ 
        orderId, 
        paymentId, 
        signature 
      });

      res.json({ success: true, data: payment });
    } catch (error) {
      const status = error.status || 500;
      logger.error('Verify payment controller error', { error: error.message });
      res.status(status).json({ 
        error: { code: error.code || 'SERVER_ERROR', message: error.message } 
      });
    }
  }

  /**
   * Get payment status for a specific quiz
   */
  async getPaymentStatus(req, res) {
    try {
      const payment = await Payment.findOne({ 
        userId: req.user._id, 
        quizId: req.params.quizId, 
        status: 'completed' 
      }).lean();
      
      res.json({ success: true, data: { paid: !!payment, payment } });
    } catch (error) {
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Status fetch failed' } });
    }
  }

  /**
   * Get batch payment status for multiple quizzes
   */
  async getBatchPaymentStatus(req, res) {
    try {
      const { quizIds } = req.body;
      const payments = await Payment.find({ 
        userId: req.user._id, 
        quizId: { $in: quizIds }, 
        status: 'completed' 
      }).lean();

      const map = quizIds.reduce((acc, id) => ({ ...acc, [id]: { paid: false } }), {});
      payments.forEach(p => {
        map[p.quizId.toString()] = { paid: true, paymentId: p._id };
      });

      res.json({ success: true, data: map });
    } catch (error) {
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Batch status failed' } });
    }
  }
}

// Export as a singleton instance
module.exports = new PaymentController();
