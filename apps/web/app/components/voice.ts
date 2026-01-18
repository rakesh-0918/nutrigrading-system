'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SupportedLang = 'en-IN' | 'hi-IN' | 'te-IN' | 'ta-IN' | 'kn-IN' | 'ml-IN' | 'bn-IN' | 'mr-IN';

export function useTts(lang: SupportedLang) {
  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined') return;
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 1;
      synth.speak(u);
    },
    [lang]
  );
  return { speak };
}

type WebkitRecognition = any;

export function useStt(lang: SupportedLang) {
  const RecognitionCtor = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  }, []);

  const recRef = useRef<WebkitRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!RecognitionCtor) return;
    const rec = new RecognitionCtor() as WebkitRecognition;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (event: any) => {
      const t = Array.from(event.results)
        .map((r: any) => r[0]?.transcript ?? '')
        .join(' ');
      setTranscript(t.trim());
    };
    rec.onerror = (e: any) => setError(e?.error ?? 'STT_ERROR');
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
  }, [RecognitionCtor, lang]);

  const start = useCallback(() => {
    setError(null);
    setTranscript('');
    if (!recRef.current) return;
    if (listening) return; // Don't start if already listening
    try {
      setListening(true);
      recRef.current.start();
    } catch {
      setListening(false);
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  return { supported: !!RecognitionCtor, listening, transcript, error, start, stop };
}


