import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/utils/api';

const ProfileScreen = () => {
    const router = useRouter();
    const { user, logout, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Fungsi untuk mengambil Inisial (Contoh: Budi Santoso -> BS)
    const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Fungsi Mengambil Data User dari API
    const fetchUserProfile = async () => {
        try {
            setLoading(true);

            if (!user?.id) {
                console.log('User ID tidak ditemukan');
                return;
            }

            console.log('Fetch Profile - userId:', user.id);

            // Panggil API untuk mendapatkan data terbaru
            const response = await api.get(`/users/${user.id}`);
            console.log('Response API:', response.data);

            if (response.data) {
                // Update data di context
                updateUser(response.data);
            }
        } catch (error: any) {
            console.error("Gagal ambil data user:", error);

            if (error.response?.status === 401) {
                // Token expired, logout
                Alert.alert("Sesi Berakhir", "Silakan login kembali", [
                    { text: "OK", onPress: () => logout() }
                ]);
            } else if (error.response?.status === 404) {
                console.log('User tidak ditemukan di endpoint');
            } else {
                Alert.alert("Error", "Gagal mengambil data profil");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Refresh data
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchUserProfile();
    }, []);

    const handleLogout = async () => {
        const logoutProcess = async () => {
            try {
                await logout(); // Proses hapus token / session kamu


            } catch (e) {
                if (Platform.OS === 'web') {
                    alert("Gagal Logout");
                } else {
                    Alert.alert("Error", "Gagal Logout");
                }
                console.error('Logout error:', e);
            }
        };

        // Pengecekan platform untuk memunculkan konfirmasi dialog
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

    // Tampilkan loading jika user belum tersedia
    if (!user) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FF0000" />
                <Text className="mt-4 text-gray-500">Memuat data profil...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF0000" />}
        >
            {/* Header Profile */}
            <View className="bg-white px-6 pb-8 pt-12 items-center shadow-sm">
                <View className="relative">
                    <View className="w-24 h-24 rounded-full bg-red-50 overflow-hidden border-2 border-red-500 items-center justify-center">
                        {user?.profile_pic ? (
                            <Image
                                source={{ uri: `https://api.siappgo.id/uploads/${user.profile_pic}` }}
                                className="w-full h-full"
                            />
                        ) : (
                            <Text className="text-red-500 text-3xl font-bold">
                                {getInitials(user?.name || 'User')}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/edit-profile')}
                        className="absolute bottom-0 right-0 bg-red-500 p-2 rounded-full border-2 border-white shadow-sm"
                    >
                        <Ionicons name="camera" size={16} color="white" />
                    </TouchableOpacity>
                </View>

                <Text className="text-xl font-bold text-gray-800 mt-4">
                    {user?.name || 'User'}
                </Text>
                <Text className="text-gray-400 text-sm font-medium">
                    {user?.email || '-'}
                </Text>

                <View className="bg-red-100 px-3 py-1 rounded-full mt-2">
                    <Text className="text-red-600 text-xs font-bold capitalize">
                        {user?.phone || 'Member'}
                    </Text>
                </View>

                {/* Badge Role */}
                {user?.role === 'mitra' && (
                    <View className="bg-blue-100 px-3 py-1 rounded-full mt-2">
                        <Text className="text-blue-600 text-xs font-bold">Akun Mitra</Text>
                    </View>
                )}
            </View>

            {/* Menu List */}
            <View className="mt-6 px-4">
                <Text className="text-gray-400 font-bold mb-3 ml-2 text-xs uppercase tracking-widest">Pengaturan Akun</Text>

                <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <MenuButton
                        icon="person-outline"
                        label="Edit Profil"
                        onPress={() => router.push('/edit-profile')}
                    />
                    <MenuButton
                        icon="lock-closed-outline"
                        label="Ubah Password"
                        onPress={() => router.push('/change-password')}
                    />

                    <MenuButton
                        icon="time-outline"
                        label="Riwayat Transaksi"
                        onPress={() => router.push('/(tabs)/history')}
                    />
                </View>

                <Text className="text-gray-400 font-bold mt-8 mb-3 ml-2 text-xs uppercase tracking-widest">Lainnya</Text>
                <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <MenuButton
                        icon="help-circle-outline"
                        label="Pusat Bantuan"
                        onPress={() => {
                            Alert.alert("Info", "Fitur akan segera hadir");
                        }}
                    />

                    <TouchableOpacity
                        onPress={handleLogout}
                        className="flex-row items-center p-4 active:bg-red-50"
                    >
                        <View className="bg-red-50 p-2 rounded-lg">
                            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        </View>
                        <Text className="flex-1 ml-4 text-red-500 font-semibold">Keluar Aplikasi</Text>
                        <Ionicons name="chevron-forward" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>



            <Text className="text-center text-gray-300 my-10 text-xs tracking-widest">Version 1.0.2 - SiappGo</Text>
        </ScrollView>
    );
};

const MenuButton = ({ icon, label, onPress }: any) => (
    <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center p-4 border-b border-gray-50 active:bg-gray-50"
    >
        <View className="bg-gray-50 p-2 rounded-lg">
            <Ionicons name={icon} size={20} color="#4b5563" />
        </View>
        <Text className="flex-1 ml-4 text-gray-700 font-medium">{label}</Text>
        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
);

export default ProfileScreen;