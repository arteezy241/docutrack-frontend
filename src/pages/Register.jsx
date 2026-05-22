import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

export default function Register() {
    const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
    const canvasRef = useRef(null);
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) return setError('Passwords do not match');
        if (form.password.length < 8) return setError('Password must be at least 8 characters');
        if (!/[A-Z]/.test(form.password)) return setError('Password must contain at least one uppercase letter');
        if (!/[a-z]/.test(form.password)) return setError('Password must contain at least one lowercase letter');
        if (!/[0-9]/.test(form.password)) return setError('Password must contain at least one number');
        setLoading(true);
        setError('');
        try {
            await client.post('/auth/register', {
                fullName: form.fullName,
                username: form.username,
                email: form.email,
                password: form.password,
                role: 'Staff'
            });
            navigate('/verify-otp', { state: { email: form.email } });
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
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
        const particles = Array.from({ length: 60 }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 3 + 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            opacity: Math.random() * 0.4 + 0.1,
        }));

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
                p.vx *= 0.98;
                p.vy *= 0.98;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
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

    return (
        <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
                @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                .reg-input {
                    width: 100%; padding: 10px 12px; font-size: 13px;
                    border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
                    background: rgba(255,255,255,0.07); color: #e8edf2;
                    box-sizing: border-box; outline: none; font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s, background 0.2s;
                }
                .reg-input:focus { border-color: rgba(71,191,255,0.5); background: rgba(255,255,255,0.1); }
                .reg-input::placeholder { color: rgba(255,255,255,0.3); }
                .reg-btn {
                    width: 100%; padding: 11px;
                    background: linear-gradient(135deg, #47bfff, #4F46E5);
                    color: #fff; border: none; border-radius: 10px;
                    font-size: 13px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 1px; cursor: pointer; font-family: 'Inter', sans-serif;
                    transition: opacity 0.2s, transform 0.2s;
                    box-shadow: 0 4px 16px rgba(79,70,229,0.4);
                }
                .reg-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .reg-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .footer-link { color: rgba(255,255,255,0.4); font-size: 11px; cursor: pointer; transition: color 0.2s; text-decoration: none; }
                .footer-link:hover { color: rgba(255,255,255,0.7); }
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
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', position: 'relative', overflow: 'hidden' }}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
            >
                {/* Canvas particles */}
                <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, cursor: 'crosshair', pointerEvents: 'all' }} />

                {/* Glow blobs */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', borderRadius: '50%', background: '#4F46E5', opacity: 0.3, filter: 'blur(120px)', width: 600, height: 600, top: '-20%', left: '-10%', transform: `translate(${mouse.x * 80}px, ${mouse.y * 60}px)`, transition: 'transform 1s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                    <div style={{ position: 'absolute', borderRadius: '50%', background: '#0ea5e9', opacity: 0.25, filter: 'blur(100px)', width: 500, height: 500, top: '30%', right: '-10%', transform: `translate(${-mouse.x * 60}px, ${mouse.y * 80}px)`, transition: 'transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                    <div style={{ position: 'absolute', borderRadius: '50%', background: '#7c3aed', opacity: 0.2, filter: 'blur(110px)', width: 550, height: 550, bottom: '-10%', left: '20%', transform: `translate(${mouse.x * 50}px, ${-mouse.y * 60}px)`, transition: 'transform 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
                </div>

                {/* Form card */}
                <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, animation: 'fadeUp 0.4s ease both' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)' }}>
                                Create your DocuTrack account
                            </h2>
                        </div>
                        <div style={{ padding: '20px' }}>
                            {error && (
                                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                                    {error}
                                </div>
                            )}
                            <div style={{ padding: '10px 12px', background: 'rgba(71,191,255,0.06)', border: '1px solid rgba(71,191,255,0.15)', borderRadius: 8, marginBottom: 16 }}>
                                <p style={{ margin: 0, fontSize: 11, color: '#47bfff', fontWeight: 600, marginBottom: 4 }}>Password requirements:</p>
                                <p style={{ margin: 0, fontSize: 11, color: '#8f98a0', lineHeight: 1.6 }}>
                                    • At least 8 characters &nbsp;•&nbsp; One uppercase (A-Z)<br />
                                    • One lowercase (a-z) &nbsp;•&nbsp; One number (0-9)
                                </p>
                            </div>
                            <form onSubmit={handleRegister}>
                                {[
                                    { label: 'Full Name', name: 'fullName', type: 'text', placeholder: 'Juan dela Cruz' },
                                    { label: 'Username', name: 'username', type: 'text', placeholder: 'juan_dc' },
                                    { label: 'Email', name: 'email', type: 'email', placeholder: 'juan@email.com' },
                                    { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
                                    { label: 'Confirm Password', name: 'confirmPassword', type: 'password', placeholder: '••••••••' },
                                ].map(field => (
                                    <div key={field.name} style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: 0.8 }}>
                                            {field.label}
                                        </label>
                                        <input className="reg-input" type={field.type} name={field.name} value={form[field.name]} onChange={handleChange} placeholder={field.placeholder} required />
                                    </div>
                                ))}
                                <button className="reg-btn" type="submit" disabled={loading} style={{ marginTop: 4 }}>
                                    {loading ? 'Creating account...' : 'Create Account'}
                                </button>
                            </form>
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Already have an account? </span>
                            <Link to="/login" style={{ color: '#47bfff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                        </div>
                    </div>
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
        </div>
    );
}