import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
    const [mitraStatus, setMitraStatus] = useState<any>(null);
    const [imageError, setImageError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Reset image error ketika profile_pic berubah
    useEffect(() => {
        console.log('🖼️ [PROFILE] profile_pic changed, resetting imageError');
        setImageError(false);
        setRetryCount(0);
    }, [user?.profile_pic]);

    // Fungsi untuk mengambil Inisial (Contoh: Budi Santoso -> BS)
    const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Fungsi untuk mendapatkan URL foto profil yang benar
    const getProfilePicUrl = (profilePic: string | null): string | null => {
        if (!profilePic) {
            console.log('🔧 [getProfilePicUrl] No profile picture');
            return null;
        }

        console.log('🔧 [getProfilePicUrl] Input profile_pic:', profilePic);
        console.log('🔧 [getProfilePicUrl] Type:', typeof profilePic);

        // Jika sudah URL lengkap
        if (profilePic.startsWith('http')) {
            console.log('✅ [getProfilePicUrl] Using full URL:', profilePic);
            return profilePic;
        }

        // Jika hanya nama file, buat URL lengkap
        const baseUrl = 'https://api.siappgo.id';
        const fullUrl = `${baseUrl}/uploads/profiles/${profilePic}`;
        console.log('✅ [getProfilePicUrl] Generated URL:', fullUrl);
        return fullUrl;
    };

    // Cek status mitra
    const checkMitraStatus = async () => {
        if (!user?.id) return;

        try {
            console.log('🔍 [PROFILE] Checking mitra status for user:', user.id);
            const response = await api.get(`/mitra/status/${user.id}`);
            console.log('📦 [PROFILE] Mitra status response:', response.data);

            if (response.data.success && response.data.data) {
                setMitraStatus(response.data.data);
            }
        } catch (error) {
            console.error('❌ [PROFILE] Error checking mitra status:', error);
        }
    };

    // Fungsi Mengambil Data User dari API
    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            console.log('🔄 [PROFILE] Fetching user profile...');

            if (!user?.id) {
                console.log('⚠️ [PROFILE] User ID not found');
                return;
            }

            console.log('📡 [PROFILE] API call: /users/${user.id}');
            const response = await api.get(`/users/${user.id}`);
            console.log('📦 [PROFILE] API response status:', response.status);
            console.log('📦 [PROFILE] API response data:', JSON.stringify(response.data, null, 2));

            // Handle berbagai format response
            let userData = response.data;
            if (response.data.success && response.data.data) {
                userData = response.data.data;
            }

            if (userData) {
                console.log('✅ [PROFILE] User data received:', {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    profile_pic: userData.profile_pic,
                    role: userData.role
                });

                // Update data di context
                updateUser(userData);
            }

            // Cek status mitra juga
            await checkMitraStatus();

        } catch (error: any) {
            console.error("❌ [PROFILE] Error fetching user data:", error);

            if (error.response?.status === 401) {
                // Token expired, logout
                Alert.alert("Sesi Berakhir", "Silakan login kembali", [
                    { text: "OK", onPress: () => logout() }
                ]);
            } else if (error.response?.status === 404) {
                console.log('⚠️ [PROFILE] User not found at endpoint');
            } else {
                Alert.alert("Error", "Gagal mengambil data profil");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Refresh data saat screen focus
    useFocusEffect(
        useCallback(() => {
            console.log('🔄 [PROFILE] Screen focused, refreshing...');
            fetchUserProfile();
        }, [user?.id])
    );

    // Refresh data
    const onRefresh = useCallback(() => {
        console.log('🔄 [PROFILE] Manual refresh');
        setRefreshing(true);
        fetchUserProfile();
    }, []);

    const handleLogout = async () => {
        console.log('🔚 [PROFILE] Logout initiated');
        const logoutProcess = async () => {
            try {
                await logout();
                console.log('✅ [PROFILE] Logout successful');
            } catch (e) {
                console.error('❌ [PROFILE] Logout error:', e);
                if (Platform.OS === 'web') {
                    alert("Gagal Logout");
                } else {
                    Alert.alert("Error", "Gagal Logout");
                }
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

    // Retry load image
    const retryLoadImage = () => {
        console.log('🔄 [PROFILE] Retrying image load, attempt:', retryCount + 1);
        setRetryCount(prev => prev + 1);
        setImageError(false);
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

    const profilePicUrl = getProfilePicUrl(user.profile_pic);
    const isMitra = user.role === 'mitra';
    const isMitraVerified = mitraStatus?.is_verified === true;
    const isMitraPending = mitraStatus?.is_registered === true && mitraStatus?.is_verified === false;

    console.log('🎨 [PROFILE] Rendering with:', {
        hasUser: !!user,
        profilePicUrl,
        imageError,
        isMitra,
        isMitraVerified,
        isMitraPending
    });

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF0000" />}
        >
            {/* Header Profile */}
            <View className="bg-white px-6 pb-8 pt-12 items-center shadow-sm">
                <View className="relative">
                    <View className="w-24 h-24 rounded-full bg-red-50 overflow-hidden border-2 border-red-500 items-center justify-center">
                        {profilePicUrl && !imageError ? (
                            <Image
                                source={{ uri: profilePicUrl }}
                                className="w-full h-full"
                                onError={(e) => {
                                    console.log('❌ [PROFILE] Image load error:', {
                                        uri: profilePicUrl,
                                        error: e.nativeEvent.error
                                    });
                                    setImageError(true);
                                }}
                                onLoad={() => {
                                    console.log('✅ [PROFILE] Image loaded successfully:', profilePicUrl);
                                    setImageError(false);
                                }}
                                onLoadStart={() => console.log('🖼️ [PROFILE] Image loading started:', profilePicUrl)}
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
                    <Text className="text-red-600 text-xs font-bold">
                        {user?.phone || 'No Phone'}
                    </Text>
                </View>

                {/* Badge Role & Status */}
                {isMitra && (
                    <View className={`px-3 py-1 rounded-full mt-2 ${isMitraVerified ? 'bg-green-100' : isMitraPending ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                        <Text className={`text-xs font-bold ${isMitraVerified ? 'text-green-600' : isMitraPending ? 'text-yellow-600' : 'text-blue-600'}`}>
                            {isMitraVerified ? '✓ Mitra Terverifikasi' : isMitraPending ? '⏳ Menunggu Verifikasi' : 'Akun Mitra'}
                        </Text>
                    </View>
                )}

                {/* Tampilkan URL gambar untuk debugging (hanya development) */}
                {__DEV__ && profilePicUrl && (
                    <Text className="text-gray-400 text-[8px] mt-2 text-center" numberOfLines={2}>
                        URL: {profilePicUrl}
                    </Text>
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

                    {/* Menu Edit Profil Terapis - Hanya untuk mitra */}
                    {isMitra && (
                        <MenuButton
                            icon="medkit-outline"
                            label="Edit Profil Terapis"
                            onPress={() => router.push('/edit-terapis')}
                            showBadge={isMitraPending}
                            badgeText="Menunggu Verifikasi"
                            iconColor="#FF0000"
                        />
                    )}

                    <MenuButton
                        icon="lock-closed-outline"
                        label="Ubah Password"
                        onPress={() => router.push('/change-password')}
                    />

                    <MenuButton
                        icon="time-outline"
                        label="Riwayat Transaksi"
                        onPress={() => router.push('/(tabs)/orders')}
                    />
                </View>

                <Text className="text-gray-400 font-bold mt-8 mb-3 ml-2 text-xs uppercase tracking-widest">Layanan</Text>
                <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <MenuButton
                        icon="help-circle-outline"
                        label="Pusat Bantuan"
                        onPress={() => {
                            Alert.alert("Info", "Fitur akan segera hadir");
                        }}
                    />

                    <MenuButton
                        icon="star-outline"
                        label="Beri Rating Aplikasi"
                        onPress={() => {
                            Alert.alert("Info", "Fitur akan segera hadir");
                        }}
                    />
                </View>

                <Text className="text-gray-400 font-bold mt-8 mb-3 ml-2 text-xs uppercase tracking-widest">Lainnya</Text>
                <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
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

            <Text className="text-center text-gray-300 my-10 text-xs tracking-widest">Version 1.0.2</Text>
        </ScrollView>
    );
};

interface MenuButtonProps {
    icon: string;
    label: string;
    onPress: () => void;
    showBadge?: boolean;
    badgeText?: string;
    iconColor?: string;
}

const MenuButton = ({ icon, label, onPress, showBadge, badgeText, iconColor = '#4b5563' }: MenuButtonProps) => (
    <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center p-4 border-b border-gray-50 active:bg-gray-50"
    >
        <View className="bg-gray-50 p-2 rounded-lg">
            <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text className="flex-1 ml-4 text-gray-700 font-medium">{label}</Text>
        {showBadge && badgeText && (
            <View className="bg-yellow-100 px-2 py-1 rounded-full mr-2">
                <Text className="text-yellow-700 text-xs font-medium">{badgeText}</Text>
            </View>
        )}
        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
);

export default ProfileScreen;