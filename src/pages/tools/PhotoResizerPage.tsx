import React, { useEffect, useState } from 'react';
import { Download, Image as ImageIcon, ShieldCheck, Sliders, Upload } from 'lucide-react';

interface SizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  maxKb: number;
  minKb: number;
}

const PORTAL_PRESETS: SizePreset[] = [
  {
    id: 'upsc_ssc_photo',
    label: 'UPSC / SSC Passport Photo (200 × 230 px · 20–50 KB)',
    width: 200,
    height: 230,
    minKb: 20,
    maxKb: 50,
  },
  {
    id: 'upsc_ssc_sig',
    label: 'UPSC / SSC Signature (140 × 60 px · 10–20 KB)',
    width: 140,
    height: 60,
    minKb: 10,
    maxKb: 20,
  },
  {
    id: 'ibps_photo',
    label: 'IBPS / Banking Photo (200 × 230 px · 20–50 KB)',
    width: 200,
    height: 230,
    minKb: 20,
    maxKb: 50,
  },
  {
    id: 'ibps_sig',
    label: 'IBPS / Banking Signature (140 × 60 px · 10–20 KB)',
    width: 140,
    height: 60,
    minKb: 10,
    maxKb: 20,
  },
  {
    id: 'rrb_photo',
    label: 'Railway RRB Photo (240 × 320 px · 20–70 KB)',
    width: 240,
    height: 320,
    minKb: 20,
    maxKb: 70,
  },
  {
    id: 'thumb_impression',
    label: 'Left Thumb Impression / Declaration (240 × 240 px · 20–50 KB)',
    width: 240,
    height: 240,
    minKb: 20,
    maxKb: 50,
  },
];

export function PhotoResizerPage() {
  const [presetId, setPresetId] = useState(PORTAL_PRESETS[0].id);
  const [width, setWidth] = useState(PORTAL_PRESETS[0].width);
  const [height, setHeight] = useState(PORTAL_PRESETS[0].height);
  const [maxKb, setMaxKb] = useState(PORTAL_PRESETS[0].maxKb);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  const [origUrl, setOrigUrl] = useState('');
  const [origMeta, setOrigMeta] = useState<{ name: string; width: number; height: number; kb: number } | null>(null);
  const [outputUrl, setOutputUrl] = useState('');
  const [outputKb, setOutputKb] = useState(0);
  const [outputQuality, setOutputQuality] = useState(90);
  const [processing, setProcessing] = useState(false);

  const handlePresetChange = (id: string) => {
    setPresetId(id);
    const p = PORTAL_PRESETS.find((x) => x.id === id);
    if (p) {
      setWidth(p.width);
      setHeight(p.height);
      setMaxKb(p.maxKb);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        setOrigUrl(dataUrl);
        setOrigMeta({
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          kb: Math.round((file.size / 1024) * 10) / 10,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!origUrl) return;
    let cancelled = false;
    setProcessing(true);

    const img = new Image();
    img.onload = async () => {
      const targetW = Math.max(40, Math.min(2000, Number(width) || 200));
      const targetH = Math.max(40, Math.min(2000, Number(height) || 230));
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

      const scale =
        fitMode === 'cover'
          ? Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight)
          : Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const dx = (targetW - drawW) / 2;
      const dy = (targetH - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);

      // Binary search JPEG quality to meet target maxKb
      const toBlob = (q: number) =>
        new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', q));

      let low = 0.15;
      let high = 0.96;
      let bestBlob = await toBlob(0.85);
      let bestQ = 0.85;

      for (let i = 0; i < 7; i++) {
        const mid = (low + high) / 2;
        const b = await toBlob(mid);
        if (!b) break;
        const kb = b.size / 1024;
        if (kb <= maxKb) {
          bestBlob = b;
          bestQ = mid;
          low = mid;
        } else {
          high = mid;
          if (!bestBlob || bestBlob.size / 1024 > maxKb) {
            bestBlob = b;
            bestQ = mid;
          }
        }
      }

      if (cancelled || !bestBlob) return;
      const url = URL.createObjectURL(bestBlob);
      setOutputUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setOutputKb(Math.round((bestBlob.size / 1024) * 10) / 10);
      setOutputQuality(Math.round(bestQ * 100));
      setProcessing(false);
    };
    img.src = origUrl;

    return () => {
      cancelled = true;
    };
  }, [origUrl, width, height, maxKb, fitMode]);

  const handleDownload = () => {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `formsaathi-${presetId}-${width}x${height}.jpg`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
          100% Client-Side Browser Utility
        </p>
        <h1 className="text-3xl font-bold text-[#14243A] dark:text-white mt-1">
          Photo &amp; Signature Resizer for Exam Forms
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 max-w-2xl">
          Resize and compress passport photographs, signatures, and thumb impressions to exact pixel dimensions and KB limits for UPSC, SSC, IBPS, and Railway portals.
        </p>
      </div>

      <div className="bg-teal-50/70 dark:bg-teal-950/20 border border-[#CCFBF1] dark:border-teal-900 rounded-xl p-4 flex items-center gap-3 text-xs text-[#172033] dark:text-slate-200">
        <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
        <span>
          <strong>Zero Server Storage:</strong> Your images are processed strictly inside your browser using HTML5 Canvas and never uploaded to any server.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold mb-2">1. Upload Photo or Signature (JPG / PNG)</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E2E8F0] dark:border-slate-700 hover:border-[#14B8A6] rounded-xl p-5 cursor-pointer text-center">
              <Upload className="w-6 h-6 text-[#0D9488] mb-1.5" />
              <span className="text-xs font-semibold">
                {origMeta ? origMeta.name : 'Click to choose image'}
              </span>
              {origMeta && (
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono-num mt-1">
                  Original: {origMeta.width}×{origMeta.height}px · {origMeta.kb} KB
                </span>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">2. Select Exam Preset</label>
            <select
              value={presetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              aria-label="Portal size preset"
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              {PORTAL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1">Width (px)</label>
              <input
                type="number"
                min={40}
                max={2000}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-mono-num bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Height (px)</label>
              <input
                type="number"
                min={40}
                max={2000}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-mono-num bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Max KB</label>
              <input
                type="number"
                min={5}
                max={1024}
                value={maxKb}
                onChange={(e) => setMaxKb(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-mono-num bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Framing Mode</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFitMode('contain')}
                className={`py-2 text-xs font-semibold rounded-lg border ${
                  fitMode === 'contain'
                    ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A]'
                    : 'border-[#E2E8F0] dark:border-slate-700'
                }`}
              >
                Fit (White Padding)
              </button>
              <button
                type="button"
                onClick={() => setFitMode('cover')}
                className={`py-2 text-xs font-semibold rounded-lg border ${
                  fitMode === 'cover'
                    ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A]'
                    : 'border-[#E2E8F0] dark:border-slate-700'
                }`}
              >
                Fill (Center Crop)
              </button>
            </div>
          </div>
        </div>

        {/* Live Side-by-Side Preview */}
        <div className="lg:col-span-7 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          {!origUrl ? (
            <div className="py-16 text-center space-y-3">
              <ImageIcon className="w-10 h-10 text-[#14B8A6] mx-auto" />
              <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
                Upload an image to preview resized output
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-sm mx-auto">
                Output dimensions and exact JPEG KB file size update automatically in your browser.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className="space-y-2 text-center">
                  <p className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                    Original ({origMeta?.width}×{origMeta?.height} · {origMeta?.kb} KB)
                  </p>
                  <div className="p-3 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 rounded-xl flex items-center justify-center min-h-[220px]">
                    <img src={origUrl} alt="Original upload" className="max-h-48 object-contain" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <p className="text-xs font-semibold text-[#0D9488] dark:text-teal-300 font-mono-num">
                    Output ({width}×{height} · {processing ? '...' : `${outputKb} KB`})
                  </p>
                  <div className="p-3 bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#14B8A6] rounded-xl flex items-center justify-center min-h-[220px]">
                    {outputUrl && (
                      <img src={outputUrl} alt="Resized output" className="max-h-48 object-contain border border-slate-300" />
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#64748B] dark:text-slate-400 font-mono-num">
                  JPEG Compression Quality: {outputQuality}% · Target Max: {maxKb} KB
                </span>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!outputUrl || processing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Resized JPEG</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
