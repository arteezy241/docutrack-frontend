import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import useWindowWidth from '../hooks/useWindowWidth';

const CSS = `
.reg-root {
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: var(--bg-base);
  font-family: 'Inter', system-ui, sans-serif;
}
.login-left {
  flex: 0 0 60%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 64px;
}
.login-canvas {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  z-index: 1; cursor: crosshair;
}
.login-blobs { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.login-left-inner { position: relative; z-index: 2; max-width: 480px; }
.login-wordmark {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 48px;
  animation: fadeUp 0.5s var(--ease-spring) both;
}
.login-logo-mark {
  width: 48px; height: 48px;
  background: var(--accent-gradient);
  border-radius: var(--radius-lg);
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-accent); flex-shrink: 0;
}
.login-headline {
  font-size: 48px; font-weight: 800; color: var(--text-primary);
  margin: 0 0 18px; letter-spacing: -0.03em; line-height: 1.08;
  animation: fadeUp 0.5s var(--ease-spring) 0.06s both;
}
.login-subline {
  font-size: 16px; color: var(--text-secondary);
  line-height: 1.7; margin: 0; max-width: 400px;
  animation: fadeUp 0.5s var(--ease-spring) 0.12s both;
}
.reg-right {
  flex: 0 0 40%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px 32px; overflow-y: auto;
  border-left: 1px solid var(--border-subtle);
  background: var(--bg-base);
}
.login-card {
  width: 100%; max-width: 420px;
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg); overflow: hidden;
  animation: fadeUp 0.5s var(--ease-spring) 0.08s both;
}
.card-head { padding: 28px 32px 22px; border-bottom: 1px solid var(--border-subtle); }
.card-body { padding: 24px 32px 28px; }
.card-foot { padding: 16px 32px; border-top: 1px solid var(--border-subtle); text-align: center; }
.f-group { margin-bottom: 14px; }
.f-label {
  display: block; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--text-tertiary); margin-bottom: 7px;
}
.f-input {
  width: 100%; padding: 11px 14px; font-size: 14px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-default);
  border-radius: var(--radius-md); color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif; outline: none;
  transition: border-color 200ms, background 200ms, box-shadow 200ms;
  box-sizing: border-box; -webkit-appearance: none;
}
.f-input:focus {
  border-color: rgba(71,191,255,0.55);
  background: var(--bg-card);
  box-shadow: 0 0 0 3px rgba(71,191,255,0.1);
}
.f-input::placeholder { color: var(--text-tertiary); }
.pw-wrap { position: relative; }
.pw-wrap .f-input { padding-right: 46px; }
.pw-toggle {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--text-tertiary);
  cursor: pointer; padding: 4px; display: flex; align-items: center;
  line-height: 0; transition: color 150ms;
}
.pw-toggle:hover { color: var(--text-secondary); }
.pw-strength-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.pw-strength-segs { display: flex; gap: 4px; flex: 1; }
.pw-strength-seg {
  flex: 1; height: 3px; border-radius: 2px;
  background: rgba(255,255,255,0.08);
  transition: background 0.25s;
}
.strength-label {
  font-size: 11px; font-weight: 600;
  min-width: 36px; text-align: right;
  transition: color 0.25s;
}
.btn-primary {
  width: 100%; padding: 12px 20px;
  background: var(--accent-gradient); color: #fff;
  border: none; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 600; cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  transition: opacity 200ms, transform 200ms, box-shadow 200ms;
  box-shadow: var(--shadow-accent);
  display: flex; align-items: center; justify-content: center;
  gap: 8px; letter-spacing: 0.01em; margin-top: 8px;
}
.btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: var(--accent-glow); }
.btn-primary:active:not(:disabled) { transform: translateY(0); opacity: 0.85; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
.error-msg {
  background: var(--danger-bg); border: 1px solid rgba(248,113,113,0.25);
  color: var(--danger); padding: 10px 14px;
  border-radius: var(--radius-md); font-size: 13px;
  margin-bottom: 16px; line-height: 1.5;
}
.spinner {
  width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
  border-radius: 50%;
  animation: spin var(--duration-slow) linear infinite; flex-shrink: 0;
}
@media (max-width: 767px) {
  .login-left { display: none !important; }
  .reg-right { flex: 1; border-left: none; padding: 32px 20px; }
  .login-card {
    background: var(--bg-surface);
    backdrop-filter: none; -webkit-backdrop-filter: none;
    border-color: var(--border-subtle);
  }
  .card-head, .card-body, .card-foot { padding-left: 24px; padding-right: 24px; }
}
`;

function Spinner() {
    return <div className="spinner" />;
}

function EyeIcon({ open }) {
    if (open) {
        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
        );
    }
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function getPasswordStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    return score;
}

const STRENGTH = {
    0: { label: '',       color: 'transparent' },
    1: { label: 'Weak',   color: 'var(--danger)' },
    2: { label: 'Fair',   color: '#fb923c' },
    3: { label: 'Good',   color: 'var(--warning)' },
    4: { label: 'Strong', color: 'var(--success)' },
};

export default function Register() {
    const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const canvasRef = useRef(null);
    const navigate = useNavigate();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) return setError('Passwords do not match');
        if (form.password.length < 8) return setError('Password must be at least 8 characters');
        if (!/[A-Z]/.test(form.password)) return setError('Password must contain at least one uppercase letter');
        if (!/[a-z]/.test(form.password)) return setError('Password must contain at least one lowercase letter');
        if (!/[0-9]/.test(form.password)) return setError('Password must contain at least one number');
        setLoading(true); setError('');
        try {
            await client.post('/auth/register', {
                fullName: form.fullName,
                username: form.username,
                email: form.email,
                password: form.password,
                role: 'Staff',
            });
            navigate('/verify-otp', { state: { email: form.email } });
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let w = (canvas.width = canvas.offsetWidth);
        let h = (canvas.height = canvas.offsetHeight);
        const resize = () => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; };
        window.addEventListener('resize', resize);

        const colors = ['#4F46E5', '#47bfff', '#7c3aed', '#06b6d4', '#0ea5e9'];
        const particles = Array.from({ length: 65 }, () => {
            const vx = (Math.random() - 0.5) * 0.5;
            const vy = (Math.random() - 0.5) * 0.5;
            return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2.5 + 0.8, color: colors[Math.floor(Math.random() * colors.length)], vx, vy, baseVx: vx, baseVy: vy, opacity: Math.random() * 0.5 + 0.1 };
        });

        const repulse = (cx, cy) => {
            particles.forEach(p => {
                const dx = p.x - cx, dy = p.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180 && dist > 0) { const force = (180 - dist) / 180; p.vx += (dx / dist) * force * 5; p.vy += (dy / dist) * force * 5; }
            });
        };
        const onClick = e => { const r = canvas.getBoundingClientRect(); repulse(e.clientX - r.left, e.clientY - r.top); };
        const onTouch = e => { const r = canvas.getBoundingClientRect(); repulse(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); };
        canvas.addEventListener('click', onClick);
        canvas.addEventListener('touchstart', onTouch);

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 140) {
                        ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(71,191,255,${0.07 * (1 - d / 140)})`; ctx.lineWidth = 0.7; ctx.stroke();
                    }
                }
            }
            particles.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0'); ctx.fill();
                p.x += p.vx; p.y += p.vy;
                p.vx += (p.baseVx - p.vx) * 0.02; p.vy += (p.baseVy - p.vy) * 0.02;
                if (p.x < 0 || p.x > w) { p.vx *= -1; p.baseVx *= -1; }
                if (p.y < 0 || p.y > h) { p.vy *= -1; p.baseVy *= -1; }
            });
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('touchstart', onTouch);
        };
    }, []);

    const strength = getPasswordStrength(form.password);
    const { label: strengthLabel, color: strengthColor } = STRENGTH[strength];

    return (
        <div className="reg-root">
            <style>{CSS}</style>

            {/* ── Left panel ── */}
            <div className="login-left">
                <canvas ref={canvasRef} className="login-canvas" />
                <div className="login-blobs" aria-hidden="true">
                    <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: '#4F46E5', opacity: 0.18, filter: 'blur(140px)', top: '-20%', left: '-15%' }} />
                    <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: '#47bfff', opacity: 0.11, filter: 'blur(120px)', bottom: '-10%', right: '-5%' }} />
                    <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: '#7c3aed', opacity: 0.14, filter: 'blur(130px)', top: '30%', left: '30%' }} />
                </div>

                <div className="login-left-inner">
                    <div className="login-wordmark">
                        <div className="login-logo-mark">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                                <polyline points="14 2 14 8 20 8" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                                <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 18, letterSpacing: '0.14em' }}>DOCUTRACK</span>
                    </div>

                    <h1 className="login-headline">
                        Secure<br />Document<br />
                        <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Management.</span>
                    </h1>
                    <p className="login-subline">
                        Join your organization's document management system. Route, track, and approve documents with enterprise-grade security.
                    </p>

                    <div style={{ marginTop: 52, fontSize: 12, color: 'var(--text-tertiary)' }}>
                        © 2026 DocuTrack · LPU-Cavite
                    </div>
                </div>
            </div>

            {/* ── Right panel ── */}
            <div className="reg-right">
                {isMobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
                        <div style={{ width: 36, height: 36, background: 'var(--accent-gradient)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-accent)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                                <polyline points="14 2 14 8 20 8" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 16, letterSpacing: '0.12em' }}>DOCUTRACK</span>
                    </div>
                )}

                <div className="login-card">
                    <div className="card-head">
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Create account</h2>
                        <p style={{ margin: '5px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Join your organization on DocuTrack</p>
                    </div>

                    <div className="card-body">
                        {error && <div className="error-msg">{error}</div>}

                        <form onSubmit={handleRegister}>
                            <div className="f-group">
                                <label className="f-label">Full Name</label>
                                <input className="f-input" type="text" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Juan dela Cruz" required autoComplete="name" />
                            </div>

                            <div className="f-group">
                                <label className="f-label">Username</label>
                                <input className="f-input" type="text" name="username" value={form.username} onChange={handleChange} placeholder="juan_dc" required autoComplete="username" />
                            </div>

                            <div className="f-group">
                                <label className="f-label">Email address</label>
                                <input className="f-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="juan@email.com" required autoComplete="email" />
                            </div>

                            <div className="f-group">
                                <label className="f-label">Password</label>
                                <div className="pw-wrap">
                                    <input className="f-input" type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Min 8 characters" required autoComplete="new-password" />
                                    <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                                        <EyeIcon open={showPw} />
                                    </button>
                                </div>
                                {form.password && (
                                    <div className="pw-strength-row">
                                        <div className="pw-strength-segs">
                                            {[0, 1, 2, 3].map(i => (
                                                <div key={i} className="pw-strength-seg" style={{ background: i < strength ? strengthColor : 'rgba(255,255,255,0.08)' }} />
                                            ))}
                                        </div>
                                        <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                                    </div>
                                )}
                            </div>

                            <div className="f-group">
                                <label className="f-label">Confirm Password</label>
                                <input className="f-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" required autoComplete="new-password" />
                            </div>

                            <button className="btn-primary" type="submit" disabled={loading}>
                                {loading ? <><Spinner /> Creating account…</> : 'Create Account'}
                            </button>
                        </form>
                    </div>

                    <div className="card-foot">
                        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Already have an account? </span>
                        <Link to="/login" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-to)', textDecoration: 'none' }}>Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
