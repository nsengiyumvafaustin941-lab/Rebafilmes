import React from 'react';
import { Sparkles, Film, Tv } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './FilterTabs.css';

const FilterTabs = ({ activeTab, onChange }) => {
  const { t } = useLanguage();
  const tabs = [
    { label: t('tab_all') || 'All', icon: Sparkles },
    { label: t('tab_movies') || 'Movies', icon: Film },
    { label: t('tab_series') || 'Series', icon: Tv },
  ];

  return (
    <div className="filter-tabs">
      {tabs.map((tab, i) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.label}
            className={`filter-tab${activeTab === i ? ' active' : ''}`}
            onClick={() => onChange(i)}
          >
            <Icon size={16} className="tab-icon-3d" />
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabs;
