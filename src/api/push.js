const PUBLIC_KEY_URL = 'https://docutrack-production.up.railway.app/api/push/publickey';
const SUBSCRIBE_URL = 'https://docutrack-production.up.railway.app/api/push/subscribe';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function registerPush() {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push not supported');
            return;
        }

        // register service worker
        const reg = await navigator.serviceWorker.register('/service-worker.js');

        // request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Push permission denied');
            return;
        }

        // get VAPID public key from backend
        const token = localStorage.getItem('token');
        const keyRes = await fetch(PUBLIC_KEY_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const { publicKey } = await keyRes.json();

        // subscribe
        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const { endpoint, keys } = subscription.toJSON();

        // send to backend
        await fetch(SUBSCRIBE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            }),
        });

        console.log('Push subscription registered');
    } catch (err) {
        console.error('Push registration failed:', err);
    }
}