// config.js
// Configuration loaded from environment variables
// Set these in Render.com dashboard or .env file for local testing

require('dotenv').config();

module.exports = {
    // Azure Speech Services
    speechKey: process.env.SPEECH_KEY || '',
    speechRegion: process.env.SPEECH_REGION || 'centralindia',

    // Azure Translator
    translatorKey: process.env.TRANSLATOR_KEY || '',
    translatorRegion: process.env.TRANSLATOR_REGION || 'centralindia',
    translatorEndpoint: 'https://api.cognitive.microsofttranslator.com'
};
