import axios from 'axios';

export function getDeviceName() {
    const ua = navigator.userAgent;
    const browser = /Chrome/i.test(ua) && !/Edge/i.test(ua) ? 'Chrome'
        : /Safari/i.test(ua) && !/Chrome/i.test(ua) ? 'Safari'
            : /Firefox/i.test(ua) ? 'Firefox'
                : /Edge/i.test(ua) ? 'Edge'
                    : 'Browser';
    if (/iPhone/i.test(ua)) return `iPhone (${browser})`;
    if (/iPad/i.test(ua)) return `iPad (${browser})`;
    if (/Android/i.test(ua) && /Mobile/i.test(ua)) return `Android Phone (${browser})`;
    if (/Android/i.test(ua)) return `Android Tablet (${browser})`;
    if (/Macintosh/i.test(ua)) return `Mac (${browser})`;
    if (/Windows/i.test(ua)) return `Windows PC (${browser})`;
    if (/Linux/i.test(ua)) return `Linux (${browser})`;
    return `Unknown (${browser})`;
}

const API_URL = 'https://api.mheku.fyi/api';

const client = axios.create({
    baseURL: API_URL,
    withCredentials: true, // sends httpOnly cookies automatically on every request
});

// Automatically attach JWT token to every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Redirect to login if 401
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && window.location.pathname !== '/login') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // device_token is httpOnly cookie — browser manages it automatically
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default client;