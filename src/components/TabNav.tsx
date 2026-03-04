import { motion } from 'framer-motion';
import { Home, BarChart3, ArrowRight, ArrowDown, Crosshair, Rocket } from 'lucide-react';

export type TabId = 'home' | 'graphs' | 'horizontal' | 'vertical' | 'projectile' | 'tracker';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={16} /> },
  { id: 'graphs', label: 'Motion Graphs', icon: <BarChart3 size={16} /> },
  { id: 'horizontal', label: 'Horizontal', icon: <ArrowRight size={16} /> },
  { id: 'vertical', label: 'Vertical', icon: <ArrowDown size={16} /> },
  { id: 'projectile', label: 'Projectile', icon: <Rocket size={16} /> },
  { id: 'tracker', label: 'Object Tracker', icon: <Crosshair size={16} /> },
];

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="flex flex-wrap justify-center gap-2 p-3 bg-card rounded-xl shadow-[var(--shadow-card)] border border-border mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === tab.id
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-primary rounded-lg"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}
