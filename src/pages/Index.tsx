import { useState } from 'react';
import TabNav, { type TabId } from '@/components/TabNav';
import HomePage from '@/components/HomePage';
import MotionGraphsExplorer from '@/components/MotionGraphsExplorer';
import KinematicCalculator from '@/components/KinematicCalculator';
import ObjectTracker from '@/components/ObjectTracker';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  return (
    <div className="min-h-screen bg-background">
      {/* Header — clickable to go home */}
      <header className="text-center pt-8 pb-4 px-4">
        <button
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center gap-3 group cursor-pointer transition-transform hover:scale-105"
        >
          <img src="/physics-favicon.png" alt="KINEMA Logo" className="w-10 h-10 md:w-12 md:h-12" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              K<span className="text-primary">.</span>I<span className="text-primary">.</span>N<span className="text-primary">.</span>E<span className="text-primary">.</span>M<span className="text-primary">.</span>A
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 group-hover:text-primary transition-colors">
              Kalman Integrated Navigation for Experimental Motion Analysis
            </p>
          </div>
        </button>
      </header>

      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-4">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 pb-12">
        {activeTab === 'home' && <HomePage onNavigate={setActiveTab} />}
        {activeTab === 'graphs' && <MotionGraphsExplorer />}
        {activeTab === 'horizontal' && <KinematicCalculator mode="horizontal" />}
        {activeTab === 'vertical' && <KinematicCalculator mode="vertical" />}
        {activeTab === 'projectile' && <KinematicCalculator mode="projectile" />}
        {activeTab === 'tracker' && <ObjectTracker />}
      </main>
    </div>
  );
}
