'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiJson } from '../components/api';
import { useTts, type SupportedLang } from '../components/voice';
import { LangPicker } from '../components/ui/LangPicker';
import { VoiceField } from '../components/ui/VoiceField';

export default function ResultPage() {
  const [lang, setLang] = useState<SupportedLang>('en-IN');
  const { speak } = useTts(lang);

  const scanId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('scanId') ?? '';
  }, []);

  const [data, setData] = useState<any>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Prefer queue item by scanId (multi-barcode support)
    const qRaw = sessionStorage.getItem('scanQueue');
    if (qRaw) {
      const q = JSON.parse(qRaw) as any[];
      const item = q.find((x) => x.scanId === scanId) ?? q[0];
      if (item) setData(item);
      return;
    }

    const raw = sessionStorage.getItem('lastScanResult');
    if (raw) setData(JSON.parse(raw));
  }, []);

  useEffect(() => {
    if (!data) return;
    if (data.kind === 'NOT_FOOD') {
      speak('This does not look like a food item.');
      return;
    }
    if (data.kind === 'UNKNOWN') {
      speak(data.voice ?? 'I could not find trusted nutrition data.');
      return;
    }

    const title = data.title ? `${data.title}.` : '';
    if (data.grade?.kind === 'BEVERAGE') {
      speak(`${title} Nutri-Grade ${data.grade.nutriGrade}. Sugar per 100 ml is ${data.grade.sugar_g_per_100ml} grams.`);
    } else if (data.grade?.kind === 'SOLID') {
      speak(`${title} Traffic lights. Sugar ${data.grade.traffic.sugar}. Fat ${data.grade.traffic.fat}. Salt ${data.grade.traffic.salt}.`);
    } else if (data.grade?.kind === 'FRUIT_VEG') {
      speak('Fruit or vegetable. Natural sugars do not affect your daily limits.');
    }

    if (data.grade?.warnings?.length) speak(data.grade.warnings[0]);
  }, [data, speak]);

  const consumeNo = async () => {
    setBusy(true);
    try {
      await apiJson('/scan/consume', { method: 'POST', body: JSON.stringify({ scanId, consumed: false }) });
      speak('Okay. Not counted in your daily intake.');
      goNextOrHome();
    } finally {
      setBusy(false);
    }
  };

  const consumeYes = async () => {
    if (qty == null || qty <= 0) {
      speak('Please say the quantity you consumed.');
      return;
    }
    setBusy(true);
    try {
      await apiJson('/scan/consume', {
        method: 'POST',
        body: JSON.stringify({ scanId, consumed: true, quantity: qty, unit })
      });
      speak('Recorded.');
      goNextOrHome();
    } catch (e: any) {
      speak('Could not record consumption.');
    } finally {
      setBusy(false);
    }
  };

  const chooseHealthier = async () => {
    setBusy(true);
    try {
      await apiJson('/points/bonus', { method: 'POST', body: JSON.stringify({ type: 'CHOOSE_HEALTHIER_OPTION' }) });
      speak('Great. Added points for choosing a healthier option.');
    } finally {
      setBusy(false);
    }
  };

  const goNextOrHome = () => {
    const qRaw = sessionStorage.getItem('scanQueue');
    if (!qRaw) {
      window.location.href = '/home';
      return;
    }
    const q = JSON.parse(qRaw) as any[];
    const idx = q.findIndex((x) => x.scanId === scanId);
    if (idx >= 0 && idx < q.length - 1) {
      const next = q[idx + 1];
      sessionStorage.setItem('lastScanResult', JSON.stringify(next));
      window.location.href = `/result?scanId=${encodeURIComponent(next.scanId)}`;
      return;
    }
    sessionStorage.removeItem('scanQueue');
    window.location.href = '/home';
  };

  const kind = data?.kind;
  const isBeverage = kind === 'BEVERAGE';

  return (
    <main className="container">
      <div className="card">
        <div className="h1">Result</div>
        <div className="small">We never guess nutrition values. We stop if confidence is below 70%.</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <LangPicker lang={lang} setLang={setLang} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Item</div>
        <div className="small">{data?.title ?? '—'}</div>
        <div className="small">Kind: {data?.kind ?? '—'}</div>
      </div>

      {data?.grade ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="h2">Grade</div>
          {data.grade.kind === 'BEVERAGE' ? (
            <div className="small">Nutri-Grade: {data.grade.nutriGrade} (sugar/100ml: {data.grade.sugar_g_per_100ml}g)</div>
          ) : null}
          {data.grade.kind === 'SOLID' ? (
            <div className="small">
              Sugar: {data.grade.traffic.sugar} | Fat: {data.grade.traffic.fat} | Salt: {data.grade.traffic.salt}
            </div>
          ) : null}
          {data.grade.warnings?.length ? (
            <div className="small" style={{ marginTop: 8 }}>Warnings: {data.grade.warnings.join(' ')}</div>
          ) : null}
          {data.grade.riskAssociations?.length ? (
            <div className="small" style={{ marginTop: 8 }}>Risk associations: {data.grade.riskAssociations.join(' ')}</div>
          ) : null}
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Did you consume this food?</div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="danger" onClick={consumeNo} disabled={busy}>No</button>
          <button className="primary" onClick={() => speak('If yes, please record the quantity you consumed.')} disabled={busy}>Yes</button>
          <button onClick={chooseHealthier} disabled={busy}>I chose a healthier option</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Quantity (voice)</div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className={unit === 'g' ? 'primary' : ''} onClick={() => setUnit('g')} aria-pressed={unit === 'g'}>
            grams
          </button>
          <button className={unit === 'ml' ? 'primary' : ''} onClick={() => setUnit('ml')} aria-pressed={unit === 'ml'}>
            ml
          </button>
        </div>
        <VoiceField
          label={isBeverage ? 'milliliters consumed' : 'grams consumed'}
          lang={lang}
          value={qty == null ? '' : String(qty)}
          onChange={(v) => {
            const n = Number(String(v).replace(/[^0-9.]/g, ''));
            setQty(Number.isFinite(n) ? n : null);
          }}
          hint="Say a number like 250."
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="primary" onClick={consumeYes} disabled={busy || qty == null}>Confirm consumption</button>
          <Link href="/home"><button>Back</button></Link>
        </div>
      </div>
    </main>
  );
}


