/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : value);

const normalizeRoomCode = (value) => {
  if (!value) return null;
  const cleaned = String(value).trim().toUpperCase();
  return cleaned || null;
};

const toBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
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

async function sanitizeUsers(db) {
  const users = db.collection('users');
  const cursor = users.find({}, { projection: { name: 1, email: 1, profilePhoto: 1, role: 1 } });
  const ops = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const update = {};

    const cleanName = normalizeString(doc.name);
    if (!cleanName) {
      console.warn(`User ${doc._id} has empty name`);
    } else if (cleanName !== doc.name) {
      update.name = cleanName;
    }

    const cleanEmail = normalizeString(doc.email);
    const normalizedEmail = cleanEmail ? cleanEmail.toLowerCase() : cleanEmail;
    if (!normalizedEmail) {
      console.warn(`User ${doc._id} has empty email`);
    } else if (normalizedEmail !== doc.email) {
      update.email = normalizedEmail;
    }

    const cleanPhoto = normalizeString(doc.profilePhoto || '');
    if ((doc.profilePhoto || '') !== cleanPhoto) {
      update.profilePhoto = cleanPhoto;
    }

    const allowedRoles = ['admin', 'host', 'participant'];
    if (!allowedRoles.includes(doc.role)) {
      update.role = 'participant';
    }

    if (Object.keys(update).length) {
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: update } } });
    }
  }

  await bulkFlush(users, ops, 'users sanitize');

  const dupEmails = await users.aggregate([
    { $group: { _id: '$email', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } }
  ]).toArray();

  if (dupEmails.length) {
    console.warn(`Duplicate email groups found: ${dupEmails.length}`);
    dupEmails.forEach((g) => console.warn(`email=${g._id}, users=${g.ids.join(',')}`));
  }
}

function sanitizeQuestion(question) {
  if (!question || typeof question !== 'object') return null;

  const text = normalizeString(question.text);
  const options = Array.isArray(question.options)
    ? question.options.map((x) => normalizeString(String(x || ''))).filter(Boolean)
    : [];

  if (!text || options.length < 2) return null;

  let correctOption = Number.isInteger(question.correctOption) ? question.correctOption : 0;
  if (correctOption < 0 || correctOption >= options.length) correctOption = 0;

  const timeLimitNum = Number(question.timeLimit);
  const timeLimit = Number.isFinite(timeLimitNum) ? Math.min(300, Math.max(5, timeLimitNum)) : 30;

  return {
    ...question,
    text,
    options,
    correctOption,
    timeLimit,
    mediaUrl: normalizeString(question.mediaUrl) || null,
    questionType: ['multiple-choice', 'true-false'].includes(question.questionType)
      ? question.questionType
      : 'multiple-choice',
    shuffleOptions: toBool(question.shuffleOptions, false),
  };
}

async function sanitizeQuizzes(db) {
  const quizzes = db.collection('quizzes');
  const cursor = quizzes.find({}, {
    projection: {
      title: 1,
      roomCode: 1,
      type: 1,
      parentId: 1,
      status: 1,
      isPaid: 1,
      price: 1,
      shuffleQuestions: 1,
      questions: 1,
    },
  });

  const ops = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const update = {};

    const title = normalizeString(doc.title);
    if (title && title !== doc.title) update.title = title;

    const roomCode = normalizeRoomCode(doc.roomCode);
    if (roomCode !== doc.roomCode) update.roomCode = roomCode;

    if (!['quiz', 'subject'].includes(doc.type)) update.type = 'quiz';
    if (!['draft', 'scheduled', 'waiting', 'live', 'completed', 'aborted'].includes(doc.status)) update.status = 'draft';

    const isPaid = toBool(doc.isPaid, false);
    if (isPaid !== doc.isPaid) update.isPaid = isPaid;

    const priceNum = Number(doc.price);
    let price = Number.isFinite(priceNum) ? priceNum : 0;
    if (!isPaid || price < 0) price = 0;
    if (price !== doc.price) update.price = price;

    const shuffleQuestions = toBool(doc.shuffleQuestions, false);
    if (shuffleQuestions !== doc.shuffleQuestions) update.shuffleQuestions = shuffleQuestions;

    const rawQuestions = Array.isArray(doc.questions) ? doc.questions : [];
    const cleanQuestions = rawQuestions.map(sanitizeQuestion).filter(Boolean);
    if (cleanQuestions.length !== rawQuestions.length || JSON.stringify(cleanQuestions) !== JSON.stringify(rawQuestions)) {
      update.questions = cleanQuestions;
    }

    if (Object.keys(update).length) {
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: update } } });
    }
  }

  await bulkFlush(quizzes, ops, 'quizzes sanitize');
}

async function sanitizeSubmissions(db) {
  const submissions = db.collection('submissions');
  const cursor = submissions.find({}, {
    projection: {
      userId: 1,
      quizId: 1,
      roomCode: 1,
      questionId: 1,
      selectedOption: 1,
      timeTaken: 1,
      score: 1,
      createdAt: 1,
    },
  });

  const updateOps = [];
  const deleteOps = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();

    const requiredObjectIds = [doc.userId, doc.quizId, doc.questionId];
    const hasInvalidId = requiredObjectIds.some((id) => !mongoose.Types.ObjectId.isValid(id));

    if (hasInvalidId) {
      deleteOps.push({ deleteOne: { filter: { _id: doc._id } } });
      continue;
    }

    const update = {};

    const roomCode = normalizeRoomCode(doc.roomCode);
    if (!roomCode) {
      deleteOps.push({ deleteOne: { filter: { _id: doc._id } } });
      continue;
    }
    if (roomCode !== doc.roomCode) update.roomCode = roomCode;

    const selectedOption = normalizeString(String(doc.selectedOption || ''));
    if (!selectedOption) {
      deleteOps.push({ deleteOne: { filter: { _id: doc._id } } });
      continue;
    }
    if (selectedOption !== doc.selectedOption) update.selectedOption = selectedOption;

    const timeTakenNum = Number(doc.timeTaken);
    const timeTaken = Number.isFinite(timeTakenNum) ? Math.max(0, timeTakenNum) : 0;
    if (timeTaken !== doc.timeTaken) update.timeTaken = timeTaken;

    const scoreNum = Number(doc.score);
    const score = Number.isFinite(scoreNum) ? Math.max(0, scoreNum) : 0;
    if (score !== doc.score) update.score = score;

    if (Object.keys(update).length) {
      updateOps.push({ updateOne: { filter: { _id: doc._id }, update: { $set: update } } });
    }
  }

  await bulkFlush(submissions, updateOps, 'submissions sanitize updates');
  await bulkFlush(submissions, deleteOps, 'submissions sanitize deletes');

  const duplicateGroups = await submissions.aggregate([
    {
      $group: {
        _id: {
          userId: '$userId',
          quizId: '$quizId',
          roomCode: '$roomCode',
          questionId: '$questionId',
        },
        ids: { $push: '$_id' },
        latest: { $max: '$createdAt' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  if (!duplicateGroups.length) return;

  console.log(`Found duplicate submission groups: ${duplicateGroups.length}`);

  const dedupeOps = [];
  for (const group of duplicateGroups) {
    const docs = await submissions
      .find({ _id: { $in: group.ids } }, { projection: { _id: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    const toDelete = docs.slice(1);
    toDelete.forEach((d) => dedupeOps.push({ deleteOne: { filter: { _id: d._id } } }));
  }

  await bulkFlush(submissions, dedupeOps, 'submissions dedupe deletes');
}

async function syncIndexesAndValidators(db) {
  const quizzes = db.collection('quizzes');
  const submissions = db.collection('submissions');
  const users = db.collection('users');

  const indexOps = [
    users.createIndex({ email: 1 }, { unique: true, name: 'email_1' }),
    users.createIndex({ role: 1 }, { name: 'role_1' }),
    quizzes.createIndex({ roomCode: 1 }, { unique: true, sparse: true, name: 'roomCode_1' }),
    quizzes.createIndex({ hostId: 1, createdAt: -1 }, { name: 'hostId_1_createdAt_-1' }),
    quizzes.createIndex({ parentId: 1, createdAt: -1 }, { name: 'parentId_1_createdAt_-1' }),
    quizzes.createIndex({ status: 1, updatedAt: -1 }, { name: 'status_1_updatedAt_-1' }),
    submissions.createIndex({ quizId: 1, userId: 1 }, { name: 'quizId_1_userId_1' }),
    submissions.createIndex({ roomCode: 1, createdAt: -1 }, { name: 'roomCode_1_createdAt_-1' }),
    submissions.createIndex({ userId: 1, createdAt: -1 }, { name: 'userId_1_createdAt_-1' }),
    submissions.createIndex({ quizId: 1, roomCode: 1 }, { name: 'quizId_1_roomCode_1' }),
  ];

  if (isDryRun) {
    console.log('[dry-run] index sync planned for users/quizzes/submissions');
  } else {
    await Promise.all(indexOps);
    console.log('Indexes synced');
  }

  const validators = [
    {
      collMod: 'users',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            name: { bsonType: 'string', minLength: 2, maxLength: 80 },
            email: {
              bsonType: 'string',
              pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
              description: 'must be valid email format',
            },
            role: { enum: ['admin', 'host', 'participant'] },
          },
        },
      },
      validationLevel: 'moderate',
      validationAction: 'warn',
    },
    {
      collMod: 'submissions',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'quizId', 'roomCode', 'questionId', 'selectedOption', 'timeTaken'],
          properties: {
            userId: { bsonType: 'objectId' },
            quizId: { bsonType: 'objectId' },
            questionId: { bsonType: 'objectId' },
            roomCode: { bsonType: 'string', minLength: 1 },
            selectedOption: { bsonType: 'string', minLength: 1 },
            timeTaken: { bsonType: ['double', 'int', 'long', 'decimal'], minimum: 0 },
            score: { bsonType: ['double', 'int', 'long', 'decimal'], minimum: 0 },
          },
        },
      },
      validationLevel: 'moderate',
      validationAction: 'warn',
    },
  ];

  if (isDryRun) {
    console.log('[dry-run] validators (warn mode) planned for users and submissions collections');
    return;
  }

  for (const command of validators) {
    try {
      await db.command(command);
      console.log(`Applied validator: ${command.collMod}`);
    } catch (error) {
      console.warn(`Could not apply validator for ${command.collMod}: ${error.message}`);
    }
  }
}

async function run() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is required in root .env');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log(`Connected to ${db.databaseName}`);
  console.log(isDryRun ? 'Mode: dry-run (no writes)' : 'Mode: apply');

  await sanitizeUsers(db);
  await sanitizeQuizzes(db);
  await sanitizeSubmissions(db);
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
