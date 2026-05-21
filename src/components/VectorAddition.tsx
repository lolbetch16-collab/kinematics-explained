import { useMemo, useState } from 'react';

interface Vec {
  id: string;
  label: string;
  mag: number;
  angle: number; // degrees
  color: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--chart-purple))',
  'hsl(var(--chart-red))',
  'hsl(var(--chart-blue))',
];

const uid = () => Math.random().toString(36).slice(2, 9);

const presets: Record<string, Omit<Vec, 'id'>[]> = {
  Perpendicular: [
    { label: 'A', mag: 4, angle: 0, color: COLORS[0] },
    { label: 'B', mag: 3, angle: 90, color: COLORS[1] },
  ],
  'Three forces': [
    { label: 'F₁', mag: 5, angle: 30, color: COLORS[0] },
    { label: 'F₂', mag: 4, angle: 120, color: COLORS[1] },
    { label: 'F₃', mag: 3, angle: 230, color: COLORS[2] },
  ],
  'Closed polygon': [
    { label: 'A', mag: 4, angle: 0, color: COLORS[0] },
    { label: 'B', mag: 4, angle: 120, color: COLORS[1] },
    { label: 'C', mag: 4, angle: 240, color: COLORS[2] },
  ],
};

export default function VectorAddition() {
  const [vectors, setVectors] = useState<Vec[]>([
    { id: uid(), label: 'A', mag: 4, angle: 30, color: COLORS[0] },
    { id: uid(), label: 'B', mag: 3, angle: 110, color: COLORS[1] },
  ]);
  const [mode, setMode] = useState<'tiptotail' | 'parallelogram'>('tiptotail');

  const computed = useMemo(() => {
    const items = vectors.map((v) => {
      const r = (v.angle * Math.PI) / 180;
      return { ...v, x: v.mag * Math.cos(r), y: v.mag * Math.sin(r) };
    });
    const Rx = items.reduce((s, v) => s + v.x, 0);
    const Ry = items.reduce((s, v) => s + v.y, 0);
    const mag = Math.hypot(Rx, Ry);
    const ang = (Math.atan2(Ry, Rx) * 180) / Math.PI;
    return { items, Rx, Ry, mag, ang };
  }, [vectors]);

  const allCoords = [
    { x: 0, y: 0 },
    { x: computed.Rx, y: computed.Ry },
  ];
  let cx = 0, cy = 0;
  computed.items.forEach((v) => {
    if (mode === 'tiptotail') {
      cx += v.x; cy += v.y;
      allCoords.push({ x: cx, y: cy });
    } else {
      allCoords.push({ x: v.x, y: v.y });
    }
  });
  const maxAbs = Math.max(2, ...allCoords.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y)))) * 1.2;
  const size = 420;
  const scale = (size / 2) / maxAbs;
  const toPx = (x: number, y: number) => ({ x: size / 2 + x * scale, y: size / 2 - y * scale });

  const update = (id: string, patch: Partial<Vec>) =>
    setVectors((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const remove = (id: string) => setVectors((vs) => vs.filter((v) => v.id !== id));
  const add = () =>
    setVectors((vs) => [
      ...vs,
      {
        id: uid(),
        label: String.fromCharCode(65 + vs.length),
        mag: 3,
        angle: 45,
        color: COLORS[vs.length % COLORS.length],
      },
    ]);
  const loadPreset = (k: string) =>
    setVectors(presets[k].map((v) => ({ ...v, id: uid() })));

  // Drawing
  const arrowPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const ax = x2 - ux * 10 - uy * 6;
    const ay = y2 - uy * 10 + ux * 6;
    const bx = x2 - ux * 10 + uy * 6;
    const by = y2 - uy * 10 - ux * 6;
    return { line: `M${x1},${y1} L${x2},${y2}`, head: `M${x2},${y2} L${ax},${ay} L${bx},${by} Z` };
  };

  let runX = 0, runY = 0;
  const drawn: { from: { x: number; y: number }; to: { x: number; y: number }; v: typeof computed.items[number] }[] = [];
  computed.items.forEach((v) => {
    if (mode === 'tiptotail') {
      const from = toPx(runX, runY);
      runX += v.x; runY += v.y;
      const to = toPx(runX, runY);
      drawn.push({ from, to, v });
    } else {
      drawn.push({ from: toPx(0, 0), to: toPx(v.x, v.y), v });
    }
  });
  const origin = toPx(0, 0);
  const tipR = toPx(computed.Rx, computed.Ry);

  return (
    <div className="kinema-section">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-bold">Vector Addition Playground</h3>
          <p className="text-sm text-muted-foreground">Add multiple 2D vectors and see the resultant computed live.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(presets).map((k) => (
            <button key={k} onClick={() => loadPreset(k)} className="px-3 py-1.5 rounded-md bg-muted text-xs font-medium hover:bg-muted/70">
              {k}
            </button>
          ))}
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button onClick={() => setMode('tiptotail')} className={`px-3 py-1.5 text-xs font-medium ${mode === 'tiptotail' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>Tip-to-tail</button>
            <button onClick={() => setMode('parallelogram')} className={`px-3 py-1.5 text-xs font-medium ${mode === 'parallelogram' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>From origin</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Vectors</h4>
          {vectors.map((v) => (
            <div key={v.id} className="bg-muted/40 rounded-lg p-3 space-y-2 border border-border">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded" style={{ background: v.color }} />
                <input
                  value={v.label}
                  onChange={(e) => update(v.id, { label: e.target.value })}
                  className="kinema-input !py-1.5 !text-sm flex-1"
                />
                <button onClick={() => remove(v.id)} className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Magnitude</label>
                  <input type="number" value={v.mag} step={0.1} onChange={(e) => update(v.id, { mag: Number(e.target.value) })} className="kinema-input !py-1.5 !text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Angle (°)</label>
                  <input type="number" value={v.angle} step={1} onChange={(e) => update(v.id, { angle: Number(e.target.value) })} className="kinema-input !py-1.5 !text-sm" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                x = {(v.mag * Math.cos((v.angle * Math.PI) / 180)).toFixed(2)}, y = {(v.mag * Math.sin((v.angle * Math.PI) / 180)).toFixed(2)}
              </div>
            </div>
          ))}
          <button onClick={add} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">+ Add Vector</button>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-1 flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[420px] bg-muted/30 rounded-xl border border-border">
            {/* grid */}
            {Array.from({ length: 11 }).map((_, i) => (
              <g key={i} stroke="hsl(var(--border))" strokeWidth={0.5}>
                <line x1={(size / 10) * i} y1={0} x2={(size / 10) * i} y2={size} />
                <line x1={0} y1={(size / 10) * i} x2={size} y2={(size / 10) * i} />
              </g>
            ))}
            {/* axes */}
            <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
            <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
            {/* vectors */}
            {drawn.map((d, i) => {
              const a = arrowPath(d.from.x, d.from.y, d.to.x, d.to.y);
              return (
                <g key={i}>
                  <path d={a.line} stroke={d.v.color} strokeWidth={2.5} fill="none" />
                  <path d={a.head} fill={d.v.color} />
                  <text x={(d.from.x + d.to.x) / 2 + 6} y={(d.from.y + d.to.y) / 2 - 6} fontSize={13} fontWeight={600} fill={d.v.color}>{d.v.label}</text>
                </g>
              );
            })}
            {/* resultant */}
            {(() => {
              const a = arrowPath(origin.x, origin.y, tipR.x, tipR.y);
              return (
                <g>
                  <path d={a.line} stroke="hsl(var(--accent))" strokeWidth={3.5} strokeDasharray="6 4" fill="none" />
                  <path d={a.head} fill="hsl(var(--accent))" />
                  <text x={tipR.x + 8} y={tipR.y - 8} fontSize={14} fontWeight={700} fill="hsl(var(--accent))">R</text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Guide + result */}
        <div className="space-y-4">
          <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-4">
            <h4 className="font-semibold text-primary mb-2">Resultant R</h4>
            <div className="font-mono text-sm space-y-1">
              <div>Rₓ = Σx = <b>{computed.Rx.toFixed(3)}</b></div>
              <div>Rᵧ = Σy = <b>{computed.Ry.toFixed(3)}</b></div>
              <div>|R| = √(Rₓ² + Rᵧ²) = <b>{computed.mag.toFixed(3)}</b></div>
              <div>θ = atan2(Rᵧ, Rₓ) = <b>{computed.ang.toFixed(2)}°</b></div>
            </div>
          </div>
          <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-2">
            <h4 className="font-semibold">How it works</h4>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>Break each vector into components: x = m·cos(θ), y = m·sin(θ).</li>
              <li>Sum all x's and all y's separately.</li>
              <li>Magnitude of resultant: √(Σx² + Σy²).</li>
              <li>Direction: atan2(Σy, Σx).</li>
            </ol>
          </div>
          <div className="highlight-tip">
            <strong>Tip:</strong> In "Tip-to-tail" mode, each vector starts where the last ended; the resultant goes from the very first tail to the very last tip.
          </div>
        </div>
      </div>
    </div>
  );
}
