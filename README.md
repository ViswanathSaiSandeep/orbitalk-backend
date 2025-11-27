# Real-time Voice Translation Backend

This Node.js backend facilitates real-time bidirectional voice translation between users using Azure Cognitive Services.

## Features
- **WebSocket Communication**: Real-time audio streaming.
- **Azure Speech-to-Text (STT)**: Continuous speech recognition.
- **Azure Translator**: Real-time text translation.
- **Azure Text-to-Speech (TTS)**: Generates raw PCM audio (16kHz, 16-bit, mono).
- **Room Management**: Supports multiple rooms for user pairing.

## Prerequisites
- Node.js (v16+)
- Azure Speech Service Key & Region
- Azure Translator Key & Region

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configuration**:
    Create a `.env` file in the root directory (optional, defaults are in `config.js`):
    ```env
    SPEECH_KEY=your_speech_key
    SPEECH_REGION=your_speech_region
    TRANSLATOR_KEY=your_translator_key
    TRANSLATOR_REGION=your_translator_region
    PORT=8080
    ```

## Running Locally

1.  **Start the Server**:
    ```bash
    npm start
    ```
    The server will listen on `ws://localhost:8080`.

2.  **Test with Client**:
    Generate a sample PCM file (if not present):
    ```bash
    node generate-pcm.js
    ```
    Run the test client:
    ```bash
    node test-client.js
    ```

## Deployment (Render)

1.  **Create a Web Service** on Render.
2.  **Connect your repository**.
3.  **Build Command**: `npm install`
4.  **Start Command**: `npm start`
5.  **Environment Variables**: Add the Azure keys and regions in the Render dashboard.

## API Reference

### WebSocket Connection
- **URL**: `wss://<your-domain>`

### Messages

#### 1. Configuration (JSON)
Send this immediately after connecting:
```json
{
  "type": "config",
  "sourceLang": "en-US",
  "targetLang": "es-ES",
  "voiceName": "es-ES-AlvaroNeural", // Optional
  "roomId": "room-123" // Users in the same room will hear each other
}
```

#### 2. Audio Data (Binary)
Stream raw PCM data (16kHz, 16-bit, mono).

#### 3. Received Audio (Binary)
The server sends back translated audio as raw PCM data.
