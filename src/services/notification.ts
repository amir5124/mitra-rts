import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import api from '../utils/api';

// Konfigurasi handler notifikasi
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }) as any,
});

export const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF0000',
        });
    }

    if (!Device.isDevice) {
        Alert.alert('Info', 'Must use physical device for Push Notifications');
        return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        Alert.alert('Error', 'Failed to get push token for push notification!');
        return;
    }

    const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id',
    });

    console.log('Expo Push Token:', token.data);

    const userToken = await AsyncStorage.getItem('userToken');
    if (userToken && token.data) {
        await api.post('/notifications/register-token', {
            push_token: token.data,
            device_type: Platform.OS,
        });
    }

    return token.data;
};

export const addNotificationListener = (callback: (notification: any) => void) => {
    return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseListener = (callback: (response: any) => void) => {
    return Notifications.addNotificationResponseReceivedListener(callback);
};