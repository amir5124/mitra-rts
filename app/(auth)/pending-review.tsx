import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
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

// Data profil mitra yang disimpan saat registrasi
interface MitraProfileData {
    user_id: string | number;
    specialization: string[];
    address: string;
    address_latitude: number | null;
    address_longitude: number | null;
    service_radius_km: number;
    working_days: string[];
    working_start: string;
    working_end: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
    certificate_uri: string;
    registered_at: string;
}

// Label hari Indonesia
const DAY_LABELS: Record<string, string> = {
    senin: 'Senin',
    selasa: 'Selasa',
    rabu: 'Rabu',
    kamis: 'Kamis',
    jumat: 'Jumat',
    sabtu: 'Sabtu',
    minggu: 'Minggu',
};

export default function PendingReviewScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [mitraStatus, setMitraStatus] = useState<MitraStatus | null>(null);
    const [specializations, setSpecializations] = useState<string[]>([]);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // ✅ State untuk data mitra dari AsyncStorage
    const [mitraProfileData, setMitraProfileData] = useState<MitraProfileData | null>(null);

    const userId = user?.id;

    const handleLogout = async () => {
        const logoutProcess = async () => {
            try {
                await logout();
                Toast.show({
                    type: 'success',
                    text1: 'Berhasil Logout',
                    text2: 'Anda telah keluar dari aplikasi',
                    visibilityTime: 2000,
                });
                setTimeout(() => {
                    router.replace('/(auth)/login');
                }, 1500);
            } catch (e) {
                if (Platform.OS === 'web') {
                    alert("Gagal Logout");
                } else {
                    Alert.alert("Error", "Gagal Logout");
                }
                console.error('Logout error:', e);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Apakah Anda yakin ingin keluar?")) {
                await logoutProcess();
            }
        } else {
            Alert.alert("Logout", "Yakin ingin keluar?", [
                { text: "Batal", style: "cancel" },
                { text: "Keluar", style: "destructive", onPress: logoutProcess }
            ]);
        }
    };

    // ✅ Ambil data mitra dari AsyncStorage (hasil registrasi)
    const loadMitraProfileFromStorage = async () => {
        try {
            const stored = await AsyncStorage.getItem('mitraProfileData');
            if (stored) {
                const parsed: MitraProfileData = JSON.parse(stored);
                setMitraProfileData(parsed);
                console.log('✅ Mitra profile loaded from AsyncStorage:', parsed);

                // Gunakan specialization dari storage sebagai fallback awal
                if (parsed.specialization && parsed.specialization.length > 0) {
                    setSpecializations(parsed.specialization);
                }
            }
        } catch (error) {
            console.error('Error loading mitra profile from AsyncStorage:', error);
        }
    };

    // Ambil data user lengkap dari API
    const fetchUserData = async () => {
        if (!userId) {
            setLoadingUser(false);
            return;
        }

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await api.get(`/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data) {
                setUserData(response.data);
            } else if (user) {
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
            console.error('Error fetching user data:', error.message);
            if (user) {
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
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await api.get(`/mitra/status/${userId}`);

            if (response.data.success && response.data.data) {
                setMitraStatus(response.data.data);

                // Ambil specialization dari API response (lebih fresh, override storage)
                if (response.data.data.specialization) {
                    const spec = response.data.data.specialization;
                    if (Array.isArray(spec)) {
                        setSpecializations(spec);
                    } else if (typeof spec === 'string') {
                        try {
                            const parsed = JSON.parse(spec);
                            setSpecializations(Array.isArray(parsed) ? parsed : [spec]);
                        } catch (e) {
                            setSpecializations([spec]);
                        }
                    }
                }
            } else if (response.data.is_registered !== undefined) {
                setMitraStatus(response.data);
                if (response.data.specialization) {
                    setSpecializations(response.data.specialization);
                }
            }
        } catch (error: any) {
            console.error('Error checking mitra status:', error.message);
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

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            await loadMitraProfileFromStorage(); // ✅ Load dari storage dulu (cepat, offline)
            await fetchUserData();
            await checkMitraStatus();
        };

        loadData();
    }, []);

    if (loading || loadingUser) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FF0000" />
                <Text className="mt-4 text-gray-500">Memuat data...</Text>
            </View>
        );
    }

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

    // ✅ Prioritas: API > AsyncStorage untuk setiap field
    const displaySpecializations = specializations.length > 0
        ? specializations
        : (mitraProfileData?.specialization ?? []);

    const displayAddress = mitraProfileData?.address || '-';

    const displayWorkingDays = (mitraProfileData?.working_days ?? [])
        .map(d => DAY_LABELS[d] ?? d)
        .join(', ') || '-';

    const displayWorkingHours =
        mitraProfileData?.working_start && mitraProfileData?.working_end
            ? `${mitraProfileData.working_start} – ${mitraProfileData.working_end}`
            : '-';

    const displayRadius = mitraProfileData?.service_radius_km
        ? `${mitraProfileData.service_radius_km} km`
        : '-';

    const displayBankName = mitraProfileData?.bank_name || '-';
    const displayBankAccount = mitraProfileData?.bank_account_number || '-';
    const displayBankAccountName = mitraProfileData?.bank_account_name || '-';

    const displayRegisteredAt = mitraProfileData?.registered_at
        ? new Date(mitraProfileData.registered_at).toLocaleString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        : '-';

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="p-1">
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-800">Status Pendaftaran</Text>
                <TouchableOpacity onPress={handleLogout} className="p-1">
                    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}>
                {/* Hero Section */}
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

                {/* Status Banner */}
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
                    {mitraProfileData?.registered_at && (
                        <Text className="text-gray-400 text-xs mt-3">
                            Didaftarkan pada: {displayRegisteredAt}
                        </Text>
                    )}
                </View>

                {/* ✅ Informasi Akun */}
                <View className="bg-gray-50 rounded-xl p-5 mb-4">
                    <Text className="font-bold text-gray-800 mb-3">Informasi Akun</Text>
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
                    </View>
                </View>

                {/* ✅ Informasi Profesional dari form */}


                {/* Kontak Support */}
                <View className="bg-blue-50 rounded-xl p-5">
                    <View className="flex-row items-center mb-3 gap-2">
                        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#3B82F6" />
                        <Text className="text-blue-800 font-bold text-base">Ada Pertanyaan?</Text>
                    </View>
                    <Text className="text-gray-700 mb-4">
                        Jika ada pertanyaan seputar pendaftaran, silakan hubungi customer support kami.
                    </Text>
                    <TouchableOpacity
                        className="bg-[#ff0000] py-3 rounded-xl items-center"
                        onPress={() => {
                            const phoneNumber = '6282323907426';
                            router.push(`tel:${phoneNumber}`);
                        }}
                    >
                        <Text className="text-white font-bold">Hubungi Support</Text>
                    </TouchableOpacity>
                </View>

                {/* Refresh Manual */}
                <TouchableOpacity
                    className="mt-6 py-3 rounded-xl items-center border border-gray-300 bg-white"
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