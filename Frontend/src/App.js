import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider as CustomThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Layout/Navbar';
import OpeningAnimation from './components/OpeningAnimation';
import Landing from './pages/Landing';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import VerifyEmail from './pages/Auth/VerifyEmail';
import ForgotPassword from './pages/Auth/ForgotPassword';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminEvents from './pages/Admin/Events';
import AdminParticipations from './pages/Admin/Participations';
import AdminReports from './pages/Admin/Reports';
import AIReports from './pages/Admin/AIReports';
import CertificateConfig from './pages/Admin/CertificateConfigNew';
import StudentDashboard from './pages/Student/Dashboard';
import StudentEvents from './pages/Student/Events';
import StudentProfile from './pages/Student/Profile';
import SubmitReport from './pages/Student/SubmitReport';
import MyReports from './pages/Student/MyReports';
import ReportProblem from './pages/Student/ReportProblem';
import MyProblemReports from './pages/Student/MyProblemReports';
import ProblemDashboard from './pages/Admin/ProblemDashboard';
import InviteUser from './pages/Admin/InviteUser';
import AcademicYearConfig from './pages/Admin/AcademicYearConfig';
import PeriodConfig from './pages/Admin/PeriodConfig';
import Leaderboard from './pages/Leaderboard';
import FacultyDashboard from './pages/Faculty/Dashboard';
import theme from './theme';

function AppContent() {
  const location = useLocation();
  const noNavbarRoutes = ['/', '/login', '/register', '/verify-email', '/forgot-password'];
  const shouldHideNavbar = noNavbarRoutes.includes(location.pathname);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    // Only check on initial mount, not on route changes
    const hasSeenAnimation = sessionStorage.getItem('hasSeenAnimation');
    if (!hasSeenAnimation) {
      setShowAnimation(true);
    }
  }, []); // Empty dependency array - only run once on mount

  const handleAnimationComplete = () => {
    sessionStorage.setItem('hasSeenAnimation', 'true');
    setShowAnimation(false);
  };

  if (showAnimation) {
    return <OpeningAnimation onComplete={handleAnimationComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {!shouldHideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute roles={['admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <PrivateRoute roles={['admin']}>
                  <AdminEvents />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/participations"
              element={
                <PrivateRoute roles={['admin']}>
                  <AdminParticipations />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <PrivateRoute roles={['admin']}>
                  <AdminReports />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/certificates/:eventId"
              element={
                <PrivateRoute roles={['admin', 'faculty']}>
                  <CertificateConfig />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/ai-reports"
              element={
                <PrivateRoute roles={['admin', 'faculty']}>
                  <AIReports />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/problems"
              element={
                <PrivateRoute roles={['admin', 'faculty']}>
                  <ProblemDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/period-config"
              element={
                <PrivateRoute roles={['admin']}>
                  <PeriodConfig />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/academic-year-config"
              element={
                <PrivateRoute roles={['admin']}>
                  <AcademicYearConfig />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/invite"
              element={
                <PrivateRoute roles={['admin']}>
                  <InviteUser />
                </PrivateRoute>
              }
            />

            {/* Faculty Routes */}
            <Route
              path="/faculty/dashboard"
              element={
                <PrivateRoute roles={['faculty', 'admin']}>
                  <FacultyDashboard />
                </PrivateRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/student/dashboard"
              element={
                <PrivateRoute roles={['student']}>
                  <StudentDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/student/events"
              element={
                <PrivateRoute roles={['student']}>
                  <StudentEvents />
                </PrivateRoute>
              }
            />
            <Route
              path="/student/profile"
              element={
                <PrivateRoute roles={['student']}>
                  <StudentProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/student/submit-report/:eventId"
              element={
                <PrivateRoute roles={['student']}>
                  <SubmitReport />
                </PrivateRoute>
              }
            />
            <Route
              path="/student/my-reports"
              element={
                <PrivateRoute roles={['student']}>
                  <MyReports />
                </PrivateRoute>
              }
            />
            <Route
              path="/student/report-problem"
              element={
                <PrivateRoute roles={['student']}>
                  <ReportProblem />
                </PrivateRoute>
              }
            />
            <Route
              path="/student/my-problem-reports"
              element={
                <PrivateRoute roles={['student']}>
                  <MyProblemReports />
                </PrivateRoute>
              }
            />

            {/* Public Leaderboard */}
            <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <CustomThemeProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <SocketProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </CustomThemeProvider>
  );
}

export default App;

