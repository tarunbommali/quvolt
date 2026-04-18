const zlib = require('zlib');
const { promisify } = require('util');
const logger = require('./logger');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const COMPRESSION_THRESHOLD = 1024; // 1KB

/**
 * Compress a message if it exceeds the threshold size.
 * Returns an object with the compressed data and metadata.
 */
const compressMessage = async (payload) => {
    try {
        const jsonString = JSON.stringify(payload);
        const size = Buffer.byteLength(jsonString, 'utf8');

        // Only compress if message is larger than threshold
        if (size < COMPRESSION_THRESHOLD) {
            return {
                compressed: false,
                data: payload,
                originalSize: size,
                compressedSize: size,
            };
        }

        const compressed = await gzip(jsonString);
        const compressedSize = compressed.length;

        logger.debug('Message compressed', {
            originalSize: size,
            compressedSize,
            ratio: ((1 - compressedSize / size) * 100).toFixed(1) + '%',
        });

        return {
            compressed: true,
            data: compressed.toString('base64'),
            originalSize: size,
            compressedSize,
        };
    } catch (error) {
        logger.error('Message compression failed', { error: error.message });
        // Return uncompressed on error
        return {
            compressed: false,
            data: payload,
            error: error.message,
        };
    }
};

/**
 * Decompress a message if it was compressed.
 */
const decompressMessage = async (compressedData) => {
    try {
        const buffer = Buffer.from(compressedData, 'base64');
        const decompressed = await gunzip(buffer);
        return JSON.parse(decompressed.toString('utf8'));
    } catch (error) {
        logger.error('Message decompression failed', { error: error.message });
        throw error;
    }
};

/**
 * Prepare a message for transmission with optional compression.
 * This is the main function to use when broadcasting messages.
 */
const prepareMessage = async (eventName, payload) => {
    const result = await compressMessage(payload);

    if (result.compressed) {
        return {
            event: eventName,
            compressed: true,
            data: result.data,
            metadata: {
                originalSize: result.originalSize,
                compressedSize: result.compressedSize,
            },
        };
    }

    return {
        event: eventName,
        compressed: false,
        data: payload,
    };
};

module.exports = {
    compressMessage,
    decompressMessage,
    prepareMessage,
    COMPRESSION_THRESHOLD,
};
