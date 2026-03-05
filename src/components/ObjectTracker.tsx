import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, Circle } from 'lucide-react';
import { KalmanFilter } from '@/lib/kinematics';

// Color-based object tracking — no TensorFlow needed
function detectColorBlob(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  targetHue: number,
  hueTolerance: number,
  minSaturation: number,
  minValue: number
): { x: number; y: number; w: number; h: number } | null {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  let sumX = 0, sumY = 0, count = 0;
  let minX = w, minY = h, maxX = 0, maxY = 0;

  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const [hue, sat, val] = rgbToHsv(r, g, b);
      const hueDiff = Math.abs(hue - targetHue);
      const hueMatch = hueDiff < hueTolerance || hueDiff > 360 - hueTolerance;
      if (hueMatch && sat > minSaturation && val > minValue) {
        sumX += x; sumY += y; count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }

  if (count < 50) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

const COLOR_PRESETS = [
  { name: 'Red', hue: 0, color: '#ef4444' },
  { name: 'Orange', hue: 30, color: '#f97316' },
  { name: 'Yellow', hue: 55, color: '#eab308' },
  { name: 'Green', hue: 120, color: '#22c55e' },
  { name: 'Blue', hue: 220, color: '#3b82f6' },
  { name: 'Purple', hue: 280, color: '#a855f7' },
];

export default function ObjectTracker() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('Choose a tracking color and start the camera.');
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
  const [targetColor, setTargetColor] = useState(0); // hue
  const [hueTolerance, setHueTolerance] = useState(25);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const velGraphRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
  const kalmanXRef = useRef(new KalmanFilter(0.5, 2));
  const kalmanVRef = useRef(new KalmanFilter(1, 5));
  const lastDetRef = useRef(0);
  const targetColorRef = useRef(0);
  const hueToleranceRef = useRef(25);
  const sensitivityRef = useRef(5);
  const smoothingFactorRef = useRef(10);
  const historyLengthRef = useRef(30);
  const pixelsPerCmRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { targetColorRef.current = targetColor; }, [targetColor]);
  useEffect(() => { hueToleranceRef.current = hueTolerance; }, [hueTolerance]);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { smoothingFactorRef.current = smoothingFactor; }, [smoothingFactor]);
  useEffect(() => { historyLengthRef.current = historyLength; }, [historyLength]);
  useEffect(() => { pixelsPerCmRef.current = pixelsPerCm; }, [pixelsPerCm]);

  const pxToCm = (px: number) => pixelsPerCmRef.current > 0 ? px / pixelsPerCmRef.current : px;

  // Compute velocity/acceleration from a sliding window using linear regression
  const computeFromWindow = (positions: number[], times: number[], windowSize = 5) => {
    const n = Math.min(windowSize, positions.length);
    if (n < 3) return { velocity: 0, acceleration: 0 };
    const ps = positions.slice(-n);
    const ts = times.slice(-n);
    // Convert times to seconds relative to first sample
    const t0 = ts[0];
    const tSec = ts.map(t => (t - t0) / 1000);
    // Linear regression for velocity: position = v*t + b
    let sumT = 0, sumP = 0, sumTP = 0, sumTT = 0;
    for (let i = 0; i < n; i++) {
      sumT += tSec[i]; sumP += ps[i]; sumTP += tSec[i] * ps[i]; sumTT += tSec[i] * tSec[i];
    }
    const denom = n * sumTT - sumT * sumT;
    const velocity = denom !== 0 ? (n * sumTP - sumT * sumP) / denom : 0;
    // Quadratic regression for acceleration: position = 0.5*a*t^2 + v0*t + x0
    // Use finite differences on velocity estimates from first and second half
    if (n >= 4) {
      const half = Math.floor(n / 2);
      const ps1 = ps.slice(0, half), ts1 = tSec.slice(0, half);
      const ps2 = ps.slice(-half), ts2 = tSec.slice(-half);
      const v1 = linearSlope(ps1, ts1);
      const v2 = linearSlope(ps2, ts2);
      const tMid1 = ts1[Math.floor(ts1.length / 2)];
      const tMid2 = ts2[Math.floor(ts2.length / 2)];
      const dt = tMid2 - tMid1;
      const acceleration = dt > 0.01 ? (v2 - v1) / dt : 0;
      return { velocity: pxToCm(velocity), acceleration: pxToCm(acceleration) };
    }
    return { velocity: pxToCm(velocity), acceleration: 0 };
  };

  const linearSlope = (vals: number[], times: number[]) => {
    const n = vals.length;
    let sumT = 0, sumV = 0, sumTV = 0, sumTT = 0;
    for (let i = 0; i < n; i++) {
      sumT += times[i]; sumV += vals[i]; sumTV += times[i] * vals[i]; sumTT += times[i] * times[i];
    }
    const denom = n * sumTT - sumT * sumT;
    return denom !== 0 ? (n * sumTV - sumT * sumV) / denom : 0;
  };

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

  const detectFrame = useCallback(() => {
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

    // Draw video (mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Color-based detection
    const minSat = (11 - sensitivityRef.current) * 0.08;
    const blob = detectColorBlob(ctx, canvas.width, canvas.height, targetColorRef.current, hueToleranceRef.current, minSat, 0.25);

    const now = performance.now();

    if (blob && blob.w > 10 && blob.h > 10) {
      const centerX = blob.x + blob.w / 2;
      const centerY = blob.y + blob.h / 2;

      // Draw bounding box
      ctx.strokeStyle = startedRef.current ? 'hsl(217, 91%, 50%)' : 'hsl(145, 63%, 42%)';
      ctx.lineWidth = startedRef.current ? 3 : 2;
      ctx.strokeRect(blob.x, blob.y, blob.w, blob.h);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '14px Space Grotesk, sans-serif';
      ctx.fillText(startedRef.current ? '● Tracking' : '● Detected', blob.x, blob.y > 20 ? blob.y - 6 : blob.y + blob.h + 16);

      if (!selectedRef.current) {
        // Auto-select after holding still near left edge for 1.5s
        if (centerX <= 120) {
          if (!selectionStartRef.current) selectionStartRef.current = now;
          else if (now - selectionStartRef.current >= 1500) {
            selectedRef.current = true;
            startedRef.current = true;
            setScannerActive(true); setRadarActive(true);
            positionsRef.current = [centerX]; timesRef.current = [now];
            velocitiesRef.current = [0]; accelerationsRef.current = [0];
            smoothedPosRef.current = centerX;
            startPosRef.current = centerX; startTimeRef.current = now;
            kalmanXRef.current.reset(); kalmanVRef.current.reset();
            setStatus('Object locked! Move it to track motion.');
          }
        } else {
          selectionStartRef.current = null;
          setStatus(`Object detected. Move it to the LEFT edge and hold for 1.5s to start tracking.`);
        }
      } else if (startedRef.current) {
        const tSinceLast = now - lastDetRef.current;
        lastDetRef.current = now;
        if (tSinceLast >= 16) {
          // Kalman-filtered position
          const kx = kalmanXRef.current.update(centerX, now);
          // Exponential smoothing on filtered position
          const sf = Math.max(0.3, smoothingFactorRef.current / 10); // 0.3–1.0 range
          smoothedPosRef.current = smoothedPosRef.current !== null
            ? smoothedPosRef.current * (1 - sf) + kx * sf
            : kx;
          positionsRef.current.push(smoothedPosRef.current);
          timesRef.current.push(now);
          // Trim history
          const maxHist = Math.max(historyLengthRef.current, 20);
          while (positionsRef.current.length > maxHist) {
            positionsRef.current.shift(); timesRef.current.shift();
          }
        }

        // Compute velocity & acceleration from sliding window regression
        // Use larger window when movement is slow for better noise rejection
        const positions = positionsRef.current;
        const times = timesRef.current;
        const recentSpan = positions.length >= 5
          ? Math.abs(positions[positions.length - 1] - positions[positions.length - 5])
          : 0;
        const isSlowMotion = recentSpan < 8; // less than 8px over recent samples
        const windowSize = isSlowMotion
          ? Math.max(12, Math.min(positions.length, 25))
          : Math.max(8, Math.min(positions.length, 15));
        const { velocity: rawV, acceleration: rawA } = computeFromWindow(
          positions, times, windowSize
        );

        // Dead-zone: if total displacement in window is tiny, suppress velocity
        const winStart = Math.max(0, positions.length - windowSize);
        const winDisp = Math.abs(positions[positions.length - 1] - positions[winStart]);
        const winTime = (times[times.length - 1] - times[winStart]) / 1000;
        const deadZoneThreshold = 3; // px — noise floor
        let curV = rawV;
        let curA = rawA;
        if (winDisp < deadZoneThreshold && winTime > 0.15) {
          // Object is essentially stationary — suppress noise
          curV = 0;
          curA = 0;
        } else if (isSlowMotion) {
          // Scale down velocity proportionally to how close we are to the dead zone
          const scale = Math.min(1, (winDisp - deadZoneThreshold) / 10);
          curV = rawV * Math.max(0, scale);
          curA = rawA * Math.max(0, scale);
        }

        // Store for graph/history
        velocitiesRef.current.push(curV);
        accelerationsRef.current.push(curA);
        while (velocitiesRef.current.length > 100) velocitiesRef.current.shift();
        while (accelerationsRef.current.length > 100) accelerationsRef.current.shift();

        const disp = pxToCm(smoothedPosRef.current! - startPosRef.current);
        const elapsed = (now - startTimeRef.current) / 1000;
        setStatus(`● Tracking Active\nDisplacement: ${disp.toFixed(2)} ${pixelsPerCmRef.current > 0 ? 'cm' : 'px'}\nVelocity: ${curV.toFixed(2)} ${pixelsPerCmRef.current > 0 ? 'cm/s' : 'px/s'}\nAcceleration: ${curA.toFixed(2)} ${pixelsPerCmRef.current > 0 ? 'cm/s²' : 'px/s²'}\nDuration: ${elapsed.toFixed(2)} s`);
      }
    } else {
      if (!selectedRef.current) {
        selectionStartRef.current = null;
        setStatus('No matching color detected. Hold a colored object in front of the camera.');
      } else if (startedRef.current) {
        startedRef.current = false; selectedRef.current = false;
        setScannerActive(false); setRadarActive(false);
        selectionStartRef.current = null;
        if (positionsRef.current.length >= 2) {
          const dispCm = pxToCm(positionsRef.current[positionsRef.current.length - 1] - positionsRef.current[0]);
          const totalT = (timesRef.current[timesRef.current.length - 1] - timesRef.current[0]) / 1000;
          const maxV = Math.max(...velocitiesRef.current.map(Math.abs));
          const avgV = dispCm / totalT;
          setStatus(`✓ Analysis Complete\nDisplacement: ${dispCm.toFixed(2)} cm\nDuration: ${totalT.toFixed(2)} s\nMax velocity: ${maxV.toFixed(2)} cm/s\nAvg velocity: ${Math.abs(avgV).toFixed(2)} cm/s`);
          setResults(prev => [`Δx: ${dispCm.toFixed(1)}cm | t: ${totalT.toFixed(1)}s | v_max: ${maxV.toFixed(1)}cm/s`, ...prev].slice(0, 10));
          drawVelGraph();
        }
      }
    }
    if (runningRef.current) requestAnimationFrame(detectFrame);
  }, [drawScanner, drawRadar, drawVelGraph]);

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
        setStatus('Camera ready. Hold a colored object in view.');
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
      setStatus('Camera stopped.');
      setScannerActive(false); setRadarActive(false);
    }
  };

  const handleCalibStart = () => { setCalibStep(1); setStatus('Move object to end position, then click "Set End".'); };
  const handleCalibEnd = () => {
    if (calibStep !== 1) return;
    setCalibStep(2);
    const dist = 640 / 2;
    const ppc = dist / refLength;
    setPixelsPerCm(ppc);
    setStatus(`✓ Calibrated: 1 cm ≈ ${ppc.toFixed(1)} px`);
  };
  const handleCalibReset = () => { setCalibStep(0); setPixelsPerCm(0); setStatus('Calibration reset.'); };

  useEffect(() => { return () => { runningRef.current = false; if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); } }; }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="kinema-section">
        <h2 className="text-2xl font-bold mb-2">Object Motion Tracker</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Track colored objects with your camera using real-time color detection and Kalman filtering. No AI model required — works instantly.
        </p>

        {/* Color selector */}
        <div className="mb-4">
          <label className="kinema-label">Select Tracking Color</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.name}
                onClick={() => setTargetColor(c.hue)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                  targetColor === c.hue ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border hover:border-muted-foreground'
                }`}
              >
                <Circle size={14} fill={c.color} stroke={c.color} />
                {c.name}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <SliderControl label={`Hue Tolerance: ${hueTolerance}°`} value={hueTolerance} onChange={setHueTolerance} min={5} max={60} />
          </div>
        </div>

        <button onClick={toggle} className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold transition-all ${running ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
          {running ? <><CameraOff size={16} /> Stop Camera</> : <><Camera size={16} /> Start Camera</>}
        </button>

        {cameraError && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
            <h4 className="font-semibold text-destructive mb-1">Camera Access Error</h4>
            <p className="text-muted-foreground">{cameraError}</p>
            <ul className="text-muted-foreground text-xs mt-2 list-disc pl-4 space-y-1">
              <li>Check browser permissions for camera access</li>
              <li>Ensure no other app is using your camera</li>
              <li>Try using HTTPS (camera requires secure context)</li>
            </ul>
          </div>
        )}

        {/* Video & Canvas */}
        <div className="relative mt-4 mx-auto rounded-xl overflow-hidden bg-foreground/5 border border-border" style={{ maxWidth: 640, aspectRatio: '4/3' }}>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ display: 'none' }} />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {!running && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">Camera feed will appear here</div>}
        </div>

        {/* Scanner & Radar */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center">
          <div className="text-center">
            <canvas ref={scannerRef} width={250} height={250} className="rounded-xl border border-border mx-auto" style={{ background: '#001a00' }} />
            <div className="mt-2 flex items-center justify-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full transition-all ${scannerActive ? 'bg-secondary animate-pulse-glow' : 'bg-destructive'}`} />
              <span>Object Scanner</span>
            </div>
          </div>
          <div className="text-center">
            <canvas ref={radarRef} width={250} height={250} className="rounded-xl border border-border mx-auto" style={{ background: '#001a00' }} />
            <div className="mt-2 flex items-center justify-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full transition-all ${radarActive ? 'bg-secondary animate-pulse-glow' : 'bg-destructive'}`} />
              <span>Tracking Radar</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-sm">Tracking Controls</h4>
            <SliderControl label={`Scanner Sensitivity: ${sensitivity}/10`} value={sensitivity} onChange={setSensitivity} min={1} max={10} />
            <SliderControl label={`Tracking Speed: ${trackingSpeed}/10`} value={trackingSpeed} onChange={setTrackingSpeed} min={1} max={10} />
            <SliderControl label={`Radar Range: ${radarRange}/10`} value={radarRange} onChange={setRadarRange} min={1} max={10} />
            <SliderControl label={`History Length: ${historyLength}`} value={historyLength} onChange={setHistoryLength} min={10} max={100} />
          </div>
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-sm">Kalman Filter Parameters</h4>
            <SliderControl label={`Process Noise: ${(kalmanPN / 100).toFixed(2)}`} value={kalmanPN} onChange={v => { setKalmanPN(v); kalmanXRef.current.processNoise = v / 100; kalmanVRef.current.processNoise = v / 100; }} min={1} max={20} />
            <SliderControl label={`Measurement Noise: ${(kalmanMN / 100).toFixed(2)}`} value={kalmanMN} onChange={v => { setKalmanMN(v); kalmanXRef.current.measurementNoise = v / 100; kalmanVRef.current.measurementNoise = v / 100; }} min={1} max={20} />
            <SliderControl label={`Smoothing: ${(smoothingFactor / 100).toFixed(2)}`} value={smoothingFactor} onChange={setSmoothingFactor} min={1} max={20} />
          </div>
        </div>

        {/* Calibration */}
        <div className="bg-muted/30 rounded-xl p-4 mt-4 space-y-3">
          <h4 className="font-semibold text-sm">Distance Calibration</h4>
          <SliderControl label={`Reference Length: ${refLength.toFixed(1)} cm`} value={refLength} onChange={setRefLength} min={1} max={30} step={0.1} />
          <div className="flex gap-2">
            <button onClick={handleCalibStart} className="px-4 py-2 text-xs rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">Set Start</button>
            <button onClick={handleCalibEnd} className="px-4 py-2 text-xs rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">Set End</button>
            <button onClick={handleCalibReset} className="px-4 py-2 text-xs rounded-lg bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors">Reset</button>
          </div>
        </div>

        {/* Kalman Info */}
        <div className="bg-primary/5 rounded-xl p-5 mt-4 border-l-4 border-primary">
          <h4 className="font-semibold text-primary text-sm mb-2">About the Kalman Filter Algorithm</h4>
          <p className="text-sm text-muted-foreground mb-3">
            The Kalman filter is an optimal recursive estimation algorithm. It combines noisy measurements with a predictive model to produce estimates that are more accurate than either alone.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4 mb-3">
            <li><strong>Process Noise (Q):</strong> How much to trust our motion model — higher = more responsive to changes</li>
            <li><strong>Measurement Noise (R):</strong> How much to trust sensor data — higher = smoother but more lag</li>
            <li><strong>Kalman Gain (K):</strong> Optimal weighting between prediction and measurement</li>
          </ul>
          <div className="space-y-1.5">
            <div className="formula-block text-xs">Predict: x̂ₖ⁻ = F·x̂ₖ₋₁ + B·uₖ</div>
            <div className="formula-block text-xs">Predict Covariance: Pₖ⁻ = F·Pₖ₋₁·Fᵀ + Q</div>
            <div className="formula-block text-xs">Kalman Gain: Kₖ = Pₖ⁻·Hᵀ·(H·Pₖ⁻·Hᵀ + R)⁻¹</div>
            <div className="formula-block text-xs">Update: x̂ₖ = x̂ₖ⁻ + Kₖ·(zₖ − H·x̂ₖ⁻)</div>
            <div className="formula-block text-xs">Update Covariance: Pₖ = (I − Kₖ·H)·Pₖ⁻</div>
          </div>
        </div>

        {/* Results */}
        <div className="mt-4">
          <h4 className="font-semibold text-sm mb-2">Tracking Data</h4>
          <canvas ref={velGraphRef} width={800} height={200} className="w-full rounded-lg border border-border mb-3" style={{ maxHeight: 200 }} />
          <div className="bg-muted/30 rounded-lg p-4 text-sm font-mono whitespace-pre-line min-h-[80px]">{status}</div>
          {results.length > 0 && (
            <div className="mt-3 space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground">History</h5>
              {results.map((r, i) => (
                <div key={i} className="text-xs font-mono bg-muted/20 rounded-lg p-3 border border-border">{r}</div>
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
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}
