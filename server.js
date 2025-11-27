const WebSocket = require('ws');
const speechService = require('./speechService');
const translationService = require('./translationService');
const { mapLanguageCode } = require('./languageMapper');
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
                    // console.log("Received PCM:", message.length); // Optional: Uncomment for debugging
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
    const sourceLang = mapLanguageCode(config.sourceLang || 'en');
    const targetLang = mapLanguageCode(config.targetLang || 'es');

    console.log(`Mapped languages: ${config.sourceLang} -> ${sourceLang}, ${config.targetLang} -> ${targetLang}`);

    clientData.config = {
        sourceLang: sourceLang,
        targetLang: targetLang,
        voiceName: config.voiceName || null
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
        const translatedText = await translationService.translateText(
            text,
            clientData.config.sourceLang,
            clientData.config.targetLang
        );
        console.log(`[${clientData.id}] Translated: ${translatedText}`);

        if (!translatedText) return;

        const audioBuffer = await speechService.synthesizeSpeech(
            translatedText,
            clientData.config.targetLang,
            clientData.config.voiceName
        );
        console.log(`[${clientData.id}] Synthesized audio size: ${audioBuffer.byteLength}`);
        console.log("Sending synthesized PCM:", audioBuffer.byteLength);

        // 🔵 PART 5: Broadcast to OTHER users in the room
        const room = rooms.get(clientData.roomId);
        if (room) {
            room.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(audioBuffer);
                }
            });
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
