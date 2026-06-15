const interviewService = require('../services/interviewSession.service');
const voiceService = require('../services/voice.service');
const { ok } = require('../utils/response');

async function getSession(req, res) {
  return ok(res, await interviewService.getPublic(req.params.token));
}

async function answer(req, res) {
  const result = await interviewService.submitAnswer(req.params.token, {
    answer: req.body.answer,
    mode: req.body.mode,
  });
  return ok(res, result);
}

async function submitCode(req, res) {
  const result = await interviewService.submitCode(req.params.token, {
    code: req.body.code,
    language: req.body.language,
  });
  return ok(res, result);
}

async function complete(req, res) {
  const result = await interviewService.completeAndEvaluate(req.params.token);
  // Candidate sees only a thank-you confirmation, not the evaluation.
  return ok(res, { status: result.status, completed_at: result.completed_at });
}

// Recruiter-only review of a candidate's interview.
async function review(req, res) {
  return ok(res, await interviewService.getReviewForCandidate(req.params.id, req.user._id));
}

// Streams interviewer voice audio for the given text (Murf TTS). Returns
// { audio: null } if not configured/failed so the client falls back to
// browser speechSynthesis.
async function speak(req, res) {
  const text = String(req.body.text || '').slice(0, 2000);
  const audio = await voiceService.synthesizeSpeech(text);
  if (!audio) return ok(res, { audio: null });
  res.set('Content-Type', 'audio/mpeg');
  return res.send(audio);
}

// Transcribes a recorded answer (AssemblyAI). Returns { text: null } if not
// configured/failed so the client falls back to browser SpeechRecognition.
async function transcribe(req, res) {
  if (!voiceService.isSttConfigured() || !req.file) {
    return ok(res, { text: null });
  }
  try {
    const text = await voiceService.transcribeAudio(req.file.buffer);
    return ok(res, { text });
  } catch {
    return ok(res, { text: null });
  }
}

module.exports = { getSession, answer, submitCode, complete, review, speak, transcribe };
