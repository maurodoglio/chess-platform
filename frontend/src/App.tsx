import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import OnlineGamePage from './pages/OnlineGamePage';
import ComputerGamePage from './pages/ComputerGamePage';
import LocalGamePage from './pages/LocalGamePage';
import GameHistoryPage from './pages/GameHistoryPage';
import ReplayPage from './pages/ReplayPage';

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/play/online" element={<OnlineGamePage />} />
        <Route path="/play/computer" element={<ComputerGamePage />} />
        <Route path="/play/local" element={<LocalGamePage />} />
        <Route path="/history" element={<GameHistoryPage />} />
        <Route path="/history/:id" element={<ReplayPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
