import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

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