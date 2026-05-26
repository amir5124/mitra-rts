import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [isChecking, setIsChecking] = useState(true);
    const hasRedirected = useRef(false);

    useEffect(() => {
        const checkMitraStatus = async () => {
            if (hasRedirected.current) return;

            // ─── 1. Belum login ───────────────────────────────────────────
            if (!user) {
                console.log('👤 Not logged in → login');
                hasRedirected.current = true;
                router.replace('/(auth)/login');
                setIsChecking(false);
                return;
            }

            // ─── 2. Bukan mitra (customer / admin) → langsung masuk ──────
            if (user.role && user.role !== 'mitra') {
                console.log('👤 Non-mitra role → tabs');
                hasRedirected.current = true;
                router.replace('/(tabs)');
                setIsChecking(false);
                return;
            }

            // ─── 3. Mitra → wajib cek verifikasi ─────────────────────────
            try {
                console.log('🔍 Checking mitra status for user ID:', user.id);

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
                console.log('📡 Mitra status response:', result);

                // ── 404 → belum pernah daftar mitra ──
                if (response.status === 404) {
                    console.log('⚠️ Mitra not found (404) → register-mitra');
                    hasRedirected.current = true;
                    router.replace('/(auth)/register-mitra');
                    return;
                }

                // ── API error lain → tahan di pending (jangan beri akses tabs) ──
                if (!response.ok || !result.success) {
                    console.log('⚠️ API error → pending-review (safety hold)');
                    hasRedirected.current = true;
                    router.replace('/(auth)/pending-review');
                    return;
                }

                const mitraStatus = result.data;
                const isRegistered: boolean = mitraStatus?.is_registered === true;
                const isVerified: boolean = mitraStatus?.is_verified === true;

                console.log(`📋 registered=${isRegistered} | verified=${isVerified}`);

                if (!isRegistered) {
                    // Belum pernah daftar mitra
                    console.log('ℹ️ Not registered → register-mitra');
                    hasRedirected.current = true;
                    router.replace('/(auth)/register-mitra');
                    return;
                }

                if (!isVerified) {
                    // Sudah daftar, BELUM diverifikasi → tahan
                    console.log('⏳ Pending verification → pending-review');
                    hasRedirected.current = true;
                    router.replace('/(auth)/pending-review');
                    return;
                }

                // ✅ Terdaftar DAN terverifikasi → boleh masuk
                console.log('✅ Verified mitra → tabs');
                hasRedirected.current = true;
                router.replace('/(tabs)');

            } catch (error) {
                // Network error → JANGAN masuk tabs, tahan di pending
                console.error('❌ Network error checking mitra status:', error);
                hasRedirected.current = true;
                router.replace('/(auth)/pending-review');
            } finally {
                setIsChecking(false);
            }
        };

        if (!isLoading && !hasRedirected.current) {
            checkMitraStatus();
        }
    }, [isLoading, user, router]);

    if (isLoading || isChecking) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#EF4444" />
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
});