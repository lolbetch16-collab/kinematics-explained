import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculate, generateGraphData, scenarios, type MotionMode, type KinematicInputs, type CalculationResult } from '@/lib/kinematics';
import MotionAnimation from './MotionAnimation';

interface Props {
  mode: MotionMode;
}

export default function KinematicCalculator({ mode }: Props) {
  const [vi, setVi] = useState('');
  const [vf, setVf] = useState('');
  const [a, setA] = useState('');
  const [t, setT] = useState('');
  const [d, setD] = useState('');
  const [angle, setAngle] = useState('45');
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [scenario, setScenario] = useState('custom');
  const [graphType, setGraphType] = useState<'position' | 'velocity' | 'acceleration'>('position');

  const parseVal = (s: string) => s === '' ? undefined : parseFloat(s);

  const handleCalculate = useCallback(() => {
    const inputs: KinematicInputs = {
      vi: parseVal(vi), vf: parseVal(vf), a: parseVal(a), t: parseVal(t), d: parseVal(d), angle: parseFloat(angle) || 45,
    };
    setResults(calculate(inputs, mode));
  }, [vi, vf, a, t, d, angle, mode]);

  const handleClear = () => {
    setVi(''); setVf(''); setA(''); setT(''); setD(''); setAngle('45');
    setResults([]); setScenario('custom');
  };

  const handleScenario = (key: string) => {
    setScenario(key);
    if (key === 'custom') { handleClear(); return; }
    const s = scenarios[key];
    if (!s) return;
    handleClear();
    if (s.values.vi !== undefined) setVi(String(s.values.vi));
    if (s.values.vf !== undefined) setVf(String(s.values.vf));
    if (s.values.a !== undefined) setA(String(s.values.a));
    if (s.values.t !== undefined) setT(String(s.values.t));
    if (s.values.d !== undefined) setD(String(s.values.d));
  };

  const graphData = useMemo(() => {
    const viN = parseFloat(vi) || 0;
    const aN = parseFloat(a) || 0;
    const tN = parseFloat(t) || 5;
    return generateGraphData(viN, aN, tN, mode, parseFloat(angle) || 45);
  }, [vi, a, t, mode, angle]);

  const chartData = useMemo(() => {
    return graphData.time.map((time, i) => ({
      time,
      position: graphData.position[i],
      velocity: graphData.velocity[i],
      acceleration: graphData.acceleration[i],
    }));
  }, [graphData]);

  const chartConfig = {
    position: { color: 'hsl(var(--chart-teal))', label: 'Position (m)' },
    velocity: { color: 'hsl(var(--chart-blue))', label: 'Velocity (m/s)' },
    acceleration: { color: 'hsl(var(--chart-purple))', label: 'Acceleration (m/s²)' },
  };

  const modeTitle = { horizontal: 'Horizontal Motion', vertical: 'Vertical Motion', projectile: 'Projectile Motion' }[mode];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Calculator */}
        <div className="kinema-section space-y-5">
          <h2 className="text-2xl font-bold">{modeTitle} Calculator</h2>

          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <h4 className="font-semibold text-sm text-primary mb-2">Standard Kinematic Equations</h4>
            <div className="space-y-2">
              <div className="equation-card-item"><strong>1.</strong> v = v₀ + a·t</div>
              <div className="equation-card-item"><strong>2.</strong> Δx = ½(v₀ + v)·t</div>
              <div className="equation-card-item"><strong>3.</strong> Δx = v₀·t + ½a·t²</div>
              <div className="equation-card-item"><strong>4.</strong> v² = v₀² + 2a·Δx</div>
            </div>
          </div>

          {/* Scenario Selector */}
          <div>
            <label className="kinema-label">Preset Scenario</label>
            <select value={scenario} onChange={e => handleScenario(e.target.value)} className="kinema-input">
              {Object.entries(scenarios).map(([k, s]) => (
                <option key={k} value={k}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="kinema-label">Initial Velocity (v₀) m/s</label>
              <input type="number" value={vi} onChange={e => setVi(e.target.value)} placeholder="m/s" className="kinema-input" />
            </div>
            <div>
              <label className="kinema-label">Final Velocity (v) m/s</label>
              <input type="number" value={vf} onChange={e => setVf(e.target.value)} placeholder="m/s" className="kinema-input" />
            </div>
            <div>
              <label className="kinema-label">Acceleration (a) m/s²</label>
              <input type="number" value={a} onChange={e => setA(e.target.value)} placeholder="m/s²" className="kinema-input" />
            </div>
            <div>
              <label className="kinema-label">Time (t) seconds</label>
              <input type="number" value={t} onChange={e => setT(e.target.value)} placeholder="seconds" className="kinema-input" />
            </div>
            <div>
              <label className="kinema-label">Displacement (Δx) meters</label>
              <input type="number" value={d} onChange={e => setD(e.target.value)} placeholder="meters" className="kinema-input" />
            </div>
            {mode === 'projectile' && (
              <div>
                <label className="kinema-label">Launch Angle (θ) degrees</label>
                <input type="number" value={angle} onChange={e => setAngle(e.target.value)} placeholder="degrees" min="0" max="90" className="kinema-input" />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleCalculate} className="flex-1 py-3 rounded-lg font-semibold bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity">
              Calculate
            </button>
            <button onClick={handleClear} className="flex-1 py-3 rounded-lg font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
              Clear
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Results</h3>
              {results.map((r, i) => (
                <div key={i} className="step-result">
                  <div className="text-xs font-semibold text-secondary mb-1">{r.label}</div>
                  <div className="font-mono text-xs text-muted-foreground">Equation: {r.equation}</div>
                  <div className="font-mono text-xs text-muted-foreground">Substitution: {r.substitution}</div>
                  <div className="font-mono text-sm font-semibold mt-1">{r.answer}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Visualization */}
        <div className="space-y-5">
          {/* Animation */}
          <MotionAnimation mode={mode} vi={parseFloat(vi) || 0} a={parseFloat(a) || 0} t={parseFloat(t) || 5} angle={parseFloat(angle) || 45} />

          {/* Graph */}
          <div className="kinema-section">
            <h3 className="font-semibold mb-3">Graphical Analysis</h3>
            <select value={graphType} onChange={e => setGraphType(e.target.value as typeof graphType)} className="kinema-input mb-4">
              <option value="position">Position vs Time</option>
              <option value="velocity">Velocity vs Time</option>
              <option value="acceleration">Acceleration vs Time</option>
            </select>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} tick={{ fontSize: 11 }} />
                <YAxis label={{ value: chartConfig[graphType].label, angle: -90, position: 'insideLeft', offset: 10 }} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey={graphType} stroke={chartConfig[graphType].color} strokeWidth={2.5} dot={false} name={chartConfig[graphType].label} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Info panel */}
          <div className="kinema-section bg-muted/20">
            <h4 className="font-semibold mb-3">Understanding {modeTitle}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Kinematic equations describe motion with constant acceleration. They connect displacement, velocity, acceleration, and time.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="px-3 py-2 text-left font-semibold border-b border-border">Equation</th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-border">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border"><td className="px-3 py-2 font-mono text-xs">v = v₀ + a·t</td><td className="px-3 py-2">Δx</td></tr>
                  <tr className="border-b border-border bg-muted/20"><td className="px-3 py-2 font-mono text-xs">Δx = ½(v₀ + v)·t</td><td className="px-3 py-2">a</td></tr>
                  <tr className="border-b border-border"><td className="px-3 py-2 font-mono text-xs">Δx = v₀·t + ½a·t²</td><td className="px-3 py-2">v</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-xs">v² = v₀² + 2a·Δx</td><td className="px-3 py-2">t</td></tr>
                </tbody>
              </table>
            </div>
            {mode === 'projectile' && (
              <div className="mt-4 space-y-2">
                <div className="formula-block">vₓ = v₀·cosθ (constant)</div>
                <div className="formula-block">vᵧ = v₀·sinθ - g·t</div>
                <div className="formula-block">Range = v₀²·sin(2θ) / g</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
