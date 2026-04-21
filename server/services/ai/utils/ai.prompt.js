/**
 * AI Prompt Engineering Utilities
 */

const sanitizeTopic = (topic) => String(topic || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildPrompt = ({ topic, difficulty, count }) => `Generate ${count} multiple-choice questions on the topic '${topic}' with ${difficulty} difficulty.

Return ONLY valid JSON in the following format:
[
  {
    "text": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact correct option text",
    "explanation": "Short explanation"
  }
]

Rules:
- Each question must have exactly 4 options
- correctAnswer must match one of the options exactly
- Avoid duplicates
- Keep questions clear and concise
- Difficulty must reflect ${difficulty} level
- Do NOT include any extra text outside JSON`;

module.exports = {
    sanitizeTopic,
    buildPrompt,
};
