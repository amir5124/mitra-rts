import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import "../global.css";
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import api from '../src/utils/api';

// Component untuk mengecek apakah mitra sudah melengkapi data DAN status verifikasi
function MitraCheckGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [isMitraComplete, setIsMitraComplete] = useState<boolean | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const hasRedirected = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkMitraProfile = async () => {
      if (!isLoggedIn || !user) {
        setChecking(false);
        return;
      }

      // Hanya cek untuk role mitra
      if (user.role !== 'mitra') {
        setIsMitraComplete(true);
        setChecking(false);
        return;
      }

      // Cek apakah sudah di halaman register-mitra atau pending-review
      const isInRegisterMitra = pathname === '/(auth)/register-mitra' ||
        pathname.includes('/register-mitra');
      const isInPendingReview = pathname === '/(auth)/pending-review' ||
        pathname.includes('/pending-review');

      // Jika sudah di halaman register-mitra atau pending-review, jangan redirect lagi
      if (isInRegisterMitra || isInPendingReview) {
        setChecking(false);
        return;
      }

      // Prevent multiple redirects
      if (hasRedirected.current) {
        setChecking(false);
        return;
      }

      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          setIsMitraComplete(false);
          setChecking(false);
          return;
        }

        // 1. Cek apakah mitra sudah mengisi data lengkap
        const profileResponse = await api.get(`/mitra/check-profile/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const isComplete = profileResponse.data?.data?.is_complete || false;
        setIsMitraComplete(isComplete);

        // 2. Cek status verifikasi mitra
        let isMitraVerified = false;
        try {
          const statusResponse = await api.get(`/mitra/status/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          isMitraVerified = statusResponse.data?.data?.is_verified === true;
          setIsVerified(isMitraVerified);
          console.log('Mitra status - is_registered:', statusResponse.data?.data?.is_registered);
          console.log('Mitra status - is_verified:', isMitraVerified);
        } catch (statusError) {
          console.log('Mitra belum terdaftar atau error:', statusError);
          setIsVerified(false);
        }

        // 3. Logika redirect
        // Jika belum lengkap, redirect ke register-mitra
        if (!isComplete && !hasRedirected.current) {
          hasRedirected.current = true;
          router.replace('/(auth)/register-mitra');
          return;
        }

        // Jika sudah lengkap tapi belum terverifikasi, redirect ke pending-review
        if (isComplete && !isMitraVerified && !hasRedirected.current) {
          hasRedirected.current = true;
          router.replace('/(auth)/pending-review');
          return;
        }

        setChecking(false);
      } catch (error) {
        console.error('Error checking mitra profile:', error);
        setIsMitraComplete(false);
        setChecking(false);
      }
    };

    checkMitraProfile();
  }, [isLoggedIn, user, pathname]);

  if (checking) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF0000" />
        <Text className="mt-4 text-gray-500">Memeriksa profil mitra...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const { isLoggedIn, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inRegisterMitra = segments[1] === 'register-mitra';
    const inPendingReview = segments[1] === 'pending-review';

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuthGroup && !inRegisterMitra && !inPendingReview) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments, isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  return (
    <MitraCheckGuard>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="order/[id]"
          options={{
            title: 'Detail Pesanan',
            headerBackTitle: 'Kembali',
            headerStyle: { backgroundColor: '#FF0000' },
            headerTintColor: '#fff',
          }}
        />
      </Stack>
    </MitraCheckGuard>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}