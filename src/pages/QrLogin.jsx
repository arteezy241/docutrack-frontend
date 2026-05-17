import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import useAuthStore from "../store/authStore";

const API_BASE = "https://docutrack-production.up.railway.app/api";
const QR_TTL = 120; // seconds

const STATUS = {
    LOADING: "loading",
    READY: "ready",
    SCANNED: "scanned",
    SUCCESS: "success",
    EXPIRED: "expired",
    ERROR: "error",
};

const STATUS_META = {
    [STATUS.LOADING]: { dot: "#8f98a0", label: "Generating…" },
    [STATUS.READY]: { dot: "#4ade80", label: "Waiting for scan" },
    [STATUS.SCANNED]: { dot: "#f59e0b", label: "Scanned — confirm on phone" },
    [STATUS.SUCCESS]: { dot: "#4ade80", label: "Confirmed!" },
    [STATUS.EXPIRED]: { dot: "#c94040", label: "Expired" },
    [STATUS.ERROR]: { dot: "#c94040", label: "Connection error" },
};

const parseJwt = (token) => {
    try { return JSON.parse(atob(token.split(".")[1])); }
    catch { return null; }
};

const iconCircle = (color) => ({
    width: 56, height: 56, borderRadius: "50%",
    background: "rgba(27,40,56,0.15)",
    border: `2px solid ${color}`, color,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 24, fontWeight: 700,
});

// ─────────────────────────────────────────────────────────────────────────────
// All sub-components OUTSIDE QrLogin — fixes "Cannot create components during render"
// ─────────────────────────────────────────────────────────────────────────────

function QrContent({ status, qrValue, errorMsg, onRetry }) {
    if (status === STATUS.LOADING) {
        return (
            <div style={s.qrBox}>
                <div style={s.spinner} />
                <p style={{ ...s.hint, marginTop: 12 }}>Generating session…</p>
            </div>
        );
    }
    if (status === STATUS.ERROR) {
        return (
            <div style={s.qrBox}>
                <div style={iconCircle("#c94040")}>⚠</div>
                <p style={{ ...s.hint, color: "#c94040", marginTop: 8, textAlign: "center", maxWidth: 200 }}>
                    {errorMsg}
                </p>
                <button onClick={onRetry} style={s.refreshBtn}>Try again</button>
            </div>
        );
    }
    if (status === STATUS.EXPIRED) {
        return (
            <div style={s.qrBox}>
                <div style={iconCircle("#8f98a0")}>⏱</div>
                <p style={{ ...s.hint, marginTop: 8 }}>Code expired</p>
                <button onClick={onRetry} style={s.refreshBtn}>Generate new code</button>
            </div>
        );
    }
    if (status === STATUS.SUCCESS) {
        return (
            <div style={s.qrBox}>
                <div style={iconCircle("#4ade80")}>✓</div>
                <p style={{ ...s.hint, color: "#4ade80", marginTop: 8 }}>Authenticated — signing in…</p>
            </div>
        );
    }
    // READY | SCANNED
    const dimmed = status === STATUS.SCANNED;
    return (
        <div style={{ position: "relative", lineHeight: 0 }}>
            <div style={{ ...s.qrFrame, opacity: dimmed ? 0.3 : 1, filter: dimmed ? "blur(2px)" : "none", transition: "opacity 0.3s, filter 0.3s" }}>
                <QRCodeSVG value={qrValue} size={192} bgColor="transparent" fgColor="#c6d4df" level="M" includeMargin={false} />
            </div>
            {dimmed && (
                <div style={s.scanOverlay}>
                    <span style={{ fontSize: 28 }}>📱</span>
                    <p style={{ color: "#f59e0b", fontSize: 13, fontWeight: 600, margin: 0 }}>Confirm on your device</p>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const meta = STATUS_META[status] || STATUS_META[STATUS.LOADING];
    const pulse = status === STATUS.READY || status === STATUS.SCANNED;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.dot, boxShadow: `0 0 6px ${meta.dot}`, display: "inline-block", animation: pulse ? "dtPulse 1.6s ease-in-out infinite" : "none" }} />
            <span style={s.statusText}>{meta.label}</span>
        </div>
    );
}

function TimerBar({ elapsed }) {
    const remaining = Math.max(0, QR_TTL - elapsed);
    const pct = (elapsed / QR_TTL) * 100;
    const low = remaining < 30;
    const fmt = remaining < 60 ? `${remaining}s` : `${Math.floor(remaining / 60)}m ${remaining % 60}s`;
    return (
        <div style={s.timerRow}>
            <div style={s.timerBg}>
                <div style={{ ...s.timerFill, width: `${100 - pct}%`, background: low ? "linear-gradient(to right,#c94040,#f59e0b)" : "linear-gradient(to right,#47bfff,#4F46E5)" }} />
            </div>
            <span style={s.timerText}>{fmt}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function QrLogin() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const pollRef = useRef(null);
    const tickRef = useRef(null);
    const mountedRef = useRef(true);

    const [status, setStatus] = useState(STATUS.LOADING);
    const [qrValue, setQrValue] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [elapsed, setElapsed] = useState(0);

    const stopAll = useCallback(() => {
        clearInterval(pollRef.current);
        clearInterval(tickRef.current);
        pollRef.current = null;
        tickRef.current = null;
    }, []);

    const startPolling = useCallback((token) => {
        stopAll();
        setElapsed(0);

        tickRef.current = setInterval(() => {
            setElapsed((prev) => {
                const next = prev + 1;
                if (next >= QR_TTL) {
                    // Can't call stopAll here — stale closure. Signal via status instead.
                    setStatus(STATUS.EXPIRED);
                }
                return next;
            });
        }, 1000);

        pollRef.current = setInterval(async () => {
            if (!mountedRef.current) return;
            try {
                const res = await fetch(`${API_BASE}/auth/qr-session/status/${token}`);
                if (!res.ok || !mountedRef.current) return;
                const data = await res.json();
                const st = (data.status || "").toLowerCase();

                if (st === "scanned") { setStatus(STATUS.SCANNED); return; }

                if (st === "confirmed" || st === "approved" || data.token) {
                    stopAll();
                    setStatus(STATUS.SUCCESS);
                    const jwt = data.token || data.accessToken || data.jwtToken;
                    if (jwt) login(jwt, parseJwt(jwt));
                    setTimeout(() => { if (mountedRef.current) navigate("/"); }, 800);
                }
            } catch {
                // swallow transient poll errors
            }
        }, 2000);
    }, [stopAll, login, navigate]);

    // Stop polling when expired (separate effect so it reacts to status)
    useEffect(() => {
        if (status === STATUS.EXPIRED) stopAll();
    }, [status, stopAll]);

    const generateSession = useCallback(async () => {
        stopAll();
        setStatus(STATUS.LOADING);
        setErrorMsg("");
        setQrValue("");
        setElapsed(0);
        try {
            const res = await fetch(`${API_BASE}/auth/qr-session/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            if (!mountedRef.current) return;

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

    // ── Fixes "Calling setState synchronously within an effect" ──
    // Wrap the async call in a void IIFE so the effect body stays synchronous.
    useEffect(() => {
        mountedRef.current = true;
        void (async () => { await generateSession(); })();
        return () => {
            mountedRef.current = false;
            stopAll();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const showTimer = status === STATUS.READY || status === STATUS.SCANNED;

    return (
        <div style={s.root}>
            <div style={s.card}>

                <div style={s.header}>
                    <div style={s.logoMark}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#47bfff" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                    </div>
                    <div>
                        <h1 style={s.title}>Sign in with QR Code</h1>
                        <p style={s.subtitle}>Scan with your DocuTrack mobile app</p>
                    </div>
                </div>

                <div style={s.divider} />

                <div style={s.qrArea}>
                    <QrContent status={status} qrValue={qrValue} errorMsg={errorMsg} onRetry={generateSession} />
                </div>

                {showTimer && <TimerBar elapsed={elapsed} />}

                <div style={s.statusRow}>
                    <StatusBadge status={status} />
                    {showTimer && (
                        <button onClick={generateSession} style={s.refreshIconBtn}>↺ Refresh</button>
                    )}
                </div>

                <ol style={s.steps}>
                    {[
                        "Open DocuTrack on your phone",
                        "Tap the QR scanner icon",
                        "Point your camera at the code above",
                        "Tap Confirm — you're in",
                    ].map((text, i) => (
                        <li key={i} style={s.step}>
                            <span style={s.stepNum}>{i + 1}</span>
                            <span style={s.stepText}>{text}</span>
                        </li>
                    ))}
                </ol>

                <div style={s.divider} />

                <div style={s.footer}>
                    <Link to="/login" style={s.link}>← Password login</Link>
                    <Link to="/register" style={s.link}>Create account</Link>
                </div>

            </div>

            <style>{`
        @keyframes dtPulse {
          0%,100% { opacity:1; transform:scale(1);    }
          50%      { opacity:.4; transform:scale(1.4); }
        }
        @keyframes dtSpin { to { transform:rotate(360deg); } }
      `}</style>
        </div>
    );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const s = {
    root: { minHeight: "100vh", background: "#1b2838", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Motiva Sans','Segoe UI',sans-serif" },
    card: { width: "100%", maxWidth: 420, background: "#c6d4df", borderRadius: 4, padding: "28px 28px 24px", boxShadow: "0 0 0 1px rgba(0,0,0,.3),0 8px 32px rgba(0,0,0,.5)" },
    header: { display: "flex", alignItems: "center", gap: 14, marginBottom: 20 },
    logoMark: { width: 42, height: 42, borderRadius: 4, background: "#1b2838", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    title: { margin: 0, fontSize: 17, fontWeight: 700, color: "#1b2838" },
    subtitle: { margin: "3px 0 0", fontSize: 12, color: "#4a7fa5" },
    divider: { height: 1, background: "#b8c7d9", margin: "0 0 20px" },
    qrArea: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: 228, marginBottom: 16 },
    qrBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "20px 0" },
    qrFrame: { padding: 14, background: "#1b2838", borderRadius: 6, boxShadow: "inset 0 2px 8px rgba(0,0,0,.5)" },
    scanOverlay: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 6, background: "rgba(27,40,56,.75)" },
    spinner: { width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(74,127,165,.25)", borderTopColor: "#47bfff", animation: "dtSpin 0.8s linear infinite" },
    hint: { fontSize: 13, color: "#4a7fa5", margin: 0, lineHeight: 1.5 },
    refreshBtn: { marginTop: 8, padding: "7px 18px", background: "linear-gradient(to bottom,#47bfff 5%,#1a44c2 95%)", border: "none", borderRadius: 3, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    timerRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
    timerBg: { flex: 1, height: 4, background: "rgba(27,40,56,.2)", borderRadius: 2, overflow: "hidden" },
    timerFill: { height: "100%", borderRadius: 2, transition: "width 1s linear, background 0.5s" },
    timerText: { fontSize: 11, color: "#4a7fa5", minWidth: 36, textAlign: "right" },
    statusRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
    statusText: { fontSize: 12, color: "#1b2838" },
    refreshIconBtn: { background: "none", border: "1px solid #4a7fa5", borderRadius: 3, color: "#4a7fa5", fontSize: 11, cursor: "pointer", padding: "3px 8px" },
    steps: { listStyle: "none", margin: "0 0 20px", padding: 0, display: "flex", flexDirection: "column", gap: 8 },
    step: { display: "flex", alignItems: "flex-start", gap: 10 },
    stepNum: { flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#1b2838", color: "#47bfff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
    stepText: { fontSize: 12, color: "#4a7fa5", lineHeight: 1.6, paddingTop: 2 },
    footer: { display: "flex", justifyContent: "space-between", paddingTop: 16 },
    link: { color: "#4a7fa5", fontSize: 12, textDecoration: "none" },
};