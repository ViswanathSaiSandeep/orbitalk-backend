// generate-speech-pcm.js
const speechService = require('./speechService');
const fs = require('fs');
const path = require('path');

async function generateSpeech() {
    console.log('Generating speech sample using Azure TTS...');
    try {
        // Synthesize English text to PCM
        const pcmData = await speechService.synthesizeSpeech(
            "Hello friend. This is a test of the translation system.",
            "en-US"
        );

        const filePath = path.join(__dirname, 'speech-sample.pcm');
        fs.writeFileSync(filePath, Buffer.from(pcmData));
        console.log(`Successfully generated '${filePath}' (${pcmData.byteLength} bytes).`);
        console.log('You can now run "node test-client.js" to test the translation pipeline.');
    } catch (error) {
        console.error('Error generating speech:', error);
    }
}

generateSpeech();
