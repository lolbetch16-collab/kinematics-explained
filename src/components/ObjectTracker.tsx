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

interface GateCrossing {
  gateLineX: number;
  time: number;
  direction: 'left-to-right' | 'right-to-left';
}

interface TripResult {
  displacement: number; // cm or px
  duration: number; // seconds
  velocity: number; // cm/s or px/s
  direction: string;
  timestamp: number;
}

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
  const [targetColor, setTargetColor] = useState(0);
  const [hueTolerance, setHueTolerance] = useState(25);

  // Gate line state
  const [gateLineA, setGateLineA] = useState<number | null>(null); // x position of start line
  const [gateLineB, setGateLineB] = useState<number | null>(null); // x position of end line
  const [gateStatus, setGateStatus] = useState<'idle' | 'setting-start' | 'setting-end' | 'ready'>('idle');
  const [tripResults, setTripResults] = useState<TripResult[]>([]);

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

  // Gate refs for use inside animation loop
  const gateLineARef = useRef<number | null>(null);
  const gateLineBRef = useRef<number | null>(null);
  const gateStatusRef = useRef<'idle' | 'setting-start' | 'setting-end' | 'ready'>('idle');
  const gateCrossingARef = useRef<{ time: number; x: number } | null>(null);
  const prevXRef = useRef<number | null>(null);
  const gateDistancePxRef = useRef(0);
  const refLengthRef = useRef(10);
  const tripResultsRef = useRef<TripResult[]>([]);

  // Instantaneous velocity tracking for real-time display between gates
  const instantVelocityRef = useRef(0);
  const instantAccelRef = useRef(0);
  const prevInstantVelRef = useRef(0);
  const prevInstantTimeRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { targetColorRef.current = targetColor; }, [targetColor]);
  useEffect(() => { hueToleranceRef.current = hueTolerance; }, [hueTolerance]);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { smoothingFactorRef.current = smoothingFactor; }, [smoothingFactor]);
  useEffect(() => { historyLengthRef.current = historyLength; }, [historyLength]);
  useEffect(() => { pixelsPerCmRef.current = pixelsPerCm; }, [pixelsPerCm]);
  useEffect(() => { gateLineARef.current = gateLineA; }, [gateLineA]);
  useEffect(() => { gateLineBRef.current = gateLineB; }, [gateLineB]);
  useEffect(() => { gateStatusRef.current = gateStatus; }, [gateStatus]);
  useEffect(() => { refLengthRef.current = refLength; }, [refLength]);

  const pxToCm = (px: number) => {
    if (gateDistancePxRef.current > 0 && refLengthRef.current > 0) {
      return (px / gateDistancePxRef.current) * refLengthRef.current;
    }
    if (pixelsPerCmRef.current > 0) return px / pixelsPerCmRef.current;
    return px;
  };

  const getUnit = () => {
    if (gateDistancePxRef.current > 0 || pixelsPerCmRef.current > 0) return 'cm';
    return 'px';
  };

  // Draw gate lines on canvas
  const drawGateLines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const lineA = gateLineARef.current;
    const lineB = gateLineBRef.current;

    if (lineA !== null) {
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'hsl(145, 80%, 50%)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lineA, 0);
      ctx.lineTo(lineA, h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'hsl(145, 80%, 50%)';
      ctx.font = 'bold 14px Space Grotesk, sans-serif';
      ctx.fillText('START', lineA + 6, 24);
      // Arrow
      ctx.beginPath();
      ctx.moveTo(lineA, h / 2 - 10);
      ctx.lineTo(lineA + 12, h / 2);
      ctx.lineTo(lineA, h / 2 + 10);
      ctx.fillStyle = 'hsla(145, 80%, 50%, 0.5)';
      ctx.fill();
      ctx.restore();
    }

    if (lineB !== null) {
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'hsl(0, 80%, 55%)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lineB, 0);
      ctx.lineTo(lineB, h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'hsl(0, 80%, 55%)';
      ctx.font = 'bold 14px Space Grotesk, sans-serif';
      ctx.fillText('END', lineB + 6, 24);
      // Arrow
      ctx.beginPath();
      ctx.moveTo(lineB, h / 2 - 10);
      ctx.lineTo(lineB - 12, h / 2);
      ctx.lineTo(lineB, h / 2 + 10);
      ctx.fillStyle = 'hsla(0, 80%, 55%, 0.5)';
      ctx.fill();
      ctx.restore();
    }

    // Draw distance indicator between lines
    if (lineA !== null && lineB !== null) {
      const midY = h - 30;
      ctx.save();
      ctx.strokeStyle = 'hsla(45, 90%, 60%, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lineA, midY);
      ctx.lineTo(lineB, midY);
      ctx.stroke();
      // End caps
      ctx.beginPath();
      ctx.moveTo(lineA, midY - 8); ctx.lineTo(lineA, midY + 8); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lineB, midY - 8); ctx.lineTo(lineB, midY + 8); ctx.stroke();
      // Label
      const dist = pxToCm(Math.abs(lineB - lineA));
      const unit = getUnit();
      ctx.fillStyle = 'hsl(45, 90%, 60%)';
      ctx.font = 'bold 13px Space Grotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${dist.toFixed(1)} ${unit}`, (lineA + lineB) / 2, midY - 10);
      ctx.restore();
    }
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

    // Always draw gate lines
    drawGateLines(ctx, canvas.width, canvas.height);

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

      // If we're setting gate positions, capture object's current X
      if (gateStatusRef.current === 'setting-start') {
        gateLineARef.current = centerX;
        setGateLineA(centerX);
        gateStatusRef.current = 'idle';
        setGateStatus('idle');
        setStatus('Start line set! Now click "Set End" and move the object to the end position.');
      } else if (gateStatusRef.current === 'setting-end') {
        gateLineBRef.current = centerX;
        setGateLineB(centerX);
        gateStatusRef.current = 'ready';
        setGateStatus('ready');
        // Calculate gate distance
        const distPx = Math.abs(centerX - (gateLineARef.current ?? 0));
        gateDistancePxRef.current = distPx;
        const distCm = (distPx / distPx) * refLengthRef.current; // = refLength
        setPixelsPerCm(distPx / refLengthRef.current);
        setStatus(`✓ Gates set! Distance: ${distCm.toFixed(1)} cm (${distPx.toFixed(0)} px)\nMove object across the gates to measure velocity.`);
      }

      if (!selectedRef.current) {
        // Auto-select: hold near left edge for 1.5s
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
            prevXRef.current = centerX;
            gateCrossingARef.current = null;
            instantVelocityRef.current = 0;
            instantAccelRef.current = 0;
            prevInstantVelRef.current = 0;
            prevInstantTimeRef.current = now;
            kalmanXRef.current.reset(); kalmanVRef.current.reset();
            setStatus('Object locked! Move it across the gate lines to measure velocity.');
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
          const sf = Math.max(0.3, smoothingFactorRef.current / 10);
          smoothedPosRef.current = smoothedPosRef.current !== null
            ? smoothedPosRef.current * (1 - sf) + kx * sf
            : kx;
          positionsRef.current.push(smoothedPosRef.current);
          timesRef.current.push(now);
          const maxHist = Math.max(historyLengthRef.current, 20);
          while (positionsRef.current.length > maxHist) {
            positionsRef.current.shift(); timesRef.current.shift();
          }
        }

        const currentX = smoothedPosRef.current!;
        const prevX = prevXRef.current;
        const lineA = gateLineARef.current;
        const lineB = gateLineBRef.current;

        // === Gate-crossing detection ===
        if (lineA !== null && lineB !== null && prevX !== null && gateStatusRef.current === 'ready') {
          const leftGate = Math.min(lineA, lineB);
          const rightGate = Math.max(lineA, lineB);

          // Check if object crossed the start gate (gate A)
          const crossedA = (prevX <= lineA && currentX > lineA) || (prevX >= lineA && currentX < lineA);
          const crossedB = (prevX <= lineB && currentX > lineB) || (prevX >= lineB && currentX < lineB);

          if (crossedA && !gateCrossingARef.current) {
            // Object just crossed gate A — start timing
            gateCrossingARef.current = { time: now, x: lineA };
            setStatus('⏱ Object crossed START gate — timing...');
          } else if (crossedB && gateCrossingARef.current) {
            // Object crossed gate B — calculate trip
            const tripTime = (now - gateCrossingARef.current.time) / 1000;
            const distPx = Math.abs(lineB - lineA);
            const distReal = pxToCm(distPx);
            const velocity = tripTime > 0.001 ? distReal / tripTime : 0;
            const direction = currentX > prevX ? '→' : '←';

            // Calculate acceleration from velocity change
            const prevVel = prevInstantVelRef.current;
            const prevTime = prevInstantTimeRef.current;
            const dt = (now - prevTime) / 1000;
            const accel = dt > 0.05 ? (velocity - prevVel) / dt : 0;

            instantVelocityRef.current = velocity;
            instantAccelRef.current = accel;
            prevInstantVelRef.current = velocity;
            prevInstantTimeRef.current = now;

            const unit = getUnit();
            const trip: TripResult = {
              displacement: distReal,
              duration: tripTime,
              velocity,
              direction,
              timestamp: now,
            };

            tripResultsRef.current = [trip, ...tripResultsRef.current].slice(0, 20);
            setTripResults([...tripResultsRef.current]);

            // Store for graph
            velocitiesRef.current.push(velocity);
            timesRef.current.push(now);
            while (velocitiesRef.current.length > 100) velocitiesRef.current.shift();

            // Classify speed
            let speedLabel = '';
            if (velocity < 5) speedLabel = '🐌 Very Slow';
            else if (velocity < 20) speedLabel = '🚶 Slow';
            else if (velocity < 60) speedLabel = '🏃 Medium';
            else if (velocity < 150) speedLabel = '🚗 Fast';
            else speedLabel = '🚀 Very Fast';

            setStatus(
              `✓ Gate Crossing Complete ${direction}\n` +
              `Speed: ${speedLabel}\n` +
              `Distance: ${distReal.toFixed(2)} ${unit}\n` +
              `Time: ${tripTime.toFixed(3)} s\n` +
              `Velocity: ${velocity.toFixed(2)} ${unit}/s\n` +
              `Acceleration: ${accel.toFixed(2)} ${unit}/s²`
            );

            setResults(prev => [
              `${direction} v: ${velocity.toFixed(1)} ${unit}/s | t: ${tripTime.toFixed(2)}s | Δx: ${distReal.toFixed(1)} ${unit} | ${speedLabel}`,
              ...prev
            ].slice(0, 10));

            drawVelGraph();
            gateCrossingARef.current = null;
          }

          // Also allow B→A crossings (reverse direction)
          if (crossedB && !gateCrossingARef.current) {
            gateCrossingARef.current = { time: now, x: lineB };
            setStatus('⏱ Object crossed END gate — timing reverse...');
          } else if (crossedA && gateCrossingARef.current && gateCrossingARef.current.x === lineB) {
            const tripTime = (now - gateCrossingARef.current.time) / 1000;
            const distPx = Math.abs(lineB - lineA);
            const distReal = pxToCm(distPx);
            const velocity = tripTime > 0.001 ? distReal / tripTime : 0;
            const direction = '←';

            const prevVel = prevInstantVelRef.current;
            const prevTime = prevInstantTimeRef.current;
            const dt = (now - prevTime) / 1000;
            const accel = dt > 0.05 ? (velocity - prevVel) / dt : 0;

            instantVelocityRef.current = velocity;
            instantAccelRef.current = accel;
            prevInstantVelRef.current = velocity;
            prevInstantTimeRef.current = now;

            const unit = getUnit();
            const trip: TripResult = {
              displacement: distReal,
              duration: tripTime,
              velocity,
              direction,
              timestamp: now,
            };

            tripResultsRef.current = [trip, ...tripResultsRef.current].slice(0, 20);
            setTripResults([...tripResultsRef.current]);

            velocitiesRef.current.push(velocity);
            timesRef.current.push(now);

            let speedLabel = '';
            if (velocity < 5) speedLabel = '🐌 Very Slow';
            else if (velocity < 20) speedLabel = '🚶 Slow';
            else if (velocity < 60) speedLabel = '🏃 Medium';
            else if (velocity < 150) speedLabel = '🚗 Fast';
            else speedLabel = '🚀 Very Fast';

            setStatus(
              `✓ Gate Crossing Complete ${direction}\n` +
              `Speed: ${speedLabel}\n` +
              `Distance: ${distReal.toFixed(2)} ${unit}\n` +
              `Time: ${tripTime.toFixed(3)} s\n` +
              `Velocity: ${velocity.toFixed(2)} ${unit}/s\n` +
              `Acceleration: ${accel.toFixed(2)} ${unit}/s²`
            );

            setResults(prev => [
              `${direction} v: ${velocity.toFixed(1)} ${unit}/s | t: ${tripTime.toFixed(2)}s | Δx: ${distReal.toFixed(1)} ${unit} | ${speedLabel}`,
              ...prev
            ].slice(0, 10));

            drawVelGraph();
            gateCrossingARef.current = null;
          }
        }

        // Real-time status when gates are not set or between crossings
        if (gateStatusRef.current !== 'ready' || (!gateCrossingARef.current && tripResultsRef.current.length === 0)) {
          const disp = pxToCm(currentX - startPosRef.current);
          const elapsed = (now - startTimeRef.current) / 1000;
          const unit = getUnit();
          
          // Simple velocity from recent positions
          const positions = positionsRef.current;
          const times = timesRef.current;
          let simpleV = 0;
          if (positions.length >= 3) {
            const lookback = Math.min(10, positions.length);
            const dt = (times[times.length - 1] - times[times.length - lookback]) / 1000;
            const dx = positions[positions.length - 1] - positions[positions.length - lookback];
            if (dt > 0.05) simpleV = pxToCm(dx) / dt;
          }

          if (gateStatusRef.current === 'ready') {
            setStatus(
              `● Tracking Active — Move object across gates\n` +
              `Position: ${pxToCm(currentX).toFixed(1)} ${unit}\n` +
              `Duration: ${elapsed.toFixed(1)} s`
            );
          } else {
            setStatus(
              `● Tracking Active (no gates set)\n` +
              `Displacement: ${disp.toFixed(2)} ${unit}\n` +
              `Velocity: ${simpleV.toFixed(2)} ${unit}/s\n` +
              `Duration: ${elapsed.toFixed(1)} s\n` +
              `Set gate lines for accurate measurement.`
            );
          }
        } else if (gateCrossingARef.current) {
          // Currently timing a crossing
          const elapsed = (now - gateCrossingARef.current.time) / 1000;
          setStatus(`⏱ Timing... ${elapsed.toFixed(2)}s\nMove object to the other gate line.`);
        }

        prevXRef.current = currentX;
      }
    } else {
      if (!selectedRef.current) {
        selectionStartRef.current = null;
        setStatus('No matching color detected. Hold a colored object in front of the camera.');
      } else if (startedRef.current) {
        startedRef.current = false; selectedRef.current = false;
        setScannerActive(false); setRadarActive(false);
        selectionStartRef.current = null;
        gateCrossingARef.current = null;
        prevXRef.current = null;
        if (tripResultsRef.current.length > 0) {
          const last = tripResultsRef.current[0];
          const unit = getUnit();
          setStatus(
            `✓ Tracking Lost\nLast measurement:\n` +
            `  Velocity: ${last.velocity.toFixed(2)} ${unit}/s\n` +
            `  Distance: ${last.displacement.toFixed(2)} ${unit}\n` +
            `  Time: ${last.duration.toFixed(3)} s`
          );
        } else {
          setStatus('Object lost. Hold in view to re-track.');
        }
        drawVelGraph();
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
        prevXRef.current = null;
        gateCrossingARef.current = null;
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

  const handleSetStart = () => {
    if (!running) { setStatus('Start the camera first!'); return; }
    setGateStatus('setting-start');
    gateStatusRef.current = 'setting-start';
    setStatus('Hold your object at the START position. The line will be placed at the object\'s center.');
  };

  const handleSetEnd = () => {
    if (!running) { setStatus('Start the camera first!'); return; }
    if (gateLineA === null) { setStatus('Set the start line first!'); return; }
    setGateStatus('setting-end');
    gateStatusRef.current = 'setting-end';
    setStatus('Move your object to the END position. The line will be placed at the object\'s center.');
  };

  const handleResetGates = () => {
    setGateLineA(null);
    setGateLineB(null);
    setGateStatus('idle');
    gateLineARef.current = null;
    gateLineBRef.current = null;
    gateStatusRef.current = 'idle';
    gateDistancePxRef.current = 0;
    gateCrossingARef.current = null;
    setPixelsPerCm(0);
    setTripResults([]);
    tripResultsRef.current = [];
    setStatus('Gates reset. Set new gate positions.');
  };

  useEffect(() => { return () => { runningRef.current = false; if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); } }; }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="kinema-section">
        <h2 className="text-2xl font-bold mb-2">Object Motion Tracker</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Track colored objects using gate lines for precise velocity measurement.
          Set two vertical reference lines, then move the object between them — the system accurately times the crossing for both fast and slow motion.
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

        {/* Gate Lines Setup */}
        <div className="bg-accent/20 rounded-xl p-4 mt-4 space-y-3 border border-accent/30">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            📏 Gate Lines — Distance Calibration
            {gateStatus === 'ready' && <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">✓ Ready</span>}
          </h4>
          <p className="text-xs text-muted-foreground">
            Place your object at the start position and click "Set Start", then move it to the end and click "Set End".
            The system will draw two vertical reference lines and measure the time taken for the object to cross between them.
          </p>
          <SliderControl label={`Reference Distance: ${refLength.toFixed(1)} cm`} value={refLength} onChange={setRefLength} min={1} max={100} step={0.5} />
          <div className="flex gap-2">
            <button
              onClick={handleSetStart}
              className={`px-4 py-2 text-xs rounded-lg font-medium transition-colors ${
                gateStatus === 'setting-start'
                  ? 'bg-secondary text-secondary-foreground animate-pulse'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {gateLineA !== null ? '✓ Start Set' : 'Set Start'}
            </button>
            <button
              onClick={handleSetEnd}
              className={`px-4 py-2 text-xs rounded-lg font-medium transition-colors ${
                gateStatus === 'setting-end'
                  ? 'bg-secondary text-secondary-foreground animate-pulse'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {gateLineB !== null ? '✓ End Set' : 'Set End'}
            </button>
            <button onClick={handleResetGates} className="px-4 py-2 text-xs rounded-lg bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors">
              Reset Gates
            </button>
          </div>
          {gateLineA !== null && gateLineB !== null && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
              Gate distance: {Math.abs(gateLineB - gateLineA).toFixed(0)} px = {refLength.toFixed(1)} cm
              <br />
              Move your tracked object back and forth across the gates to measure velocity.
            </div>
          )}
        </div>

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

        {/* Trip Results Table */}
        {tripResults.length > 0 && (
          <div className="mt-4 bg-muted/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm mb-3">Gate Crossing History</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground">#</th>
                    <th className="text-left py-2 px-2 text-muted-foreground">Dir</th>
                    <th className="text-right py-2 px-2 text-muted-foreground">Distance</th>
                    <th className="text-right py-2 px-2 text-muted-foreground">Time</th>
                    <th className="text-right py-2 px-2 text-muted-foreground">Velocity</th>
                    <th className="text-left py-2 px-2 text-muted-foreground">Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {tripResults.map((t, i) => {
                    const unit = getUnit();
                    let speedLabel = '';
                    if (t.velocity < 5) speedLabel = '🐌 Very Slow';
                    else if (t.velocity < 20) speedLabel = '🚶 Slow';
                    else if (t.velocity < 60) speedLabel = '🏃 Medium';
                    else if (t.velocity < 150) speedLabel = '🚗 Fast';
                    else speedLabel = '🚀 Very Fast';
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2 px-2 font-mono">{tripResults.length - i}</td>
                        <td className="py-2 px-2">{t.direction}</td>
                        <td className="py-2 px-2 text-right font-mono">{t.displacement.toFixed(1)} {unit}</td>
                        <td className="py-2 px-2 text-right font-mono">{t.duration.toFixed(3)}s</td>
                        <td className="py-2 px-2 text-right font-mono font-bold">{t.velocity.toFixed(1)} {unit}/s</td>
                        <td className="py-2 px-2">{speedLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Kalman Info */}
        <div className="bg-primary/5 rounded-xl p-5 mt-4 border-l-4 border-primary">
          <h4 className="font-semibold text-primary text-sm mb-2">How Gate-Line Tracking Works</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Instead of estimating velocity frame-by-frame (which is noisy), the gate-line system measures the <strong>time taken</strong> for an object to travel a <strong>known distance</strong> between two reference lines.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4 mb-3">
            <li><strong>Constant Distance:</strong> The distance between gates is fixed and calibrated in cm</li>
            <li><strong>Time-Based:</strong> Slow objects take longer → lower velocity. Fast objects take less time → higher velocity</li>
            <li><strong>No Noise Amplification:</strong> A single time measurement replaces hundreds of noisy frame-to-frame differences</li>
            <li><strong>Bi-directional:</strong> Works in both directions — move the object back and forth</li>
          </ul>
          <div className="space-y-1.5">
            <div className="formula-block text-xs">v = Δx / Δt (distance between gates / crossing time)</div>
            <div className="formula-block text-xs">a = Δv / Δt (change in velocity between consecutive crossings)</div>
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
