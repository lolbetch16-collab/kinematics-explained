import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff } from 'lucide-react';
import { KalmanFilter } from '@/lib/kinematics';

export default function ObjectTracker() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('Waiting to start...');
  const [cameraError, setCameraError] = useState('');
  const [sensitivity, setSensitivity] = useState(5);
  const [trackingSpeed, setTrackingSpeed] = useState(5);
  const [radarRange, setRadarRange] = useState(7);
  const [historyLength, setHistoryLength] = useState(30);
  const [refLength, setRefLength] = useState(10);
  const [kalmanPN, setKalmanPN] = useState(10);
  const [kalmanMN, setKalmanMN] = useState(10);
  const [smoothingFactor, setSmoothingFactor] = useState(10);
  const [scannerActive, setScannerActive] = useState(false);
  const [radarActive, setRadarActive] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [pixelsPerCm, setPixelsPerCm] = useState(0);
  const [calibStep, setCalibStep] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const velGraphRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const runningRef = useRef(false);
  const positionsRef = useRef<number[]>([]);
  const timesRef = useRef<number[]>([]);
  const velocitiesRef = useRef<number[]>([]);
  const accelerationsRef = useRef<number[]>([]);
  const selectedRef = useRef(false);
  const startedRef = useRef(false);
  const smoothedPosRef = useRef<number | null>(null);
  const startPosRef = useRef(0);
  const startTimeRef = useRef(0);
  const selectionStartRef = useRef<number | null>(null);
  const scanAngleRef = useRef(0);
  const radarAngleRef = useRef(0);
  const kalmanXRef = useRef(new KalmanFilter());
  const kalmanVRef = useRef(new KalmanFilter());
  const lastDetRef = useRef(0);

  const pxToCm = useCallback((px: number) => pixelsPerCm > 0 ? px / pixelsPerCm : 0, [pixelsPerCm]);

  const drawScanner = useCallback(() => {
    const canvas = scannerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,20,0,0.2)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,255,0,0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    scanAngleRef.current = (scanAngleRef.current + 2) % 360;
    const rad = (scanAngleRef.current * Math.PI) / 180;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * Math.cos(rad), cy + r * Math.sin(rad));
    ctx.strokeStyle = 'rgba(0,255,0,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    if (startedRef.current && smoothedPosRef.current !== null && canvasRef.current) {
      const nx = (smoothedPosRef.current / canvasRef.current.width) * w;
      ctx.beginPath(); ctx.arc(nx, h / 2, 8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,255,0,0.8)'; ctx.fill();
    }
  }, []);

  const drawRadar = useCallback(() => {
    const canvas = radarRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, mr = Math.min(w, h) / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,255,0,0.3)'; ctx.lineWidth = 1;
    for (let r = mr / 5; r <= mr; r += mr / 5) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    radarAngleRef.current = (radarAngleRef.current + 3) % 360;
    const rad = (radarAngleRef.current * Math.PI) / 180;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + mr * Math.cos(rad), cy + mr * Math.sin(rad));
    ctx.strokeStyle = 'rgba(0,255,0,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    if (startedRef.current && smoothedPosRef.current !== null && canvasRef.current) {
      const nd = (smoothedPosRef.current / canvasRef.current.width) * mr;
      const a = radarAngleRef.current + 90;
      const ox = cx + nd * Math.cos(a * Math.PI / 180);
      const oy = cy + nd * Math.sin(a * Math.PI / 180);
      ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,255,0,0.8)'; ctx.fill();
    }
  }, []);

  const drawVelGraph = useCallback(() => {
    const canvas = velGraphRef.current;
    if (!canvas || velocitiesRef.current.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height, pad = 20;
    const gw = w - 2 * pad, gh = h - 2 * pad;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'hsl(220, 20%, 97%)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();
    const maxV = Math.max(...velocitiesRef.current.map(Math.abs)) * 1.2 || 1;
    const times = timesRef.current;
    const vels = velocitiesRef.current;
    ctx.beginPath();
    for (let i = 0; i < vels.length; i++) {
      const x = pad + ((times[i] - times[0]) / (times[times.length - 1] - times[0])) * gw;
      const y = h - pad - ((vels[i] + maxV) / (2 * maxV)) * gh;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'hsl(217, 91%, 50%)'; ctx.lineWidth = 2; ctx.stroke();
  }, []);

  const detectFrame = useCallback(async () => {
    if (!runningRef.current) return;
    drawScanner();
    drawRadar();
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current?.active) {
      if (runningRef.current) requestAnimationFrame(detectFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror draw
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    let predictions: any[] = [];
    if (modelRef.current) {
      try {
        predictions = await modelRef.current.detect(video);
        predictions = predictions.filter((p: any) => p.class !== 'person' && p.score >= 0.7);
      } catch {}
    }

    const now = performance.now();
    if (predictions.length > 0) {
      const obj = predictions[0];
      const [x, , w, h2] = obj.bbox;
      const mirX = canvas.width - (x + w);
      const cY = obj.bbox[1] + h2 / 2;

      if (!selectedRef.current) {
        if (mirX <= 100) {
          if (!selectionStartRef.current) selectionStartRef.current = now;
          else if (now - selectionStartRef.current >= 2000) {
            selectedRef.current = true;
            startedRef.current = true;
            setScannerActive(true); setRadarActive(true);
            positionsRef.current = [mirX]; timesRef.current = [now];
            velocitiesRef.current = [0]; accelerationsRef.current = [0];
            smoothedPosRef.current = mirX;
            startPosRef.current = mirX; startTimeRef.current = now;
            kalmanXRef.current.reset(); kalmanVRef.current.reset();
            setStatus('Object selected! Move it inside the frame.');
          }
        } else {
          selectionStartRef.current = null;
          setStatus('Bring object to the right edge to select...');
        }
        ctx.strokeStyle = 'lime'; ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - (x + w), obj.bbox[1], w, h2);
      } else if (startedRef.current) {
        const tSinceLast = now - lastDetRef.current;
        lastDetRef.current = now;
        if (tSinceLast >= 16) {
          const kx = kalmanXRef.current.update(mirX, now);
          const sf = smoothingFactor / 100;
          smoothedPosRef.current = smoothedPosRef.current !== null ? smoothedPosRef.current * (1 - sf) + kx * sf : kx;
          positionsRef.current.push(smoothedPosRef.current);
          timesRef.current.push(now);
          if (positionsRef.current.length > historyLength) {
            positionsRef.current.shift(); timesRef.current.shift();
            if (velocitiesRef.current.length > 0) velocitiesRef.current.shift();
            if (accelerationsRef.current.length > 0) accelerationsRef.current.shift();
          }
          if (positionsRef.current.length >= 2) {
            const len = positionsRef.current.length;
            const dt = (timesRef.current[len - 1] - timesRef.current[len - 2]) / 1000;
            if (dt > 0) {
              const rawV = pxToCm(positionsRef.current[len - 1] - positionsRef.current[len - 2]) / dt;
              const kv = kalmanVRef.current.update(rawV, now);
              velocitiesRef.current.push(kv);
              if (velocitiesRef.current.length >= 2) {
                const vLen = velocitiesRef.current.length;
                const acc = (velocitiesRef.current[vLen - 1] - velocitiesRef.current[vLen - 2]) / dt;
                accelerationsRef.current.push(acc);
              }
            }
          }
        }
        ctx.strokeStyle = 'blue'; ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width - (x + w), obj.bbox[1], w, h2);

        const disp = pxToCm(smoothedPosRef.current! - startPosRef.current);
        const elapsed = (now - startTimeRef.current) / 1000;
        const curV = velocitiesRef.current.length > 0 ? velocitiesRef.current[velocitiesRef.current.length - 1] : 0;
        const curA = accelerationsRef.current.length > 0 ? accelerationsRef.current[accelerationsRef.current.length - 1] : 0;
        setStatus(`Tracking...\nDisplacement: ${disp.toFixed(2)} cm\nVelocity: ${curV.toFixed(2)} cm/s\nAcceleration: ${curA.toFixed(2)} cm/s²\nDuration: ${elapsed.toFixed(2)} s`);
      }
    } else {
      if (!selectedRef.current) {
        selectionStartRef.current = null;
        setStatus('No object detected. Bring object to right edge...');
      } else if (startedRef.current) {
        // Finalize
        startedRef.current = false; selectedRef.current = false;
        setScannerActive(false); setRadarActive(false);
        selectionStartRef.current = null;
        if (positionsRef.current.length >= 2) {
          const dispCm = pxToCm(positionsRef.current[positionsRef.current.length - 1] - positionsRef.current[0]);
          const totalT = (timesRef.current[timesRef.current.length - 1] - timesRef.current[0]) / 1000;
          const maxV = Math.max(...velocitiesRef.current.map(Math.abs));
          const avgV = dispCm / totalT;
          setStatus(`Analysis Complete!\nDisplacement: ${dispCm.toFixed(2)} cm\nDuration: ${totalT.toFixed(2)} s\nMax velocity: ${maxV.toFixed(2)} cm/s\nAvg velocity: ${Math.abs(avgV).toFixed(2)} cm/s`);
          setResults(prev => [`Disp: ${dispCm.toFixed(1)}cm | Time: ${totalT.toFixed(1)}s | MaxV: ${maxV.toFixed(1)}cm/s`, ...prev].slice(0, 10));
          drawVelGraph();
        }
      }
    }
    if (runningRef.current) requestAnimationFrame(detectFrame);
  }, [drawScanner, drawRadar, drawVelGraph, historyLength, smoothingFactor, pxToCm]);

  const toggle = async () => {
    if (!running) {
      setRunning(true); runningRef.current = true;
      setCameraError('');
      setStatus('Initializing camera...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise<void>(r => { videoRef.current!.onloadedmetadata = () => { videoRef.current!.play(); r(); }; });
        }
        if (canvasRef.current) { canvasRef.current.width = 640; canvasRef.current.height = 480; }
        if (!modelRef.current) {
          setStatus('Loading AI model...');
          const cocoSsd = await import('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd/+esm' as any);
          modelRef.current = await cocoSsd.load();
        }
        setStatus('Ready. Bring object to right edge...');
        selectedRef.current = false; startedRef.current = false;
        positionsRef.current = []; timesRef.current = []; velocitiesRef.current = []; accelerationsRef.current = [];
        detectFrame();
      } catch (err: any) {
        setCameraError(err.message || 'Camera access denied');
        setRunning(false); runningRef.current = false;
      }
    } else {
      setRunning(false); runningRef.current = false;
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      setStatus('Stopped.');
      setScannerActive(false); setRadarActive(false);
    }
  };

  const handleCalibStart = () => { setCalibStep(1); setStatus('Click "Set End" when object is at end position.'); };
  const handleCalibEnd = () => {
    if (calibStep !== 1) return;
    setCalibStep(2);
    const dist = 640 / 2; // half canvas
    const ppc = dist / refLength;
    setPixelsPerCm(ppc);
    setStatus(`Calibrated! 1 cm = ${ppc.toFixed(1)} px`);
  };
  const handleCalibReset = () => { setCalibStep(0); setPixelsPerCm(0); setStatus('Calibration reset.'); };

  useEffect(() => { return () => { runningRef.current = false; if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); } }; }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="kinema-section">
        <h2 className="text-2xl font-bold mb-2">Object Motion Tracker</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Track real-world objects with your camera and analyze their motion using AI detection and Kalman filtering.
        </p>

        <button onClick={toggle} className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold transition-all ${running ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
          {running ? <><CameraOff size={16} /> Stop Camera</> : <><Camera size={16} /> Start Camera</>}
        </button>

        {cameraError && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
            <h4 className="font-semibold text-destructive mb-1">Camera Access Denied</h4>
            <p className="text-muted-foreground">{cameraError}</p>
          </div>
        )}

        {/* Video & Canvas */}
        <div className="relative mt-4 mx-auto rounded-xl overflow-hidden bg-foreground/5 border border-border" style={{ maxWidth: 640, aspectRatio: '4/3' }}>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ display: running ? 'block' : 'none' }} />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {!running && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">Camera feed will appear here</div>}
        </div>

        {/* Scanner & Radar */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center">
          <div className="text-center">
            <canvas ref={scannerRef} width={250} height={250} className="rounded-xl border border-border mx-auto" style={{ background: '#000' }} />
            <div className="mt-2 flex items-center justify-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${scannerActive ? 'bg-secondary animate-pulse-glow' : 'bg-destructive'}`} />
              <span>Scanner</span>
            </div>
          </div>
          <div className="text-center">
            <canvas ref={radarRef} width={250} height={250} className="rounded-xl border border-border mx-auto" style={{ background: '#000' }} />
            <div className="mt-2 flex items-center justify-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${radarActive ? 'bg-secondary animate-pulse-glow' : 'bg-destructive'}`} />
              <span>Radar</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-sm">Tracking Controls</h4>
            <SliderControl label="Scanner Sensitivity" value={sensitivity} onChange={setSensitivity} min={1} max={10} />
            <SliderControl label="Tracking Speed" value={trackingSpeed} onChange={setTrackingSpeed} min={1} max={10} />
            <SliderControl label="Radar Range" value={radarRange} onChange={setRadarRange} min={1} max={10} />
            <SliderControl label="History Length" value={historyLength} onChange={setHistoryLength} min={10} max={100} />
          </div>
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-sm">Advanced (Kalman Filter)</h4>
            <SliderControl label="Process Noise" value={kalmanPN} onChange={v => { setKalmanPN(v); kalmanXRef.current.processNoise = v / 100; kalmanVRef.current.processNoise = v / 100; }} min={1} max={20} />
            <SliderControl label="Measurement Noise" value={kalmanMN} onChange={v => { setKalmanMN(v); kalmanXRef.current.measurementNoise = v / 100; kalmanVRef.current.measurementNoise = v / 100; }} min={1} max={20} />
            <SliderControl label="Smoothing Factor" value={smoothingFactor} onChange={setSmoothingFactor} min={1} max={20} />
          </div>
        </div>

        {/* Calibration */}
        <div className="bg-muted/30 rounded-xl p-4 mt-4 space-y-3">
          <h4 className="font-semibold text-sm">Calibration</h4>
          <SliderControl label={`Reference Length: ${refLength.toFixed(1)} cm`} value={refLength} onChange={setRefLength} min={1} max={30} step={0.1} />
          <div className="flex gap-2">
            <button onClick={handleCalibStart} className="px-4 py-2 text-xs rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20">Set Start</button>
            <button onClick={handleCalibEnd} className="px-4 py-2 text-xs rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20">Set End</button>
            <button onClick={handleCalibReset} className="px-4 py-2 text-xs rounded-lg bg-muted text-muted-foreground font-medium hover:bg-muted/80">Reset</button>
          </div>
        </div>

        {/* Kalman Info */}
        <div className="bg-primary/5 rounded-xl p-4 mt-4 border-l-4 border-primary">
          <h4 className="font-semibold text-primary text-sm mb-2">About the Kalman Filter</h4>
          <p className="text-sm text-muted-foreground mb-2">The Kalman filter improves tracking accuracy by combining motion model predictions with sensor measurements.</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
            <li><strong>Process Noise:</strong> Trust in motion model (higher = more responsive)</li>
            <li><strong>Measurement Noise:</strong> Trust in sensor (higher = smoother but laggier)</li>
            <li><strong>Smoothing Factor:</strong> Additional smoothing on Kalman output</li>
          </ul>
          <div className="mt-3 space-y-1">
            <div className="formula-block text-xs">Prediction: x̂ₖ⁻ = Fₖ·x̂ₖ₋₁ + Bₖ·uₖ</div>
            <div className="formula-block text-xs">Update: x̂ₖ = x̂ₖ⁻ + Kₖ·(zₖ - Hₖ·x̂ₖ⁻)</div>
            <div className="formula-block text-xs">Kalman Gain: Kₖ = Pₖ⁻·Hₖᵀ·(Hₖ·Pₖ⁻·Hₖᵀ + Rₖ)⁻¹</div>
          </div>
        </div>

        {/* Results */}
        <div className="mt-4">
          <h4 className="font-semibold text-sm mb-2">Tracking Data</h4>
          <canvas ref={velGraphRef} width={800} height={200} className="w-full rounded-lg border border-border mb-3" style={{ maxHeight: 200 }} />
          <div className="bg-muted/30 rounded-lg p-4 text-sm font-mono whitespace-pre-line min-h-[80px]">{status}</div>
          {results.length > 0 && (
            <div className="mt-3 space-y-2">
              {results.map((r, i) => (
                <div key={i} className="text-xs bg-muted/20 rounded-lg p-3 border border-border">{r}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SliderControl({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground font-medium block mb-1">{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}
