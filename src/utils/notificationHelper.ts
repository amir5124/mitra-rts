// src/utils/notificationHelper.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

// 🔧 Tipe untuk notification handler
type NotificationHandler = {
    handleNotification: (notification: Notifications.Notification) => Promise<Notifications.NotificationBehavior>;
};

// 🔧 KONFIGURASI NOTIFICATION HANDLER (Perbaiki tipe)
Notifications.setNotificationHandler({
    handleNotification: async (notification: Notifications.Notification) => {
        console.log('📱 Handling notification:', notification.request.content);

        return {
            shouldShowAlert: true,      // ✅ TAMPILKAN BANNER
            shouldPlaySound: true,      // ✅ MAIN SOUND
            shouldSetBadge: true,       // ✅ UPDATE BADGE
            priority: Notifications.AndroidNotificationPriority.HIGH,
        };
    },
} as Notifications.NotificationHandler);

// 🎵 Setup notification channel untuk Android
export async function setupNotificationChannels() {
    if (Platform.OS === 'android') {
        // Channel khusus mitra dengan sound custom
        await Notifications.setNotificationChannelAsync('mitra_notifications', {
            name: 'Notifikasi Mitra',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'notification.wav', // 🔥 PASTIKAN NAMA FILE SAMA
            enableVibrate: true,
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        // Channel default sebagai fallback
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Notifikasi Umum',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'notification.wav',
            enableVibrate: true,
            showBadge: true,
        });

        console.log('✅ Notification channels configured with custom sound');
    }
}

export async function registerForPushNotificationsAsync() {
    console.log('📢 Registering for push notifications...');

    // Setup channels terlebih dahulu
    await setupNotificationChannels();

    // 1. Minta izin notifikasi
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('❌ Permission denied');
        return null;
    }

    // 2. Dapatkan native device token
    try {
        const nativeToken = await Notifications.getDevicePushTokenAsync();
        console.log('✅ Device token obtained:', nativeToken.type);
        return nativeToken.data;
    } catch (error: any) {
        console.error('❌ Error getting token:', error.message);
        return null;
    }
}

// FUNGSI UTAMA - Dipanggil saat login/register berhasil
export async function registerDeviceTokenToBackend(
    userId: string,
    authToken: string
) {
    console.log('📱 [REGISTER_DEVICE] Starting device token registration...');

    try {
        // Setup channels dulu
        await setupNotificationChannels();

        // 1. Dapatkan FCM token
        const fcmToken = await registerForPushNotificationsAsync();
        if (!fcmToken) {
            console.log('❌ Cannot register: No FCM token available');
            return { success: false, message: 'No FCM token available' };
        }

        // 2. Dapatkan atau buat device ID
        let deviceId = await AsyncStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            await AsyncStorage.setItem('device_id', deviceId);
            console.log('🆕 Created device ID:', deviceId);
        } else {
            console.log('📱 Existing device ID:', deviceId);
        }

        // 3. Persiapkan data
        const deviceName = `${Platform.OS} ${Platform.Version}`;
        const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

        console.log('📤 Sending to backend:', {
            userId,
            deviceId,
            deviceType,
            fcmTokenPreview: fcmToken.substring(0, 30) + '...'
        });

        // 4. Kirim ke backend
        const response = await api.post(
            '/devices/register',
            {
                user_id: parseInt(userId),
                device_id: deviceId,
                fcm_token: fcmToken,
                device_name: deviceName,
                device_type: deviceType,
            },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`
                },
                timeout: 10000
            }
        );

        console.log('✅ Device token registered to backend successfully!');
        console.log('📦 Server response:', response.data);

        // 5. Simpan lokal sebagai backup
        await saveTokenLocally(userId, deviceId, fcmToken, deviceName, deviceType);

        // 6. Test notifikasi lokal (opsional)


        return { success: true, data: response.data };

    } catch (error: any) {
        console.error('❌ Failed to register device token:', error.message);

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }

        return {
            success: false,
            message: error.message,
            status: error.response?.status
        };
    }
}

// 🧪 Test notifikasi lokal untuk verifikasi sound


// Simpan token secara lokal (backup)
async function saveTokenLocally(
    userId: string,
    deviceId: string,
    fcmToken: string,
    deviceName: string,
    deviceType: string
) {
    const tokenData = {
        userId,
        deviceId,
        fcmToken,
        deviceName,
        deviceType,
        savedAt: new Date().toISOString()
    };

    await AsyncStorage.setItem('device_token_data', JSON.stringify(tokenData));
    await AsyncStorage.setItem('device_token', fcmToken);
    await AsyncStorage.setItem('device_id', deviceId);

    console.log('✅ Token saved locally as backup');
}

// Dapatkan device token yang tersimpan
export async function getStoredDeviceToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem('device_token');
    } catch (error) {
        return null;
    }
}

// Dapatkan device ID
export async function getStoredDeviceId(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem('device_id');
    } catch (error) {
        return null;
    }
}

// Hapus device dari backend (saat logout)
export async function unregisterDeviceTokenFromBackend(deviceId: string, authToken: string) {
    console.log('🗑️ Unregistering device from backend...');

    try {
        const response = await api.post(
            '/devices/unregister',
            { device_id: deviceId },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            }
        );

        await AsyncStorage.multiRemove(['device_token', 'device_id', 'device_token_data']);
        console.log('✅ Device unregistered successfully');

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('❌ Failed to unregister:', error.message);
        return { success: false, message: error.message };
    }
}