const fs = require('fs');
const path = require('path');

const pcmFile = path.join(__dirname, 'speech-sample.pcm');
const wavFile = path.join(__dirname, 'speech-sample.wav');

if (!fs.existsSync(pcmFile)) {
    console.error('speech-sample.pcm not found!');
    process.exit(1);
}

const pcmData = fs.readFileSync(pcmFile);
const wavHeader = Buffer.alloc(44);

// WAV Header Parameters for 16kHz, 16-bit, Mono
const sampleRate = 16000;
const numChannels = 1;
const bitsPerSample = 16;
const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
const blockAlign = numChannels * (bitsPerSample / 8);
const dataSize = pcmData.length;
const fileSize = 36 + dataSize;

// RIFF chunk descriptor
wavHeader.write('RIFF', 0);
wavHeader.writeUInt32LE(fileSize, 4);
wavHeader.write('WAVE', 8);

// fmt sub-chunk
wavHeader.write('fmt ', 12);
wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
wavHeader.writeUInt16LE(numChannels, 22);
wavHeader.writeUInt32LE(sampleRate, 24);
wavHeader.writeUInt32LE(byteRate, 28);
wavHeader.writeUInt16LE(blockAlign, 32);
wavHeader.writeUInt16LE(bitsPerSample, 34);

// data sub-chunk
wavHeader.write('data', 36);
wavHeader.writeUInt32LE(dataSize, 40);

const wavData = Buffer.concat([wavHeader, pcmData]);
fs.writeFileSync(wavFile, wavData);

console.log(`Successfully converted output.pcm to ${wavFile}`);
console.log('You can now play output.wav in any media player.');
