import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import { GoogleLogin } from "@react-oauth/google";
import useWindowWidth from '../hooks/useWindowWidth';


export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDeviceOtp, setShowDeviceOtp] = useState(false);
    const [deviceOtp, setDeviceOtp] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');
    const [deviceOtpLoading, setDeviceOtpLoading] = useState(false);
    const [deviceOtpError, setDeviceOtpError] = useState('');
    const { login } = useAuthStore();
    const navigate = useNavigate();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await client.post('/auth/login', { email, password });
            if (res.data.requiresOtp) {
                // new device detected — show OTP modal
                setPendingEmail(res.data.email);
                setShowDeviceOtp(true);
                setLoading(false);
                return;
            }
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeviceVerify = async () => {
        setDeviceOtpLoading(true);
        setDeviceOtpError('');
        try {
            const deviceName = navigator.userAgent.slice(0, 100);
            const res = await client.post('/auth/verify-device', {
                email: pendingEmail,
                otp: deviceOtp,
                deviceName,
            });
            localStorage.setItem('deviceToken', res.data.deviceToken);
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            setDeviceOtpError(err.response?.data?.error || 'Invalid OTP');
        } finally {
            setDeviceOtpLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#1b2838', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>

            {/* Navbar */}
            <div style={{ background: '#171a21', borderBottom: '1px solid #000', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 32, height: 32, background: '#4F46E5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>D</span>
                    </div>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 2 }}>DOCUTRACK</span>
                </div>
            </div>

            {/* Hero */}
            <div style={{ flex: 1, background: 'linear-gradient(135deg, #0f1923 0%, #1b2838 50%, #2a475e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : '48px 24px', position: 'relative', overflow: 'hidden' }}>

                {/* Glow blobs */}
                <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: '#4F46E5', opacity: 0.15, filter: 'blur(80px)' }}></div>
                <div style={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: '#66c0f4', opacity: 0.1, filter: 'blur(80px)' }}></div>

                {/* Content row */}
                <div style={{ display: 'flex', gap: isMobile ? 0 : 48, alignItems: 'flex-start', position: 'relative', zIndex: 1, flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? 420 : 'none' }}>

                    {/* Left - branding - hidden on mobile */}
                    {!isMobile && (
                        <div style={{ paddingTop: 16, minWidth: 240 }}>
                            <h1 style={{ fontSize: 48, fontWeight: 'bold', color: '#fff', margin: 0, marginBottom: 12 }}>Sign In</h1>
                            <p style={{ color: '#8f98a0', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                                Access your DocuTrack account to manage and track documents across your organization.
                            </p>
                            {['Document routing & approval', 'Real-time push notifications', 'Automated workflow engine', 'QR code tracking'].map(f => (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <span style={{ color: '#66c0f4', fontSize: 16 }}>✓</span>
                                    <span style={{ color: '#8f98a0', fontSize: 13 }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Divider - hidden on mobile */}
                    {!isMobile && (
                        <div style={{ width: 1, alignSelf: 'stretch', background: '#66c0f4', opacity: 0.2 }}></div>
                    )}

                    {/* Center - Login form */}
                    <div style={{ width: isMobile ? '100%' : 300, borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

                        {/* Form header */}
                        <div style={{ background: '#c6d4df', padding: '16px 20px 12px' }}>
                            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#3d3d3f' }}>
                                Sign in with account name
                            </h2>
                        </div>

                        {/* Form body */}
                        <div style={{ background: '#c6d4df', padding: '0 20px 16px' }}>
                            {error && (
                                <div style={{ background: '#fee', border: '1px solid #fcc', color: '#c33', padding: '8px 12px', borderRadius: 4, fontSize: 12, marginBottom: 10 }}>
                                    {error}
                                </div>
                            )}
                            <form onSubmit={handleLogin}>
                                <div style={{ marginBottom: 10 }}>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: '#3d3d3f', marginBottom: 4, letterSpacing: 0.5 }}>Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #a0a0a0', borderRadius: 3, background: '#fff', color: '#333', boxSizing: 'border-box', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: '#3d3d3f', marginBottom: 4, letterSpacing: 0.5 }}>Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #a0a0a0', borderRadius: 3, background: '#fff', color: '#333', boxSizing: 'border-box', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                    <input type="checkbox" id="remember" style={{ width: 13, height: 13 }} />
                                    <label htmlFor="remember" style={{ fontSize: 12, color: '#3d3d3f', cursor: 'pointer' }}>Remember me</label>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{ width: '100%', padding: '10px', background: 'linear-gradient(to bottom, #47bfff 5%, #1a44c2 95%)', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
                                >
                                    {loading ? 'Signing in...' : 'Sign in'}
                                </button>
                            </form>

                            <div style={{ textAlign: 'center', marginTop: 10 }}>
                                <a href="#" style={{ color: '#4a7fa5', fontSize: 12, textDecoration: 'none' }}>I can't sign in</a>
                            </div>

                            {/* Google Sign In */}
                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontSize: 11, color: '#8f98a0' }}>— or —</div>
                                <GoogleLogin
                                    onSuccess={async (credentialResponse) => {
                                        try {
                                            const res = await client.post("/auth/google", {
                                                idToken: credentialResponse.credential,
                                            });
                                            login(res.data.token, res.data.user);
                                            navigate("/");
                                        } catch (err) {
                                            setError("Google login failed");
                                        }
                                    }}
                                    onError={() => setError("Google login failed")}
                                    useOneTap
                                    theme="filled_blue"
                                    shape="rectangular"
                                    text="signin_with_google"
                                    width="260"
                                />
                            </div>
                        </div>

                        {/* Register */}
                        <div style={{ background: '#b8c7d9', borderTop: '1px solid #a0b0c0', padding: '10px 20px', textAlign: 'center' }}>
                            <span style={{ fontSize: 12, color: '#3d3d3f' }}>New to DocuTrack? </span>
                            <Link to="/register" style={{ color: '#4a7fa5', fontSize: 12, fontWeight: 'bold', textDecoration: 'none' }}>Create a free account</Link>
                        </div>
                    </div>

                    {/* Right - QR panel - hidden on mobile */}
                    {!isMobile && (
                        <div
                            onClick={() => navigate("/qr-login")}
                            style={{ width: 200, borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'pointer' }}
                        >
                            <div style={{ background: '#c6d4df', padding: 16 }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', color: '#3d3d3f', letterSpacing: 0.5 }}>
                                    Or sign in with QR
                                </h3>
                                <div style={{ background: '#fff', border: '1px solid #a0a0a0', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 16, borderRadius: 3 }}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4a7fa5" strokeWidth="1.5">
                                        <rect x="3" y="3" width="7" height="7" rx="1" />
                                        <rect x="14" y="3" width="7" height="7" rx="1" />
                                        <rect x="3" y="14" width="7" height="7" rx="1" />
                                        <rect x="14" y="14" width="7" height="7" rx="1" />
                                        <rect x="5" y="5" width="3" height="3" fill="#4a7fa5" stroke="none" />
                                        <rect x="16" y="5" width="3" height="3" fill="#4a7fa5" stroke="none" />
                                        <rect x="5" y="16" width="3" height="3" fill="#4a7fa5" stroke="none" />
                                    </svg>
                                    <p style={{ margin: '8px 0 0', fontSize: 11, color: '#666', textAlign: 'center' }}>Click to sign in with QR</p>
                                </div>
                                <p style={{ fontSize: 11, color: '#4d6275', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
                                    Use the DocuTrack mobile app to sign in via QR code
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div style={{ background: '#171a21', borderTop: '1px solid #000', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ color: '#8f98a0', fontSize: 11 }}>© 2026 DocuTrack — Lyceum of the Philippines University Cavite</span>
                <div style={{ display: 'flex', gap: 16 }}>
                    {['Privacy Policy', 'Legal', 'Support'].map(l => (
                        <span key={l} style={{ color: '#8f98a0', fontSize: 11, cursor: 'pointer' }}>{l}</span>
                    ))}
                </div>
            </div>
            {/* Device verification modal */}
            {showDeviceOtp && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
                    <div style={{ width: '100%', maxWidth: 360, borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                        <div style={{ background: '#c6d4df', padding: '16px 20px 12px' }}>
                            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#3d3d3f' }}>
                                New Device Detected
                            </h2>
                        </div>
                        <div style={{ background: '#c6d4df', padding: '16px 20px' }}>
                            <p style={{ fontSize: 12, color: '#4d6275', marginBottom: 16, lineHeight: 1.6 }}>
                                We sent a verification code to <strong>{pendingEmail}</strong>. Enter it below to trust this device.
                            </p>
                            {deviceOtpError && (
                                <div style={{ background: '#fee', border: '1px solid #fcc', color: '#c33', padding: '8px 12px', borderRadius: 4, fontSize: 12, marginBottom: 12 }}>
                                    {deviceOtpError}
                                </div>
                            )}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: '#3d3d3f', marginBottom: 4 }}>
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    value={deviceOtp}
                                    onChange={(e) => setDeviceOtp(e.target.value)}
                                    placeholder="123456"
                                    maxLength={6}
                                    style={{ width: '100%', padding: '10px', fontSize: 20, border: '1px solid #a0a0a0', borderRadius: 3, background: '#fff', color: '#333', boxSizing: 'border-box', outline: 'none', textAlign: 'center', letterSpacing: 8, fontWeight: 'bold' }}
                                />
                            </div>
                            <button
                                onClick={handleDeviceVerify}
                                disabled={deviceOtpLoading || deviceOtp.length < 6}
                                style={{ width: '100%', padding: '10px', background: 'linear-gradient(to bottom, #47bfff 5%, #1a44c2 95%)', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', opacity: deviceOtpLoading ? 0.6 : 1 }}
                            >
                                {deviceOtpLoading ? 'Verifying...' : 'Verify Device'}
                            </button>
                            <div style={{ textAlign: 'center', marginTop: 10 }}>
                                <button
                                    onClick={() => { setShowDeviceOtp(false); setDeviceOtp(''); setDeviceOtpError(''); }}
                                    style={{ background: 'none', border: 'none', color: '#4a7fa5', fontSize: 12, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}