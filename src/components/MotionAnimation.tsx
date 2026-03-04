import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { MotionMode } from '@/lib/kinematics';

interface Props {
  mode: MotionMode;
  vi: number;
  a: number;
  t: number;
  angle: number;
}

export default function MotionAnimation({ mode, vi, a, t, angle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [displayTime, setDisplayTime] = useState(0);
  const [displayPos, setDisplayPos] = useState(0);
  const [displayVel, setDisplayVel] = useState(0);
  const [displayAcc, setDisplayAcc] = useState(0);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const draw = useCallback((elapsed: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const groundY = h - 30;
    const rad = (angle * Math.PI) / 180;

    ctx.clearRect(0, 0, w, h);

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'hsl(210, 30%, 95%)');
    grad.addColorStop(1, 'hsl(210, 20%, 90%)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = 'hsl(120, 15%, 85%)';
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = 'hsl(120, 10%, 60%)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Calculate position
    let xPos = 20, yPos = groundY - 10;
    let curVel = vi, curDisp = 0, curAcc = a;

    // Calculate max displacement for scaling
    let maxDisp = Math.abs(vi * t + 0.5 * a * t * t);
    let maxH = 0;

    if (mode === 'projectile') {
      const viy = vi * Math.sin(rad);
      const vix = vi * Math.cos(rad);
      const tFlight = (2 * viy) / 9.8;
      maxDisp = vix * tFlight;
      maxH = (viy * viy) / (2 * 9.8);
    }

    const availW = w - 40;
    const availH = groundY - 20;
    const scaleX = maxDisp > 0 ? Math.min(availW / maxDisp, 1) : 1;
    const scaleY = maxH > 0 ? Math.min(availH / maxH, 1) : 1;

    if (mode === 'horizontal') {
      curVel = vi + a * elapsed;
      curDisp = vi * elapsed + 0.5 * a * elapsed ** 2;
      xPos = 20 + curDisp * scaleX;
      yPos = groundY - 10;
    } else if (mode === 'vertical') {
      curVel = vi + a * elapsed;
      curDisp = vi * elapsed + 0.5 * a * elapsed ** 2;
      xPos = w / 2;
      yPos = groundY - 10 - curDisp * scaleY;
    } else {
      const vix = vi * Math.cos(rad);
      const viy = vi * Math.sin(rad);
      const xD = vix * elapsed;
      const yD = viy * elapsed - 0.5 * 9.8 * elapsed ** 2;
      xPos = 20 + xD * scaleX;
      yPos = groundY - 10 - yD * scaleY;
      curVel = Math.sqrt(vix ** 2 + (viy - 9.8 * elapsed) ** 2);
      curDisp = Math.sqrt(xD ** 2 + yD ** 2);
      curAcc = 9.8;
    }

    xPos = Math.max(10, Math.min(w - 10, xPos));
    yPos = Math.max(10, Math.min(groundY - 10, yPos));

    // Trail
    ctx.beginPath();
    const trailSteps = 30;
    for (let i = 0; i <= trailSteps; i++) {
      const tt = (elapsed * i) / trailSteps;
      let tx = 20, ty = groundY - 10;
      if (mode === 'horizontal') {
        tx = 20 + (vi * tt + 0.5 * a * tt ** 2) * scaleX;
        ty = groundY - 10;
      } else if (mode === 'vertical') {
        tx = w / 2;
        ty = groundY - 10 - (vi * tt + 0.5 * a * tt ** 2) * scaleY;
      } else {
        tx = 20 + vi * Math.cos(rad) * tt * scaleX;
        ty = groundY - 10 - (vi * Math.sin(rad) * tt - 0.5 * 9.8 * tt ** 2) * scaleY;
      }
      tx = Math.max(10, Math.min(w - 10, tx));
      ty = Math.max(10, Math.min(groundY - 10, ty));
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.strokeStyle = 'hsla(217, 91%, 50%, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ball
    ctx.beginPath();
    ctx.arc(xPos, yPos, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'hsl(217, 91%, 50%)';
    ctx.fill();
    ctx.strokeStyle = 'hsl(217, 91%, 40%)';
    ctx.lineWidth = 2;
    ctx.stroke();

    setDisplayTime(elapsed);
    setDisplayPos(curDisp);
    setDisplayVel(curVel);
    setDisplayAcc(curAcc);
  }, [vi, a, mode, angle, t]);

  const animate = useCallback((timestamp: number) => {
    if (!startRef.current) startRef.current = timestamp;
    const elapsed = ((timestamp - startRef.current) * speed) / 1000;
    draw(elapsed);
    animRef.current = requestAnimationFrame(animate);
  }, [draw, speed]);

  useEffect(() => {
    draw(0);
  }, [draw]);

  const play = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    startRef.current = 0;
    animRef.current = requestAnimationFrame(animate);
  };

  const pause = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animRef.current);
  };

  const reset = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animRef.current);
    startRef.current = 0;
    draw(0);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="kinema-section">
      <h3 className="font-semibold mb-3">Real-time Animation</h3>
      <canvas ref={canvasRef} width={560} height={250} className="w-full rounded-lg border border-border" style={{ maxHeight: 250 }} />
      <div className="flex gap-2 mt-3">
        <button onClick={play} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm">
          <Play size={14} /> Play
        </button>
        <button onClick={pause} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-sm">
          <Pause size={14} /> Pause
        </button>
        <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-sm">
          <RotateCcw size={14} /> Reset
        </button>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <label className="text-xs text-muted-foreground font-medium">Speed:</label>
        <input type="range" min="0.5" max="3" step="0.5" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="flex-1" />
        <span className="text-xs text-muted-foreground">{speed}×</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
        <span>Time: {displayTime.toFixed(2)} s</span>
        <span>Position: {displayPos.toFixed(2)} m</span>
        <span>Velocity: {displayVel.toFixed(2)} m/s</span>
        <span>Acceleration: {displayAcc.toFixed(2)} m/s²</span>
      </div>
    </div>
  );
}
