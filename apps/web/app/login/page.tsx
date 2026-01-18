'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiJson } from '../components/api';
import { LangPicker } from '../components/ui/LangPicker';
import { VoiceField } from '../components/ui/VoiceField';
import { useTts, type SupportedLang } from '../components/voice';

export default function LoginPage() {
  const [lang, setLang] = useState<SupportedLang>('en-IN');
  const { speak } = useTts(lang);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    speak('Welcome. Tap record to say your phone number and password. Then tap login.');
  }, [speak]);

  const login = async () => {
    setErr(null);
    setBusy(true);
    try {
      await apiJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password })
      });
      speak('Login successful.');
      window.location.href = '/home';
    } catch (e: any) {
      setErr(e?.message ?? 'LOGIN_FAILED');
      speak('Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <div className="card">
        <div className="h1">Login</div>
        <p className="small">
          Login with voice or typing. For privacy, use a quiet place for voice.
        </p>
      </div>

      <div style={{ marginTop: 12 }}>
        <LangPicker lang={lang} setLang={setLang} />
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
          hint="Say digits clearly, e.g., nine eight seven..."
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
          normalize={(raw) => raw.trim()}
        />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <button className="primary" onClick={login} disabled={busy || !phone || !password}>
            {busy ? 'Logging in…' : 'Login'}
          </button>
          <Link href="/signup"><button>Create account</button></Link>
        </div>
        {err ? <div className="small" style={{ marginTop: 10 }}>Error: {err}</div> : null}
      </div>
    </main>
  );
}


