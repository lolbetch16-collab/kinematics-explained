import { motion } from 'framer-motion';
import { Calculator, Play, BarChart3, Crosshair, Zap, BookOpen, Target, Atom, ArrowRight } from 'lucide-react';
import type { TabId } from './TabNav';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const features: { icon: React.ReactNode; title: string; desc: string; tab: TabId }[] = [
  { icon: <Calculator size={28} />, title: 'Kinematic Calculator', desc: 'Solve physics problems using the four standard kinematic equations with step-by-step solutions.', tab: 'horizontal' },
  { icon: <Play size={28} />, title: 'Real-time Animations', desc: 'Visualize horizontal, vertical, and projectile motion with interactive animations.', tab: 'horizontal' },
  { icon: <BarChart3 size={28} />, title: 'Motion Graphs Explorer', desc: 'Understand position, velocity, and acceleration relationships through interactive graphs.', tab: 'graphs' },
  { icon: <Crosshair size={28} />, title: 'Object Motion Tracker', desc: 'Track real-world objects via camera and analyze motion with Kalman filtering.', tab: 'tracker' },
];

const equations = [
  { name: 'Velocity-Time', formula: 'v = v₀ + at', desc: 'Relates final velocity to initial velocity, acceleration, and time.', missing: 'Δx' },
  { name: 'Average Velocity', formula: 'Δx = ½(v₀ + v)t', desc: 'Displacement from average of initial and final velocities.', missing: 'a' },
  { name: 'Position-Time', formula: 'Δx = v₀t + ½at²', desc: 'Position as function of time with constant acceleration.', missing: 'v' },
  { name: 'Velocity-Position', formula: 'v² = v₀² + 2aΔx', desc: 'Relates velocities to acceleration and displacement (no time).', missing: 't' },
];

const variables = [
  { symbol: 'v₀', name: 'Initial velocity at t = 0 (m/s)' },
  { symbol: 'v', name: 'Final velocity at time t (m/s)' },
  { symbol: 'a', name: 'Constant acceleration (m/s²)' },
  { symbol: 't', name: 'Elapsed time (seconds)' },
  { symbol: 'Δx', name: 'Displacement — change in position (meters)' },
  { symbol: 'θ', name: 'Launch angle for projectile motion (degrees)' },
];

const concepts = [
  { icon: <Zap size={20} />, title: 'Constant Acceleration', text: 'Kinematic equations apply only when acceleration is constant throughout the motion.' },
  { icon: <Target size={20} />, title: 'Direction Matters', text: 'Use consistent sign conventions — typically up/right is positive, down/left is negative.' },
  { icon: <Atom size={20} />, title: 'Free Fall', text: 'Near Earth\'s surface, all objects accelerate at g ≈ 9.8 m/s² downward (ignoring air resistance).' },
  { icon: <BookOpen size={20} />, title: 'Projectile Motion', text: 'Decompose into independent horizontal (constant v) and vertical (constant a = -g) components.' },
];

const team = [
  { initials: 'HB', name: 'Harvey Bruno', role: 'Lead Developer & Professional Tambay', desc: 'Responsible for the core kinematic calculations engine and real-time visualization systems. Background in computational physics and software engineering.' },
  { initials: 'RC', name: 'Rein Cabillo', role: 'Mathematics Prodigy & Quant Developer', desc: 'Designed the intuitive interface and educational content. Focused on making complex physics concepts accessible to learners at all levels.' },
  { initials: 'RG', name: 'Roel Guevarra', role: 'Computer Vision Engineer and Aspiring Electrical Engineer', desc: 'Developed the object tracking system with Kalman filtering. Specializes in real-time computer vision applications.' },
];

interface HomePageProps {
  onNavigate: (tab: TabId) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-center"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase"
            style={{ background: 'hsl(217, 91%, 50% / 0.2)', color: 'hsl(217, 91%, 80%)' }}
          >
            Interactive Physics Platform
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-3"
            style={{ color: 'white' }}
          >
            Welcome to KINEMA
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-medium mb-4 opacity-80"
            style={{ color: 'hsl(217, 91%, 80%)' }}
          >
            Kalman Integrated Navigation for Experimental Motion Analysis
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto opacity-70 leading-relaxed"
            style={{ color: 'hsl(220, 20%, 85%)' }}
          >
            An interactive physics learning platform combining kinematic equation calculations with real-time visualizations and object tracking technology. Perfect for students and educators exploring motion.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('horizontal')}
            className="mt-6 px-8 py-3 rounded-lg font-semibold bg-card text-primary hover:bg-muted transition-colors inline-flex items-center gap-2"
          >
            Get Started <ArrowRight size={16} />
          </motion.button>
        </div>
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10" style={{ background: 'hsl(217, 91%, 60%)' }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10" style={{ background: 'hsl(174, 72%, 46%)' }} />
      </motion.section>

      {/* Features Grid — CLICKABLE */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.button
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              onClick={() => onNavigate(f.tab)}
              className="kinema-section flex gap-4 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-1 transition-all duration-300 border-l-4 border-primary text-left group cursor-pointer"
            >
              <div className="text-primary shrink-0 mt-1 group-hover:scale-110 transition-transform">{f.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
                <span className="inline-flex items-center gap-1 text-primary text-xs font-semibold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ArrowRight size={12} />
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Kinematic Equations */}
      <section className="kinema-section">
        <h2 className="text-2xl font-bold mb-2">The Four Kinematic Equations</h2>
        <p className="text-muted-foreground mb-6">
          These equations describe motion with constant acceleration. They are the foundation of classical mechanics and allow us to predict the position, velocity, and time of moving objects.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {equations.map((eq, i) => (
            <motion.div
              key={eq.name}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="bg-muted/40 rounded-xl p-5 border border-border"
            >
              <div className="font-mono text-lg font-semibold text-primary mb-2">{eq.formula}</div>
              <div className="text-sm font-semibold mb-1">{eq.name}</div>
              <p className="text-muted-foreground text-sm mb-2">{eq.desc}</p>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Missing: {eq.missing}</span>
            </motion.div>
          ))}
        </div>

        {/* Equation Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-4 py-3 text-left font-semibold border-b border-border">Equation</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-border">When to Use</th>
                <th className="px-4 py-3 text-left font-semibold border-b border-border">Missing Variable</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border"><td className="px-4 py-3 font-mono">v = v₀ + a·t</td><td className="px-4 py-3">When you don't need displacement</td><td className="px-4 py-3">Δx</td></tr>
              <tr className="border-b border-border bg-muted/20"><td className="px-4 py-3 font-mono">Δx = ½(v₀ + v)·t</td><td className="px-4 py-3">When you don't have acceleration</td><td className="px-4 py-3">a</td></tr>
              <tr className="border-b border-border"><td className="px-4 py-3 font-mono">Δx = v₀·t + ½a·t²</td><td className="px-4 py-3">When final velocity is unknown</td><td className="px-4 py-3">v</td></tr>
              <tr><td className="px-4 py-3 font-mono">v² = v₀² + 2a·Δx</td><td className="px-4 py-3">When time is not given</td><td className="px-4 py-3">t</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Variables */}
      <section className="kinema-section">
        <h2 className="text-2xl font-bold mb-6">Variable Definitions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {variables.map((v) => (
            <div key={v.symbol} className="flex items-center bg-muted/30 rounded-lg p-3">
              <span className="variable-badge">{v.symbol}</span>
              <span className="text-sm">{v.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Key Concepts */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8">Key Concepts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {concepts.map((c, i) => (
            <motion.div
              key={c.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="kinema-section border-l-4 border-secondary"
            >
              <div className="flex items-center gap-2 mb-2 text-secondary">
                {c.icon}
                <h3 className="font-semibold">{c.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Common Scenarios */}
      <section className="kinema-section">
        <h2 className="text-2xl font-bold mb-6">Common Scenarios</h2>
        <div className="space-y-4">
          <div className="step-result">
            <h4 className="font-semibold mb-1">Free Fall</h4>
            <p className="text-sm text-muted-foreground mb-2">a = -9.8 m/s² (downward)</p>
            <div className="formula-block">v = v₀ - 9.8t</div>
          </div>
          <div className="step-result">
            <h4 className="font-semibold mb-1">Projectile Motion</h4>
            <p className="text-sm text-muted-foreground mb-2">Horizontal: a = 0 (constant vₓ) | Vertical: a = -9.8 m/s²</p>
            <div className="formula-block">vₓ = v₀·cosθ &nbsp;&nbsp; vᵧ = v₀·sinθ - 9.8t</div>
            <p className="text-sm text-muted-foreground mt-2">Maximum range occurs at θ = 45° (on level ground).</p>
          </div>
          <div className="step-result">
            <h4 className="font-semibold mb-1">Inclined Plane</h4>
            <p className="text-sm text-muted-foreground mb-2">Acceleration depends on angle θ of the incline</p>
            <div className="formula-block">a = g·sinθ</div>
          </div>
        </div>
      </section>

      {/* Derivations */}
      <section className="kinema-section">
        <h2 className="text-2xl font-bold mb-6">Equation Derivations</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          All kinematic equations can be derived from the definitions of velocity and acceleration using calculus.
        </p>
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-xl p-5">
            <h4 className="font-semibold mb-2">From the definition of acceleration:</h4>
            <div className="formula-block">a = dv/dt → ∫dv = ∫a dt → v = v₀ + at</div>
          </div>
          <div className="bg-muted/30 rounded-xl p-5">
            <h4 className="font-semibold mb-2">From the definition of velocity:</h4>
            <div className="formula-block">v = dx/dt → ∫dx = ∫(v₀ + at) dt → x = x₀ + v₀t + ½at²</div>
          </div>
          <div className="bg-muted/30 rounded-xl p-5">
            <h4 className="font-semibold mb-2">Eliminating time:</h4>
            <div className="formula-block">t = (v - v₀)/a → substitute into position equation → v² = v₀² + 2a·Δx</div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8">Meet the Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {team.map((t, i) => (
            <motion.div
              key={t.name}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="kinema-section text-center border-t-4 border-secondary"
            >
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold mx-auto mb-3">
                {t.initials}
              </div>
              <h4 className="font-semibold text-lg">{t.name}</h4>
              <p className="text-primary text-sm font-medium mb-2">{t.role}</p>
              <p className="text-muted-foreground text-sm">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl p-8 text-center"
        style={{ background: 'var(--gradient-primary)' }}
      >
        <h3 className="text-2xl font-bold mb-3" style={{ color: 'white' }}>Ready to Explore Physics?</h3>
        <p className="mb-6 opacity-80" style={{ color: 'hsl(220, 20%, 90%)' }}>
          Click any feature card above or use the navigation tabs to get started.
        </p>
        <button
          onClick={() => onNavigate('horizontal')}
          className="px-8 py-3 rounded-lg font-semibold bg-card text-primary hover:bg-muted transition-colors inline-flex items-center gap-2"
        >
          Start Calculating <ArrowRight size={16} />
        </button>
      </motion.section>
    </div>
  );
}
