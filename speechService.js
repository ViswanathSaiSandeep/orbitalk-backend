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
        if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
            if (onRecognizing) onRecognizing(e.result.text);
        }
    };

    recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
            if (onRecognized) onRecognized(e.result.text);
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

    // Start continuous recognition
    recognizer.startContinuousRecognitionAsync();

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

module.exports = { recognizeSpeech, synthesizeSpeech };
