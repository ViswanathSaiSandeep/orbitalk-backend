// test-client.js
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const ws = new WebSocket('ws://localhost:8080');
const pcmFilePath = path.join(__dirname, 'speech-sample.pcm'); // Generated speech file
const outputFilePath = path.join(__dirname, 'output.pcm');

// Create a write stream for the output audio
const outputStream = fs.createWriteStream(outputFilePath);

ws.on('open', () => {
    console.log('Connected to server');

    // 1. Send Config
    const config = {
        type: 'config',
        sourceLang: 'en-US',
        targetLang: 'es-ES',
        roomId: 'test-room'
    };
    ws.send(JSON.stringify(config));
    console.log('Sent config:', config);

    // 2. Stream Audio (Simulate real-time streaming)
    if (fs.existsSync(pcmFilePath)) {
        const fileBuffer = fs.readFileSync(pcmFilePath);
        const chunkSize = 4096; // 128ms of audio at 16kHz 16-bit mono
        let offset = 0;

        console.log(`Starting to stream ${pcmFilePath} (${fileBuffer.length} bytes)...`);

        const interval = setInterval(() => {
            if (offset >= fileBuffer.length) {
                clearInterval(interval);
                console.log('Finished sending audio file. Sending silence to trigger recognition...');

                // Send 2 seconds of silence
                const silenceDuration = 2000; // ms
                const silenceChunks = silenceDuration / 128;
                let silenceCount = 0;

                const silenceInterval = setInterval(() => {
                    if (silenceCount >= silenceChunks) {
                        clearInterval(silenceInterval);
                        console.log('Finished sending silence. Waiting for results...');
                        setTimeout(() => {
                            console.log('Closing connection.');
                            ws.close();
                        }, 5000);
                        return;
                    }
                    // Send 128ms of silence (4096 bytes of zeros)
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(Buffer.alloc(4096));
                    }
                    silenceCount++;
                }, 128);

                return;
            }

            const end = Math.min(offset + chunkSize, fileBuffer.length);
            const chunk = fileBuffer.slice(offset, end);

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(chunk);
            }

            offset += chunkSize;
        }, 128); // Send every 128ms to match the chunk duration
    } else {
        console.error('speech-sample.pcm not found! Please run "node generate-speech-pcm.js" first.');
    }
});

ws.on('message', (data, isBinary) => {
    if (isBinary) {
        console.log(`Received audio chunk: ${data.length} bytes`);
        outputStream.write(data);
    } else {
        console.log('Received message:', data.toString());
    }
});

ws.on('close', () => {
    console.log('Disconnected');
    outputStream.end();
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});
