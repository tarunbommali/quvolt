export const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
    { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' }
];

export const getLanguageDetails = (code) => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code) || SUPPORTED_LANGUAGES[0];
};
