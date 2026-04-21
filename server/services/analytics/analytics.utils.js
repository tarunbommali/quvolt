const mongoose = require('mongoose');

/**
 * Safe conversion to MongoDB ObjectId
 */
const toObjectId = (id) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return new mongoose.Types.ObjectId(id);
};

/**
 * Calculate Pearson Correlation Coefficient for a set of {x, y} pairs
 */
const getPearsonCorrelation = (pairs) => {
    if (!Array.isArray(pairs) || pairs.length < 2) return 0;

    const n = pairs.length;
    const sumX = pairs.reduce((acc, p) => acc + p.x, 0);
    const sumY = pairs.reduce((acc, p) => acc + p.y, 0);
    const sumXY = pairs.reduce((acc, p) => acc + (p.x * p.y), 0);
    const sumX2 = pairs.reduce((acc, p) => acc + (p.x * p.x), 0);
    const sumY2 = pairs.reduce((acc, p) => acc + (p.y * p.y), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX ** 2)) * ((n * sumY2) - (sumY ** 2)));

    if (!Number.isFinite(denominator) || denominator === 0) return 0;
    return Number((numerator / denominator).toFixed(4));
};

module.exports = {
    toObjectId,
    getPearsonCorrelation,
};
