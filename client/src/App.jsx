import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import DailyLog from './pages/DailyLog';
import EmotionTracker from './pages/EmotionTracker';
import WeeklyReview from './pages/WeeklyReview';
import MonthlyStats from './pages/MonthlyStats';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/journal/:accountId/:date" element={<ProtectedRoute><DailyLog /></ProtectedRoute>} />
          <Route path="/journal/:accountId/:date/emotion" element={<ProtectedRoute><EmotionTracker /></ProtectedRoute>} />
          <Route path="/journal/:accountId/weekly" element={<ProtectedRoute><WeeklyReview /></ProtectedRoute>} />
          <Route path="/journal/:accountId/monthly" element={<ProtectedRoute><MonthlyStats /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
