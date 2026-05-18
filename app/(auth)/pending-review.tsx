import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/utils/api';

interface MitraStatus {
    is_registered: boolean;
    is_verified: boolean;
    is_online: boolean;
    specialization?: string[];
    message?: string;
}

interface UserData {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    profile_pic: string | null;
}

export default function PendingReviewScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [mitraStatus, setMitraStatus] = useState<MitraStatus | null>(null);
    const [specializations, setSpecializations] = useState<string[]>([]);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const userId = user?.id;

    // DEBUG: Cek data dari AuthContext
    console.log('=== DEBUG AUTH CONTEXT ===');
    console.log('user dari AuthContext:', JSON.stringify(user, null, 2));
    console.log('userId:', userId);
    console.log('==========================');

    // Ambil data user lengkap dari API
    const fetchUserData = async () => {
        if (!userId) {
            console.log('❌ userId tidak ditemukan, skip fetchUserData');
            setLoadingUser(false);
            return;
        }

        try {
            console.log('🔄 Mengambil data user dari API untuk userId:', userId);
            const token = await AsyncStorage.getItem('userToken');
            console.log('Token tersedia:', !!token);

            const response = await api.get(`/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log('✅ Response user data:', JSON.stringify(response.data, null, 2));

            if (response.data) {
                setUserData(response.data);
                console.log('✅ UserData berhasil diset:', response.data);
            } else if (user) {
                console.log('⚠️ Fallback ke data dari AuthContext');
                setUserData({
                    id: user.id,
                    name: user.name || 'Pengguna',
                    email: user.email || '-',
                    phone: user.phone || '-',
                    role: user.role || 'mitra',
                    profile_pic: user.profile_pic || null
                });
            }
        } catch (error: any) {
            console.error('❌ Error fetching user data:', error.message);
            console.error('Response error:', error.response?.data);
            // Fallback ke data dari AuthContext
            if (user) {
                console.log('⚠️ Fallback ke data dari AuthContext karena error');
                setUserData({
                    id: user.id,
                    name: user.name || 'Pengguna',
                    email: user.email || '-',
                    phone: user.phone || '-',
                    role: user.role || 'mitra',
                    profile_pic: user.profile_pic || null
                });
            }
        } finally {
            setLoadingUser(false);
        }
    };

    // Cek status registrasi mitra
    const checkMitraStatus = async () => {
        if (!userId) {
            console.log('❌ userId tidak ditemukan, skip checkMitraStatus');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log('🔄 Mengecek status mitra untuk userId:', userId);
            const response = await api.get(`/mitra/status/${userId}`);

            console.log('✅ Mitra status response:', JSON.stringify(response.data, null, 2));

            if (response.data.success && response.data.data) {
                setMitraStatus(response.data.data);

                // Ambil specialization dari response
                if (response.data.data.specialization) {
                    const spec = response.data.data.specialization;
                    console.log('Raw specialization:', spec);
                    if (Array.isArray(spec)) {
                        setSpecializations(spec);
                        console.log('Specialization sebagai array:', spec);
                    } else if (typeof spec === 'string') {
                        try {
                            const parsed = JSON.parse(spec);
                            if (Array.isArray(parsed)) {
                                setSpecializations(parsed);
                                console.log('Specialization parsed dari JSON:', parsed);
                            } else {
                                setSpecializations([spec]);
                                console.log('Specialization sebagai string biasa:', [spec]);
                            }
                        } catch (e) {
                            setSpecializations([spec]);
                            console.log('Specialization (gagal parse):', [spec]);
                        }
                    }
                }
            } else if (response.data.is_registered !== undefined) {
                setMitraStatus(response.data);
                if (response.data.specialization) {
                    setSpecializations(response.data.specialization);
                    console.log('Specialization dari response langsung:', response.data.specialization);
                }
            }
        } catch (error: any) {
            console.error('❌ Error checking mitra status:', error.message);
            console.error('Response error:', error.response?.data);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Gagal memeriksa status pendaftaran',
                visibilityTime: 3000,
            });
        } finally {
            setLoading(false);
        }
    };

    // Redirect ke tabs jika sudah terverifikasi
    useEffect(() => {
        if (mitraStatus?.is_verified === true && !isRedirecting) {
            setIsRedirecting(true);
            Toast.show({
                type: 'success',
                text1: 'Akun Terverifikasi!',
                text2: 'Selamat, akun mitra Anda sudah aktif',
                visibilityTime: 2000,
            });
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 1500);
        }
    }, [mitraStatus?.is_verified]);

    useEffect(() => {
        console.log('=== COMPONENT MOUNTED ===');
        // Ambil data user dan status mitra
        const loadData = async () => {
            await fetchUserData();
            await checkMitraStatus();
        };

        loadData();

        // Set interval untuk mengecek status setiap 30 detik
        const interval = setInterval(() => {
            if (mitraStatus?.is_verified !== true) {
                checkMitraStatus();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // DEBUG: Cek state setelah update
    useEffect(() => {
        console.log('=== STATE UPDATE ===');
        console.log('userData:', userData);
        console.log('mitraStatus:', mitraStatus);
        console.log('specializations:', specializations);
        console.log('==================');
    }, [userData, mitraStatus, specializations]);

    if (loading || loadingUser) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FF0000" />
                <Text className="mt-4 text-gray-500">Memuat data...</Text>
            </View>
        );
    }

    // Jika sudah terverifikasi, tampilkan loading sambil redirect
    if (mitraStatus?.is_verified === true || isRedirecting) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FF0000" />
                <Text className="mt-4 text-gray-500">Mengalihkan ke halaman utama...</Text>
            </View>
        );
    }

    const displayName = userData?.name || user?.name || 'Pengguna';
    const displayEmail = userData?.email || user?.email || '-';
    const displayPhone = userData?.phone || user?.phone || '-';

    console.log('=== RENDER DATA ===');
    console.log('displayName:', displayName);
    console.log('displayEmail:', displayEmail);
    console.log('displayPhone:', displayPhone);
    console.log('specializations:', specializations);
    console.log('==================');

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="p-1">
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-800">Status Pendaftaran</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}>
                <View className="items-center mt-10 mb-8">
                    <View className="w-24 h-24 bg-yellow-100 rounded-full items-center justify-center mb-4">
                        <Ionicons name="time-outline" size={50} color="#EAB308" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
                        Pendaftaran Sedang Ditinjau
                    </Text>
                    <Text className="text-gray-500 text-center mb-6">
                        Terima kasih telah mendaftar sebagai mitra terapis
                    </Text>
                </View>

                <View className="bg-yellow-50 rounded-xl p-5 mb-6 border border-yellow-200">
                    <View className="flex-row items-center mb-3 gap-2">
                        <Ionicons name="information-circle-outline" size={24} color="#EAB308" />
                        <Text className="text-yellow-800 font-bold text-base">Status Verifikasi</Text>
                    </View>
                    <Text className="text-gray-700 mb-2">
                        Data pendaftaran Anda sedang dalam proses verifikasi oleh tim admin.
                    </Text>
                    <Text className="text-gray-700">
                        Proses verifikasi biasanya memakan waktu 1x24 jam.
                    </Text>
                </View>

                <View className="bg-gray-50 rounded-xl p-5 mb-6">
                    <Text className="font-bold text-gray-800 mb-3">Informasi Pendaftaran:</Text>
                    <View className="gap-3">
                        <View className="flex-row">
                            <Text className="text-gray-500 w-32">Status:</Text>
                            <View className="bg-yellow-100 px-3 py-1 rounded-full">
                                <Text className="text-yellow-700 text-xs font-bold">Menunggu Verifikasi</Text>
                            </View>
                        </View>
                        <View className="flex-row">
                            <Text className="text-gray-500 w-32">Nama:</Text>
                            <Text className="text-gray-700 flex-1">{displayName}</Text>
                        </View>
                        <View className="flex-row">
                            <Text className="text-gray-500 w-32">Email:</Text>
                            <Text className="text-gray-700 flex-1">{displayEmail}</Text>
                        </View>
                        <View className="flex-row">
                            <Text className="text-gray-500 w-32">Telepon:</Text>
                            <Text className="text-gray-700 flex-1">{displayPhone}</Text>
                        </View>
                        <View className="flex-row">
                            <Text className="text-gray-500 w-32">Spesialisasi:</Text>
                            <Text className="text-gray-700 flex-1">
                                {specializations.length > 0 ? specializations.join(', ') : '-'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="bg-blue-50 rounded-xl p-5">
                    <View className="flex-row items-center mb-3 gap-2">
                        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#3B82F6" />
                        <Text className="text-blue-800 font-bold text-base">Ada Pertanyaan?</Text>
                    </View>
                    <Text className="text-gray-700 mb-4">
                        Jika ada pertanyaan seputar pendaftaran, silakan hubungi customer support kami.
                    </Text>
                    <TouchableOpacity
                        className="bg-blue-500 py-3 rounded-xl items-center"
                        onPress={() => {
                            const phoneNumber = '6281234567890';
                            router.push(`tel:${phoneNumber}`);
                        }}
                    >
                        <Text className="text-white font-bold">Hubungi Support</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className="mt-6 py-3 rounded-xl items-center border border-gray-300"
                    onPress={checkMitraStatus}
                >
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="refresh-outline" size={20} color="#666" />
                        <Text className="text-gray-600 font-medium">Refresh Status</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
            <Toast />
        </SafeAreaView>
    );
}