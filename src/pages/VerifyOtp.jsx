import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import client from '../api/client';

const CSS = `
.votp-root {
  min-height: 100vh;
  background: var(--bg-base);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px 20px;
  position: relative; overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}
.votp-blobs { position: absolute; inset: 0; pointer-events: none; }
.votp-wrap {
  position: relative; z-index: 1;
  width: 100%; max-width: 420px;
  display: flex; flex-direction: column; align-items: center;
  animation: fadeUp 0.5s var(--ease-spring) both;
}
.votp-logo {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 32px;
}
.votp-logo-mark {
  width: 48px; height: 48px;
  background: var(--accent-gradient);
  border-radius: var(--radius-lg);
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-accent); flex-shrink: 0;
}
.votp-card {
  width: 100%;
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg); overflow: hidden;
}
.card-head { padding: 28px 32px 22px; border-bottom: 1px solid var(--border-subtle); }
.card-body { padding: 28px 32px 32px; }
.card-foot { padding: 16px 32px; border-top: 1px solid var(--border-subtle); text-align: center; }
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
.otp-row { display: flex; gap: 10px; justify-content: center; }
.otp-box {
  width: 46px; height: 56px;
  text-align: center; font-size: 22px; font-weight: 700;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms, color 150ms;
  caret-color: transparent; -webkit-appearance: none;
}
.otp-box:focus {
  border-color: rgba(71,191,255,0.6);
  box-shadow: 0 0 0 3px rgba(71,191,255,0.12);
}
.otp-box.filled { border-color: var(--accent-to); color: var(--accent-to); }
.btn-primary {
  width: 100%; padding: 12px 20px;
  background: var(--accent-gradient); color: #fff;
  border: none; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 600; cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  transition: opacity 200ms, transform 200ms, box-shadow 200ms;
  box-shadow: var(--shadow-accent);
  display: flex; align-items: center; justify-content: center;
  gap: 8px; letter-spacing: 0.01em;
}
.btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: var(--accent-glow); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
.error-msg {
  background: var(--danger-bg); border: 1px solid rgba(248,113,113,0.25);
  color: var(--danger); padding: 10px 14px;
  border-radius: var(--radius-md); font-size: 13px;
  margin-bottom: 20px; line-height: 1.5;
}
.success-msg {
  background: var(--success-bg); border: 1px solid rgba(52,211,153,0.25);
  color: var(--success); padding: 12px 16px;
  border-radius: var(--radius-md); font-size: 13px;
  text-align: center; line-height: 1.5;
}
.resend-btn {
  background: none; border: none; cursor: pointer; padding: 0;
  font-size: 13px; font-family: 'Inter', system-ui, sans-serif;
  font-weight: 500; transition: opacity 200ms;
}
.resend-btn:disabled { cursor: not-allowed; opacity: 0.5; }
.spinner {
  width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
  border-radius: 50%;
  animation: spin var(--duration-slow) linear infinite; flex-shrink: 0;
}
@media (max-width: 480px) {
  .otp-box { width: 40px; height: 50px; font-size: 18px; }
  .otp-row { gap: 8px; }
  .card-head, .card-body, .card-foot { padding-left: 24px; padding-right: 24px; }
}
`;

function Spinner() {
    return <div className="spinner" />;
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
        if (e.key === 'ArrowLeft'  && i > 0) refs.current[i - 1]?.focus();
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

export default function VerifyOtp() {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState(location.state?.email || '');

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await client.post('/auth/verify-otp', { email, otp });
            setSuccess(true);
            setTimeout(() => navigate('/login', { state: { message: 'Email verified! You can now log in.' } }), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError('');
        try {
            await client.post('/auth/resend-otp', { email });
            setCountdown(60);
        } catch {
            setError('Failed to resend OTP. Please try again.');
        }
    };

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    return (
        <div className="votp-root">
            <style>{CSS}</style>

            {/* Atmospheric blobs */}
            <div className="votp-blobs" aria-hidden="true">
                <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: '#4F46E5', opacity: 0.12, filter: 'blur(160px)', top: '-30%', left: '-20%' }} />
                <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: '#47bfff', opacity: 0.08, filter: 'blur(130px)', bottom: '-20%', right: '-15%' }} />
                <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: '#7c3aed', opacity: 0.1, filter: 'blur(120px)', top: '40%', left: '40%' }} />
            </div>

            <div className="votp-wrap">
                {/* Logo above card */}
                <div className="votp-logo">
                    <div className="votp-logo-mark">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                            <polyline points="14 2 14 8 20 8" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                            <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 18, letterSpacing: '0.14em' }}>DOCUTRACK</span>
                </div>

                {/* Card */}
                <div className="votp-card">
                    <div className="card-head">
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Verify your email</h2>
                        <p style={{ margin: '5px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                            {email ? <>Code sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong></> : 'Enter your email and the 6-digit code'}
                        </p>
                    </div>

                    <div className="card-body">
                        {success ? (
                            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-bg)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)', margin: '0 0 8px' }}>Email verified!</p>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>Redirecting to sign in…</p>
                            </div>
                        ) : (
                            <form onSubmit={handleVerify}>
                                {error && <div className="error-msg">{error}</div>}

                                {/* Email input — only shown when email not passed via state */}
                                {!location.state?.email && (
                                    <div style={{ marginBottom: 20 }}>
                                        <label className="f-label">Email address</label>
                                        <input
                                            className="f-input"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                )}

                                {/* OTP boxes */}
                                <div style={{ marginBottom: 28 }}>
                                    <label className="f-label" style={{ textAlign: 'center' }}>Verification code</label>
                                    <div style={{ marginTop: 10 }}>
                                        <OtpBoxes value={otp} onChange={setOtp} />
                                    </div>
                                </div>

                                <button className="btn-primary" type="submit" disabled={loading || otp.length < 6}>
                                    {loading ? <><Spinner /> Verifying…</> : 'Verify Email'}
                                </button>

                                {/* Resend */}
                                <div style={{ textAlign: 'center', marginTop: 20 }}>
                                    {countdown > 0 ? (
                                        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                                            Resend code in <strong style={{ color: 'var(--text-secondary)' }}>{countdown}s</strong>
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                                            Didn't receive it?{' '}
                                            <button type="button" className="resend-btn" style={{ color: 'var(--accent-to)' }} onClick={handleResend}>
                                                Resend code
                                            </button>
                                        </span>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="card-foot">
                        <Link to="/login" style={{ fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'color 150ms' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
