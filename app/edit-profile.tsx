import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EditProfile = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const BASE_URL = 'https://api.siappgo.id/api/v1';

  // States Data
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);

  // States Modal (Custom Alert)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'success' as 'success' | 'error',
    onClose: () => {},
  });

  // Fungsi memanggil Modal
  const showAlert = (title: string, message: string, type: 'success' | 'error', onClose?: () => void) => {
    setModalConfig({
      title,
      message,
      type,
      onClose: onClose || (() => setModalVisible(false)),
    });
    setModalVisible(true);
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      
      const response = await axios.get(`${BASE_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { name, email, phone, profile_pic } = response.data;
      setName(name || '');
      setEmail(email || '');
      setPhone(phone || '');
      setExistingPhoto(profile_pic);
    } catch (error: any) {
      showAlert("Error", "Gagal memuat data user", "error");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);

      if (image) {
        const uriParts = image.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        // Fix untuk Web & Mobile
        const fileToUpload = Platform.OS === 'web' 
          ? await (await fetch(image)).blob() 
          : {
              uri: image,
              name: `photo.${fileType}`,
              type: `image/${fileType}`,
            };
            
        formData.append('profile_pic', fileToUpload as any);
      }

      await axios.put(`${BASE_URL}/users/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      showAlert("Sukses", "Profil berhasil diperbarui", "success", () => {
  setModalVisible(false);
  // Ganti router.back() dengan ini:
  router.replace('/(tabs)/profile'); 
});

    } catch (error: any) {
      const msg = error.response?.data?.message || "Gagal memperbarui profil";
      showAlert("Error", msg, "error");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-white"
    >
      {/* HEADER */}
      <View 
        style={{ paddingTop: insets.top + 10 }} 
        className="flex-row items-center px-6 pb-4 border-b border-gray-50 bg-white"
      >
        <TouchableOpacity onPress={() => router.back()} className="pr-4">
          <Ionicons name="arrow-back" size={24} color="#1e1b4b" />
        </TouchableOpacity>
        <Text className="text-[#1e1b4b] text-lg font-bold">Edit Profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
        {/* FOTO SECTION */}
        <View className="items-center py-8">
          <TouchableOpacity onPress={pickImage} className="relative">
            <View className="w-28 h-28 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden items-center justify-center">
              {image ? (
                <Image source={{ uri: image }} className="w-full h-full" />
              ) : existingPhoto ? (
                <Image source={{ uri: `https://api.siappgo.id/uploads/${existingPhoto}` }} className="w-full h-full" />
              ) : (
                <Ionicons name="person" size={50} color="#d1d5db" />
              )}
            </View>
            <View className="absolute bottom-0 right-0 bg-[#FF0000] p-2 rounded-full border-2 border-white shadow-sm">
              <Ionicons name="camera" size={18} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-gray-400 text-xs mt-3 font-medium">Ketuk untuk ubah foto</Text>
        </View>

        {/* INPUTS */}
        <View className="space-y-4">
          <InputGroup label="Nama Lengkap" value={name} onChange={setName} placeholder="Nama Anda" icon="person-outline" />
          <InputGroup label="Email" value={email} onChange={setEmail} placeholder="email@anda.com" icon="mail-outline" keyboard="email-address" />
          <InputGroup label="Nomor Telepon" value={phone} onChange={setPhone} placeholder="0812..." icon="call-outline" keyboard="phone-pad" />
        </View>

        <TouchableOpacity 
          onPress={handleUpdate}
          disabled={updating}
          className={`mt-10 py-4 rounded-2xl items-center shadow-lg ${updating ? 'bg-gray-400' : 'bg-[#FF0000]'}`}
        >
          {updating ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Simpan Perubahan</Text>}
        </TouchableOpacity>
        
        <View className="h-10" />
      </ScrollView>

      {/* CUSTOM ALERT MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-2xl">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${modalConfig.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
              <Ionicons 
                name={modalConfig.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
                size={40} 
                color={modalConfig.type === 'success' ? '#22c55e' : '#ef4444'} 
              />
            </View>
            <Text className="text-xl font-bold text-gray-800 mb-2">{modalConfig.title}</Text>
            <Text className="text-gray-500 text-center mb-6">{modalConfig.message}</Text>
            <TouchableOpacity 
              onPress={modalConfig.onClose}
              className={`w-full py-4 rounded-xl ${modalConfig.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
            >
              <Text className="text-white text-center font-bold">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// Sub-komponen Input agar kode lebih bersih
const InputGroup = ({ label, value, onChange, placeholder, icon, keyboard }: any) => (
  <View className="mb-4">
    <Text className="text-gray-500 text-xs font-bold mb-2 uppercase tracking-widest">{label}</Text>
    <View className="flex-row items-center bg-gray-50 rounded-xl px-4 border border-gray-100">
      <Ionicons name={icon} size={20} color="#9ca3af" />
      <TextInput
        className="flex-1 p-4 text-[#1e1b4b]"
        placeholder={placeholder}
        keyboardType={keyboard || 'default'}
        value={value}
        onChangeText={onChange}
      />
    </View>
  </View>
);

export default EditProfile;