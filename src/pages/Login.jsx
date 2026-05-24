import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client, { setCookie, getDeviceName } from '../api/client';
import useAuthStore from '../store/authStore';
import { GoogleLogin } from "@react-oauth/google";
import useWindowWidth from '../hooks/useWindowWidth';
import { registerPush } from '../api/push';
import { useEffect, useRef } from "react";
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
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
    const [showForgot, setShowForgot] = useState(false);
    const [forgotStep, setForgotStep] = useState('email');
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotOtp, setForgotOtp] = useState('');
    const [forgotNewPass, setForgotNewPass] = useState('');
    const [forgotConfirmPass, setForgotConfirmPass] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState('');
  
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let w = canvas.width = canvas.offsetWidth;
        let h = canvas.height = canvas.offsetHeight;

        const resize = () => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; };
        window.addEventListener('resize', resize);

        const colors = ['#4F46E5', '#47bfff', '#7c3aed', '#06b6d4', '#0ea5e9'];
        const particles = Array.from({ length: 60 }, () => {
            const vx = (Math.random() - 0.5) * 0.6;
            const vy = (Math.random() - 0.5) * 0.6;
            return {
                x: Math.random() * w, y: Math.random() * h,
                r: Math.random() * 3 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx, vy,
                baseVx: vx, baseVy: vy,
                opacity: Math.random() * 0.4 + 0.1,
            };
        });

        const repulse = (cx, cy) => {
            particles.forEach(p => {
                const dx = p.x - cx;
                const dy = p.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    const force = (200 - dist) / 200;
                    p.vx += (dx / dist) * force * 6;
                    p.vy += (dy / dist) * force * 6;
                }
            });
        };

        const handleClick = (e) => {
            const rect = canvas.getBoundingClientRect();
            repulse(e.clientX - rect.left, e.clientY - rect.top);
        };

        const handleTouch = (e) => {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            repulse(touch.clientX - rect.left, touch.clientY - rect.top);
        };

        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', handleTouch);

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(71,191,255,${0.08 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
                ctx.fill();
                p.x += p.vx;
                p.y += p.vy;
                // Gradually return to base speed after repulsion
                p.vx += (p.baseVx - p.vx) * 0.02;
                p.vy += (p.baseVy - p.vy) * 0.02;
                if (p.x < 0 || p.x > w) { p.vx *= -1; p.baseVx *= -1; }
                if (p.y < 0 || p.y > h) { p.vy *= -1; p.baseVy *= -1; }
            });
            animId = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('touchstart', handleTouch);
        };
    }, []);

    
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
                setPendingEmail(res.data.email);
                setShowDeviceOtp(true);
                setLoading(false);
                return;
            }
            login(res.data.token, res.data.user);
            registerPush();
            navigate('/', { replace: true });
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
            const res = await client.post('/auth/verify-device', {
                email: pendingEmail,
                otp: deviceOtp,
                deviceName: getDeviceName()
            });
            const userId = res.data.user?.id;
            localStorage.setItem(`deviceToken_${userId}`, res.data.deviceToken);
            setCookie(`deviceToken_${userId}`, res.data.deviceToken, 90);
            login(res.data.token, res.data.user);
            registerPush();
            navigate('/', { replace: true });
        } catch (err) {
            setDeviceOtpError(err.response?.data?.error || 'Invalid OTP');
        } finally {
            setDeviceOtpLoading(false);
        }
    };

    const handleForgotSendOtp = async () => {
        setForgotLoading(true);
        setForgotError('');
        try {
            await client.post('/auth/forgot-password', { email: forgotEmail });
            setForgotStep('otp');
        } catch {
            setForgotError('Something went wrong. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleForgotVerifyOtp = () => {
        if (forgotOtp.length < 6) { setForgotError('Enter the 6-digit code.'); return; }
        setForgotStep('newpass');
        setForgotError('');
    };

    const handleForgotReset = async () => {
        setForgotError('');
        if (forgotNewPass.length < 8) { setForgotError('Password must be at least 8 characters.'); return; }
        if (!/[A-Z]/.test(forgotNewPass)) { setForgotError('Password must contain at least one uppercase letter.'); return; }
        if (!/[a-z]/.test(forgotNewPass)) { setForgotError('Password must contain at least one lowercase letter.'); return; }
        if (!/[0-9]/.test(forgotNewPass)) { setForgotError('Password must contain at least one number.'); return; }
        if (forgotNewPass !== forgotConfirmPass) { setForgotError('Passwords do not match.'); return; }
        setForgotLoading(true);
        try {
            await client.post('/auth/reset-password', {
                email: forgotEmail,
                otp: forgotOtp,
                newPassword: forgotNewPass,
            });
            setForgotStep('done');
        } catch (err) {
            setForgotError(err.response?.data?.error || 'Reset failed. Code may have expired.');
        } finally {
            setForgotLoading(false);
        }
    };

    const closeForgot = () => {
        setShowForgot(false);
        setForgotStep('email');
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPass('');
        setForgotConfirmPass('');
        setForgotError('');
        
    };

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouse({ x: e.clientX / rect.width, y: e.clientY / rect.height });
    };

    const handleTouchMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        setMouse({ x: touch.clientX / rect.width, y: touch.clientY / rect.height });
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes blob1 {
                    0%, 100% { transform: translate(var(--mx, 0px), var(--my, 0px)) scale(1); }
                    33% { transform: translate(calc(var(--mx, 0px) + 40px), calc(var(--my, 0px) - 30px)) scale(1.1); }
                    66% { transform: translate(calc(var(--mx, 0px) - 20px), calc(var(--my, 0px) + 20px)) scale(0.95); }
                }
                @keyframes blob2 {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    33% { transform: translate(-50px, 30px) scale(1.05); }
                    66% { transform: translate(30px, -40px) scale(1.1); }
                }
                @keyframes blob3 {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    33% { transform: translate(30px, -20px) scale(0.95); }
                    66% { transform: translate(-40px, 30px) scale(1.05); }
                }
                @keyframes blob4 {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    50% { transform: translate(-30px, -40px) scale(1.15); }
                }
                .login-input {
                    width: 100%; padding: 10px 12px;
                    font-size: 13px;
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 8px;
                    background: rgba(255,255,255,0.07);
                    color: #e8edf2;
                    box-sizing: border-box;
                    outline: none;
                    font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s, background 0.2s;
                }
                .login-input:focus {
                    border-color: rgba(71,191,255,0.5);
                    background: rgba(255,255,255,0.1);
                }
                .login-input::placeholder { color: rgba(255,255,255,0.3); }
                .login-btn {
                    width: 100%; padding: 11px;
                    background: linear-gradient(135deg, #47bfff, #4F46E5);
                    color: #fff; border: none; border-radius: 10px;
                    font-size: 13px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 1px;
                    cursor: pointer; font-family: 'Inter', sans-serif;
                    transition: opacity 0.2s, transform 0.2s;
                    box-shadow: 0 4px 16px rgba(79,70,229,0.4);
                }
                .login-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .login-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .qr-btn {
                    width: 100%; padding: 11px;
                    background: rgba(255,255,255,0.06);
                    color: #c6d4df; border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 10px; font-size: 13px; font-weight: 600;
                    cursor: pointer; font-family: 'Inter', sans-serif;
                    transition: background 0.2s, border-color 0.2s;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                }
                .qr-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
                .feature-item {
                    display: flex; align-items: center; gap: 10px;
                    margin-bottom: 12px; animation: fadeUp 0.5s ease both;
                }
                .qr-panel {
                    cursor: pointer;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px; padding: 20px;
                    transition: background 0.2s, border-color 0.2s, transform 0.2s;
                    animation: fadeUp 0.5s ease 0.2s both;
                }
                .qr-panel:hover {
                    background: rgba(255,255,255,0.07);
                    border-color: rgba(71,191,255,0.3);
                    transform: translateY(-2px);
                }
                .footer-link {
                    color: rgba(255,255,255,0.4); font-size: 11px;
                    cursor: pointer; transition: color 0.2s;
                    text-decoration: none;
                }
                .footer-link:hover { color: rgba(255,255,255,0.7); }
                .forgot-link {
                    background: none; border: none;
                    color: rgba(71,191,255,0.7); font-size: 12px;
                    cursor: pointer; font-family: 'Inter', sans-serif;
                    transition: color 0.2s; padding: 0;
                }
                .forgot-link:hover { color: #47bfff; }
            `}</style>

            {/* Navbar */}
            <div style={{ background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#47bfff,#4F46E5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(79,70,229,0.4)' }}>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>D</span>
                    </div>
                    <span style={{ color: '#e8edf2', fontWeight: 700, fontSize: 14, letterSpacing: 2 }}>DOCUTRACK</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>LPU-Cavite</span>
            </div>

            {/* Hero — mouse tracking happens here */}
            <div
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '32px 16px' : '48px 24px', position: 'relative', overflow: 'hidden' }}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
            >
                <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, cursor: 'crosshair', pointerEvents: 'all' }}
                />
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', borderRadius: '50%', background: '#4F46E5', opacity: 0.3, filter: 'blur(120px)', width: 600, height: 600, top: '-20%', left: '-10%', transform: `translate(${mouse.x * 80}px, ${mouse.y * 60}px)`, transition: 'transform 1s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                    <div style={{ position: 'absolute', borderRadius: '50%', background: '#0ea5e9', opacity: 0.25, filter: 'blur(100px)', width: 500, height: 500, top: '30%', right: '-10%', transform: `translate(${-mouse.x * 60}px, ${mouse.y * 80}px)`, transition: 'transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                    <div style={{ position: 'absolute', borderRadius: '50%', background: '#7c3aed', opacity: 0.2, filter: 'blur(110px)', width: 550, height: 550, bottom: '-10%', left: '20%', transform: `translate(${mouse.x * 50}px, ${-mouse.y * 60}px)`, transition: 'transform 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                </div>

                {/* Content */}
                <div style={{ display: 'flex', gap: isMobile ? 0 : 48, alignItems: isMobile ? 'stretch' : 'flex-start', position: 'relative', zIndex: 1, flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? 440 : 'none' }}>

                    {/* Left branding */}
                    {!isMobile && (
                        <div style={{ paddingTop: 8, minWidth: 260, animation: 'fadeUp 0.4s ease both' }}>
                            <h1 style={{ fontSize: 52, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1 }}>Sign In</h1>
                            <p style={{ color: '#8f98a0', fontSize: 13, marginBottom: 28, lineHeight: 1.7 }}>
                                Access your DocuTrack account to manage and track documents across your organization.
                            </p>
                            {[
                                { icon: '📄', text: 'Document routing & approval' },
                                { icon: '🔔', text: 'Real-time push notifications' },
                                { icon: '⚡', text: 'Automated workflow engine' },
                                { icon: '📱', text: 'QR code tracking' },
                            ].map((f, i) => (
                                <div key={f.text} className="feature-item" style={{ animationDelay: `${i * 0.08}s` }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(71,191,255,0.1)', border: '1px solid rgba(71,191,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                                        {f.icon}
                                    </div>
                                    <span style={{ color: '#8f98a0', fontSize: 13 }}>{f.text}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {!isMobile && (
                        <div style={{ width: 1, alignSelf: 'stretch', background: 'linear-gradient(to bottom, transparent, rgba(102,192,244,0.3), transparent)' }} />
                    )}

                    {/* Login form */}
                    <div style={{ width: isMobile ? '100%' : 300, animation: 'fadeUp 0.45s ease both' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
                            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)' }}>
                                    Sign in with account name
                                </h2>
                            </div>
                            <div style={{ padding: '20px' }}>
                                {error && (
                                    <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                                        {error}
                                    </div>
                                )}
                                <form onSubmit={handleLogin}>
                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 0.8 }}>Email</label>
                                        <input className="login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
                                    </div>
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8 }}>Password</label>
                                            <button type="button" className="forgot-link" onClick={() => { setShowForgot(true); setForgotEmail(email); }}>
                                                Forgot password?
                                            </button>
                                        </div>
                                        <input className="login-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                                    </div>
                                    <button className="login-btn" type="submit" disabled={loading}>
                                        {loading ? 'Signing in...' : 'Sign in'}
                                    </button>
                                </form>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>or</span>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                    <GoogleLogin
                                        onSuccess={async (credentialResponse) => {
                                            try {
                                                const res = await client.post("/auth/google", { idToken: credentialResponse.credential });
                                                if (res.data.requiresOtp) {
                                                    setPendingEmail(res.data.email);
                                                    setShowDeviceOtp(true);
                                                } else {
                                                    login(res.data.token, res.data.user);
                                                    registerPush();
                                                    navigate('/', { replace: true });
                                                }
                                            } catch {
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

                                <button className="qr-btn" onClick={() => navigate('/qr-login')}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="7" height="7" rx="1" />
                                        <rect x="14" y="3" width="7" height="7" rx="1" />
                                        <rect x="3" y="14" width="7" height="7" rx="1" />
                                        <rect x="14" y="14" width="3" height="3" rx="0.5" />
                                    </svg>
                                    Sign in with QR Code
                                </button>
                            </div>
                            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>New to DocuTrack? </span>
                                <Link to="/register" style={{ color: '#47bfff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Create a free account</Link>
                            </div>
                        </div>
                    </div>

                    {/* Right QR panel — desktop only */}
                    {!isMobile && (
                        <div className="qr-panel" onClick={() => navigate('/qr-login')} style={{ width: 200 }}>
                            <h3 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>
                                Or sign in with QR
                            </h3>
                            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 20, borderRadius: 12 }}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(71,191,255,0.6)" strokeWidth="1.5">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                    <rect x="5" y="5" width="3" height="3" fill="rgba(71,191,255,0.6)" stroke="none" />
                                    <rect x="16" y="5" width="3" height="3" fill="rgba(71,191,255,0.6)" stroke="none" />
                                    <rect x="5" y="16" width="3" height="3" fill="rgba(71,191,255,0.6)" stroke="none" />
                                </svg>
                                <p style={{ margin: '10px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.5 }}>Click to sign in with QR</p>
                            </div>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
                                Use the DocuTrack mobile app to sign in via QR code
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={{ background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, position: 'relative', zIndex: 10 }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>© 2026 DocuTrack — Lyceum of the Philippines University Cavite</span>
                <div style={{ display: 'flex', gap: 16 }}>
                    {['Privacy Policy', 'Legal', 'Support'].map(l => (
                        <span key={l} className="footer-link">{l}</span>
                    ))}
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgot && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20, animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ width: '100%', maxWidth: 380, background: 'rgba(13,17,23,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.6)', animation: 'fadeUp 0.25s ease' }}>
                        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)' }}>
                                {forgotStep === 'done' ? 'Password Reset' : 'Forgot Password'}
                            </h2>
                            <button onClick={closeForgot} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#8f98a0', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                        <div style={{ padding: 20 }}>
                            {forgotError && (
                                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                                    {forgotError}
                                </div>
                            )}
                            {forgotStep === 'email' && (
                                <>
                                    <p style={{ fontSize: 13, color: '#8f98a0', marginBottom: 16, lineHeight: 1.6 }}>Enter your email address and we'll send you a reset code.</p>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 0.8 }}>Email</label>
                                    <input className="login-input" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" style={{ marginBottom: 16 }} />
                                    <button className="login-btn" onClick={handleForgotSendOtp} disabled={forgotLoading || !forgotEmail}>
                                        {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                                    </button>
                                </>
                            )}
                            {forgotStep === 'otp' && (
                                <>
                                    <p style={{ fontSize: 13, color: '#8f98a0', marginBottom: 16, lineHeight: 1.6 }}>
                                        We sent a reset code to <strong style={{ color: '#c6d4df' }}>{forgotEmail}</strong>. Enter it below.
                                    </p>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 0.8 }}>Reset Code</label>
                                    <input className="login-input" type="text" value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} placeholder="123456" maxLength={6} style={{ textAlign: 'center', letterSpacing: 10, fontSize: 22, fontWeight: 700, marginBottom: 16 }} />
                                    <button className="login-btn" onClick={handleForgotVerifyOtp} disabled={forgotOtp.length < 6}>Continue</button>
                                    <div style={{ textAlign: 'center', marginTop: 10 }}>
                                        <button className="forgot-link" onClick={() => setForgotStep('email')}>Back</button>
                                    </div>
                                </>
                            )}
                            {forgotStep === 'newpass' && (
                                <>
                                    <p style={{ fontSize: 13, color: '#8f98a0', marginBottom: 16, lineHeight: 1.6 }}>Choose a new password for your account.</p>
                                    <div style={{ padding: '10px 12px', background: 'rgba(71,191,255,0.06)', border: '1px solid rgba(71,191,255,0.15)', borderRadius: 8, marginBottom: 16 }}>
                                        <p style={{ margin: 0, fontSize: 11, color: '#47bfff', fontWeight: 600, marginBottom: 4 }}>Password requirements:</p>
                                        <p style={{ margin: 0, fontSize: 11, color: '#8f98a0', lineHeight: 1.6 }}>
                                            • At least 8 characters<br />
                                            • One uppercase letter (A-Z)<br />
                                            • One lowercase letter (a-z)<br />
                                            • One number (0-9)
                                        </p>
                                    </div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 0.8 }}>New Password</label>
                                    <input className="login-input" type="password" value={forgotNewPass} onChange={(e) => setForgotNewPass(e.target.value)} placeholder="Min 8 characters" style={{ marginBottom: 12 }} />
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 0.8 }}>Confirm Password</label>
                                    <input className="login-input" type="password" value={forgotConfirmPass} onChange={(e) => setForgotConfirmPass(e.target.value)} placeholder="••••••••" style={{ marginBottom: 16 }} />
                                    <button className="login-btn" onClick={handleForgotReset} disabled={forgotLoading}>
                                        {forgotLoading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </>
                            )}
                            {forgotStep === 'done' && (
                                <>
                                    <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                        <p style={{ fontSize: 14, color: '#4ade80', fontWeight: 600, margin: '0 0 8px' }}>Password Reset!</p>
                                        <p style={{ fontSize: 13, color: '#8f98a0', margin: '0 0 20px', lineHeight: 1.6 }}>Your password has been reset. All trusted devices have been removed for security.</p>
                                    </div>
                                    <button className="login-btn" onClick={closeForgot}>Back to Sign In</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Device OTP modal */}
            {showDeviceOtp && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20, animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ width: '100%', maxWidth: 380, background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.6)', animation: 'fadeUp 0.25s ease' }}>
                        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)' }}>New Device Detected</h2>
                        </div>
                        <div style={{ padding: 20 }}>
                            <p style={{ fontSize: 13, color: '#8f98a0', marginBottom: 20, lineHeight: 1.6 }}>
                                We sent a verification code to <strong style={{ color: '#c6d4df' }}>{pendingEmail}</strong>. Enter it below to continue.
                            </p>
                            {deviceOtpError && (
                                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                                    {deviceOtpError}
                                </div>
                            )}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: 0.8 }}>Verification Code</label>
                                <input className="login-input" type="text" value={deviceOtp} onChange={(e) => setDeviceOtp(e.target.value)} placeholder="123456" maxLength={6} style={{ textAlign: 'center', letterSpacing: 10, fontSize: 22, fontWeight: 700 }} />
                            </div>
                            <button className="login-btn" onClick={handleDeviceVerify} disabled={deviceOtpLoading || deviceOtp.length < 6} style={{ opacity: deviceOtpLoading || deviceOtp.length < 6 ? 0.5 : 1 }}>
                                {deviceOtpLoading ? 'Verifying...' : 'Verify Device'}
                            </button>
                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                                <button onClick={() => { setShowDeviceOtp(false); setDeviceOtp(''); setDeviceOtpError(''); }} style={{ background: 'none', border: 'none', color: 'rgba(71,191,255,0.7)', fontSize: 12, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
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