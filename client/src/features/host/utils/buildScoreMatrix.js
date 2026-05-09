/**
 * Transforms flat leaderboard data into a matrix-style structure for tabular display.
 * 
 * @param {Array} data - Leaderboard data from API: [{ userId, email, totalScore, unitBreakdown: [{ unitId, score }] }]
 * @param {Array} units - List of units (subjects) in the folder: [{ _id, title }]
 */
export const buildScoreMatrix = (data, units) => {
    if (!data || !units) return [];

    return data.map(user => {
        const unitScores = {};
        
        // Map existing scores
        user.unitBreakdown?.forEach(item => {
            unitScores[item.unitId] = item.score;
        });

        // Ensure every unit has a value (default to 0)
        units.forEach(unit => {
            if (unitScores[unit._id] === undefined) {
                unitScores[unit._id] = 0;
            }
        });

        return {
            userId: user.userId,
            name: user.name,
            email: user.email,
            profilePhoto: user.profilePhoto,
            units: unitScores,
            total: user.totalScore
        };
    });
};
