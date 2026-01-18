'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiJson } from '../components/api';
import { LangPicker } from '../components/ui/LangPicker';
import { VoiceField } from '../components/ui/VoiceField';
import { useTts, type SupportedLang } from '../components/voice';

type Pref = 'NORMAL' | 'DIABETES_T1' | 'DIABETES_T2' | 'HIGH_BP' | 'FAT_RELATED_OBESITY' | 'DIABETES_OBESITY';

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [lang, setLang] = useState<SupportedLang>('en-IN');
  const { speak } = useTts(lang);

  const [name, setName] = useState('');
  const [pref, setPref] = useState<Pref>('NORMAL');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiJson<{ user: any }>('/me');
        setMe(data.user);
        setName(data.user?.name ?? '');
        setLang((data.user?.languagePreference?.language as SupportedLang) ?? 'en-IN');
      } catch {
        window.location.href = '/login';
      }
    })();
  }, []);

  useEffect(() => {
    speak('Profile. You can change your name now. Health preference changes apply from tomorrow and end your current streak.');
  }, [speak]);

  const saveLang = async (l: SupportedLang) => {
    setLang(l);
    try {
      await apiJson('/language', { method: 'POST', body: JSON.stringify({ language: l }) });
      speak('Language updated.');
    } catch {
      // ignore
    }
  };

  const saveName = async () => {
    setBusy(true);
    try {
      await apiJson('/profile/name', { method: 'POST', body: JSON.stringify({ name }) });
      speak('Name updated.');
    } finally {
      setBusy(false);
    }
  };

  const savePref = async () => {
    setBusy(true);
    try {
      const resp = await apiJson<{ ok: boolean; voice: string }>('/profile/preference', {
        method: 'POST',
        body: JSON.stringify({ preference: pref })
      });
      speak(resp.voice);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <div className="card">
        <div className="h1">Profile</div>
        <div className="small">Phone: {me?.phone ?? '—'}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <LangPicker lang={lang} setLang={saveLang} />
      </div>

      <VoiceField label="name" lang={lang} value={name} onChange={setName} />

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <button className="primary" onClick={saveName} disabled={busy || !name}>Save name</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Health preference (tap)</div>
        <div className="small">Rule: profile changes affect only future days. Past data never changes.</div>
        <div className="row" style={{ marginTop: 10 }}>
          {([
            ['NORMAL', 'Normal'],
            ['DIABETES_T1', 'Diabetes Type 1'],
            ['DIABETES_T2', 'Diabetes Type 2'],
            ['HIGH_BP', 'High BP'],
            ['FAT_RELATED_OBESITY', 'Fat-related Obesity'],
            ['DIABETES_OBESITY', 'Diabetes + Obesity']
          ] as Array<[Pref, string]>).map(([k, label]) => (
            <button key={k} className={pref === k ? 'primary' : ''} onClick={() => setPref(k)} aria-pressed={pref === k}>
              {label}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="primary" onClick={savePref} disabled={busy}>Save preference</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <Link href="/home"><button>Back</button></Link>
        </div>
      </div>
    </main>
  );
}


