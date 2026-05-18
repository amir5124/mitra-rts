import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { registerForPushNotificationsAsync } from '../services/notification';

export const useNotification = () => {
    useEffect(() => {
        registerForPushNotificationsAsync();

        // Listener untuk notifikasi saat app dalam foreground
        const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
            console.log('Notification received:', notification);
        });

        // Listener saat notifikasi diklik
        const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;

            if (data?.orderId) {
                router.push(`/order/${data.orderId}`);
            }
        });

        // Cleanup: remove listeners
        return () => {
            notificationListener.remove();
            responseListener.remove();
        };
    }, []);
};