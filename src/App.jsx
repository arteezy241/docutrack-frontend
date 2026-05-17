import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import Dashboard from './pages/Dashboard';
import QrLogin from './pages/QrLogin';
import QrConfirm from './pages/QrConfirm';
import Documents from './pages/Documents';
import Routing from './pages/Routing';
import Workflow from './pages/Workflow';
import Departments from './pages/Departments';
import Users from './pages/Users';
import Settings from './pages/Settings';
import useAuthStore from './store/authStore';

function ProtectedRoute({ children }) {
    const { token } = useAuthStore();
    return token ? children : <Navigate to="/login" />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />
                <Route path="/qr-login" element={<QrLogin />} />
                <Route path="/qr-confirm/:token" element={<QrConfirm />} />

                {/* Protected */}
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                <Route path="/routing" element={<ProtectedRoute><Routing /></ProtectedRoute>} />
                <Route path="/workflow" element={<ProtectedRoute><Workflow /></ProtectedRoute>} />
                <Route path="/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;