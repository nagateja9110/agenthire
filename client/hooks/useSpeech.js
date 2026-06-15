'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
