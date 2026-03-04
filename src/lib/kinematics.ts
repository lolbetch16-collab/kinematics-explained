// Kinematic calculation engine

export type MotionMode = 'horizontal' | 'vertical' | 'projectile';

export interface KinematicInputs {
  vi?: number;
  vf?: number;
  a?: number;
  t?: number;
  d?: number;
  angle?: number;
}

export interface CalculationResult {
  equation: string;
  substitution: string;
  answer: string;
  label: string;
}

export interface Scenario {
  name: string;
  values: KinematicInputs;
  mode: MotionMode;
}

export const scenarios: Record<string, Scenario> = {
  custom: { name: 'Custom Scenario', values: {}, mode: 'horizontal' },
  freefall: { name: 'Free Fall (No Air Resistance)', values: { a: -9.8, vi: 0, d: 10 }, mode: 'vertical' },
  thrown_up: { name: 'Object Thrown Upward', values: { a: -9.8, vi: 20, vf: 0 }, mode: 'vertical' },
  car_accel: { name: 'Car Accelerating from Rest', values: { a: 2, vi: 0, t: 5 }, mode: 'horizontal' },
  car_braking: { name: 'Car Braking to Stop', values: { a: -3, vi: 25, vf: 0 }, mode: 'horizontal' },
  inclined_plane: { name: 'Object on Inclined Plane', values: { a: 4.9, vi: 0, t: 3 }, mode: 'horizontal' },
};

export function calculate(inputs: KinematicInputs, mode: MotionMode): CalculationResult[] {
  const { vi, vf, a, t, d, angle = 45 } = inputs;
  const results: CalculationResult[] = [];

  // Equation 1: vf = vi + a * t
  if (vi !== undefined && a !== undefined && t !== undefined) {
    const calc = vi + a * t;
    results.push({ label: 'Velocity-Time', equation: 'v = v₀ + a × t', substitution: `v = ${vi} + ${a} × ${t}`, answer: `v = ${calc.toFixed(2)} m/s` });
  } else if (vf !== undefined && a !== undefined && t !== undefined) {
    const calc = vf - a * t;
    results.push({ label: 'Initial Velocity', equation: 'v₀ = v - a × t', substitution: `v₀ = ${vf} - ${a} × ${t}`, answer: `v₀ = ${calc.toFixed(2)} m/s` });
  } else if (vf !== undefined && vi !== undefined && t !== undefined) {
    const calc = (vf - vi) / t;
    results.push({ label: 'Acceleration', equation: 'a = (v - v₀) ÷ t', substitution: `a = (${vf} - ${vi}) ÷ ${t}`, answer: `a = ${calc.toFixed(2)} m/s²` });
  } else if (vf !== undefined && vi !== undefined && a !== undefined) {
    const calc = (vf - vi) / a;
    results.push({ label: 'Time', equation: 't = (v - v₀) ÷ a', substitution: `t = (${vf} - ${vi}) ÷ ${a}`, answer: `t = ${calc.toFixed(2)} s` });
  }

  // Equation 2: d = (vi + vf)/2 * t
  if (vi !== undefined && vf !== undefined && t !== undefined) {
    const calc = (vi + vf) / 2 * t;
    results.push({ label: 'Average Velocity', equation: 'Δx = (v₀ + v) ÷ 2 × t', substitution: `Δx = (${vi} + ${vf}) ÷ 2 × ${t}`, answer: `Δx = ${calc.toFixed(2)} m` });
  } else if (d !== undefined && vf !== undefined && t !== undefined) {
    const calc = (2 * d / t) - vf;
    results.push({ label: 'Initial Velocity', equation: 'v₀ = (2 × Δx ÷ t) - v', substitution: `v₀ = (2 × ${d} ÷ ${t}) - ${vf}`, answer: `v₀ = ${calc.toFixed(2)} m/s` });
  } else if (d !== undefined && vi !== undefined && t !== undefined) {
    const calc = (2 * d / t) - vi;
    results.push({ label: 'Final Velocity', equation: 'v = (2 × Δx ÷ t) - v₀', substitution: `v = (2 × ${d} ÷ ${t}) - ${vi}`, answer: `v = ${calc.toFixed(2)} m/s` });
  } else if (d !== undefined && vi !== undefined && vf !== undefined) {
    const calc = 2 * d / (vi + vf);
    results.push({ label: 'Time', equation: 't = 2 × Δx ÷ (v₀ + v)', substitution: `t = 2 × ${d} ÷ (${vi} + ${vf})`, answer: `t = ${calc.toFixed(2)} s` });
  }

  // Equation 3: d = vi*t + 0.5*a*t^2
  if (vi !== undefined && a !== undefined && t !== undefined) {
    const calc = vi * t + 0.5 * a * t * t;
    results.push({ label: 'Position-Time', equation: 'Δx = v₀ × t + ½ × a × t²', substitution: `Δx = ${vi} × ${t} + 0.5 × ${a} × ${t}²`, answer: `Δx = ${calc.toFixed(2)} m` });
  } else if (d !== undefined && a !== undefined && t !== undefined) {
    const calc = (d - 0.5 * a * t * t) / t;
    results.push({ label: 'Initial Velocity', equation: 'v₀ = (Δx - ½ × a × t²) ÷ t', substitution: `v₀ = (${d} - 0.5 × ${a} × ${t}²) ÷ ${t}`, answer: `v₀ = ${calc.toFixed(2)} m/s` });
  } else if (d !== undefined && vi !== undefined && t !== undefined) {
    const calc = 2 * (d - vi * t) / (t * t);
    results.push({ label: 'Acceleration', equation: 'a = 2 × (Δx - v₀ × t) ÷ t²', substitution: `a = 2 × (${d} - ${vi} × ${t}) ÷ ${t}²`, answer: `a = ${calc.toFixed(2)} m/s²` });
  }

  // Equation 4: vf² = vi² + 2*a*d
  if (vi !== undefined && a !== undefined && d !== undefined) {
    const val = vi ** 2 + 2 * a * d;
    if (val >= 0) {
      const calc = Math.sqrt(val);
      results.push({ label: 'Velocity-Position', equation: 'v = √(v₀² + 2 × a × Δx)', substitution: `v = √(${vi}² + 2 × ${a} × ${d})`, answer: `v = ${calc.toFixed(2)} m/s` });
    }
  } else if (vf !== undefined && a !== undefined && d !== undefined) {
    const val = vf ** 2 - 2 * a * d;
    if (val >= 0) {
      const calc = Math.sqrt(val);
      results.push({ label: 'Initial Velocity', equation: 'v₀ = √(v² - 2 × a × Δx)', substitution: `v₀ = √(${vf}² - 2 × ${a} × ${d})`, answer: `v₀ = ${calc.toFixed(2)} m/s` });
    }
  } else if (vf !== undefined && vi !== undefined && d !== undefined) {
    const calc = (vf ** 2 - vi ** 2) / (2 * d);
    results.push({ label: 'Acceleration', equation: 'a = (v² - v₀²) ÷ (2 × Δx)', substitution: `a = (${vf}² - ${vi}²) ÷ (2 × ${d})`, answer: `a = ${calc.toFixed(2)} m/s²` });
  } else if (vf !== undefined && vi !== undefined && a !== undefined) {
    const calc = (vf ** 2 - vi ** 2) / (2 * a);
    results.push({ label: 'Displacement', equation: 'Δx = (v² - v₀²) ÷ (2 × a)', substitution: `Δx = (${vf}² - ${vi}²) ÷ (2 × ${a})`, answer: `Δx = ${calc.toFixed(2)} m` });
  }

  // Special vertical / free fall
  if (mode === 'vertical' && a !== undefined && Math.abs(a + 9.8) < 0.1 && vi !== undefined) {
    const maxH = vi > 0 ? (vi ** 2 / (2 * 9.8)) : 0;
    const tPeak = vi > 0 ? vi / 9.8 : 0;
    results.push({
      label: 'Free Fall Analysis',
      equation: 'Using g = 9.8 m/s² downward',
      substitution: `Max height = v₀²/(2g), Time to peak = v₀/g`,
      answer: `Max height: ${maxH.toFixed(2)} m | Time to peak: ${tPeak.toFixed(2)} s | Total flight: ${(2 * tPeak).toFixed(2)} s`,
    });
  }

  // Special projectile
  if (mode === 'projectile' && vi !== undefined) {
    const rad = (angle * Math.PI) / 180;
    const viy = vi * Math.sin(rad);
    const vix = vi * Math.cos(rad);
    const tPeak = viy / 9.8;
    const maxH = viy * tPeak - 0.5 * 9.8 * tPeak ** 2;
    const tFlight = 2 * tPeak;
    const range = vix * tFlight;
    results.push({
      label: `Projectile Motion (θ = ${angle}°)`,
      equation: `vₓ = v₀·cos(θ), vᵧ = v₀·sin(θ)`,
      substitution: `vₓ = ${vix.toFixed(2)} m/s, vᵧ = ${viy.toFixed(2)} m/s`,
      answer: `Max height: ${maxH.toFixed(2)} m | Range: ${range.toFixed(2)} m | Flight time: ${tFlight.toFixed(2)} s`,
    });
  }

  return results;
}

// Graph data generation
export function generateGraphData(vi: number, a: number, tMax: number, mode: MotionMode, angle: number = 45) {
  const points = 41;
  const dt = tMax / (points - 1);
  const rad = (angle * Math.PI) / 180;

  const time: number[] = [];
  const position: number[] = [];
  const velocity: number[] = [];
  const acceleration: number[] = [];

  for (let i = 0; i < points; i++) {
    const t = i * dt;
    time.push(parseFloat(t.toFixed(2)));

    if (mode === 'projectile') {
      const vix = vi * Math.cos(rad);
      const viy = vi * Math.sin(rad);
      const xD = vix * t;
      const yD = viy * t - 0.5 * 9.8 * t * t;
      position.push(Math.sqrt(xD ** 2 + yD ** 2));
      velocity.push(Math.sqrt(vix ** 2 + (viy - 9.8 * t) ** 2));
      acceleration.push(9.8);
    } else {
      position.push(vi * t + 0.5 * a * t * t);
      velocity.push(vi + a * t);
      acceleration.push(a);
    }
  }

  return { time, position, velocity, acceleration };
}

// Kalman Filter
export class KalmanFilter {
  processNoise: number;
  measurementNoise: number;
  estimatedValue: number;
  estimatedVariance: number;
  lastTimestamp: number;

  constructor(processNoise = 0.01, measurementNoise = 0.1) {
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
    this.estimatedValue = 0;
    this.estimatedVariance = 1;
    this.lastTimestamp = 0;
  }

  update(measurement: number, timestamp: number): number {
    const dt = this.lastTimestamp ? (timestamp - this.lastTimestamp) / 1000 : 0.1;
    this.lastTimestamp = timestamp;
    const predVar = this.estimatedVariance + this.processNoise * dt;
    const gain = predVar / (predVar + this.measurementNoise);
    this.estimatedValue = this.estimatedValue + gain * (measurement - this.estimatedValue);
    this.estimatedVariance = (1 - gain) * predVar;
    return this.estimatedValue;
  }

  reset() {
    this.estimatedValue = 0;
    this.estimatedVariance = 1;
    this.lastTimestamp = 0;
  }
}
