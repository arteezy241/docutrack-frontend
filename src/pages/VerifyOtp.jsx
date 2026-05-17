import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import client from '../api/client';

export default function VerifyOtp() {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState(location.state?.email || '');

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
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

    return (
        <div style={{ minHeight: '100vh', background: '#1b2838', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ background: '#171a21', borderBottom: '1px solid #000', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, background: '#4F46E5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>D</span>
                    </div>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 2 }}>DOCUTRACK</span>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(135deg, #0f1923 0%, #1b2838 50%, #2a475e 100%)' }}>
                <div style={{ width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                    <div style={{ background: '#c6d4df', padding: '16px 20px 12px' }}>
                        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#3d3d3f' }}>
                            Verify your email
                        </h2>
                    </div>

                    <div style={{ background: '#c6d4df', padding: '16px 20px' }}>

                        {success ? (
                            <div style={{ background: '#e6f9f0', border: '1px solid #4ade80', color: '#166534', padding: '12px', borderRadius: 4, fontSize: 13, textAlign: 'center' }}>
                                ✓ Email verified! Redirecting to login…
                            </div>
                        ) : (
                            <>
                                <p style={{ fontSize: 12, color: '#4d6275', marginBottom: 16, lineHeight: 1.6 }}>
                                    Enter the 6-digit code sent to your email.
                                </p>

                                {error && (
                                    <div style={{ background: '#fee', border: '1px solid #fcc', color: '#c33', padding: '8px 12px', borderRadius: 4, fontSize: 12, marginBottom: 12 }}>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleVerify}>
                                    {/* show email input if not passed via state */}
                                    {!location.state?.email && (
                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{ display: 'block', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: '#3d3d3f', marginBottom: 4 }}>
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="your@email.com"
                                                required
                                                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #a0a0a0', borderRadius: 3, background: '#fff', color: '#333', boxSizing: 'border-box', outline: 'none' }}
                                            />
                                        </div>
                                    )}

                                    {location.state?.email && (
                                        <p style={{ fontSize: 12, color: '#4d6275', marginBottom: 12 }}>
                                            Code sent to <strong>{email}</strong>
                                        </p>
                                    )}

                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: '#3d3d3f', marginBottom: 4 }}>
                                            Verification Code
                                        </label>
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="123456"
                                            maxLength={6}
                                            required
                                            style={{ width: '100%', padding: '10px', fontSize: 20, border: '1px solid #a0a0a0', borderRadius: 3, background: '#fff', color: '#333', boxSizing: 'border-box', outline: 'none', textAlign: 'center', letterSpacing: 8, fontWeight: 'bold' }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{ width: '100%', padding: 10, background: 'linear-gradient(to bottom, #47bfff 5%, #1a44c2 95%)', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
                                    >
                                        {loading ? 'Verifying...' : 'Verify Email'}
                                    </button>
                                </form>

                                <div style={{ textAlign: 'center', marginTop: 12 }}>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await client.post('/auth/resend-otp', { email });
                                                alert('New OTP sent to your email!');
                                            } catch {
                                                alert('Failed to resend OTP');
                                            }
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#4a7fa5', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Resend code
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div style={{ background: '#b8c7d9', borderTop: '1px solid #a0b0c0', padding: '10px 20px', textAlign: 'center' }}>
                        <Link to="/login" style={{ color: '#4a7fa5', fontSize: 12, textDecoration: 'none' }}>← Back to login</Link>
                    </div>
                </div>
            </div>

            <div style={{ background: '#171a21', borderTop: '1px solid #000', padding: '10px 24px' }}>
                <span style={{ color: '#8f98a0', fontSize: 11 }}>© 2026 DocuTrack</span>
            </div>
        </div>
    );
}