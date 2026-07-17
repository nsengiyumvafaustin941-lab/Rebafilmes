import React from 'react';
import { X, Bell, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { useAnnouncements } from '../contexts/AnnouncementsContext';
import './AnnouncementBar.css';

const AnnouncementBar = () => {
  const { activeAnnouncement, dismiss } = useAnnouncements();

  if (!activeAnnouncement) return null;

  const { message, type, linkUrl } = activeAnnouncement;
  
  const Icon = type === 'warning' ? AlertTriangle : type === 'success' ? Bell : Info;
  
  const content = (
    <div className={`announcement-bar ${type}`}>
      <div className="announcement-content">
        <Icon size={16} className="announcement-icon" />
        <span className="announcement-text">{message}</span>
        {linkUrl && <ArrowRight size={14} className="announcement-arrow" />}
      </div>
      <button className="announcement-close" onClick={(e) => { e.preventDefault(); dismiss(); }}>
        <X size={15} />
      </button>
    </div>
  );

  if (linkUrl) {
    return (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="announcement-link-wrap">
        {content}
      </a>
    );
  }

  return content;
};

export default AnnouncementBar;
