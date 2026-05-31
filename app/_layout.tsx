import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Toast, {
  BaseToast,
  ErrorToast,
  ToastConfig,
} from 'react-native-toast-message';
import "../global.css";

import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { setupNotificationChannels } from '../src/utils/notificationHelper';

const toastConfig: ToastConfig = {
  success: props => (
    <BaseToast
      {...props}
      style={styles.toastBase}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastText1}
      text2Style={styles.toastText2}
    />
  ),
  error: props => (
    <ErrorToast
      {...props}
      style={[styles.toastBase, { borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastText1}
      text2Style={[styles.toastText2, { color: '#FF9494' }]}
    />
  ),
};

function RootLayoutContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const notificationListenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);
  const { isLoading, user, authToken } = useAuth();

  // 🔥 Setup StatusBar
  useEffect(() => {
    StatusBar.setBackgroundColor('#FF0000');
    StatusBar.setBarStyle('light-content');
    StatusBar.setTranslucent(false);
  }, []);

  // Setup notifikasi dan register token saat auth ready
  useEffect(() => {
    const setupNotifications = async () => {
      await setupNotificationChannels();

      if (user?.id && authToken) {
        const { registerDeviceTokenToBackend } = await import('../src/utils/notificationHelper');
        await registerDeviceTokenToBackend(user.id.toString(), authToken);
      }
    };

    setupNotifications();
  }, [user, authToken]);

  // 🔥 FUNGSI REDIRECT YANG DIPANGGIL DARI MANA SAJA
  const handleRedirect = (data: any) => {
    console.log('🔀 [REDIRECT] Redirecting with data:', data);

    if (!data) {
      console.log('⚠️ [REDIRECT] No data provided');
      return;
    }

    // Prioritas 1: order_id (dari notifikasi order)
    if (data?.order_id) {
      const orderId = parseInt(data.order_id);
      if (!isNaN(orderId) && orderId > 0) {
        console.log(`✅ [REDIRECT] Navigating to order/${orderId}`);
        router.replace({
          pathname: '/order/[id]',
          params: { id: orderId.toString() },
        });
        return;
      }
    }

    // Prioritas 2: screen orders_mitra
    if (data?.screen === 'orders_mitra') {
      console.log(`✅ [REDIRECT] Navigating to orders_mitra`);
      router.replace('/(tabs)/orders');
      return;
    }

    // Prioritas 3: screen dashboard_mitra
    if (data?.screen === 'dashboard_mitra') {
      console.log(`✅ [REDIRECT] Navigating to dashboard_mitra`);
      router.replace('/(tabs)');
      return;
    }

    // Prioritas 4: orderId (format alternatif)
    if (data?.orderId) {
      const orderId = parseInt(data.orderId);
      if (!isNaN(orderId) && orderId > 0) {
        console.log(`✅ [REDIRECT] Navigating to order/${orderId} (from orderId)`);
        router.replace({
          pathname: '/order/[id]',
          params: { id: orderId.toString() },
        });
        return;
      }
    }

    console.warn('⚠️ [REDIRECT] No matching route for data:', data);
  };

  // 🔥 Setup notification listeners dengan cleanup
  useEffect(() => {
    console.log('🔔 [NOTIFICATION] Setting up notification listeners...');

    // 🔥 Listener untuk notifikasi saat app di FOREGROUND
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 [NOTIFICATION] Received in foreground:', notification);
      const { title, body, data } = notification.request.content;

      // Tampilkan Toast sebagai notifikasi visual
      Toast.show({
        type: 'success',
        text1: title || 'Pesanan Baru!',
        text2: body || 'Klik untuk melihat detail pesanan',
        onPress: () => {
          console.log('🔔 [TOAST] Toast pressed, redirecting...');
          handleRedirect(data);
        },
        visibilityTime: 5000,
        autoHide: true,
      });
    });

    // 🔥 Listener untuk notifikasi saat DIKLIK (dari background/kill state)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 [NOTIFICATION] Clicked from background/kill:', response);
      const data = response.notification.request.content.data;
      handleRedirect(data);
    });

    notificationListenerRef.current = notificationListener;
    responseListenerRef.current = responseListener;


  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* StatusBar sudah di-set di useEffect */}
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#fff' },
          statusBarBackgroundColor: '#FF0000',
          statusBarStyle: 'light',
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </View>
      <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
      <Toast config={toastConfig} position="top" topOffset={insets.top + 10} />
    </View>
  );
}

function RootLayoutWithAuth() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutWithAuth />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  toastBase: { backgroundColor: '#1E1E1E', borderRadius: 12, height: 65, width: '90%', alignSelf: 'center', elevation: 10 },
  toastContent: { paddingHorizontal: 20 },
  toastText1: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  toastText2: { fontSize: 12, color: '#A1A1AA', marginTop: 2 },
});