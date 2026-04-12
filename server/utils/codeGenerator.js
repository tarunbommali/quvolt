const generateCode = () => {
    // Using a segment of the current timestamp in base36 + a random factor
    // Resulting in a 6-character unique, time-influenced code
    const timestampSegment = Date.now().toString(36).slice(-4).toUpperCase();
    const randomSegment = Math.random().toString(36).substring(2, 4).toUpperCase();
    return (timestampSegment + randomSegment).slice(0, 6);
};

module.exports = { generateCode };
