const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  transactionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },

  type: {
    type: String,
    enum: ['SUBSCRIPTION', 'REFUND', 'ADJUSTMENT'],
    required: true,
    index: true
  },

  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
    index: true
  },

  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  netAmount: { type: Number }, // After all fees

  sessionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'QuizSession',
    index: true 
  },
  quizTitle: { type: String },
  participantCount: { type: Number },

  payerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },
  hostId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },

  paymentMethod: { type: String },
  referenceId: { 
    type: String,
    index: true 
  }, // Razorpay/Stripe Payment ID

  feeBreakdown: {
    gatewayFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 }
  },

  note: { type: String },
  failureReason: { type: String },

  processedAt: { type: Date },
}, { timestamps: true });

// Indexes for common queries
TransactionSchema.index({ hostId: 1, createdAt: -1 });
TransactionSchema.index({ sessionId: 1 });
TransactionSchema.index({ status: 1, type: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
