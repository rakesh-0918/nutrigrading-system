'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiJson } from '../components/api';
import { useTts, type SupportedLang } from '../components/voice';
import { LangPicker } from '../components/ui/LangPicker';

export default function HistoryPage() {
  const [lang, setLang] = useState<SupportedLang>('en-IN');
  const { speak } = useTts(lang);
  const [scans, setScans] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const me = await apiJson<{ user: any }>('/me');
        setLang((me.user?.languagePreference?.language as SupportedLang) ?? 'en-IN');
      } catch {
        window.location.href = '/login';
      }

      const data = await apiJson<{ scans: any[] }>('/scans/recent?take=30');
      setScans(data.scans);
    })();
  }, []);

  useEffect(() => {
    speak('Scan history.');
  }, [speak]);

  return (
    <main className="container">
      <div className="card">
        <div className="h1">Scan history</div>
        <div className="small">Last 30 scans.</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <LangPicker lang={lang} setLang={setLang} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        {scans.map((s) => (
          <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div><span className="badge">{s.kind}</span> {s.title ?? '—'}</div>
            <div className="small">{new Date(s.createdAt).toLocaleString()} | confidence {s.confidence}% | consumed: {String(s.consumed)}</div>
          </div>
        ))}
        {!scans.length ? <div className="small">No scans yet.</div> : null}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <Link href="/home"><button>Back</button></Link>
        </div>
      </div>
    </main>
  );
}


