import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { MotionMode } from '@/lib/kinematics';

type ObjectType = 'ball' | 'car' | 'rocket' | 'bicycle' | 'airplane' | 'skateboard' | 'bird' | 'train' | 'helicopter' | 'football';

interface ObjectConfig {
  label: string;
  emoji: string;
  background: 'city' | 'mountains' | 'space' | 'park' | 'sky' | 'stadium';
}

const objectConfigs: Record<ObjectType, ObjectConfig> = {
  ball: { label: 'Ball', emoji: '⚽', background: 'park' },
  car: { label: 'Car', emoji: '🚗', background: 'city' },
  rocket: { label: 'Rocket', emoji: '🚀', background: 'space' },
  bicycle: { label: 'Bicycle', emoji: '🚲', background: 'park' },
  airplane: { label: 'Airplane', emoji: '✈️', background: 'sky' },
  skateboard: { label: 'Skateboard', emoji: '🛹', background: 'city' },
  bird: { label: 'Bird', emoji: '🐦', background: 'sky' },
  train: { label: 'Train', emoji: '🚆', background: 'city' },
  helicopter: { label: 'Helicopter', emoji: '🚁', background: 'sky' },
  football: { label: 'Football', emoji: '🏈', background: 'stadium' },
};

interface Props {
  mode: MotionMode;
  vi: number;
  a: number;
  t: number;
  angle: number;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, bg: ObjectConfig['background'], groundY: number) {
  // Sky
  const grad = ctx.createLinearGradient(0, 0, 0, h);

  switch (bg) {
    case 'space':
      grad.addColorStop(0, 'hsl(240, 40%, 8%)');
      grad.addColorStop(1, 'hsl(240, 30%, 15%)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Stars
      for (let i = 0; i < 60; i++) {
        const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 269.5) * 0.5 + 0.5) * (groundY - 10);
        const sr = 0.5 + (i % 3) * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(0, 0%, 100%, ${0.4 + (i % 5) * 0.12})`;
        ctx.fill();
      }
      // Moon
      ctx.beginPath();
      ctx.arc(w - 60, 40, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(45, 20%, 85%)';
      ctx.fill();
      // Ground (dark)
      ctx.fillStyle = 'hsl(240, 15%, 12%)';
      ctx.fillRect(0, groundY, w, h - groundY);
      break;

    case 'city':
      grad.addColorStop(0, 'hsl(210, 25%, 85%)');
      grad.addColorStop(1, 'hsl(210, 20%, 92%)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Buildings
      const buildings = [
        { x: 20, w: 30, h: 60 }, { x: 60, w: 25, h: 80 }, { x: 100, w: 35, h: 50 },
        { x: 150, w: 20, h: 90 }, { x: 200, w: 40, h: 45 }, { x: 260, w: 30, h: 70 },
        { x: 310, w: 25, h: 55 }, { x: 360, w: 35, h: 85 }, { x: 410, w: 28, h: 40 },
        { x: 450, w: 32, h: 65 }, { x: 500, w: 22, h: 75 },
      ];
      buildings.forEach(b => {
        ctx.fillStyle = `hsl(220, 15%, ${28 + (b.h % 15)}%)`;
        ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
        // Windows
        for (let wy = groundY - b.h + 8; wy < groundY - 5; wy += 12) {
          for (let wx = b.x + 4; wx < b.x + b.w - 4; wx += 8) {
            ctx.fillStyle = `hsla(50, 70%, 75%, ${Math.random() > 0.3 ? 0.6 : 0.1})`;
            ctx.fillRect(wx, wy, 4, 6);
          }
        }
      });
      // Road
      ctx.fillStyle = 'hsl(0, 0%, 35%)';
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.setLineDash([20, 15]);
      ctx.strokeStyle = 'hsl(50, 80%, 70%)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY + (h - groundY) / 2);
      ctx.lineTo(w, groundY + (h - groundY) / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;

    case 'mountains':
      grad.addColorStop(0, 'hsl(200, 40%, 80%)');
      grad.addColorStop(1, 'hsl(200, 30%, 90%)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Far mountains
      ctx.fillStyle = 'hsl(210, 15%, 65%)';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(60, groundY - 70); ctx.lineTo(130, groundY - 30);
      ctx.lineTo(200, groundY - 90); ctx.lineTo(280, groundY - 40);
      ctx.lineTo(370, groundY - 80); ctx.lineTo(440, groundY - 35);
      ctx.lineTo(520, groundY - 60); ctx.lineTo(w, groundY - 20);
      ctx.lineTo(w, groundY); ctx.closePath(); ctx.fill();
      // Near mountains
      ctx.fillStyle = 'hsl(140, 15%, 50%)';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(80, groundY - 45); ctx.lineTo(160, groundY - 15);
      ctx.lineTo(250, groundY - 55); ctx.lineTo(350, groundY - 20);
      ctx.lineTo(450, groundY - 40); ctx.lineTo(w, groundY - 10);
      ctx.lineTo(w, groundY); ctx.closePath(); ctx.fill();
      // Ground
      ctx.fillStyle = 'hsl(120, 20%, 75%)';
      ctx.fillRect(0, groundY, w, h - groundY);
      break;

    case 'park':
      grad.addColorStop(0, 'hsl(200, 50%, 85%)');
      grad.addColorStop(1, 'hsl(200, 40%, 92%)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Trees
      const trees = [40, 120, 250, 380, 480];
      trees.forEach(tx => {
        ctx.fillStyle = 'hsl(30, 30%, 35%)';
        ctx.fillRect(tx - 3, groundY - 35, 6, 35);
        ctx.beginPath();
        ctx.arc(tx, groundY - 45, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(120, 35%, 40%)';
        ctx.fill();
      });
      // Grass
      ctx.fillStyle = 'hsl(120, 30%, 65%)';
      ctx.fillRect(0, groundY, w, h - groundY);
      break;

    case 'sky':
      grad.addColorStop(0, 'hsl(210, 60%, 70%)');
      grad.addColorStop(1, 'hsl(210, 40%, 88%)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Clouds
      const clouds = [{ x: 60, y: 40 }, { x: 200, y: 65 }, { x: 380, y: 35 }, { x: 490, y: 55 }];
      clouds.forEach(c => {
        ctx.fillStyle = 'hsla(0, 0%, 100%, 0.7)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 16, 0, Math.PI * 2);
        ctx.arc(c.x + 18, c.y - 4, 12, 0, Math.PI * 2);
        ctx.arc(c.x + 32, c.y, 14, 0, Math.PI * 2);
        ctx.fill();
      });
      // Ground
      ctx.fillStyle = 'hsl(120, 25%, 70%)';
      ctx.fillRect(0, groundY, w, h - groundY);
      break;

    case 'stadium':
      grad.addColorStop(0, 'hsl(210, 30%, 82%)');
      grad.addColorStop(1, 'hsl(210, 25%, 90%)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Stadium stands
      ctx.fillStyle = 'hsl(0, 0%, 45%)';
      ctx.fillRect(0, groundY - 40, w, 40);
      // Crowd dots
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 30; col++) {
          const cx = 10 + col * (w / 30);
          const cy = groundY - 35 + row * 12;
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${(col * 37) % 360}, 50%, 60%)`;
          ctx.fill();
        }
      }
      // Field
      ctx.fillStyle = 'hsl(120, 40%, 50%)';
      ctx.fillRect(0, groundY, w, h - groundY);
      // Field lines
      ctx.strokeStyle = 'hsla(0, 0%, 100%, 0.4)';
      ctx.lineWidth = 1;
      for (let lx = 50; lx < w; lx += 60) {
        ctx.beginPath();
        ctx.moveTo(lx, groundY);
        ctx.lineTo(lx, h);
        ctx.stroke();
      }
      break;
  }

  // KINEMA watermark
  ctx.save();
  ctx.font = 'bold 14px "Space Grotesk", system-ui, sans-serif';
  ctx.fillStyle = bg === 'space' ? 'hsla(0, 0%, 100%, 0.08)' : 'hsla(220, 25%, 10%, 0.06)';
  ctx.textAlign = 'right';
  ctx.fillText('KINEMA', w - 10, h - 8);
  ctx.restore();
}

function drawObject(ctx: CanvasRenderingContext2D, x: number, y: number, emoji: string) {
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

export default function MotionAnimation({ mode, vi, a, t, angle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedObject, setSelectedObject] = useState<ObjectType>('ball');
  const [displayTime, setDisplayTime] = useState(0);
  const [displayPos, setDisplayPos] = useState(0);
  const [displayVel, setDisplayVel] = useState(0);
  const [displayAcc, setDisplayAcc] = useState(0);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const config = objectConfigs[selectedObject];

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
    drawBackground(ctx, w, h, config.background, groundY);

    let xPos = 20, yPos = groundY - 14;
    let curVel = vi, curDisp = 0, curAcc = a;

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
      yPos = groundY - 14;
    } else if (mode === 'vertical') {
      curVel = vi + a * elapsed;
      curDisp = vi * elapsed + 0.5 * a * elapsed ** 2;
      xPos = w / 2;
      yPos = groundY - 14 - curDisp * scaleY;
    } else {
      const vix = vi * Math.cos(rad);
      const viy = vi * Math.sin(rad);
      const xD = vix * elapsed;
      const yD = viy * elapsed - 0.5 * 9.8 * elapsed ** 2;
      xPos = 20 + xD * scaleX;
      yPos = groundY - 14 - yD * scaleY;
      curVel = Math.sqrt(vix ** 2 + (viy - 9.8 * elapsed) ** 2);
      curDisp = Math.sqrt(xD ** 2 + yD ** 2);
      curAcc = 9.8;
    }

    xPos = Math.max(14, Math.min(w - 14, xPos));
    yPos = Math.max(14, Math.min(groundY - 14, yPos));

    // Trail
    ctx.beginPath();
    const trailSteps = 30;
    for (let i = 0; i <= trailSteps; i++) {
      const tt = (elapsed * i) / trailSteps;
      let tx = 20, ty = groundY - 14;
      if (mode === 'horizontal') {
        tx = 20 + (vi * tt + 0.5 * a * tt ** 2) * scaleX;
        ty = groundY - 14;
      } else if (mode === 'vertical') {
        tx = w / 2;
        ty = groundY - 14 - (vi * tt + 0.5 * a * tt ** 2) * scaleY;
      } else {
        tx = 20 + vi * Math.cos(rad) * tt * scaleX;
        ty = groundY - 14 - (vi * Math.sin(rad) * tt - 0.5 * 9.8 * tt ** 2) * scaleY;
      }
      tx = Math.max(14, Math.min(w - 14, tx));
      ty = Math.max(14, Math.min(groundY - 14, ty));
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.strokeStyle = 'hsla(217, 91%, 50%, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Object
    drawObject(ctx, xPos, yPos, config.emoji);

    setDisplayTime(elapsed);
    setDisplayPos(curDisp);
    setDisplayVel(curVel);
    setDisplayAcc(curAcc);
  }, [vi, a, mode, angle, t, config]);

  const animate = useCallback((timestamp: number) => {
    if (!startRef.current) startRef.current = timestamp;
    const elapsed = ((timestamp - startRef.current) * speed) / 1000;
    draw(elapsed);
    animRef.current = requestAnimationFrame(animate);
  }, [draw, speed]);

  useEffect(() => { draw(0); }, [draw]);

  const play = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    startRef.current = 0;
    animRef.current = requestAnimationFrame(animate);
  };
  const pause = () => { setIsPlaying(false); cancelAnimationFrame(animRef.current); };
  const reset = () => { setIsPlaying(false); cancelAnimationFrame(animRef.current); startRef.current = 0; draw(0); };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  return (
    <div className="kinema-section">
      <h3 className="font-semibold mb-3">Real-time Animation</h3>

      {/* Object Selector */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(Object.keys(objectConfigs) as ObjectType[]).map(key => (
          <button
            key={key}
            onClick={() => { setSelectedObject(key); reset(); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedObject === key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {objectConfigs[key].emoji} {objectConfigs[key].label}
          </button>
        ))}
      </div>

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
