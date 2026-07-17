import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../utils/api';

const AnnouncementsContext = createContext();
const ANNOUNCEMENTS_KEY = 'rebafilme_announcement';
const DISMISSED_KEY = 'rebafilme_announcement_dismissed';

export const AnnouncementsProvider = ({ children }) => {
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissedId, setDismissedId] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) || null;
  });

  useEffect(() => {
    const fetchAnnouncement = async () => {
      const fetched = await api.get(ANNOUNCEMENTS_KEY, null);
      setAnnouncement(fetched);
      setLoading(false);
    };
    fetchAnnouncement();
  }, []);

  const broadcast = useCallback((message, type = 'info', linkUrl = '') => {
    if (!message) {
      setAnnouncement(null);
      api.set(ANNOUNCEMENTS_KEY, null, true);
      return;
    }
    const newAnn = { id: `ann_${Date.now()}`, message, type, linkUrl, createdAt: Date.now() };
    setAnnouncement(newAnn);
    api.set(ANNOUNCEMENTS_KEY, newAnn, true);
  }, []);

  const dismiss = useCallback(() => {
    if (announcement) {
      setDismissedId(announcement.id);
      localStorage.setItem(DISMISSED_KEY, announcement.id);
    }
  }, [announcement]);

  const activeAnnouncement = announcement && announcement.id !== dismissedId ? announcement : null;

  return (
    <AnnouncementsContext.Provider value={{ announcement, activeAnnouncement, broadcast, dismiss, loading }}>
      {children}
    </AnnouncementsContext.Provider>
  );
};

export const useAnnouncements = () => useContext(AnnouncementsContext);
