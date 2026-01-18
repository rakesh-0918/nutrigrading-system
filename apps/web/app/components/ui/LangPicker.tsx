'use client';

import type { SupportedLang } from '../voice';

const LANGS: { code: SupportedLang; label: string }[] = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'mr-IN', label: 'Marathi' }
];

export function LangPicker({ lang, setLang }: { lang: SupportedLang; setLang: (l: SupportedLang) => void }) {
  return (
    <div className="card">
      <div className="h2">Language</div>
      <div className="row" style={{ marginTop: 10 }}>
        {LANGS.map((l) => (
          <button
            key={l.code}
            className={l.code === lang ? 'primary' : ''}
            onClick={() => setLang(l.code)}
            aria-pressed={l.code === lang}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="small" style={{ marginTop: 8 }}>
        Voice input requires a browser that supports Web Speech (Chrome/Edge recommended).
      </div>
    </div>
  );
}


