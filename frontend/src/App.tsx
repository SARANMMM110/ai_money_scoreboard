import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { NewScanPage, ScanProgressPage } from './pages/ScanPage';
import { ResultsPage, ReportViewPage } from './pages/ResultsPage';
import { HistoryPage, SettingsPage } from './pages/HistoryPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/app" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/app/scan" element={<ProtectedRoute><NewScanPage /></ProtectedRoute>} />
          <Route path="/app/scan/:id" element={<ProtectedRoute><ScanProgressPage /></ProtectedRoute>} />
          <Route path="/app/results/:id" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/app/report/:id" element={<ProtectedRoute><ReportViewPage /></ProtectedRoute>} />
          <Route path="/app/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/app/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
