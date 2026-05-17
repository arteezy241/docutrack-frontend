import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

export default function Register() {
    const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) return setError('Passwords do not match');
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

    return (
        <div style={{ minHeight: '100vh', background: '#1b2838', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>

            {/* Navbar */}
            <div style={{ background: '#171a21', borderBottom: '1px solid #000', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, background: '#4F46E5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>D</span>
                    </div>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 2 }}>DOCUTRACK</span>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(135deg, #0f1923 0%, #1b2838 50%, #2a475e 100%)' }}>
                <div style={{ width: 380, borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

                    {/* Header */}
                    <div style={{ background: '#c6d4df', padding: '16px 20px 12px' }}>
                        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#3d3d3f' }}>
                            Create your DocuTrack account
                        </h2>
                    </div>

                    {/* Body */}
                    <div style={{ background: '#c6d4df', padding: '16px 20px' }}>
                        {error && (
                            <div style={{ background: '#fee', border: '1px solid #fcc', color: '#c33', padding: '8px 12px', borderRadius: 4, fontSize: 12, marginBottom: 12 }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleRegister}>
                            {[
                                { label: 'Full Name', name: 'fullName', type: 'text', placeholder: 'Juan dela Cruz' },
                                { label: 'Username', name: 'username', type: 'text', placeholder: 'juan_dc' },
                                { label: 'Email', name: 'email', type: 'email', placeholder: 'juan@email.com' },
                                { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
                                { label: 'Confirm Password', name: 'confirmPassword', type: 'password', placeholder: '••••••••' },
                            ].map(field => (
                                <div key={field.name} style={{ marginBottom: 10 }}>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: '#3d3d3f', marginBottom: 4, letterSpacing: 0.5 }}>
                                        {field.label}
                                    </label>
                                    <input
                                        type={field.type}
                                        name={field.name}
                                        value={form[field.name]}
                                        onChange={handleChange}
                                        placeholder={field.placeholder}
                                        required
                                        style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #a0a0a0', borderRadius: 3, background: '#fff', color: '#333', boxSizing: 'border-box', outline: 'none' }}
                                    />
                                </div>
                            ))}

                            <button
                                type="submit"
                                disabled={loading}
                                style={{ width: '100%', padding: 10, background: 'linear-gradient(to bottom, #47bfff 5%, #1a44c2 95%)', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', marginTop: 4, opacity: loading ? 0.6 : 1 }}
                            >
                                {loading ? 'Creating account...' : 'Create account'}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div style={{ background: '#b8c7d9', borderTop: '1px solid #a0b0c0', padding: '10px 20px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color: '#3d3d3f' }}>Already have an account? </span>
                        <Link to="/login" style={{ color: '#4a7fa5', fontSize: 12, fontWeight: 'bold', textDecoration: 'none' }}>Sign in</Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ background: '#171a21', borderTop: '1px solid #000', padding: '10px 24px' }}>
                <span style={{ color: '#8f98a0', fontSize: 11 }}>© 2026 DocuTrack</span>
            </div>
        </div>
    );
}