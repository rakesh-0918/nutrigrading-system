'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiJson } from '../components/api';
import { useTts, type SupportedLang } from '../components/voice';
import { LangPicker } from '../components/ui/LangPicker';

export default function HomePage() {
  const [lang, setLang] = useState<SupportedLang>('en-IN');
  const { speak } = useTts(lang);
  const [me, setMe] = useState<any>(null);
  const [today, setToday] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiJson<{ user: any }>('/me');
        setMe(data.user);
        const userLang = (data.user?.languagePreference?.language as SupportedLang) ?? 'en-IN';
        setLang(userLang);
        const t = await apiJson('/day/today');
        setToday(t);
      } catch {
        window.location.href = '/login';
      }
    })();
  }, []);

  useEffect(() => {
    speak('Home. Tap scan image or upload image.');
  }, [speak]);

  return (
    <main className="container">
      <div className="card">
        <div className="h1">Home</div>
        <div className="small">Hello {me?.name ?? '—'} | Points: {today?.points ?? '—'}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <LangPicker lang={lang} setLang={setLang} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Actions</div>
        <div className="row" style={{ marginTop: 10 }}>
          <Link href="/scan?mode=camera"><button className="primary">Scan Image (camera)</button></Link>
          <Link href="/scan?mode=upload"><button>Upload Image</button></Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Today</div>
        <div className="small">
          Sugar: {today?.intake?.freeSugarG ?? 0} / {today?.limits?.sugarLimit ?? '—'} g | Red fat items: {today?.flags?.redFatItems ?? 0} | Red salt items: {today?.flags?.redSaltItems ?? 0}
        </div>
        {today?.limits && today?.intake && today.intake.freeSugarG > today.limits.sugarLimit ? (
          <div className="small" style={{ marginTop: 8 }}>Warning: sugar intake exceeded today’s limit.</div>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Leaderboard</div>
        <div className="row" style={{ marginTop: 10 }}>
          <Link href="/leaderboard"><button>View leaderboard</button></Link>
          <Link href="/history"><button>Scan history</button></Link>
          <Link href="/profile"><button>Profile</button></Link>
        </div>
      </div>
    </main>
  );
}


