import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../src/utils/api';
import { registerDeviceTokenToBackend } from '../../src/utils/notificationHelper';

export default function RegisterScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'mitra',
    });

    const showAlert = (title: string, message: string, onConfirm?: () => void) => {
        if (Platform.OS === 'web') {
            alert(`${title}\n\n${message}`);
            if (onConfirm) onConfirm();
        } else {
            Alert.alert(title, message, [
                { text: 'OK', onPress: onConfirm },
            ]);
        }
    };

    const isFormValid =
        form.name.trim().length > 0 &&
        form.email.trim().includes('@') &&
        form.phone.length >= 10 &&
        form.password.length >= 6 &&
        form.password === confirmPassword;

    const handleRegister = async () => {
        if (!isFormValid) return;
        setLoading(true);

        try {
            const response = await api.post('/auth/register', {
                name: form.name,
                email: form.email,
                phone: form.phone,
                password: form.password,
                role: 'mitra',
            });

            console.log('Register response:', response.data);

            if (response.data.status) {
                const { token, user } = response.data;

                if (token && user) {
                    await AsyncStorage.setItem('userToken', token);
                    await AsyncStorage.setItem('userId', String(user.id));
                    await AsyncStorage.setItem('userData', JSON.stringify(user));
                    await AsyncStorage.setItem('userRole', user.role || 'mitra');

                    console.log('✅ Data saved to AsyncStorage');

                    // 🔥 REGISTRASI FCM TOKEN KE BACKEND SETELAH REGISTER BERHASIL
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
                    }
                }

                const userData = {
                    id: response.data.user?.id,
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                };

                showAlert(
                    'Registrasi Berhasil',
                    'Silakan lengkapi data profil mitra Anda',
                    () => router.push({
                        pathname: '/(auth)/register-mitra',
                        params: userData
                    })
                );
            } else {
                showAlert('Registrasi Gagal', response.data.message);
            }
        } catch (error: any) {
            console.error('Register error:', error);
            const errorMessage = error.response?.data?.message || 'Terjadi kesalahan pada server';
            showAlert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <View className="flex-row items-center justify-between px-5 pt-12 pb-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-800">Daftar Terapis</Text>
                <View className="w-6" />
            </View>

            <ScrollView
                className="px-5"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="mt-4">
                    <Text className="text-base font-bold text-gray-800 mb-2">Nama Lengkap</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50">
                        <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Masukkan nama lengkap"
                            placeholderTextColor="#A0A0A0"
                            autoCapitalize="words"
                            value={form.name}
                            onChangeText={(v) => setForm({ ...form, name: v })}
                        />
                    </View>

                    <Text className="text-base font-bold text-gray-800 mt-4 mb-2">Nomor Telepon</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50">
                        <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Contoh: 081234567890"
                            placeholderTextColor="#A0A0A0"
                            keyboardType="phone-pad"
                            value={form.phone}
                            onChangeText={(v) => setForm({ ...form, phone: v })}
                        />
                    </View>

                    <Text className="text-base font-bold text-gray-800 mt-4 mb-2">Email</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50">
                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Masukkan email"
                            placeholderTextColor="#A0A0A0"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={form.email}
                            onChangeText={(v) => setForm({ ...form, email: v.toLowerCase().trim() })}
                        />
                    </View>

                    <Text className="text-base font-bold text-gray-800 mt-4 mb-2">Kata Sandi</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50">
                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Minimal 6 karakter"
                            placeholderTextColor="#A0A0A0"
                            secureTextEntry={!showPassword}
                            value={form.password}
                            onChangeText={(v) => setForm({ ...form, password: v })}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={22} color="#888" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-base font-bold text-gray-800 mt-4 mb-2">Konfirmasi Kata Sandi</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50">
                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Konfirmasi kata sandi"
                            placeholderTextColor="#A0A0A0"
                            secureTextEntry={!showConfirmPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                            <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={22} color="#888" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={handleRegister}
                        disabled={!isFormValid || loading}
                        style={{
                            backgroundColor: isFormValid ? '#FF0000' : '#E5E7EB',
                            paddingVertical: 20,
                            borderRadius: 12,
                            alignItems: 'center',
                            marginTop: 30,
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
                                Daftar Mitra
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View className="mt-8 items-center px-2">
                        <Text className="text-center text-xs text-gray-400 leading-5">
                            Dengan klik <Text className="font-bold text-gray-800">Daftar</Text>, saya menyetujui{' '}
                            <Text className="text-red-500 underline">Syarat & Ketentuan</Text> dan{' '}
                            <Text className="text-red-500 underline">Kebijakan Privasi</Text> RTS.
                        </Text>
                    </View>
                </View>
            </ScrollView>
            <Toast />
        </KeyboardAvoidingView>
    );
}