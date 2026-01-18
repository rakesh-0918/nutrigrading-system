'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiJson } from '../components/api';
import { LangPicker } from '../components/ui/LangPicker';
import { VoiceField } from '../components/ui/VoiceField';
import { useTts, type SupportedLang } from '../components/voice';

type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export default function SignupPage() {
  const [lang, setLang] = useState<SupportedLang>('en-IN');
  const { speak } = useTts(lang);

  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender>('PREFER_NOT_TO_SAY');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    speak('Sign up. Please record your name, age, phone number, and password. Then tap create account.');
  }, [speak]);

  const signup = async () => {
    setErr(null);
    setBusy(true);
    try {
      await apiJson('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, age, gender, phone, password })
      });
      speak('Account created.');
      window.location.href = '/home';
    } catch (e: any) {
      setErr(e?.message ?? 'SIGNUP_FAILED');
      speak('Sign up failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <div className="card">
        <div className="h1">Sign up</div>
        <p className="small">Sign up using voice or typing.</p>
      </div>

      <div style={{ marginTop: 12 }}>
        <LangPicker lang={lang} setLang={setLang} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Name</div>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <VoiceField label="or record name" lang={lang} value={name} onChange={setName} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Age</div>
        <input
          type="number"
          placeholder="Enter your age"
          value={age == null ? '' : String(age)}
          onChange={(e) => {
            const n = Number(e.target.value);
            setAge(Number.isFinite(n) && n > 0 ? n : null);
          }}
          style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <VoiceField
          label="or record age"
          lang={lang}
          value={age == null ? '' : String(age)}
          onChange={(v) => {
            const n = Number(String(v).replace(/[^0-9]/g, ''));
            setAge(Number.isFinite(n) ? n : null);
          }}
          hint="Say a number like 28."
        />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Gender</div>
        <div className="row" style={{ marginTop: 10 }}>
          {(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as Gender[]).map((g) => (
            <button key={g} className={g === gender ? 'primary' : ''} onClick={() => setGender(g)} aria-pressed={g === gender}>
              {g.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Phone number</div>
        <input
          type="tel"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^+0-9]/g, ''))}
          style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <VoiceField
          label="or record phone"
          lang={lang}
          value={phone}
          onChange={setPhone}
          hint="Say digits clearly."
          normalize={(raw) => raw.replace(/\s+/g, '').replace(/[^+0-9]/g, '')}
        />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Password</div>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <VoiceField
          label="or record password"
          lang={lang}
          value={password ? '••••••' : ''}
          onChange={setPassword}
          hint="Say a password phrase you will remember."
        />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <button className="primary" onClick={signup} disabled={busy || !name || !phone || !password || age == null}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
          <Link href="/login"><button>Back to login</button></Link>
        </div>
        {err ? <div className="small" style={{ marginTop: 10 }}>Error: {err}</div> : null}
      </div>
    </main>
  );
}


