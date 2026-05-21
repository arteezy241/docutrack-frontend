self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {};
    const title = data.title || 'DocuTrack';
    const options = {
        body: data.message || 'You have a new notification.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});