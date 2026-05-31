import { openai } from './openai.js';

export async function generateSpeechBase64(text) {
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'nova',
    input: text,
    response_format: 'mp3',
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}
