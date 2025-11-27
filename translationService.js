// translationService.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

async function translateText(text, sourceLang, targetLang) {
    try {
        const response = await axios({
            baseURL: config.translatorEndpoint,
            url: '/translate',
            method: 'post',
            headers: {
                'Ocp-Apim-Subscription-Key': config.translatorKey,
                'Ocp-Apim-Subscription-Region': config.translatorRegion,
                'Content-type': 'application/json',
                'X-ClientTraceId': uuidv4().toString()
            },
            params: {
                'api-version': '3.0',
                'from': sourceLang,
                'to': targetLang
            },
            data: [{
                'text': text
            }],
            responseType: 'json'
        });

        if (response.data && response.data.length > 0) {
            return response.data[0].translations[0].text;
        }
        return null;
    } catch (error) {
        console.error('Translation error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { translateText };
