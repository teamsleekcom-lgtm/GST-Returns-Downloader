import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LockScreen from './components/LockScreen';
import SetupView from './views/SetupView';
import DashboardView from './views/DashboardView';
import ClientManagerView from './views/ClientManagerView';
import DownloadView from './views/DownloadView';
import RunnerView from './views/RunnerView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';
import { isEngineRunning } from './services/engineService';
import { isVaultUnlocked } from './services/clientService';

function App() {
  const [engineReady, setEngineReady] = useState(null);
  const [unlocked, setUnlocked] = useState(isVaultUnlocked());

  useEffect(() => {
    const checkEngine = async () => {
      const running = await isEngineRunning();
      setEngineReady(running);
    };
    checkEngine();
  }, []);

  // Show lock screen if vault is not unlocked
  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  if (engineReady === null) {
    return <div className="flex-center" style={{ height: '100vh' }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={engineReady ? <Navigate to="/dashboard" replace /> : <SetupView />}
        />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/clients" element={<ClientManagerView />} />
        <Route path="/download" element={<DownloadView />} />
        <Route path="/runner" element={<RunnerView />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
