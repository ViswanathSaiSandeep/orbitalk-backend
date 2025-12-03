const WebSocket = require('ws');
const speechService = require('./speechService');
const translationService = require('./translationService');
const { mapLanguageCode, getVoiceNameForLang } = require('./languageMapper');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Store client state
const clients = new Map();
// Store rooms
const rooms = new Map();

console.log(`WebSocket server started on port ${PORT}`);

wss.on('connection', (ws) => {
    console.log('New client connected');
    const clientId = uuidv4();

    clients.set(ws, {
        id: clientId,
        roomId: null,
        config: null,
        speechService: null
    });

    ws.on('message', async (message, isBinary) => {
        const clientData = clients.get(ws);

        if (!isBinary) {
            try {
                const msg = JSON.parse(message.toString());
                if (msg.type === 'config') {
                    handleConfigMessage(ws, clientData, msg);
                }
            } catch (e) {
                console.error('Error parsing JSON message:', e);
            }
        } else {
            if (clientData.speechService && clientData.speechService.pushStream) {
                try {
                    console.log("Received PCM:", message.length);
                    clientData.speechService.pushStream.write(message);
                } catch (e) {
                    console.error('Error writing to push stream:', e);
                }
            }
        }
    });

    ws.on('close', () => {
        console.log(`Client ${clientId} disconnected`);
        cleanupClient(ws);
    });

    ws.on('error', (error) => {
        console.error(`Client ${clientId} error:`, error);
        cleanupClient(ws);
    });
});

function handleConfigMessage(ws, clientData, config) {
    console.log(`Received config for client ${clientData.id}:`, config);

    // Map language codes to Azure-compatible formats
    // For Speech Recognition: use full code (te-IN)
    // For Translation API: use base code only (te)
    const sourceLangFull = mapLanguageCode(config.sourceLang || 'en');
    const targetLangFull = mapLanguageCode(config.targetLang || 'es');

    // Extract base language code for translation (te-IN → te)
    const sourceLangBase = sourceLangFull.split('-')[0];
    const targetLangBase = targetLangFull.split('-')[0];

    console.log(`Mapped languages: ${sourceLangFull} -> ${sourceLangBase}, ${targetLangFull} -> ${targetLangBase}`);

    // Store configuration
    clientData.config = {
        sourceLang: sourceLangFull,      // Full code for speech recognition (te-IN)
        targetLang: targetLangFull,      // Full code for speech recognition (en-US)
        sourceLangBase: sourceLangBase,  // Base code for translation (te)
        targetLangBase: targetLangBase,  // Base code for translation (en)
        voiceName: getVoiceNameForLang(targetLangFull) // Full code for voice selection
    };

    const roomId = config.roomId || 'default-room';
    clientData.roomId = roomId;

    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(ws);
    console.log(`Client ${clientData.id} joined room ${roomId}`);

    if (clientData.speechService) {
        clientData.speechService.close();
    }

    clientData.speechService = speechService.recognizeSpeech(
        clientData.config.sourceLang,
        (text) => handleRecognizedText(ws, text),
        (text) => console.log(`[${clientData.id}] Recognizing: ${text}`)
    );
}

async function handleRecognizedText(ws, text) {
    if (!text) return;
    const clientData = clients.get(ws);
    if (!clientData || !clientData.roomId) return;

    console.log(`[${clientData.id}] Recognized: ${text}`);

    try {
        // Use BASE language codes for translation API
        const translatedText = await translationService.translateText(
            text,
            clientData.config.sourceLangBase,  // Use "te" not "te-IN"
            clientData.config.targetLangBase   // Use "en" not "en-US"
        );
        console.log(`[${clientData.id}] Translated: ${translatedText}`);

        if (!translatedText) return;

        // Send transcript to the speaking user (original text + their own translation)
        if (ws.readyState === WebSocket.OPEN) {
            const transcriptData = JSON.stringify({
                type: 'transcript',
                original: text,
                translated: translatedText,
                isLocal: true,
                timestamp: new Date().toISOString()
            });
            ws.send(transcriptData);
            console.log(`[${clientData.id}] Sent transcript to speaker`);
        }

        const audioBuffer = await speechService.synthesizeSpeechWAV(
            translatedText,
            clientData.config.targetLang,  // Use full code for TTS (en-US)
            clientData.config.voiceName
        );
        console.log(`[${clientData.id}] Synthesized WAV audio size: ${audioBuffer.byteLength}`);

        // Broadcast audio and transcript to OTHER users in the room
        const room = rooms.get(clientData.roomId);
        if (room) {
            room.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    // Send audio
                    client.send(audioBuffer);

                    // Send transcript text
                    const transcriptData = JSON.stringify({
                        type: 'transcript',
                        original: text,
                        translated: translatedText,
                        isLocal: false,
                        timestamp: new Date().toISOString()
                    });
                    client.send(transcriptData);
                }
            });
            console.log(`[${clientData.id}] Broadcast to ${room.size - 1} other users`);
        }

    } catch (error) {
        console.error('Error in processing pipeline:', error);
    }
}

function cleanupClient(ws) {
    const clientData = clients.get(ws);
    if (clientData) {
        if (clientData.speechService) {
            clientData.speechService.close();
        }

        if (clientData.roomId && rooms.has(clientData.roomId)) {
            const room = rooms.get(clientData.roomId);
            room.delete(ws);
            if (room.size === 0) {
                rooms.delete(clientData.roomId);
            }
        }

        clients.delete(ws);
    }
}
