// speechService.js
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const config = require("./config");

function createSpeechConfig() {
    return sdk.SpeechConfig.fromSubscription(config.speechKey, config.speechRegion);
}

function recognizeSpeech(sourceLang, onRecognized, onRecognizing) {
    const speechConfig = createSpeechConfig();
    speechConfig.speechRecognitionLanguage = sourceLang;

    // Create a push stream for audio input
    const pushStream = sdk.AudioInputStream.createPushStream();

    // 🔵 PART 2: Configure for 16kHz Mono PCM
    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream, format);

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (s, e) => {
        console.log(`(SpeechService) RECOGNIZING event - Reason: ${e.result.reason}`);
        if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
            console.log(`(SpeechService) Recognizing: "${e.result.text}"`);
            if (onRecognizing) onRecognizing(e.result.text);
        } else if (e.result.reason === sdk.ResultReason.NoMatch) {
            console.log(`(SpeechService) No speech recognized (NoMatch)`);
        }
    };

    recognizer.recognized = (s, e) => {
        console.log(`(SpeechService) RECOGNIZED event - Reason: ${e.result.reason}`);
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
            console.log(`(SpeechService) Recognized: "${e.result.text}"`);
            if (onRecognized) onRecognized(e.result.text);
        } else if (e.result.reason === sdk.ResultReason.NoMatch) {
            console.log(`(SpeechService) No speech could be recognized (NoMatch in final result)`);
        }
    };

    recognizer.sessionStarted = (s, e) => {
        console.log("(SpeechService) Session started.");
    };

    recognizer.canceled = (s, e) => {
        console.log(`(SpeechService) CANCELED: Reason=${e.reason}`);
        if (e.reason === sdk.CancellationReason.Error) {
            console.log(`(SpeechService) CANCELED: ErrorCode=${e.errorCode}`);
            console.log(`(SpeechService) CANCELED: ErrorDetails=${e.errorDetails}`);
        }
        recognizer.stopContinuousRecognitionAsync();
    };

    recognizer.sessionStopped = (s, e) => {
        console.log("\n    Session stopped event.");
        recognizer.stopContinuousRecognitionAsync();
    };

    recognizer.speechStartDetected = (s, e) => {
        console.log("(SpeechService) *** SPEECH START DETECTED ***");
    };

    recognizer.speechEndDetected = (s, e) => {
        console.log("(SpeechService) *** SPEECH END DETECTED ***");
    };

    // Start continuous recognition with error handling
    recognizer.startContinuousRecognitionAsync(
        () => {
            console.log(`(SpeechService) Recognition started successfully for language: ${sourceLang}`);
        },
        (err) => {
            console.error(`(SpeechService) ERROR starting recognition: ${err}`);
        }
    );

    return {
        pushStream,
        close: () => {
            recognizer.stopContinuousRecognitionAsync();
            recognizer.close();
        }
    };
}

function synthesizeSpeech(text, targetLang, voiceName) {
    return new Promise((resolve, reject) => {
        const speechConfig = createSpeechConfig();
        speechConfig.speechSynthesisLanguage = targetLang;
        if (voiceName) {
            speechConfig.speechSynthesisVoiceName = voiceName;
        }

        // Set output format to raw 16kHz 16-bit mono PCM
        speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm;

        // Create a synthesizer with null audio config to prevent default speaker output
        // We only want the audio data
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

        synthesizer.speakTextAsync(
            text,
            (result) => {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    resolve(result.audioData);
                } else {
                    reject(new Error("Speech synthesis failed: " + result.errorDetails));
                }
                synthesizer.close();
            },
            (error) => {
                reject(error);
                synthesizer.close();
            }
        );
    });
}

// Synthesize speech with WAV format (for Zego MediaPlayer injection)
function synthesizeSpeechWAV(text, targetLang, voiceName) {
    return new Promise(async (resolve, reject) => {
        try {
            const axios = require('axios');
            const speechRegion = config.speechRegion;
            const speechKey = config.speechKey;
            const url = `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

            // Use the voice name if provided, otherwise construct default
            const voice = voiceName || `${targetLang}-JennyNeural`;

            // CRITICAL: Extract language from voice name to match Azure requirements
            // Example: "en-US-JennyNeural" → "en-US"
            // Example: "te-IN-ShrutiNeural" → "te-IN"
            const voiceLangMatch = voice.match(/^([a-z]{2}-[A-Z]{2})/);
            const voiceLang = voiceLangMatch ? voiceLangMatch[1] : targetLang;

            console.log(`(SpeechService) Voice: ${voice}, Extracted Language: ${voiceLang}`);

            // Build SSML with language that matches the voice
            const ssml = `<speak version='1.0' xml:lang='${voiceLang}'>
                <voice xml:lang='${voiceLang}' name='${voice}'>
                    ${text}
                </voice>
            </speak>`;

            const response = await axios({
                method: 'post',
                url: url,
                headers: {
                    'Ocp-Apim-Subscription-Key': speechKey,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'riff-16khz-16bit-mono-pcm', // CRITICAL: WAV with headers
                    'User-Agent': 'OrbiTalk-NodeJS'
                },
                data: ssml,
                responseType: 'arraybuffer' // Return binary data
            });

            console.log(`(SpeechService) Synthesized WAV audio: ${response.data.byteLength} bytes`);
            resolve(response.data);
        } catch (error) {
            console.error('(SpeechService) WAV synthesis error:', error.message);
            if (error.response) {
                console.error('(SpeechService) Response status:', error.response.status);
                console.error('(SpeechService) Response data:', error.response.data);
            }
            reject(error);
        }
    });
}

module.exports = { recognizeSpeech, synthesizeSpeech, synthesizeSpeechWAV };
