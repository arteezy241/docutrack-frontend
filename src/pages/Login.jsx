import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client, { getDeviceName } from '../api/client';
import useAuthStore from '../store/authStore';
import { GoogleLogin } from '@react-oauth/google';
import useWindowWidth from '../hooks/useWindowWidth';
import { registerPush } from '../api/push';

const CSS = `
.login-root {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg-base);
  font-family: 'Inter', system-ui, sans-serif;
}
.login-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  cursor: crosshair;
}
.login-blobs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.login-center {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 420px;
  padding: 24px 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeUp 0.5s var(--ease-spring) both;
}
.login-card { width: 100%; }
.login-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
  width: 100%;
}
.login-logo-mark {
  width: 40px;
  height: 40px;
  background: var(--accent-gradient);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-accent);
  flex-shrink: 0;
}
.login-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08) inset;
  overflow: hidden;
}
.card-head { padding: 28px 32px 22px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.card-body { padding: 24px 32px 28px; }
.card-foot { padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; }
.f-group { margin-bottom: 16px; }
.f-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255,255,255,0.5);
  margin-bottom: 7px;
}
.f-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: nowrap;
  margin-bottom: 7px;
}
.f-input {
  width: 100%;
  padding: 11px 14px;
  font-size: 14px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  color: #ffffff;
  font-family: 'Inter', system-ui, sans-serif;
  outline: none;
  transition: border-color 200ms, background 200ms, box-shadow 200ms;
  box-sizing: border-box;
  -webkit-appearance: none;
}
.f-input:focus {
  border-color: rgba(71,191,255,0.6);
  background: rgba(255,255,255,0.1);
  box-shadow: 0 0 0 3px rgba(71,191,255,0.12);
}
.f-input::placeholder { color: rgba(255,255,255,0.35); }
.pw-wrap { position: relative; }
.pw-wrap .f-input { padding-right: 46px; }
.pw-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  line-height: 0;
  transition: color 150ms;
}
.pw-toggle:hover { color: rgba(255,255,255,0.75); }
.btn-primary {
  width: 100%;
  padding: 12px 20px;
  background: var(--accent-gradient);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  transition: opacity 200ms, transform 200ms, box-shadow 200ms;
  box-shadow: var(--shadow-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.01em;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: var(--accent-glow);
}
.btn-primary:active:not(:disabled) { transform: translateY(0); opacity: 0.85; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
.btn-glass {
  width: 100%;
  padding: 11px 16px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.8);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  transition: background 200ms, border-color 200ms, color 200ms;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-glass:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.25);
  color: #ffffff;
}
.btn-glass:disabled { opacity: 0.5; cursor: not-allowed; }
.or-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0;
}
.or-divider::before, .or-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.12);
}
.or-divider span { font-size: 12px; color: rgba(255,255,255,0.4); white-space: nowrap; }
.error-msg {
  background: var(--danger-bg);
  border: 1px solid rgba(248,113,113,0.25);
  color: var(--danger);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.5;
}
.link-btn {
  background: none;
  border: none;
  color: var(--accent-to);
  font-size: 13px;
  font-family: 'Inter', system-ui, sans-serif;
  cursor: pointer;
  padding: 0;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity 200ms;
}
.link-btn:hover { opacity: 0.75; }
.link-btn-sm {
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  font-family: 'Inter', system-ui, sans-serif;
  cursor: pointer;
  padding: 0;
  transition: color 200ms;
}
.link-btn-sm:hover { color: rgba(255,255,255,0.7); }
.otp-row { display: flex; gap: 8px; justify-content: center; }
.otp-box {
  width: 46px;
  height: 54px;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: var(--radius-md);
  color: #ffffff;
  font-family: 'Inter', system-ui, sans-serif;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms, color 150ms;
  caret-color: transparent;
  -webkit-appearance: none;
}
.otp-box:focus {
  border-color: rgba(71,191,255,0.6);
  box-shadow: 0 0 0 3px rgba(71,191,255,0.12);
}
.otp-box.filled { border-color: var(--accent-to); color: var(--accent-to); }
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
  animation: fadeIn var(--duration-fast) ease;
}
.modal-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  animation: scaleIn var(--duration-base) var(--ease-spring);
}
.modal-head {
  padding: 20px 24px 18px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.modal-body { padding: 22px 24px 26px; }
.modal-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-card-hover);
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 150ms, color 150ms;
}
.modal-close:hover { background: var(--border-default); color: var(--text-primary); }
.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255,255,255,0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin var(--duration-slow) linear infinite;
  flex-shrink: 0;
}
.step-dots { display: flex; gap: 5px; align-items: center; }
.step-dot {
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: var(--border-strong);
  transition: width 250ms var(--ease-spring), background 250ms;
}
.step-dot.active { width: 18px; background: var(--accent-to); }
.req-box {
  background: rgba(71,191,255,0.06);
  border: 1px solid rgba(71,191,255,0.15);
  border-radius: var(--radius-md);
  padding: 11px 14px;
  margin-bottom: 16px;
}
.req-box-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent-to);
  margin: 0 0 5px;
}
.req-box-text {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.7;
  margin: 0;
}
.btn-google {
  width: 100%;
  padding: 11px 16px;
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: rgba(255,255,255,0.88);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  transition: background 200ms, border-color 200ms, box-shadow 200ms, transform 150ms;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.08) inset;
}
.btn-google:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.25);
  box-shadow: 0 4px 20px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.12) inset;
  transform: translateY(-1px);
}
.btn-google:disabled { opacity: 0.5; cursor: not-allowed; }
.spinner-muted {
  width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: rgba(255,255,255,0.7);
  border-radius: 50%;
  animation: spin var(--duration-slow) linear infinite;
  flex-shrink: 0;
}
@media (max-width: 767px) {
  .login-center { padding: 20px 16px; }
  .login-card { border-radius: 16px; }
  .card-head, .card-body, .card-foot { padding-left: 20px; padding-right: 20px; }
}
[data-theme="light"] .login-root { background: #0d0f14; }
/* Login card always has a dark background — keep all text white in light mode */
[data-theme="light"] .login-card h1,
[data-theme="light"] .login-card h2,
[data-theme="light"] .login-card h3,
[data-theme="light"] .login-card p,
[data-theme="light"] .login-card span,
[data-theme="light"] .login-card label,
[data-theme="light"] .login-card .f-label,
[data-theme="light"] .login-card .pw-toggle,
[data-theme="light"] .login-card .or-divider span,
[data-theme="light"] .login-card .link-btn-sm,
[data-theme="light"] .login-card .btn-glass {
  text-shadow: none !important;
}
[data-theme="light"] .login-card .f-label { color: rgba(255,255,255,0.5) !important; }
[data-theme="light"] .login-card .or-divider span { color: rgba(255,255,255,0.4) !important; }
[data-theme="light"] .login-card .link-btn-sm { color: rgba(255,255,255,0.4) !important; }
[data-theme="light"] .login-card .pw-toggle { color: rgba(255,255,255,0.4) !important; }
[data-theme="light"] .login-card .btn-glass { color: rgba(255,255,255,0.8) !important; }
[data-theme="light"] .login-card .f-input {
  background: rgba(255,255,255,0.07) !important;
  border-color: rgba(255,255,255,0.12) !important;
  color: #ffffff !important;
}
[data-theme="light"] .login-card .f-input::placeholder { color: rgba(255,255,255,0.35) !important; }
[data-theme="light"] .login-brand-name { color: #ffffff !important; }
[data-theme="light"] .btn-google { color: rgba(255,255,255,0.88) !important; text-shadow: none !important; }
`;

function Spinner() {
  return <div className="spinner" />;
}

function SpinnerMuted() {
  return <div className="spinner-muted" />;
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

function OtpBoxes({ value, onChange }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (i, e) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    if (!ch) return;
    const next = digits.map((d, idx) => (idx === i ? ch : d)).join('');
    onChange(next);
    if (i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) {
        onChange(digits.map((d, idx) => (idx === i ? '' : d)).join(''));
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
        onChange(digits.map((d, idx) => (idx === i - 1 ? '' : d)).join(''));
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <div className="otp-row">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => (refs.current[i] = el)}
          className={`otp-box${d ? ' filled' : ''}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoComplete="off"
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const windowWidth = useWindowWidth();
  // null | 'credentials' | 'google' | 'qr'
  const [authLoading, setAuthLoading] = useState(null);

  const [showDeviceOtp, setShowDeviceOtp] = useState(false);
  const [deviceOtp, setDeviceOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [deviceOtpLoading, setDeviceOtpLoading] = useState(false);
  const [deviceOtpError, setDeviceOtpError] = useState('');

  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [showForgotConfirmPw, setShowForgotConfirmPw] = useState(false);

  const canvasRef = useRef(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (authLoading !== null) return;
    setAuthLoading('credentials'); setError('');
    try {
      const res = await client.post('/auth/login', { email, password });
      if (res.data.requiresOtp) { setPendingEmail(res.data.email); setShowDeviceOtp(true); setAuthLoading(null); return; }
      login(res.data.token, res.data.user); registerPush(); navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.status === 429 ? 'Too many attempts. Please wait a moment before trying again.' : err.response?.data?.error || 'Login failed.');
    } finally { setAuthLoading(null); }
  };

  const handleDeviceVerify = async () => {
    setDeviceOtpLoading(true); setDeviceOtpError('');
    try {
      const res = await client.post('/auth/verify-device', { email: pendingEmail, otp: deviceOtp, deviceName: getDeviceName() });
      login(res.data.token, res.data.user); registerPush(); navigate('/', { replace: true });
    } catch (err) { setDeviceOtpError(err.response?.data?.error || 'Invalid OTP'); }
    finally { setDeviceOtpLoading(false); }
  };

  const handleForgotSendOtp = async () => {
    setForgotLoading(true); setForgotError('');
    try { await client.post('/auth/forgot-password', { email: forgotEmail }); setForgotStep('otp'); }
    catch { setForgotError('Something went wrong. Please try again.'); }
    finally { setForgotLoading(false); }
  };

  const handleForgotVerifyOtp = () => {
    if (forgotOtp.length < 6) { setForgotError('Enter the 6-digit code.'); return; }
    setForgotStep('newpass'); setForgotError('');
  };

  const handleForgotReset = async () => {
    setForgotError('');
    if (forgotNewPass.length < 8) { setForgotError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(forgotNewPass)) { setForgotError('Password must contain at least one uppercase letter.'); return; }
    if (!/[a-z]/.test(forgotNewPass)) { setForgotError('Password must contain at least one lowercase letter.'); return; }
    if (!/[0-9]/.test(forgotNewPass)) { setForgotError('Password must contain at least one number.'); return; }
    if (forgotNewPass !== forgotConfirmPass) { setForgotError('Passwords do not match.'); return; }
    setForgotLoading(true);
    try { await client.post('/auth/reset-password', { email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPass }); setForgotStep('done'); }
    catch (err) { setForgotError(err.response?.data?.error || 'Reset failed. Code may have expired.'); }
    finally { setForgotLoading(false); }
  };

  const closeForgot = () => {
    setShowForgot(false); setForgotStep('email'); setForgotEmail(''); setForgotOtp('');
    setForgotNewPass(''); setForgotConfirmPass(''); setForgotError('');
  };

  const forgotStepIndex = { email: 0, otp: 1, newpass: 2 }[forgotStep] ?? 0;

  return (
    <div className="login-root">
      <style>{CSS}</style>

      {/* ── Full-screen background ── */}
      <canvas ref={canvasRef} className="login-canvas" />
      <div className="login-blobs" aria-hidden="true">
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: '#4F46E5', opacity: 0.18, filter: 'blur(140px)', top: '-20%', left: '-15%' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: '#47bfff', opacity: 0.11, filter: 'blur(120px)', bottom: '-10%', right: '-5%' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: '#7c3aed', opacity: 0.14, filter: 'blur(130px)', top: '30%', left: '30%' }} />
      </div>

      {/* ── Centered card ── */}
      <div className="login-center">
        {/* Brand above card */}
        <div className="login-brand">
          <div className="login-logo-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" stroke="white" strokeWidth="2" strokeLinejoin="round" />
              <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 17, letterSpacing: '0.12em' }}>DOCUTRACK</span>
        </div>

        {/* Info blurb */}
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.6, letterSpacing: '0.01em' }}>
          Document management &amp; routing system for LPU-Cavite
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
          {['Secure Routing', 'Document Tracking', 'Role-based Access'].map(f => (
            <span key={f} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px', letterSpacing: '0.02em' }}>{f}</span>
          ))}
        </div>

        <div className="login-card">
          <div className="card-head">
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>Welcome back</h2>
            <p style={{ margin: '5px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Sign in to your DocuTrack account</p>
          </div>

          <div className="card-body">
            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="f-group">
                <label className="f-label">Email address</label>
                <input className="f-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
              </div>
              <div className="f-group">
                <div className="f-label-row">
                  <label className="f-label" style={{ margin: 0 }}>Password</label>
                  <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => { setShowForgot(true); setForgotEmail(email); }}>
                    Forgot password?
                  </button>
                </div>
                <div className="pw-wrap">
                  <input className="f-input" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}><EyeIcon open={showPw} /></button>
                </div>
              </div>
              <button
                className="btn-primary"
                type="submit"
                disabled={authLoading !== null}
                style={{ marginTop: 4, opacity: authLoading !== null && authLoading !== 'credentials' ? 0.5 : 1 }}
              >
                {authLoading === 'credentials' ? <><Spinner /> Signing in…</> : 'Sign in'}
              </button>
            </form>

            <div className="or-divider"><span>or continue with</span></div>

            {/* Custom glass Google button — overlays the invisible GoogleLogin iframe */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <div style={{ position: 'absolute', inset: 0, zIndex: 2, opacity: 0.001 }}>
                <GoogleLogin
                  onSuccess={async (cr) => {
                    if (authLoading !== null) return;
                    setAuthLoading('google');
                    try {
                      const res = await client.post('/auth/google', { idToken: cr.credential });
                      if (res.data.requiresOtp) { setPendingEmail(res.data.email); setShowDeviceOtp(true); }
                      else { login(res.data.token, res.data.user); registerPush(); navigate('/', { replace: true }); }
                    } catch { setError('Google login failed.'); }
                    finally { setAuthLoading(null); }
                  }}
                  onError={() => setError('Google login failed.')}
                  useOneTap
                  width="400"
                />
              </div>
              <button
                className="btn-google"
                disabled={authLoading !== null}
                style={{ pointerEvents: 'none' }}
              >
                {authLoading === 'google' ? (
                  <><SpinnerMuted /> Signing in with Google…</>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </div>

            <button
              className="btn-glass"
              disabled={authLoading !== null}
              style={{ opacity: authLoading !== null ? 0.5 : 1 }}
              onClick={() => { if (authLoading !== null) return; navigate('/qr-login'); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="3" height="3" rx="0.5" />
              </svg>
              Sign in with QR Code
            </button>
          </div>

          <div className="card-foot">
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Don't have an account? </span>
            <Link to="/register" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-to)', textDecoration: 'none' }}>Create account</Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          © 2026 DocuTrack · LPU-Cavite
        </div>
      </div>

      {/* ── Device OTP modal ── */}
      {showDeviceOtp && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 3 }}>New Device Detected</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Verify your identity</div>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{pendingEmail}</strong>. Enter it below to authorize this device.
              </p>
              {deviceOtpError && <div className="error-msg">{deviceOtpError}</div>}
              <div style={{ marginBottom: 24 }}>
                <label className="f-label" style={{ textAlign: 'center', display: 'block', marginBottom: 14 }}>Verification code</label>
                <OtpBoxes value={deviceOtp} onChange={setDeviceOtp} />
              </div>
              <button className="btn-primary" onClick={handleDeviceVerify} disabled={deviceOtpLoading || deviceOtp.length < 6}>
                {deviceOtpLoading ? <><Spinner /> Verifying…</> : 'Verify Device'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button className="link-btn-sm" onClick={() => { setShowDeviceOtp(false); setDeviceOtp(''); setDeviceOtpError(''); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Forgot password modal ── */}
      {showForgot && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 3 }}>
                  {forgotStep === 'done' ? 'Success' : 'Reset Password'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {forgotStep === 'email' && 'Forgot your password?'}
                  {forgotStep === 'otp' && 'Enter reset code'}
                  {forgotStep === 'newpass' && 'Choose new password'}
                  {forgotStep === 'done' && 'Password updated!'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {forgotStep !== 'done' && (
                  <div className="step-dots">
                    {[0, 1, 2].map(i => <div key={i} className={`step-dot${forgotStepIndex === i ? ' active' : ''}`} />)}
                  </div>
                )}
                <button className="modal-close" onClick={closeForgot}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <line x1="1" y1="1" x2="10" y2="10" /><line x1="10" y1="1" x2="1" y2="10" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="modal-body">
              {forgotError && <div className="error-msg">{forgotError}</div>}

              {forgotStep === 'email' && (
                <>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                    Enter your email and we'll send a reset code.
                  </p>
                  <div className="f-group">
                    <label className="f-label">Email address</label>
                    <input className="f-input" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                  </div>
                  <button className="btn-primary" onClick={handleForgotSendOtp} disabled={forgotLoading || !forgotEmail}>
                    {forgotLoading ? <><Spinner /> Sending…</> : 'Send Reset Code'}
                  </button>
                </>
              )}

              {forgotStep === 'otp' && (
                <>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                    We sent a reset code to <strong style={{ color: 'var(--text-primary)' }}>{forgotEmail}</strong>.
                  </p>
                  <div style={{ marginBottom: 24 }}>
                    <label className="f-label" style={{ textAlign: 'center', display: 'block', marginBottom: 14 }}>Reset code</label>
                    <OtpBoxes value={forgotOtp} onChange={setForgotOtp} />
                  </div>
                  <button className="btn-primary" onClick={handleForgotVerifyOtp} disabled={forgotOtp.length < 6}>Continue</button>
                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <button className="link-btn-sm" onClick={() => { setForgotStep('email'); setForgotError(''); }}>← Back</button>
                  </div>
                </>
              )}

              {forgotStep === 'newpass' && (
                <>
                  <div className="req-box">
                    <p className="req-box-title">Password requirements</p>
                    <p className="req-box-text">8+ characters · uppercase · lowercase · number</p>
                  </div>
                  <div className="f-group">
                    <label className="f-label">New password</label>
                    <div className="pw-wrap">
                      <input className="f-input" type={showForgotPw ? 'text' : 'password'} value={forgotNewPass} onChange={e => setForgotNewPass(e.target.value)} placeholder="Min 8 characters" />
                      <button type="button" className="pw-toggle" onClick={() => setShowForgotPw(v => !v)} tabIndex={-1}><EyeIcon open={showForgotPw} /></button>
                    </div>
                  </div>
                  <div className="f-group">
                    <label className="f-label">Confirm password</label>
                    <div className="pw-wrap">
                      <input className="f-input" type={showForgotConfirmPw ? 'text' : 'password'} value={forgotConfirmPass} onChange={e => setForgotConfirmPass(e.target.value)} placeholder="••••••••" />
                      <button type="button" className="pw-toggle" onClick={() => setShowForgotConfirmPw(v => !v)} tabIndex={-1}><EyeIcon open={showForgotConfirmPw} /></button>
                    </div>
                  </div>
                  <button className="btn-primary" onClick={handleForgotReset} disabled={forgotLoading}>
                    {forgotLoading ? <><Spinner /> Resetting…</> : 'Reset Password'}
                  </button>
                </>
              )}

              {forgotStep === 'done' && (
                <>
                  <div style={{ textAlign: 'center', padding: '12px 0 24px' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--success-bg)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <p style={{ fontSize: 15, color: 'var(--success)', fontWeight: 600, margin: '0 0 10px' }}>Password reset successfully!</p>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>All trusted devices have been removed for security. Sign in with your new password.</p>
                  </div>
                  <button className="btn-primary" onClick={closeForgot}>Back to Sign In</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
