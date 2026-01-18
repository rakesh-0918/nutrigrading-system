'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiJson } from '../components/api';
import { useTts, type SupportedLang } from '../components/voice';
import { LangPicker } from '../components/ui/LangPicker';

export default function LeaderboardPage() {
  const [lang, setLang] = useState<SupportedLang>('en-IN');
  const { speak } = useTts(lang);
  const [top, setTop] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const data = await apiJson<{ top: any[] }>('/leaderboard/top');
      setTop(data.top);
    })();
  }, []);

  useEffect(() => {
    if (top.length) {
      const first3 = top.slice(0, 3).map((u) => `${u.rank}. ${u.displayName}, ${u.points} points`).join('. ');
      speak(`Leaderboard top three. ${first3}.`);
    } else {
      speak('Leaderboard.');
    }
  }, [top, speak]);

  return (
    <main className="container">
      <div className="card">
        <div className="h1">Leaderboard</div>
        <div className="small">Top 50 users (masked identity). Ranked by points, then first to reach the score.</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <LangPicker lang={lang} setLang={setLang} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <Link href="/home"><button>Back</button></Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        {top.map((u) => (
          <div key={`${u.rank}-${u.displayName}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span>#{u.rank} {u.displayName}</span>
            <span className="badge">{u.points}</span>
          </div>
        ))}
        {!top.length ? <div className="small">No data yet.</div> : null}
      </div>
    </main>
  );
}


