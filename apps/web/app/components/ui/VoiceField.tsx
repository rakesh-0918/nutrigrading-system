'use client';

import { useEffect, useState } from 'react';
import { useStt, useTts, type SupportedLang } from '../voice';

export function VoiceField(props: {
  label: string;
  lang: SupportedLang;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  normalize?: (raw: string) => string;
}) {
  const { speak } = useTts(props.lang);
  const stt = useStt(props.lang);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (stt.error) speak('Sorry, I could not hear that. Please try again.');
  }, [stt.error, speak]);

  const setFromTranscript = () => {
    const raw = stt.transcript || '';
    const next = (props.normalize ? props.normalize(raw) : raw).trim();
    if (!next) {
      speak('I did not catch that. Please try again.');
      return;
    }
    props.onChange(next);
    speak(`${props.label} saved.`);
  };

  if (!mounted) {
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">{props.label}</div>
        {props.hint ? <div className="small">{props.hint}</div> : null}
        <div className="row" style={{ marginTop: 10 }}>
          <button disabled>Hear prompt</button>
          <button className="primary" disabled>Record</button>
          <button disabled>Stop</button>
          <button disabled>Save</button>
        </div>
        <div className="kv" style={{ marginTop: 10 }}>
          <div className="badge">Current: {props.value ? props.value : '—'}</div>
          <div className="small">Heard: —</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="h2">{props.label}</div>
      {props.hint ? <div className="small">{props.hint}</div> : null}
      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={() => speak(`Please say your ${props.label}. Then tap save.`)}>Hear prompt</button>
        <button className="primary" onClick={stt.start} disabled={!stt.supported || stt.listening}>
          {stt.listening ? 'Listening…' : 'Record'}
        </button>
        <button onClick={stt.stop} disabled={!stt.listening}>
          Stop
        </button>
        <button onClick={setFromTranscript} disabled={!stt.transcript}>
          Save
        </button>
      </div>
      <div className="kv" style={{ marginTop: 10 }}>
        <div className="badge">Current: {props.value ? props.value : '—'}</div>
        <div className="small">Heard: {stt.transcript ? stt.transcript : '—'}</div>
      </div>
    </div>
  );
}


