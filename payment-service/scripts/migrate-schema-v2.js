/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : value);

const toAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Number(num.toFixed(2)));
};

const bulkFlush = async (collection, operations, label) => {
  if (operations.length === 0) return;
  if (isDryRun) {
    console.log(`[dry-run] ${label}: ${operations.length} pending updates`);
    return;
  }

  const result = await collection.bulkWrite(operations, { ordered: false });
  console.log(`${label}: matched=${result.matchedCount || 0}, modified=${result.modifiedCount || 0}`);
};

async function sanitizePayments(db) {
  const payments = db.collection('payments');
  const cursor = payments.find({}, {
    projection: {
      userId: 1,
      quizId: 1,
      amount: 1,
      currency: 1,
      razorpayOrderId: 1,
      razorpayPaymentId: 1,
      razorpaySignature: 1,
      status: 1,
    },
  });

  const updateOps = [];
  const deleteOps = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();

    const hasInvalidId = [doc.userId, doc.quizId].some((id) => !mongoose.Types.ObjectId.isValid(id));
    if (hasInvalidId) {
      deleteOps.push({ deleteOne: { filter: { _id: doc._id } } });
      continue;
    }

    const update = {};

    const amount = toAmount(doc.amount);
    if (amount !== doc.amount) update.amount = amount;

    const currency = normalizeString(String(doc.currency || 'INR')).toUpperCase() || 'INR';
    if (currency !== 'INR') {
      update.currency = 'INR';
    } else if (currency !== doc.currency) {
      update.currency = currency;
    }

    const orderId = normalizeString(doc.razorpayOrderId);
    if (!orderId) {
      deleteOps.push({ deleteOne: { filter: { _id: doc._id } } });
      continue;
    }
    if (orderId !== doc.razorpayOrderId) update.razorpayOrderId = orderId;

    const paymentId = normalizeString(doc.razorpayPaymentId || '') || null;
    if ((doc.razorpayPaymentId || null) !== paymentId) update.razorpayPaymentId = paymentId;

    const signature = normalizeString(doc.razorpaySignature || '') || null;
    if ((doc.razorpaySignature || null) !== signature) update.razorpaySignature = signature;

    const allowedStatuses = ['created', 'completed', 'failed'];
    if (!allowedStatuses.includes(doc.status)) update.status = 'failed';

    if (Object.keys(update).length) {
      updateOps.push({ updateOne: { filter: { _id: doc._id }, update: { $set: update } } });
    }
  }

  await bulkFlush(payments, updateOps, 'payments sanitize updates');
  await bulkFlush(payments, deleteOps, 'payments sanitize deletes');

  const duplicates = await payments.aggregate([
    { $group: { _id: '$razorpayOrderId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
  ]).toArray();

  if (duplicates.length) {
    console.warn(`Duplicate razorpayOrderId groups found: ${duplicates.length}`);
    duplicates.forEach((g) => console.warn(`order=${g._id}, ids=${g.ids.join(',')}`));
  }
}

async function syncIndexesAndValidators(db) {
  const payments = db.collection('payments');

  if (isDryRun) {
    console.log('[dry-run] index sync planned for payments');
  } else {
    await Promise.all([
      payments.createIndex({ userId: 1, quizId: 1 }, { name: 'userId_1_quizId_1' }),
      payments.createIndex({ razorpayOrderId: 1 }, { unique: true, name: 'razorpayOrderId_1' }),
      payments.createIndex({ razorpayPaymentId: 1 }, { name: 'razorpayPaymentId_1' }),
      payments.createIndex({ status: 1 }, { name: 'status_1' }),
      payments.createIndex({ userId: 1, status: 1 }, { name: 'userId_1_status_1' }),
      payments.createIndex({ quizId: 1, status: 1 }, { name: 'quizId_1_status_1' }),
    ]);
    console.log('Indexes synced for payments');
  }

  const validatorCommand = {
    collMod: 'payments',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'quizId', 'amount', 'currency', 'razorpayOrderId', 'status'],
        properties: {
          userId: { bsonType: 'objectId' },
          quizId: { bsonType: 'objectId' },
          amount: { bsonType: ['double', 'int', 'long', 'decimal'], minimum: 0 },
          currency: { enum: ['INR'] },
          razorpayOrderId: { bsonType: 'string', minLength: 1 },
          status: { enum: ['created', 'completed', 'failed'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'warn',
  };

  if (isDryRun) {
    console.log('[dry-run] validator (warn mode) planned for payments');
    return;
  }

  try {
    await db.command(validatorCommand);
    console.log('Applied validator: payments');
  } catch (error) {
    console.warn(`Could not apply validator for payments: ${error.message}`);
  }
}

async function run() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('DATABASE_URL is required in root .env');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log(`Connected to ${db.databaseName}`);
  console.log(isDryRun ? 'Mode: dry-run (no writes)' : 'Mode: apply');

  await sanitizePayments(db);
  await syncIndexesAndValidators(db);

  await mongoose.disconnect();
  console.log('Migration complete');
}

run().catch(async (error) => {
  console.error('Migration failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
