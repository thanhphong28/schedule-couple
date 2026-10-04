// main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { AppProvider } from './context/AppContext.jsx'

// Prevent QuotaExceededError from crashing the app globally
['localStorage', 'sessionStorage'].forEach(storageType => {
  try {
    const storage = window[storageType];
    const originalSetItem = storage.setItem;
    storage.setItem = function(key, value) {
      try {
        originalSetItem.apply(this, arguments);
      } catch (e) {
        console.warn(`${storageType} setItem failed (QuotaExceeded?):`, e);
      }
    };
  } catch (e) {
    // Ignore if not accessible
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

import { ErrorBoundary } from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
