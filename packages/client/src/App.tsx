import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.js';
import Nearby from './pages/Nearby.js';
import Anywhere from './pages/Anywhere.js';
import Transfers from './pages/Transfers.js';
import Settings from './pages/Settings.js';
import Room from './pages/Room.js';
import Transfer from './pages/Transfer.js';
import Completion from './pages/Completion.js';
import { NavigationShell } from './components/md3/NavigationShell.js';
import { useSocket } from './hooks/useSocket.js';

function AppContent() {
  useSocket();

  return (
    <NavigationShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nearby" element={<Nearby />} />
        <Route path="/anywhere" element={<Anywhere />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/transfer/:roomId" element={<Transfer />} />
        <Route path="/complete/:roomId" element={<Completion />} />
        <Route path="/history" element={<Navigate to="/transfers" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NavigationShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
