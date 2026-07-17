import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './FilterTabs.css';

const FilterTabs = ({ activeTab, onChange }) => {
  const { t } = useLanguage();
  const tabs = [t('tab_all'), t('tab_movies'), t('tab_series')];

  return (
    <div className="filter-tabs">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          className={`filter-tab${activeTab === i ? ' active' : ''}`}
          onClick={() => onChange(i)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default FilterTabs;
