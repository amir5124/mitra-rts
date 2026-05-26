import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/utils/api';
import { registerDeviceTokenToBackend } from '../../src/utils/notificationHelper';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ email: '', password: '' });

    const isFormValid = form.email.trim().length > 0 && form.password.trim().length > 0;

    const handleLogin = async () => {
        if (!isFormValid) return;
        setLoading(true);

        try {
            console.log("Mencoba Login ke:", api.defaults.baseURL + '/auth/login');

            const response = await api.post('/auth/login', {
                email: form.email,
                password: form.password,
            });

            console.log("Response API:", response.data);

            if (response.data.status === true) {
                const token = response.data.token;
                const user = response.data.user;

                if (!token || !user) {
                    throw new Error("Token atau data user tidak ditemukan dalam respons API");
                }

                // Gunakan fungsi login dari AuthContext
                await login(token, user);

                // 🔥 REGISTRASI FCM TOKEN KE BACKEND SETELAH LOGIN BERHASIL
                console.log('📱 Registering device token to backend...');
                const registerResult = await registerDeviceTokenToBackend(
                    String(user.id),
                    token
                );

                if (registerResult.success) {
                    console.log('✅ Device token registered to backend');
                    Toast.show({
                        type: 'success',
                        text1: 'Notifikasi Aktif',
                        text2: 'Perangkat Anda siap menerima notifikasi',
                        visibilityTime: 2000,
                    });
                } else {
                    console.log('⚠️ Device token registration failed:', registerResult.message);
                    if (registerResult.status === 502) {
                        Toast.show({
                            type: 'info',
                            text1: 'Info',
                            text2: 'Backend notifikasi sedang dalam persiapan',
                            visibilityTime: 2000,
                        });
                    }
                }

                Toast.show({
                    type: 'success',
                    text1: 'Login Berhasil',
                    text2: `Selamat datang, ${user.name}!`,
                });

                router.replace('/(tabs)');
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Login Gagal',
                    text2: response.data.message || 'Email atau password salah',
                });
            }
        } catch (error: any) {
            console.error("LOGIN_ERROR_DETAIL:", error);
            console.error("ERROR_RESPONSE_DATA:", error.response?.data);

            let errorMessage = 'Gagal terhubung ke server';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message === 'Network Error') {
                errorMessage = 'Periksa koneksi internet Anda';
            }

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60, paddingTop: 60 }}
                className="bg-white flex-1 px-6"
            >
                <View className="items-center mt-24">
                    <View className="w-24 h-24  rounded-full items-center justify-center">
                        <Image
                            source={{
                                uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1777178620/rts_d3xz4p.webp',
                            }}
                            className="w-24 h-24"
                            resizeMode="contain"
                        />
                    </View>
                    <Text className="text-2xl font-bold text-gray-800 mt-5">Mitra RTS</Text>
                    <Text className="text-gray-500 text-sm mt-1">Aplikasi Terapis RTS</Text>
                </View>

                <View className="mt-10">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Email</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50 mb-4">
                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-gray-800"
                            placeholder="Masukkan email"
                            placeholderTextColor="#A0A0A0"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={form.email}
                            onChangeText={(v) => setForm({ ...form, email: v.toLowerCase().trim() })}
                        />
                    </View>

                    <Text className="text-sm font-semibold text-gray-700 mb-2">Kata Sandi</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50">
                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-gray-800"
                            placeholder="Masukkan kata sandi"
                            placeholderTextColor="#A0A0A0"
                            secureTextEntry={!showPassword}
                            value={form.password}
                            onChangeText={(v) => setForm({ ...form, password: v })}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={22} color="#888" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleLogin}
                        disabled={!isFormValid || loading}
                        style={[
                            styles.loginButton,
                            { backgroundColor: !isFormValid ? '#D1D5DB' : '#EF4444' }
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white text-base font-bold">Masuk Sekarang</Text>
                        )}
                    </TouchableOpacity>

                    <View className="flex-row justify-center mt-6">
                        <Text className="text-gray-500 text-sm">Belum punya akun? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text className="text-red-500 text-sm font-bold">Daftar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
            <Toast />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    loginButton: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    }
});