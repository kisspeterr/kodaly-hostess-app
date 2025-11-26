import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home'; // Added import
import Quiz from './pages/Quiz';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import QuizEditor from './pages/QuizEditor';
import JobTableEditor from './pages/JobTableEditor';
import Notifications from './pages/Notifications';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import HostessSchedule from './pages/HostessSchedule';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<><Navbar /><Home /></>} />
            <Route path="/jobs" element={<><Navbar /><Dashboard /></>} />
            <Route path="/profile" element={<><Navbar /><Profile /></>} />
            <Route path="/users" element={<><Navbar /><UserManagement /></>} />
            <Route path="/quiz-editor" element={<><Navbar /><QuizEditor /></>} />
            <Route path="/admin/schedule" element={<><Navbar /><JobTableEditor /></>} />
            <Route path="/schedule" element={<><Navbar /><HostessSchedule /></>} />
            <Route path="/quiz" element={<div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}><Navbar /><Quiz /></div>} />
            <Route path="/notifications" element={<><Navbar /><Notifications /></>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
