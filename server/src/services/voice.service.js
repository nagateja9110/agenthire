const env = require('../config/env');

const MURF_STREAM_URL = 'https://global.api.murf.ai/v1/speech/stream';

function isTtsConfigured() {
  return Boolean(env.MURF_API_KEY);
}

function isSttConfigured() {
  return Boolean(env.ASSEMBLYAI_API_KEY);
}

// Proxies Murf's streaming TTS endpoint. Returns an audio Buffer (MP3) on
// success, or null on any failure - TTS is best-effort, callers fall back
// to the browser's speechSynthesis.
async function synthesizeSpeech(text) {
  if (!isTtsConfigured() || !text) return null;
  try {
    const res = await fetch(MURF_STREAM_URL, {
      method: 'POST',
      headers: {
        'api-key': env.MURF_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: env.MURF_VOICE_ID,
        style: 'Conversation',
        text,
        locale: 'en-IN',
        model: 'FALCON',
        format: 'MP3',
        sampleRate: 24000,
        channelType: 'MONO',
      }),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

// Uploads an audio buffer to AssemblyAI and polls until the transcript is
// ready. Throws on failure - callers fall back to browser SpeechRecognition.
async function transcribeAudio(buffer) {
  const { AssemblyAI } = require('assemblyai');
  const client = new AssemblyAI({ apiKey: env.ASSEMBLYAI_API_KEY });
  const transcript = await client.transcripts.transcribe({ audio: buffer });
  if (transcript.status === 'error') {
    throw new Error(transcript.error || 'AssemblyAI transcription failed');
  }
  return transcript.text || '';
}

module.exports = { isTtsConfigured, isSttConfigured, synthesizeSpeech, transcribeAudio };
