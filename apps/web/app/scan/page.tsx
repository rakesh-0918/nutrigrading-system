'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTts, type SupportedLang } from '../components/voice';
import { LangPicker } from '../components/ui/LangPicker';
import { apiJson } from '../components/api';
import { fileToBase64 } from '../components/scan/image';
import { decodeBarcodesFromImage } from '../components/scan/zxing';

function computeImageConfidence0to100(img: HTMLImageElement): number {
  // Simple blur/edge heuristic to avoid using ML here.
  // Not nutrition guessing; only quality gating.
  const w = Math.min(640, img.naturalWidth);
  const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return 0;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Compute Laplacian variance on grayscale approx
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4 + 0];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  const mean = sum / Math.max(1, count);
  const variance = sumSq / Math.max(1, count) - mean * mean;

  // Map variance into 0-100. Tuned conservatively.
  const score = Math.max(0, Math.min(100, (Math.log10(variance + 1) / 3) * 100));
  return Math.round(score);
}

export default function ScanPage() {
  const [lang, setLang] = useState<SupportedLang>('en-IN');
  const { speak } = useTts(lang);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [cameraMode, setCameraMode] = useState<'user' | 'environment'>('user');
  const [cameraOpen, setCameraOpen] = useState(false);

  const mode = useMemo(() => {
    if (typeof window === 'undefined') return 'camera';
    const m = new URLSearchParams(window.location.search).get('mode');
    return m === 'upload' ? 'upload' : 'camera';
  }, []);

  useEffect(() => {
    speak(mode === 'upload' ? 'Upload an image.' : `Scan using ${cameraMode === 'user' ? 'front' : 'rear'} camera.`);
  }, [mode, cameraMode, speak]);

  const openCamera = async () => {
    try {
      setCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraMode }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e: any) {
      speak('Camera access denied. Please use choose file instead.');
      console.error('Camera error:', e?.message);
      setCameraOpen(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setCameraOpen(false);

    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' });
        await onFile(file);
      }
    }, 'image/jpeg', 0.9);
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setCameraOpen(false);
  };

  const onFile = async (file: File) => {
    setStatus('Loading image…');
    const url = URL.createObjectURL(file);
    setImgUrl(url);

    const img = new Image();
    img.onload = () => {
      const score = computeImageConfidence0to100(img);
      setConfidence(score);

      if (score < 70) {
        setStatus('Low confidence. Please rescan.');
        speak('Please adjust the camera angle and scan again.');
        return;
      }

      setStatus('Image quality OK. Detecting barcode…');
      speak('Image quality is good. Now detecting barcode.');

      (async () => {
        try {
          setBusy(true);
          const barcodes = await decodeBarcodesFromImage(img);
          if (barcodes.length > 1) speak(`Multiple barcodes found. Processing ${barcodes.length} items.`);

          const b64 = await fileToBase64(file);
          const resp = await apiJson<any>('/scan/analyze', {
            method: 'POST',
            body: JSON.stringify({
              source: mode === 'upload' ? 'UPLOAD' : 'CAMERA',
              confidence: score,
              imageBase64: b64,
              barcodes
            })
          });

          const queue = resp?.queue ?? (resp?.scanId ? [resp] : []);
          if (queue.length) {
            sessionStorage.setItem('scanQueue', JSON.stringify(queue));
            const first = queue[0];
            sessionStorage.setItem('lastScanResult', JSON.stringify(first));
            window.location.href = `/result?scanId=${encodeURIComponent(first.scanId)}`;
            return;
          }

          setStatus('Scan completed.');
        } catch (e: any) {
          const msg = e?.message ?? 'SCAN_FAILED';
          setStatus(`Error: ${msg}`);
          if (msg === 'LOW_CONFIDENCE') speak('Please adjust the camera angle and scan again.');
          else speak('Scan failed. Please try again.');
        } finally {
          setBusy(false);
        }
      })();
    };
    img.src = url;
  };

  return (
    <main className="container">
      <div className="card">
        <div className="h1">Scan</div>
        <div className="small">
          Safety rule: if confidence is below 70 percent, we stop and ask you to rescan.
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <LangPicker lang={lang} setLang={setLang} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Choose image (tap)</div>
        {mode === 'camera' && (
          <>
            <div className="row" style={{ marginTop: 10, marginBottom: 10 }}>
              <button 
                className={cameraMode === 'user' ? 'primary' : ''} 
                onClick={() => setCameraMode('user')}
                disabled={busy}
              >
                Front Camera
              </button>
              <button 
                className={cameraMode === 'environment' ? 'primary' : ''} 
                onClick={() => setCameraMode('environment')}
                disabled={busy}
              >
                Rear Camera
              </button>
            </div>
            <div className="row" style={{ marginTop: 10, marginBottom: 10 }}>
              <button 
                className="primary"
                onClick={openCamera}
                disabled={busy}
              >
                📷 Open Camera
              </button>
            </div>
          </>
        )}
        <div style={{ marginTop: 10 }}>
          <label>Or choose file:</label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture={mode === 'camera' ? cameraMode : undefined}
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
            style={{ marginTop: 10 }}
          />
        </div>
        <div className="small" style={{ marginTop: 10 }}>Status: {status || '—'}</div>
        <div className="small">Confidence: {confidence == null ? '—' : `${confidence}%`}</div>
      </div>

      {imgUrl ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="h2">Preview</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="scan" style={{ width: '100%', borderRadius: 12, marginTop: 10 }} />
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Next steps (wired next)</div>
        <div className="small">
          - Barcode detection with ZXing (queue multiple barcodes)
          <br />
          - If barcode: Open Food Facts (trusted nutrition)
          <br />
          - If no barcode: Amazon Rekognition (food/not-food), then Open Food Facts search / USDA (trusted)\n          <br />\n          - Then you confirm consumption and quantity by voice/tap (no typing)
        </div>
      </div>

      {cameraOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              maxHeight: '70vh',
              objectFit: 'cover'
            }}
          />
          <div className="row" style={{ marginTop: 20, gap: 10 }}>
            <button
              className="primary"
              onClick={captureImage}
              disabled={busy}
              style={{ fontSize: 16, padding: 12 }}
            >
              ✓ Okay - Capture
            </button>
            <button
              onClick={closeCamera}
              disabled={busy}
              style={{ fontSize: 16, padding: 12 }}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}


