import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../src/utils/api'; // Pastikan path api.ts benar

const ChangePasswordScreen = () => {
  const router = useRouter();
  
  // State Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // State UI
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async () => {
    // 1. Validasi Input Sederhana
    if (!oldPassword || !newPassword || !confirmPassword) {
      const msg = "Semua field harus diisi";
      Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = "Konfirmasi password baru tidak cocok";
      Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
      return;
    }

    if (newPassword.length < 6) {
      const msg = "Password baru minimal 6 karakter";
      Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
      return;
    }

    setLoading(true);

    try {
      // 2. Ambil ID dari storage (karena route Anda butuh /:id)
      const userId = await AsyncStorage.getItem('userId');
      
      // 3. Panggil API: PUT /api/v1/users/:id/change-password
      const response = await api.put(`/users/${userId}/change-password`, {
        oldPassword,
        newPassword
      });

      const successMsg = response.data.message || "Password berhasil diperbarui";
      
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert("Berhasil", successMsg);
      }

      // Kembali ke profil setelah sukses
      router.back();

    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Terjadi kesalahan pada server";
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert("Gagal", errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 pt-10">
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-800 mb-2">Ubah Password</Text>
        <Text className="text-gray-500 mb-8">
          Pastikan password baru Anda kuat dan sulit ditebak.
        </Text>

        {/* Form */}
        <View className="space-y-4">
          
          {/* Password Lama */}
          <View>
            <Text className="text-gray-700 font-medium mb-2 ml-1">Password Lama</Text>
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 h-14 border border-gray-200">
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Masukkan password saat ini"
                secureTextEntry={!showOld}
                value={oldPassword}
                onChangeText={setOldPassword}
              />
              <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                <Ionicons name={showOld ? "eye-off-outline" : "eye-outline"} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Baru */}
          <View className="mt-4">
            <Text className="text-gray-700 font-medium mb-2 ml-1">Password Baru</Text>
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 h-14 border border-gray-200">
              <Ionicons name="key-outline" size={20} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Minimal 6 karakter"
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Konfirmasi Password Baru */}
          <View className="mt-4">
            <Text className="text-gray-700 font-medium mb-2 ml-1">Konfirmasi Password Baru</Text>
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 h-14 border border-gray-200">
              <Ionicons name="checkmark-circle-outline" size={20} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Ulangi password baru"
                secureTextEntry={!showNew}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>
        </View>

        {/* Tombol Simpan */}
        <TouchableOpacity
          onPress={handleChangePassword}
          disabled={loading}
          className={`mt-10 h-14 rounded-2xl flex-row justify-center items-center shadow-lg ${
            loading ? 'bg-red-300' : 'bg-red-500'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-2">Simpan Perubahan</Text>
            </>
          )}
        </TouchableOpacity>

      
      </View>
    </ScrollView>
  );
};

export default ChangePasswordScreen;