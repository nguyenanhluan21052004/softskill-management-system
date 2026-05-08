import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import SoftSkillDashboard from './pages/SoftSkillDashboard';
import StudentPage from './pages/StudentPage';
import TeacherDashboard from './pages/TeacherDashboard';

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem('ss_user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
};

const getDefaultRoute = (role) => {
  if (role === 'admin') {
    return '/admin';
  }

  if (role === 'teacher') {
    return '/teacher';
  }

  if (role === 'student') {
    return '/student';
  }

  return '/login';
};

const PrivateRoute = ({ user, allowedRoles, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(getStoredUser);

  const defaultRoute = useMemo(() => getDefaultRoute(user?.role), [user?.role]);

  const handleLogin = (loggedInUser) => {
    localStorage.setItem('ss_user', JSON.stringify(loggedInUser));
    if (loggedInUser.token) {
      localStorage.setItem('ss_token', loggedInUser.token);
    }
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('ss_user');
    localStorage.removeItem('ss_token');
    setUser(null);
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="app-shell">
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route
            path="/admin"
            element={
              <PrivateRoute user={user} allowedRoles={['admin']}>
                <AdminDashboard user={user} onLogout={handleLogout} />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <PrivateRoute user={user} allowedRoles={['teacher']}>
                <TeacherDashboard user={user} onLogout={handleLogout} />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/analytics"
            element={
              <PrivateRoute user={user} allowedRoles={['teacher']}>
                <SoftSkillDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/student"
            element={
              <PrivateRoute user={user} allowedRoles={['student']}>
                <StudentPage user={user} onLogout={handleLogout} />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to={defaultRoute} replace />} />
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
