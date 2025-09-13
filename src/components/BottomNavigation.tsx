import React from 'react';
import { Home, BarChart3, TrendingUp } from 'lucide-react';
import './BottomNavigation.css';

interface BottomNavigationProps {
  activeTab: 'home' | 'summary' | 'income' | 'analytics';
  onTabChange: (tab: 'home' | 'summary' | 'income' | 'analytics') => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'summary' as const, label: 'Summary', icon: BarChart3 },
    { id: 'analytics' as const, label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <nav className="bottom-navigation">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-button ${activeTab === id ? 'active' : ''}`}
          onClick={() => {
            console.log('🟢 BottomNavigation clicked:', id);
            console.log('🟢 Calling onTabChange with:', id);
            onTabChange(id);
            console.log('🟢 onTabChange called');
          }}
        >
          <Icon size={28} />
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNavigation;
