/**
 * app/(tabs)/_layout.tsx
 * Guard layer kedua — blokir akses langsung ke tabs
 * bagi mitra yang belum terverifikasi.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [guardPassed, setGuardPassed] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (isLoading || hasChecked.current) return;

    const runGuard = async () => {
      hasChecked.current = true;

      // Belum login
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      // Bukan mitra → langsung boleh
      if (user.role && user.role !== 'mitra') {
        setGuardPassed(true);
        return;
      }

      // Mitra → wajib cek is_verified
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(
          `https://api.siappgo.id/api/v1/mitra/status/${user.id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        const result = await response.json();

        if (response.status === 404) {
          router.replace('/(auth)/register-mitra');
          return;
        }

        if (!response.ok || !result.success) {
          router.replace('/(auth)/pending-review');
          return;
        }

        const isRegistered: boolean = result.data?.is_registered === true;
        const isVerified: boolean = result.data?.is_verified === true;

        if (!isRegistered) {
          router.replace('/(auth)/register-mitra');
          return;
        }

        if (!isVerified) {
          // ⛔ Paksa keluar meski sudah di dalam tabs
          router.replace('/(auth)/pending-review');
          return;
        }

        // ✅ Verified — render tabs
        setGuardPassed(true);

      } catch {
        router.replace('/(auth)/pending-review');
      }
    };

    runGuard();
  }, [isLoading, user]);

  // Tampilkan loading selama guard berjalan
  if (!guardPassed) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  // ─── Render tabs normal (sama persis dengan yang sudah ada) ──────
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF0000',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pesanan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});