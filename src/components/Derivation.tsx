import { motion } from 'framer-motion';

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start">
      <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold">{n}</span>
      <div className="flex-1 text-lg leading-relaxed">{children}</div>
    </div>
  );
}

function Formula({ children, big = false }: { children: React.ReactNode; big?: boolean }) {
  return (
    <div className={`font-mono ${big ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'} bg-primary/10 border-l-4 border-primary px-5 py-4 rounded-r-lg my-3 inline-block`}>
      {children}
    </div>
  );
}

function Hl({ children }: { children: React.ReactNode }) {
  return <span className="bg-accent/20 text-accent-foreground dark:text-accent px-1.5 py-0.5 rounded font-semibold">{children}</span>;
}

function VTGraph({ kind }: { kind: 'rect' | 'triangle' | 'trapezoid' }) {
  // Visual aid SVG: v vs t with shaded area
  const W = 320, H = 200, padL = 40, padB = 30;
  const v0 = 30, vf = kind === 'rect' ? 30 : 120;
  const yFor = (v: number) => H - padB - (v / 140) * (H - padB - 10);
  const xT0 = padL, xTf = W - 10;
  const poly =
    kind === 'rect'
      ? `${xT0},${yFor(0)} ${xT0},${yFor(v0)} ${xTf},${yFor(v0)} ${xTf},${yFor(0)}`
      : kind === 'triangle'
      ? `${xT0},${yFor(0)} ${xT0},${yFor(0)} ${xTf},${yFor(vf)} ${xTf},${yFor(0)}`
      : `${xT0},${yFor(0)} ${xT0},${yFor(v0)} ${xTf},${yFor(vf)} ${xTf},${yFor(0)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md bg-muted/30 rounded-lg border border-border">
      <polygon points={poly} fill="hsl(var(--primary) / 0.25)" stroke="hsl(var(--primary))" strokeWidth={2} />
      <line x1={padL} y1={H - padB} x2={W - 5} y2={H - padB} stroke="hsl(var(--foreground))" />
      <line x1={padL} y1={10} x2={padL} y2={H - padB} stroke="hsl(var(--foreground))" />
      <text x={W - 30} y={H - padB + 18} fontSize={12} fill="hsl(var(--muted-foreground))">t</text>
      <text x={padL - 28} y={20} fontSize={12} fill="hsl(var(--muted-foreground))">v</text>
      <text x={padL - 10} y={yFor(v0) + 4} fontSize={11} fill="hsl(var(--foreground))" textAnchor="end">v₀</text>
      {kind !== 'rect' && <text x={xTf + 2} y={yFor(vf) + 4} fontSize={11} fill="hsl(var(--foreground))">v</text>}
    </svg>
  );
}

export default function Derivation() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <header className="kinema-section">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Deriving the Four Kinematic Equations</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl">
          These four equations describe motion with <Hl>constant acceleration</Hl>. Let's see exactly where each one comes from — no magic, just algebra and a v–t graph.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <a href="#eq1" className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted/70">1. v = v₀ + at</a>
          <a href="#eq2" className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted/70">2. x = v₀t + ½at²</a>
          <a href="#eq3" className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted/70">3. v² = v₀² + 2aΔx</a>
          <a href="#eq4" className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted/70">4. x = ½(v₀ + v)t</a>
        </div>
      </header>

      {/* Eq 1 */}
      <section id="eq1" className="kinema-section">
        <h2 className="text-3xl md:text-4xl font-bold mb-2">1. v = v₀ + at</h2>
        <p className="text-lg text-muted-foreground mb-4">"How fast am I going after some time t, if I started at v₀ and accelerated steadily?"</p>
        <div className="space-y-5">
          <Step n={1}>Start from the <Hl>definition of acceleration</Hl>: average acceleration is the change in velocity divided by the change in time.<Formula>a = (v − v₀) / (t − 0)</Formula></Step>
          <Step n={2}><Hl>Multiply both sides by t</Hl> to clear the denominator.<Formula>a · t = v − v₀</Formula></Step>
          <Step n={3}>Add v₀ to both sides to isolate v.<Formula big>v = v₀ + a · t</Formula></Step>
        </div>
        <div className="mt-5 p-4 rounded-lg bg-secondary/10 border-l-4 border-secondary">
          <p className="text-base"><b>Example:</b> A car starts at <Hl>v₀ = 5 m/s</Hl> and accelerates at <Hl>a = 2 m/s²</Hl> for <Hl>t = 4 s</Hl>. Then v = 5 + 2·4 = <b>13 m/s</b>.</p>
        </div>
      </section>

      {/* Eq 2 */}
      <section id="eq2" className="kinema-section">
        <h2 className="text-3xl md:text-4xl font-bold mb-2">2. x = v₀t + ½at²</h2>
        <p className="text-lg text-muted-foreground mb-4">"How far have I traveled in time t?" — derived from the area under a v–t graph.</p>
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <VTGraph kind="trapezoid" />
          <p className="text-lg">On a v–t graph with constant acceleration, velocity is a straight line. The area under the line equals displacement. That area is a <Hl>trapezoid</Hl>, which we split into a rectangle (v₀·t) and a triangle (½·t·(v−v₀)).</p>
        </div>
        <div className="space-y-5 mt-6">
          <Step n={1}>Displacement = area under v–t graph = rectangle + triangle.<Formula>x = v₀·t + ½ · t · (v − v₀)</Formula></Step>
          <Step n={2}>From equation 1, we know <Hl>v − v₀ = a·t</Hl>. Substitute it in.<Formula>x = v₀·t + ½ · t · (a·t)</Formula></Step>
          <Step n={3}>Simplify the second term.<Formula big>x = v₀·t + ½·a·t²</Formula></Step>
        </div>
      </section>

      {/* Eq 3 */}
      <section id="eq3" className="kinema-section">
        <h2 className="text-3xl md:text-4xl font-bold mb-2">3. v² = v₀² + 2a·Δx</h2>
        <p className="text-lg text-muted-foreground mb-4">"What's my speed after traveling some distance?" — the time-free equation.</p>
        <div className="space-y-5">
          <Step n={1}>From equation 1, solve for t.<Formula>t = (v − v₀) / a</Formula></Step>
          <Step n={2}>From equation 2: <Formula>Δx = v₀·t + ½·a·t²</Formula></Step>
          <Step n={3}><Hl>Substitute t</Hl> from step 1 into equation 2.<Formula>Δx = v₀·(v − v₀)/a + ½·a·((v − v₀)/a)²</Formula></Step>
          <Step n={4}>Expand and simplify carefully. The a's cancel in the second term.<Formula>Δx = (v·v₀ − v₀²)/a + (v − v₀)² / (2a)</Formula></Step>
          <Step n={5}>Multiply everything by <Hl>2a</Hl> to clear denominators.<Formula>2a·Δx = 2(v·v₀ − v₀²) + (v − v₀)²</Formula></Step>
          <Step n={6}>Expand (v − v₀)² = v² − 2v·v₀ + v₀² and combine like terms — the cross terms cancel.<Formula big>v² = v₀² + 2a·Δx</Formula></Step>
        </div>
        <div className="mt-5 p-4 rounded-lg bg-destructive/10 border-l-4 border-destructive">
          <p className="text-base"><b>Common mistake:</b> Forgetting to use Δx (displacement), not total distance. If the object turns around, these are different!</p>
        </div>
      </section>

      {/* Eq 4 */}
      <section id="eq4" className="kinema-section">
        <h2 className="text-3xl md:text-4xl font-bold mb-2">4. x = ½(v₀ + v)·t</h2>
        <p className="text-lg text-muted-foreground mb-4">"Use the average velocity when acceleration is constant."</p>
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <VTGraph kind="trapezoid" />
          <p className="text-lg">When acceleration is constant, the <Hl>average velocity</Hl> is just the average of the starting and ending velocity. Distance = average velocity × time.</p>
        </div>
        <div className="space-y-5 mt-6">
          <Step n={1}>Average velocity for constant acceleration:<Formula>v̄ = (v₀ + v) / 2</Formula></Step>
          <Step n={2}>Displacement equals average velocity times time:<Formula>x = v̄ · t</Formula></Step>
          <Step n={3}>Substitute v̄:<Formula big>x = ½ · (v₀ + v) · t</Formula></Step>
        </div>
        <div className="mt-5 p-4 rounded-lg bg-secondary/10 border-l-4 border-secondary">
          <p className="text-base"><b>Why useful?</b> When you don't know acceleration but you do know both velocities and time — pick this one.</p>
        </div>
      </section>

      <section className="kinema-section">
        <h2 className="text-2xl font-bold mb-3">All four together</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-lg font-mono">
          <div className="formula-block !text-xl">v = v₀ + a·t</div>
          <div className="formula-block !text-xl">x = v₀·t + ½·a·t²</div>
          <div className="formula-block !text-xl">v² = v₀² + 2a·Δx</div>
          <div className="formula-block !text-xl">x = ½(v₀ + v)·t</div>
        </div>
        <p className="text-base text-muted-foreground mt-4">Each equation is missing one variable — pick whichever leaves out the quantity you <Hl>don't have and don't need</Hl>.</p>
      </section>
    </motion.div>
  );
}
