const fs = require('fs');
const path = require('path');

const sampleRate = 16000;
const duration = 2; // seconds
const frequency = 440; // A4
const amplitude = 32767 * 0.5; // 16-bit max * 0.5 volume

const numSamples = sampleRate * duration;
const buffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample

for (let i = 0; i < numSamples; i++) {
    const value = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude;
    buffer.writeInt16LE(value, i * 2);
}

fs.writeFileSync(path.join(__dirname, 'sample.pcm'), buffer);
console.log('Generated sample.pcm');
