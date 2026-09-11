import React, { createContext, useContext, useState, useCallback } from 'react';
import { getSettings, buildDownloadUrl } from '../utils/settings';
import { useVIP } from '../hooks/useVIP';
import { useAdmin } from './AdminContext';

const ContentLockerContext = createContext({
  isOpen: false,
  activeItem: null,
  openContentLocker: () => {},
  closeContentLocker: () => {},
});

export const useContentLocker = () => useContext(ContentLockerContext);

export const ContentLockerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const { isVip } = useVIP();
  const { isAdmin } = useAdmin();

  const openContentLocker = useCallback((item) => {
    if (!item) return;

    const settings = getSettings();
    const resolvedDownloadUrl = item.downloadUrl || (
      item.videoUrl
        ? `/api/download?url=${encodeURIComponent(item.videoUrl)}&title=${encodeURIComponent(item.title || '')}`
        : buildDownloadUrl(item.title || '')
    );

    // If VIP, Admin, or Locker is disabled, direct download immediately
    if (isVip || isAdmin || !settings.contentLockerEnabled || settings.disableMonetization) {
      window.open(resolvedDownloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Otherwise open Content Locker modal
    setActiveItem({
      ...item,
      downloadUrl: resolvedDownloadUrl,
    });
    setIsOpen(true);
  }, [isVip, isAdmin]);

  const closeContentLocker = useCallback(() => {
    setIsOpen(false);
    setActiveItem(null);
  }, []);

  return (
    <ContentLockerContext.Provider
      value={{
        isOpen,
        activeItem,
        openContentLocker,
        closeContentLocker,
      }}
    >
      {children}
    </ContentLockerContext.Provider>
  );
};

export default ContentLockerContext;
