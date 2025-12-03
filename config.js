// config.js
require('dotenv').config();

module.exports = {
    speechKey: process.env.SPEECH_KEY,
    speechRegion: process.env.SPEECH_REGION || 'centralindia',
    translatorKey: process.env.TRANSLATOR_KEY,
    translatorRegion: process.env.TRANSLATOR_REGION || 'centralindia',
    translatorEndpoint: 'https://api.cognitive.microsofttranslator.com'
};
