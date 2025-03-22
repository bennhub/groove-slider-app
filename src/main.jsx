import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

// Function to preload FFmpeg files for offline use
async function preloadFFmpeg() {
  try {
    if ('caches' in window) {
      const cache = await caches.open('groove-gallery-cache-v1');
      const urls = [
        'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.js',
        'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.wasm'
      ];
      
      // Check if already cached
      const allCached = await Promise.all(
        urls.map(async url => !!(await cache.match(url)))
      );
      
      if (!allCached.every(Boolean)) {
        console.log('Preloading FFmpeg files...');
        await Promise.all(urls.map(url => fetch(url).then(res => cache.put(url, res))));
        console.log('FFmpeg files preloaded successfully');
      } else {
        console.log('FFmpeg files already cached');
      }
    }
  } catch (error) {
    console.error('Error preloading FFmpeg:', error);
  }
}

function Main() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // PWA service worker registration with vite-plugin-pwa
  useEffect(() => {
    // Register service worker using vite-plugin-pwa
    const updateSW = registerSW({
      onNeedRefresh() {
        // App needs refresh because new content is available
        setUpdateAvailable(true);
      },
      onOfflineReady() {
        console.log('App ready for offline use');
        // Preload FFmpeg files when service worker is ready
        preloadFFmpeg();
      }
    });

    // PWA Installation Handler
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPrompt(e);
    };

    const handleAppInstalled = (evt) => {
      console.log('App was successfully installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Also try to preload FFmpeg on initial load
    preloadFFmpeg();

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
    }
  };

  const handleUpdateClick = () => {
    // This function will reload the page to update to the latest version
    window.location.reload();
  };

  return (
    <StrictMode>
      <App 
        installPrompt={installPrompt} 
        onInstallClick={handleInstallClick}
        updateAvailable={updateAvailable}
        onUpdateClick={handleUpdateClick}
      />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(<Main />);