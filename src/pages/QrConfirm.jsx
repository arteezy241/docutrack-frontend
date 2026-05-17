import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';

export default function QrConfirm() {
    const { token } = useParams();
    const [status, setStatus] = useState('confirming');
    const { token: authToken } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authToken) {
            // Not logged in — redirect to login with return URL
            navigate(`/login?redirect=/qr-confirm/${token}`);
            return;
        }

        // Confirm the QR session
        client.post(`/auth/qr-session/confirm/${token}`)
            .then(() => setStatus('success'))
            .catch(() => setStatus('error'));
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#1b2838', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ width: 300, borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', background: '#c6d4df', padding: 32, textAlign: 'center' }}>
                {status === 'confirming' && (
                    <>
                        <div style={{ fontSize: 48 }}>⏳</div>
                        <h2 style={{ color: '#3d3d3f', fontSize: 16, margin: '16px 0 8px' }}>Confirming...</h2>
                        <p style={{ color: '#4d6275', fontSize: 13 }}>Please wait while we confirm your QR login.</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div style={{ fontSize: 48 }}>✅</div>
                        <h2 style={{ color: '#10b981', fontSize: 16, margin: '16px 0 8px' }}>Success!</h2>
                        <p style={{ color: '#4d6275', fontSize: 13 }}>Your desktop session has been authenticated. You can close this page.</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div style={{ fontSize: 48 }}>❌</div>
                        <h2 style={{ color: '#ef4444', fontSize: 16, margin: '16px 0 8px' }}>Failed</h2>
                        <p style={{ color: '#4d6275', fontSize: 13 }}>QR code is invalid or expired. Please generate a new one.</p>
                    </>
                )}
            </div>
        </div>
    );
}