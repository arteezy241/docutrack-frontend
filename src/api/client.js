import axios from 'axios';

export function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const [k, ...val] = v.split('=');
        return k === name ? decodeURIComponent(val.join('=')) : r;
    }, '');
}

export function removeCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// Device name detection
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

const API_URL = 'https://docutrack-production.up.railway.app/api';

const client = axios.create({
    baseURL: API_URL,
});

// Automatically attach JWT token and device token to every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const deviceToken = localStorage.getItem('deviceToken') || getCookie('deviceToken');
    if (deviceToken) {
        config.headers['X-Device-Token'] = deviceToken;
    }

    return config;
});

// Redirect to login if 401
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default client;