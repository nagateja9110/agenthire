'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/api';

// True only where the Web Speech recognition API exists (Chrome/Edge).
export function speechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/** Text-to-speech: the AI interviewer "speaks" each question aloud. */
export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback(
    (text) => {
      if (!supported || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [supported]
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  useEffect(() => () => supported && window.speechSynthesis.cancel(), [supported]);

  return { speak, stop, speaking, supported };
}

/**
 * Real interviewer voice via server-proxied Murf TTS, falling back to the
 * browser's speechSynthesis when `ttsEnabled` is false or the request fails.
 */
export function useInterviewerVoice(token, ttsEnabled) {
  const browserTts = useTextToSpeech();
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);

  const speak = useCallback(
    async (text) => {
      if (!text) return;
      if (!ttsEnabled) {
        browserTts.speak(text);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/interview/${token}/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('audio')) {
          if (audioRef.current) audioRef.current.pause();
          const url = URL.createObjectURL(await res.blob());
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onplay = () => setSpeaking(true);
          audio.onended = () => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
          };
          audio.onerror = () => {
            setSpeaking(false);
            browserTts.speak(text);
          };
          await audio.play();
          return;
        }
      } catch {
        /* fall through to browser TTS */
      }
      browserTts.speak(text);
    },
    [ttsEnabled, token, browserTts]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
    browserTts.stop();
  }, [browserTts]);

  useEffect(() => () => audioRef.current?.pause(), []);

  return { speak, stop, speaking: speaking || browserTts.speaking, supported: true };
}

/**
 * Records a candidate's spoken answer as an audio blob (for server-side
 * AssemblyAI transcription) using the MediaRecorder API.
 */
export function useVoiceRecorder() {
  const supported =
    typeof window !== 'undefined' && !!(navigator.mediaDevices && window.MediaRecorder);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const start = useCallback(async () => {
    if (!supported) return;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setError('Microphone permission was blocked. Allow mic access or type your answer.');
    }
  }, [supported]);

  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const mr = mediaRef.current;
      if (!mr) {
        resolve(null);
        return;
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRef.current = null;
        setRecording(false);
        resolve(blob);
      };
      mr.stop();
    });
  }, []);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  return { supported, recording, error, start, stop };
}

/**
 * Speech-to-text: streams the candidate's spoken answer into `transcript`
 * with live interim results. Final text accumulates across pauses.
 */
export function useSpeechRecognition() {
  const supported = speechRecognitionSupported();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const finalRef = useRef('');

  const start = useCallback(() => {
    if (!supported) return;
    setError('');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalRef.current += chunk + ' ';
        else interim += chunk;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone permission was blocked. Allow mic access or type your answer.');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError('Speech recognition error: ' + e.error);
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [supported]);

  const stop = useCallback(() => {
    if (recRef.current) recRef.current.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalRef.current = '';
    setTranscript('');
    setError('');
  }, []);

  const setManual = useCallback((text) => {
    finalRef.current = text ? text + ' ' : '';
    setTranscript(text);
  }, []);

  useEffect(
    () => () => {
      if (recRef.current) recRef.current.abort();
    },
    []
  );

  return { supported, listening, transcript, error, start, stop, reset, setManual };
}
