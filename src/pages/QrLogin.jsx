import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import useAuthStore from "../store/authStore";
import useWindowWidth from "../hooks/useWindowWidth";
import client from "../api/client";

const QR_TTL = 120;

const STATUS = {
    LOADING: "loading",
    READY: "ready",
    SCANNED: "scanned",
    SUCCESS: "success",
    EXPIRED: "expired",
    ERROR: "error",
};

const parseJwt = (token) => {
    try { return JSON.parse(atob(token.split(".")[1])); }
    catch { return null; }
};

function QrContent({ status, qrValue, errorMsg, onRetry }) {
    if (status === STATUS.LOADING) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(71,191,255,0.2)', borderTopColor: '#47bfff', animation: 'dtSpin 0.8s linear infinite' }} />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Generating session…</p>
            </div>
        );
    }
    if (status === STATUS.ERROR) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                </div>
                <p style={{ fontSize: 13, color: '#f87171', margin: 0, textAlign: 'center', maxWidth: 200, lineHeight: 1.5 }}>{errorMsg}</p>
                <button onClick={onRetry} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Try again</button>
            </div>
        );
    }
    if (status === STATUS.EXPIRED) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(143,152,160,0.1)', border: '1px solid rgba(143,152,160,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8f98a0" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Code expired</p>
                <button onClick={onRetry} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Generate new code</button>
            </div>
        );
    }
    if (status === STATUS.SUCCESS) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p style={{ fontSize: 13, color: '#4ade80', margin: 0, fontWeight: 600 }}>Authenticated — signing in…</p>
            </div>
        );
    }
    const dimmed = status === STATUS.SCANNED;
    return (
        <div style={{ position: 'relative', lineHeight: 0 }}>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, opacity: dimmed ? 0.3 : 1, filter: dimmed ? 'blur(2px)' : 'none', transition: 'opacity 0.3s, filter 0.3s' }}>
                <QRCodeSVG value={qrValue} size={180} bgColor="transparent" fgColor="#e8edf2" level="M" includeMargin={false} />
            </div>
            {dimmed && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, background: 'rgba(0,0,0,0.5)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" /></svg>
                    <p style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, margin: 0 }}>Confirm on your device</p>
                </div>
            )}
        </div>
    );
}

function TimerBar({ elapsed }) {
    const remaining = Math.max(0, QR_TTL - elapsed);
    const pct = (elapsed / QR_TTL) * 100;
    const low = remaining < 30;
    const fmt = remaining < 60 ? `${remaining}s` : `${Math.floor(remaining / 60)}m ${remaining % 60}s`;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${100 - pct}%`, background: low ? 'linear-gradient(to right,#f87171,#f59e0b)' : 'linear-gradient(to right,#47bfff,#4F46E5)', transition: 'width 1s linear, background 0.5s' }} />
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 36, textAlign: 'right' }}>{fmt}</span>
        </div>
    );
}

export default function QrLogin() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const width = useWindowWidth();
    const isMobile = width < 768;
    const canvasRef = useRef(null);
    const pollRef = useRef(null);
    const tickRef = useRef(null);
    const mountedRef = useRef(true);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

    const [status, setStatus] = useState(STATUS.LOADING);
    const [qrValue, setQrValue] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [elapsed, setElapsed] = useState(0);

    // Canvas particles — same as Login.jsx
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
            return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 3 + 1, color: colors[Math.floor(Math.random() * colors.length)], vx, vy, baseVx: vx, baseVy: vy, opacity: Math.random() * 0.4 + 0.1 };
        });
        const repulse = (cx, cy) => {
            particles.forEach(p => {
                const dx = p.x - cx; const dy = p.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) { const force = (200 - dist) / 200; p.vx += (dx / dist) * force * 6; p.vy += (dy / dist) * force * 6; }
            });
        };
        const handleClick = (e) => { const rect = canvas.getBoundingClientRect(); repulse(e.clientX - rect.left, e.clientY - rect.top); };
        const handleTouch = (e) => { const rect = canvas.getBoundingClientRect(); const touch = e.touches[0]; repulse(touch.clientX - rect.left, touch.clientY - rect.top); };
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', handleTouch);
        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) { ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = `rgba(71,191,255,${0.08 * (1 - dist / 150)})`; ctx.lineWidth = 0.8; ctx.stroke(); }
                }
            }
            particles.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
                ctx.fill();
                p.x += p.vx; p.y += p.vy;
                p.vx += (p.baseVx - p.vx) * 0.02; p.vy += (p.baseVy - p.vy) * 0.02;
                if (p.x < 0 || p.x > w) { p.vx *= -1; p.baseVx *= -1; }
                if (p.y < 0 || p.y > h) { p.vy *= -1; p.baseVy *= -1; }
            });
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); canvas.removeEventListener('click', handleClick); canvas.removeEventListener('touchstart', handleTouch); };
    }, []);

    const handleMouseMove = (e) => { const rect = e.currentTarget.getBoundingClientRect(); setMouse({ x: e.clientX / rect.width, y: e.clientY / rect.height }); };
    const handleTouchMove = (e) => { const rect = e.currentTarget.getBoundingClientRect(); const touch = e.touches[0]; setMouse({ x: touch.clientX / rect.width, y: touch.clientY / rect.height }); };

    const stopAll = useCallback(() => {
        clearInterval(pollRef.current); clearInterval(tickRef.current);
        pollRef.current = null; tickRef.current = null;
    }, []);

    const startPolling = useCallback((token) => {
        stopAll();
        setElapsed(0);
        tickRef.current = setInterval(() => {
            setElapsed((prev) => {
                const next = prev + 1;
                if (next >= QR_TTL) setStatus(STATUS.EXPIRED);
                return next;
            });
        }, 1000);
        pollRef.current = setInterval(async () => {
            if (!mountedRef.current) return;
            try {
                const res = await client.get(`/auth/qr-session/status/${token}`);
                const data = res.data;
                const st = (data.status || "").toLowerCase();
                if (st === "scanned") { setStatus(STATUS.SCANNED); return; }
                if (st === "confirmed" || st === "approved" || data.token) {
                    stopAll(); setStatus(STATUS.SUCCESS);
                    const jwt = data.token || data.accessToken || data.jwtToken;
                    if (jwt) login(jwt, parseJwt(jwt));
                    setTimeout(() => { if (mountedRef.current) navigate("/"); }, 800);
                }
            } catch { }
        }, 2000);
    }, [stopAll, login, navigate]);

    useEffect(() => { if (status === STATUS.EXPIRED) stopAll(); }, [status, stopAll]);

    const generateSession = useCallback(async () => {
        stopAll(); setStatus(STATUS.LOADING); setErrorMsg(""); setQrValue(""); setElapsed(0);
        try {
            const res = await client.post("/auth/qr-session/create");
            if (!mountedRef.current) return;
            const data = res.data;
            const token = data.token || data.sessionToken || data.qrToken || data.id;
            if (!token) throw new Error("No session token in response");
            setQrValue(`${window.location.origin}/qr-confirm/${token}`);
            setStatus(STATUS.READY);
            startPolling(token);
        } catch (err) {
            if (!mountedRef.current) return;
            setErrorMsg(err.message);
            setStatus(STATUS.ERROR);
        }
    }, [stopAll, startPolling]);

    useEffect(() => {
        mountedRef.current = true;
        void (async () => { await generateSession(); })();
        return () => { mountedRef.current = false; stopAll(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const showTimer = status === STATUS.READY || status === STATUS.SCANNED;

    return (
        <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column', fontFamily: "'Inter',sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
                @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes dtSpin { to { transform:rotate(360deg); } }
                @keyframes dtPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(1.4); } }
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

            {/* Hero */}
            <div
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '32px 16px' : '48px 24px', position: 'relative', overflow: 'hidden' }}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
            >
                <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, cursor: 'crosshair', pointerEvents: 'all' }} />
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', borderRadius: '50%', background: '#4F46E5', opacity: 0.3, filter: 'blur(120px)', width: 600, height: 600, top: '-20%', left: '-10%', transform: `translate(${mouse.x * 80}px, ${mouse.y * 60}px)`, transition: 'transform 1s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                    <div style={{ position: 'absolute', borderRadius: '50%', background: '#0ea5e9', opacity: 0.25, filter: 'blur(100px)', width: 500, height: 500, top: '30%', right: '-10%', transform: `translate(${-mouse.x * 60}px, ${mouse.y * 80}px)`, transition: 'transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                    <div style={{ position: 'absolute', borderRadius: '50%', background: '#7c3aed', opacity: 0.2, filter: 'blur(110px)', width: 550, height: 550, bottom: '-10%', left: '20%', transform: `translate(${mouse.x * 50}px, ${-mouse.y * 60}px)`, transition: 'transform 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                </div>

                {/* Card */}
                <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1, animation: 'fadeUp 0.45s ease both' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>

                        {/* Card header */}
                        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)' }}>
                                Sign in with QR Code
                            </h2>
                        </div>

                        <div style={{ padding: 20 }}>
                            {/* QR area */}
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 212, marginBottom: 16 }}>
                                <QrContent status={status} qrValue={qrValue} errorMsg={errorMsg} onRetry={generateSession} />
                            </div>

                            {/* Timer */}
                            {showTimer && <TimerBar elapsed={elapsed} />}

                            {/* Status row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: status === STATUS.READY ? '#4ade80' : status === STATUS.SCANNED ? '#f59e0b' : status === STATUS.SUCCESS ? '#4ade80' : '#8f98a0', boxShadow: status === STATUS.READY ? '0 0 6px #4ade80' : 'none', display: 'inline-block', animation: (status === STATUS.READY || status === STATUS.SCANNED) ? 'dtPulse 1.6s ease-in-out infinite' : 'none' }} />
                                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                        {status === STATUS.LOADING ? 'Generating…' : status === STATUS.READY ? 'Waiting for scan' : status === STATUS.SCANNED ? 'Scanned — confirm on phone' : status === STATUS.SUCCESS ? 'Confirmed!' : status === STATUS.EXPIRED ? 'Expired' : 'Connection error'}
                                    </span>
                                </div>
                                {showTimer && (
                                    <button onClick={generateSession} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', padding: '3px 10px', fontFamily: "'Inter',sans-serif", transition: 'border-color 0.2s, color 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(71,191,255,0.4)'; e.currentTarget.style.color = '#47bfff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                                    >↺ Refresh</button>
                                )}
                            </div>

                            {/* Steps */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
                                {[
                                    'Open DocuTrack on your phone',
                                    'Tap the QR scanner icon',
                                    'Point your camera at the code above',
                                    'Tap Confirm — you\'re in',
                                ].map((text, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'rgba(71,191,255,0.1)', border: '1px solid rgba(71,191,255,0.2)', color: '#47bfff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, paddingTop: 2 }}>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card footer */}
                        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                            <Link to="/login" style={{ color: '#47bfff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>← Back to password login</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, position: 'relative', zIndex: 10 }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>© 2026 DocuTrack — Lyceum of the Philippines University Cavite</span>
                <div style={{ display: 'flex', gap: 16 }}>
                    {['Privacy Policy', 'Legal', 'Support'].map(l => (
                        <span key={l} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>{l}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}