import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';

export default function MotionGraphsExplorer() {
  const [vi, setVi] = useState(5);
  const [a, setA] = useState(-1);
  const [tMax, setTMax] = useState(10);

  const data = useMemo(() => {
    const points = [];
    for (let t = 0; t <= tMax; t++) {
      points.push({
        t,
        acceleration: a,
        velocity: vi + a * t,
        position: vi * t + 0.5 * a * t * t,
      });
    }
    return points;
  }, [vi, a, tMax]);

  const vFinal = (vi + a * tMax).toFixed(2);
  const xFinal = (vi * tMax + 0.5 * a * tMax * tMax).toFixed(2);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="kinema-section">
        <h2 className="text-2xl font-bold mb-2">Motion Graphs Explorer</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Visualize how position, velocity, and acceleration relate to each other over time. Adjust parameters to see live updates.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            <h3 className="font-semibold">Motion Parameters</h3>
            <div>
              <label className="kinema-label">Initial Velocity (v₀) m/s</label>
              <input type="number" value={vi} onChange={e => setVi(Number(e.target.value))} className="kinema-input" />
            </div>
            <div>
              <label className="kinema-label">Acceleration (a) m/s²</label>
              <input type="number" value={a} onChange={e => setA(Number(e.target.value))} className="kinema-input" />
            </div>
            <div>
              <label className="kinema-label">Time Duration (t) s</label>
              <input type="number" value={tMax} min={1} max={20} onChange={e => setTMax(Number(e.target.value))} className="kinema-input" />
            </div>

            <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-1">
              <h4 className="font-semibold text-primary mb-2">Calculated Values</h4>
              <p>v₀ = {vi.toFixed(2)} m/s</p>
              <p>v = {vFinal} m/s</p>
              <p>x = {xFinal} m</p>
              <p>a = {a.toFixed(2)} m/s²</p>
            </div>

            <div className="highlight-tip">
              <strong>Tip:</strong> Try:
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>a = 0 (constant velocity)</li>
                <li>v₀ = 0, a &gt; 0 (speeding up)</li>
                <li>v₀ &gt; 0, a &lt; 0 (slowing down)</li>
              </ul>
            </div>
          </div>

          {/* Graphs */}
          <div className="lg:col-span-3 space-y-6">
            <GraphBlock
              title="Acceleration vs Time"
              dataKey="acceleration"
              color="hsl(var(--chart-red))"
              data={data}
              yLabel="Acceleration (m/s²)"
              formula="a = constant"
              tips={[
                'Flat line: Constant acceleration',
                'Positive: Accelerating forward',
                'Negative: Decelerating',
              ]}
              keyConcept="The area under the a-t graph = change in velocity (Δv)."
            />
            <GraphBlock
              title="Velocity vs Time"
              dataKey="velocity"
              color="hsl(var(--chart-green))"
              data={data}
              yLabel="Velocity (m/s)"
              formula="v = v₀ + a·t"
              tips={[
                'Slope = acceleration',
                'Above x-axis: positive direction',
                'Below x-axis: negative direction',
              ]}
              keyConcept="The area under the v-t graph = displacement (Δx)."
            />
            <GraphBlock
              title="Position vs Time"
              dataKey="position"
              color="hsl(var(--chart-blue))"
              data={data}
              yLabel="Position (m)"
              formula="x = x₀ + v₀·t + ½a·t²"
              tips={[
                'Slope = instantaneous velocity',
                'Curved: changing velocity',
                'Straight: constant velocity',
              ]}
              keyConcept="The slope at any point gives the velocity at that moment."
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GraphBlock({
  title, dataKey, color, data, yLabel, formula, tips, keyConcept,
}: {
  title: string; dataKey: string; color: string;
  data: Record<string, number>[]; yLabel: string;
  formula: string; tips: string[]; keyConcept: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 bg-muted/20 rounded-xl p-4 border border-border">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} tick={{ fontSize: 12 }} />
            <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10 }} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} name={yLabel} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="graph-info-panel">
        <h4 className="font-semibold text-primary mb-2">{title}</h4>
        <div className="formula-block">{formula}</div>
        <ul className="text-sm space-y-2 mt-3">
          {tips.map((t, i) => <li key={i}><strong>{t.split(':')[0]}:</strong>{t.split(':').slice(1).join(':')}</li>)}
        </ul>
        <div className="highlight-tip mt-3">
          <strong>Key Concept:</strong> {keyConcept}
        </div>
      </div>
    </div>
  );
}
