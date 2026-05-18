import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/utils/api';

// Google Places API Key
const GOOGLE_PLACES_API_KEY = 'AIzaSyCxfdljVSgNFeQKfEzNzeUJUuJVxSxntVQ';

interface FormData {
    specialization: string[];
    certificate_url: string;
    certificate_uri: string;
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
}

interface Service {
    id: number;
    service_name: string;
    description: string;
    service_image: string | null;
    created_at: string;
}

interface MitraStatus {
    is_registered: boolean;
    is_verified: boolean;
    is_online: boolean;
    specialization?: string[];
    message?: string;
}

const DAYS = [
    { id: 'senin', label: 'Senin' },
    { id: 'selasa', label: 'Selasa' },
    { id: 'rabu', label: 'Rabu' },
    { id: 'kamis', label: 'Kamis' },
    { id: 'jumat', label: 'Jumat' },
    { id: 'sabtu', label: 'Sabtu' },
    { id: 'minggu', label: 'Minggu' },
];

// Generate time options for dropdown
const TIME_OPTIONS = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
];

// Time Picker Modal Component
const TimePickerModal = ({ visible, onClose, onSelect, currentValue, title }: any) => (
    <Modal visible={visible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white rounded-2xl w-4/5 max-h-[70%] p-5">
                <Text className="text-lg font-bold text-center mb-4 text-gray-800">{title}</Text>
                <ScrollView className="max-h-80">
                    {TIME_OPTIONS.map((time) => (
                        <TouchableOpacity
                            key={time}
                            className={`py-3 px-4 border-b border-gray-100 ${currentValue === time ? 'bg-red-50' : ''}`}
                            onPress={() => {
                                onSelect(time);
                                onClose();
                            }}
                        >
                            <Text className={`text-center text-base ${currentValue === time ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                                {time}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity className="mt-4 py-3 bg-gray-100 rounded-lg" onPress={onClose}>
                    <Text className="text-center text-sm text-gray-500">Tutup</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

// Specialization Picker Modal Component (Multi-select)
const SpecializationPickerModal = ({ visible, onClose, onSelect, selectedValues, services, loading }: any) => (
    <Modal visible={visible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white rounded-2xl w-4/5 max-h-[70%] p-5">
                <Text className="text-lg font-bold text-center mb-4 text-gray-800">Pilih Spesialisasi</Text>
                <Text className="text-xs text-center text-gray-500 mb-4">(Pilih lebih dari satu)</Text>

                {loading ? (
                    <View className="py-10 items-center">
                        <ActivityIndicator size="large" color="#FF0000" />
                        <Text className="mt-4 text-gray-500">Memuat spesialisasi...</Text>
                    </View>
                ) : (
                    <ScrollView className="max-h-80">
                        {services.map((service: Service) => (
                            <TouchableOpacity
                                key={service.id}
                                className={`py-3 px-4 border-b border-gray-100 flex-row items-center justify-between ${selectedValues.includes(service.service_name) ? 'bg-red-50' : ''}`}
                                onPress={() => onSelect(service.service_name)}
                            >
                                <View className="flex-1">
                                    <Text className={`text-base ${selectedValues.includes(service.service_name) ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                                        {service.service_name}
                                    </Text>
                                    {service.description && (
                                        <Text className="text-xs text-gray-400 mt-1" numberOfLines={2}>
                                            {service.description}
                                        </Text>
                                    )}
                                </View>
                                {selectedValues.includes(service.service_name) && (
                                    <Ionicons name="checkmark-circle" size={24} color="#EF4444" />
                                )}
                            </TouchableOpacity>
                        ))}

                        {services.length === 0 && (
                            <View className="py-8 items-center gap-3">
                                <Ionicons name="sad-outline" size={48} color="#9CA3AF" />
                                <Text className="text-sm text-gray-400 text-center">
                                    Belum ada data spesialisasi
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                )}

                <View className="flex-row gap-3 mt-4">
                    <TouchableOpacity className="flex-1 py-3 bg-gray-100 rounded-lg" onPress={onClose}>
                        <Text className="text-center text-sm text-gray-500">Tutup</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 py-3 bg-red-500 rounded-lg" onPress={onClose}>
                        <Text className="text-center text-sm text-white font-bold">Simpan</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

export default function RegisterMitraScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadingCertificate, setUploadingCertificate] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [showSpecializationPicker, setShowSpecializationPicker] = useState(false);

    // State untuk services/spesialisasi
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [servicesError, setServicesError] = useState<string | null>(null);

    // State untuk status mitra
    const [mitraStatus, setMitraStatus] = useState<MitraStatus | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Google Places refs
    const autocompleteService = useRef<any>(null);
    const placesService = useRef<any>(null);

    // Ambil user_id dari AuthContext atau params
    const userId = user?.id || params.id;
    const userName = user?.name || params.name || 'Pengguna';

    const [form, setForm] = useState<FormData>({
        specialization: [],
        certificate_url: '',
        certificate_uri: '',
        address: '',
        address_latitude: null,
        address_longitude: null,
        service_radius_km: 10,
        working_days: [],
        working_start: '09:00',
        working_end: '17:00',
        bank_name: '',
        bank_account_number: '',
        bank_account_name: '',
    });

    // Redirect ke halaman pending review jika sudah terdaftar dan belum diverifikasi
    useEffect(() => {
        if (mitraStatus?.is_registered === true && mitraStatus?.is_verified === false && !isRedirecting) {
            setIsRedirecting(true);
            router.replace('/(auth)/pending-review');
        }
    }, [mitraStatus]);

    // Redirect ke home jika sudah terverifikasi
    useEffect(() => {
        if (mitraStatus?.is_registered === true && mitraStatus?.is_verified === true && !isRedirecting) {
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
    }, [mitraStatus]);

    // Cek status registrasi mitra
    const checkMitraStatus = async () => {
        if (!userId) return;

        try {
            setCheckingStatus(true);
            const response = await api.get(`/mitra/status/${userId}`);

            console.log('Mitra status:', response.data);

            if (response.data.success && response.data.data) {
                setMitraStatus(response.data.data);
            } else if (response.data.is_registered !== undefined) {
                setMitraStatus(response.data);
            } else {
                setMitraStatus({ is_registered: false, is_verified: false, is_online: false });
            }
        } catch (error: any) {
            console.error('Error checking mitra status:', error);
            if (error.response?.status === 404) {
                setMitraStatus({ is_registered: false, is_verified: false, is_online: false });
            } else {
                setMitraStatus({ is_registered: false, is_verified: false, is_online: false });
            }
        } finally {
            setCheckingStatus(false);
        }
    };

    // Inisialisasi Google Places SDK untuk Web
    useEffect(() => {
        if (Platform.OS === 'web') {
            const loadGoogleScript = () => {
                const google = (window as any).google;
                if (!google) {
                    const script = document.createElement('script');
                    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&libraries=places`;
                    script.async = true;
                    script.onload = () => initServices();
                    document.head.appendChild(script);
                } else {
                    initServices();
                }
            };

            const initServices = () => {
                const google = (window as any).google;
                if (google) {
                    autocompleteService.current = new google.maps.places.AutocompleteService();
                    placesService.current = new google.maps.places.PlacesService(document.createElement('div'));
                    console.log('Google Places services initialized');
                }
            };
            loadGoogleScript();
        }
    }, []);

    // Fungsi untuk mengambil data services dari database
    const fetchServices = async () => {
        try {
            setLoadingServices(true);
            setServicesError(null);

            const response = await api.get('/services');

            console.log('Services response:', response.data);

            if (response.data.success === true && Array.isArray(response.data.data)) {
                setServices(response.data.data);
                console.log('Services loaded:', response.data.data.length);
            } else if (response.data.status === true && response.data.data) {
                setServices(response.data.data);
            } else if (Array.isArray(response.data)) {
                setServices(response.data);
            } else {
                setServicesError('Format data tidak sesuai');
                console.error('Unexpected response format:', response.data);
            }
        } catch (error: any) {
            console.error('Error fetching services:', error);

            if (error.code === 'ECONNABORTED') {
                setServicesError('Koneksi timeout. Periksa koneksi internet Anda.');
            } else if (error.message === 'Network Error') {
                setServicesError('Tidak dapat terhubung ke server. Periksa koneksi internet.');
            } else {
                setServicesError('Terjadi kesalahan saat memuat data layanan');
            }
        } finally {
            setLoadingServices(false);
        }
    };

    // Handle multi-select specialization
    const toggleSpecialization = (serviceName: string) => {
        if (form.specialization.includes(serviceName)) {
            setForm({
                ...form,
                specialization: form.specialization.filter(s => s !== serviceName)
            });
        } else {
            setForm({
                ...form,
                specialization: [...form.specialization, serviceName]
            });
        }
    };

    // Fungsi pencarian alamat dengan Google Places
    const searchAddress = async (text: string) => {
        setSearchQuery(text);

        if (text.length < 3) {
            setAddressSuggestions([]);
            return;
        }

        setSearchingAddress(true);

        try {
            if (Platform.OS === 'web' && autocompleteService.current) {
                autocompleteService.current.getPlacePredictions(
                    {
                        input: text,
                        componentRestrictions: { country: 'id' },
                        language: 'id',
                    },
                    (results: any, status: string) => {
                        setSearchingAddress(false);
                        if (status === 'OK' && results) {
                            setAddressSuggestions(results);
                        } else {
                            setAddressSuggestions([]);
                        }
                    }
                );
            } else {
                const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_PLACES_API_KEY}&components=country:id&language=id`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.status === 'OK') {
                    setAddressSuggestions(data.predictions);
                } else {
                    setAddressSuggestions([]);
                }
                setSearchingAddress(false);
            }
        } catch (error) {
            console.error('Error searching address:', error);
            setAddressSuggestions([]);
            setSearchingAddress(false);
        }
    };

    // Fungsi memilih alamat
    const selectAddress = async (placeId: string, description: string) => {
        setSearchingAddress(true);

        try {
            if (Platform.OS === 'web' && placesService.current) {
                placesService.current.getDetails(
                    { placeId: placeId, fields: ['formatted_address', 'geometry'] },
                    (result: any, status: string) => {
                        setSearchingAddress(false);
                        if (status === 'OK' && result) {
                            const address = result.formatted_address;
                            const latitude = result.geometry?.location?.lat();
                            const longitude = result.geometry?.location?.lng();

                            setForm({
                                ...form,
                                address: address,
                                address_latitude: latitude || null,
                                address_longitude: longitude || null,
                            });

                            setAddressSuggestions([]);
                            setSearchQuery('');
                            setShowAddressPicker(false);

                            Toast.show({
                                type: 'success',
                                text1: 'Alamat Dipilih',
                                text2: address.substring(0, 50) + '...',
                                visibilityTime: 2000,
                            });
                        } else {
                            Toast.show({
                                type: 'error',
                                text1: 'Error',
                                text2: 'Gagal mendapatkan detail alamat',
                                visibilityTime: 2000,
                            });
                        }
                    }
                );
            } else {
                const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry&key=${GOOGLE_PLACES_API_KEY}&language=id`;
                const response = await fetch(url);
                const data = await response.json();

                setSearchingAddress(false);

                if (data.status === 'OK' && data.result) {
                    const address = data.result.formatted_address;
                    const latitude = data.result.geometry?.location?.lat;
                    const longitude = data.result.geometry?.location?.lng;

                    setForm({
                        ...form,
                        address: address,
                        address_latitude: latitude || null,
                        address_longitude: longitude || null,
                    });

                    setAddressSuggestions([]);
                    setSearchQuery('');
                    setShowAddressPicker(false);

                    Toast.show({
                        type: 'success',
                        text1: 'Alamat Dipilih',
                        text2: address.substring(0, 50) + '...',
                        visibilityTime: 2000,
                    });
                } else {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Gagal memilih alamat',
                        visibilityTime: 2000,
                    });
                }
            }
        } catch (error) {
            console.error('Error getting place details:', error);
            setSearchingAddress(false);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Gagal memilih alamat',
                visibilityTime: 2000,
            });
        }
    };

    useEffect(() => {
        checkMitraStatus();
        fetchServices();

        (async () => {
            if (Platform.OS !== 'web') {
                const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
                const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (cameraStatus !== 'granted') {
                    console.log('Camera permission not granted');
                }
                if (mediaStatus !== 'granted') {
                    console.log('Media library permission not granted');
                }
            }
        })();
    }, []);

    const isFormValid = () => {
        return (
            form.specialization.length > 0 &&
            form.address.trim().length > 0 &&
            form.working_days.length > 0 &&
            form.working_start.length > 0 &&
            form.working_end.length > 0 &&
            form.bank_name.length > 0 &&
            form.bank_account_number.length > 0 &&
            form.bank_account_name.length > 0
        );
    };

    // Upload sertifikat ke server
    const uploadCertificate = async (base64Image: string): Promise<string> => {
        try {
            const response = await api.post('/upload/certificate', {
                image: base64Image,
                user_id: userId,
            });

            if (response.data.success) {
                return response.data.url;
            }
            throw new Error('Upload failed');
        } catch (error) {
            console.error('Upload certificate error:', error);
            throw error;
        }
    };

    // Pilih gambar untuk web dan mobile
    const pickCertificateImage = async (useCamera: boolean) => {
        try {
            if (Platform.OS === 'web') {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const result = reader.result as string;
                            setForm({
                                ...form,
                                certificate_uri: result,
                                certificate_url: result.split(',')[1] || '',
                            });
                            Toast.show({
                                type: 'success',
                                text1: 'Sertifikat Dipilih',
                                text2: 'File siap diupload',
                                visibilityTime: 2000,
                            });
                        };
                        reader.readAsDataURL(file);
                    }
                };
                input.click();
            } else {
                let result;
                if (useCamera) {
                    result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        quality: 0.8,
                        base64: true,
                    });
                } else {
                    result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        quality: 0.8,
                        base64: true,
                    });
                }

                if (!result.canceled && result.assets[0]) {
                    const asset = result.assets[0];
                    setForm({
                        ...form,
                        certificate_uri: asset.uri,
                        certificate_url: asset.base64 || '',
                    });
                    Toast.show({
                        type: 'success',
                        text1: 'Sertifikat Dipilih',
                        text2: 'File siap diupload',
                        visibilityTime: 2000,
                    });
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Gagal memilih gambar',
                visibilityTime: 2000,
            });
        }
    };

    const showImagePickerOptions = () => {
        if (Platform.OS === 'web') {
            pickCertificateImage(false);
        } else {
            Alert.alert(
                'Upload Sertifikat',
                'Pilih sumber gambar',
                [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Ambil Foto', onPress: () => pickCertificateImage(true) },
                    { text: 'Pilih dari Galeri', onPress: () => pickCertificateImage(false) },
                ],
                { cancelable: true }
            );
        }
    };

    const toggleWorkingDay = (dayId: string) => {
        if (form.working_days.includes(dayId)) {
            setForm({
                ...form,
                working_days: form.working_days.filter(d => d !== dayId),
            });
        } else {
            setForm({
                ...form,
                working_days: [...form.working_days, dayId],
            });
        }
    };

    const handleRegisterMitra = async () => {
        if (!isFormValid()) {
            Toast.show({
                type: 'error',
                text1: 'Form Tidak Lengkap',
                text2: 'Harap isi semua field yang diperlukan',
                visibilityTime: 3000,
            });
            return;
        }

        if (!userId) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'User ID tidak ditemukan',
                visibilityTime: 3000,
            });
            return;
        }

        setLoading(true);
        setUploadingCertificate(true);

        try {
            let certificateUrl = '';

            if (form.certificate_url && form.certificate_url.length > 0) {
                certificateUrl = await uploadCertificate(form.certificate_url);
            }

            const response = await api.post('/mitra/register', {
                user_id: parseInt(userId as string),
                specialization: JSON.stringify(form.specialization),
                certificate_url: certificateUrl,
                address: form.address,
                address_latitude: form.address_latitude,
                address_longitude: form.address_longitude,
                service_radius_km: form.service_radius_km,
                working_days: JSON.stringify(form.working_days),
                working_start: form.working_start,
                working_end: form.working_end,
                bank_name: form.bank_name,
                bank_account_number: form.bank_account_number,
                bank_account_name: form.bank_account_name,
            });

            if (response.data.success) {
                // ✅ SIMPAN / UPDATE DATA USER KE ASYNCSTORAGE
                try {
                    const token = await AsyncStorage.getItem('userToken');
                    const userResponse = await api.get(`/users/${userId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (userResponse.data) {
                        await AsyncStorage.setItem('userData', JSON.stringify(userResponse.data));
                        await AsyncStorage.setItem('userId', String(userResponse.data.id));
                        await AsyncStorage.setItem('userRole', userResponse.data.role || 'mitra');
                        console.log('✅ User data saved to AsyncStorage:', userResponse.data);
                    }
                } catch (userError) {
                    console.error('Error saving user data:', userError);
                    // Fallback: simpan data minimal dari params
                    const minimalUserData = {
                        id: userId,
                        name: userName,
                        email: params.email || '',
                        phone: params.phone || '',
                        role: 'mitra',
                        profile_pic: null,
                        is_active: true
                    };
                    await AsyncStorage.setItem('userData', JSON.stringify(minimalUserData));
                    await AsyncStorage.setItem('userId', String(userId));
                    await AsyncStorage.setItem('userRole', 'mitra');
                    console.log('✅ Minimal user data saved to AsyncStorage');
                }

                Toast.show({
                    type: 'success',
                    text1: 'Pendaftaran Berhasil!',
                    text2: 'Data mitra telah disimpan dan sedang ditinjau',
                    visibilityTime: 3000,
                });

                // Redirect ke halaman pending review
                setTimeout(() => {
                    router.push('/(auth)/pending-review');
                }, 1500);
            } else {
                throw new Error(response.data.message || 'Pendaftaran gagal');
            }
        } catch (error: any) {
            console.error('Register mitra error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan';
            Toast.show({
                type: 'error',
                text1: 'Pendaftaran Gagal',
                text2: errorMessage,
                visibilityTime: 3000,
            });
        } finally {
            setLoading(false);
            setUploadingCertificate(false);
        }
    };

    // Tampilkan loading saat mengecek status
    if (checkingStatus) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FF0000" />
                <Text className="mt-4 text-gray-500">Memeriksa status pendaftaran...</Text>
            </View>
        );
    }

    // Jika sedang redirect, tampilkan loading
    if (isRedirecting) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FF0000" />
                <Text className="mt-4 text-gray-500">Mengalihkan...</Text>
            </View>
        );
    }

    // Tampilkan form pendaftaran jika belum terdaftar
    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
                    <TouchableOpacity onPress={() => router.back()} className="p-1">
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-800">Lengkapi Data Mitra</Text>
                    <View style={{ width: 32 }} />
                </View>

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-row items-center bg-green-50 p-3 rounded-xl mb-4 gap-2">
                        <Ionicons name="hand-left-outline" size={24} color="#166534" />
                        <Text className="flex-1 text-sm text-green-800">
                            Selamat datang, {userName}! Silakan lengkapi data profil mitra Anda.
                        </Text>
                    </View>

                    <Text className="text-lg font-bold text-gray-800 mb-4 mt-4">Informasi Profesional</Text>

                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Spesialisasi * <Text className="text-xs text-gray-400">(bisa pilih lebih dari satu)</Text>
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowSpecializationPicker(true)}
                        className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50 mb-4"
                    >
                        <Ionicons name="medkit-outline" size={20} color="#9CA3AF" />
                        <Text className="flex-1 ml-2 text-sm text-gray-800">
                            {form.specialization.length > 0
                                ? form.specialization.join(', ')
                                : 'Pilih Spesialisasi'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    {form.specialization.length > 0 && (
                        <View className="flex-row flex-wrap mb-4">
                            {form.specialization.map((spec, index) => (
                                <View key={index} className="bg-red-100 px-3 py-1 rounded-full mr-2 mb-2 flex-row items-center">
                                    <Text className="text-red-600 text-xs">{spec}</Text>
                                    <TouchableOpacity
                                        onPress={() => toggleSpecialization(spec)}
                                        className="ml-2"
                                    >
                                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    <Text className="text-sm font-semibold text-gray-700 mb-2">Upload Sertifikat (Opsional)</Text>
                    <View className="border border-gray-200 rounded-xl bg-gray-50 mb-4 overflow-hidden">
                        {form.certificate_uri ? (
                            <>
                                <Image source={{ uri: form.certificate_uri }} className="w-full h-48" style={{ resizeMode: 'cover' }} />
                                <TouchableOpacity className="flex-row items-center justify-center p-4 gap-2" onPress={showImagePickerOptions}>
                                    <Ionicons name="refresh-outline" size={20} color="#FF0000" />
                                    <Text className="text-red-500 text-sm font-medium">Ganti Sertifikat</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity className="flex-row items-center justify-center p-4 gap-2" onPress={showImagePickerOptions}>
                                <Ionicons name="cloud-upload-outline" size={24} color="#FF0000" />
                                <Text className="text-red-500 text-sm font-medium">Upload Sertifikat</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text className="text-lg font-bold text-gray-800 mb-4 mt-4">Alamat Praktik</Text>

                    <TouchableOpacity
                        onPress={() => setShowAddressPicker(true)}
                        className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50 mb-4"
                    >
                        <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                        <Text className="flex-1 ml-2 text-sm text-gray-800">
                            {form.address || 'Klik untuk cari alamat'}
                        </Text>
                        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <Text className="text-sm font-semibold text-gray-700 mb-2">Radius Layanan (km) *</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50 mb-4">
                        <Ionicons name="navigate-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Jarak maksimal layanan dalam km"
                            keyboardType="numeric"
                            value={String(form.service_radius_km)}
                            onChangeText={(v) => setForm({ ...form, service_radius_km: parseInt(v) || 0 })}
                        />
                        <Text className="text-gray-400 text-xs">km</Text>
                    </View>

                    <Text className="text-lg font-bold text-gray-800 mb-4 mt-4">Jam Kerja</Text>

                    <Text className="text-sm font-semibold text-gray-700 mb-2">Hari Kerja *</Text>
                    <View className="flex-row flex-wrap mb-4">
                        {DAYS.map((day) => (
                            <TouchableOpacity
                                key={day.id}
                                onPress={() => toggleWorkingDay(day.id)}
                                className={`flex-row items-center px-3 py-2 rounded-full m-1 gap-1.5 ${form.working_days.includes(day.id) ? 'bg-red-500' : 'bg-gray-200'}`}
                            >
                                <Ionicons
                                    name={form.working_days.includes(day.id) ? "checkbox" : "square-outline"}
                                    size={18}
                                    color={form.working_days.includes(day.id) ? "#FFFFFF" : "#4B5563"}
                                />
                                <Text className={`text-xs ${form.working_days.includes(day.id) ? 'text-white' : 'text-gray-600'}`}>
                                    {day.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View className="flex-row mb-4">
                        <View className="flex-1 mr-2">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Jam Mulai *</Text>
                            <TouchableOpacity
                                className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50"
                                onPress={() => setShowStartTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                                <Text className="flex-1 ml-2 text-sm text-gray-800">{form.working_start}</Text>
                                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <View className="flex-1 ml-2">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Jam Selesai *</Text>
                            <TouchableOpacity
                                className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50"
                                onPress={() => setShowEndTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                                <Text className="flex-1 ml-2 text-sm text-gray-800">{form.working_end}</Text>
                                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text className="text-lg font-bold text-gray-800 mb-4 mt-4">Informasi Bank</Text>

                    <Text className="text-sm font-semibold text-gray-700 mb-2">Nama Bank *</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50 mb-4">
                        <Ionicons name="business-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Contoh: Bank BRI"
                            value={form.bank_name}
                            onChangeText={(v) => setForm({ ...form, bank_name: v })}
                        />
                    </View>

                    <Text className="text-sm font-semibold text-gray-700 mb-2">Nomor Rekening *</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50 mb-4">
                        <Ionicons name="card-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Masukkan nomor rekening"
                            keyboardType="numeric"
                            value={form.bank_account_number}
                            onChangeText={(v) => setForm({ ...form, bank_account_number: v })}
                        />
                    </View>

                    <Text className="text-sm font-semibold text-gray-700 mb-2">Nama Pemilik Rekening *</Text>
                    <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50 mb-4">
                        <Ionicons name="person-circle-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Sesuai dengan nama rekening bank"
                            value={form.bank_account_name}
                            onChangeText={(v) => setForm({ ...form, bank_account_name: v })}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleRegisterMitra}
                        disabled={loading || !isFormValid()}
                        className={`py-4 rounded-xl items-center mb-10 mt-6 ${(isFormValid() && !loading) ? 'bg-red-500' : 'bg-gray-200'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text className="text-white text-base font-bold">Daftar Sebagai Mitra</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>

                {/* Modal Alamat Picker */}
                <Modal
                    visible={showAddressPicker}
                    animationType="slide"
                    presentationStyle="fullScreen"
                >
                    <SafeAreaView className="flex-1 bg-white">
                        <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
                            <TouchableOpacity onPress={() => setShowAddressPicker(false)} className="p-1">
                                <Ionicons name="arrow-back" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold text-gray-800">Cari Alamat</Text>
                            <View style={{ width: 32 }} />
                        </View>

                        <View className="px-4 pt-4">
                            <View className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50">
                                <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-2 text-sm text-gray-800"
                                    placeholder="Cari alamat praktik Anda..."
                                    placeholderTextColor="#9CA3AF"
                                    value={searchQuery}
                                    onChangeText={searchAddress}
                                    autoFocus
                                />
                                {searchingAddress && (
                                    <ActivityIndicator size="small" color="#9CA3AF" />
                                )}
                            </View>
                        </View>

                        <ScrollView>
                            {addressSuggestions.map((item) => (
                                <TouchableOpacity
                                    key={item.place_id}
                                    className="flex-row items-center px-4 py-3 border-b border-gray-200 bg-white gap-3"
                                    onPress={() => selectAddress(item.place_id, item.description)}
                                >
                                    <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                                    <Text className="flex-1 text-sm text-gray-700">{item.description}</Text>
                                </TouchableOpacity>
                            ))}
                            {searchQuery.length >= 3 && addressSuggestions.length === 0 && !searchingAddress && (
                                <View className="p-8 items-center gap-3">
                                    <Ionicons name="sad-outline" size={48} color="#9CA3AF" />
                                    <Text className="text-sm text-gray-400 text-center">Tidak ada hasil ditemukan</Text>
                                </View>
                            )}
                        </ScrollView>
                    </SafeAreaView>
                </Modal>

                {/* Specialization Picker Modal - Multi Select */}
                <SpecializationPickerModal
                    visible={showSpecializationPicker}
                    onClose={() => setShowSpecializationPicker(false)}
                    onSelect={toggleSpecialization}
                    selectedValues={form.specialization}
                    services={services}
                    loading={loadingServices}
                />

                {/* Time Picker Modals */}
                <TimePickerModal
                    visible={showStartTimePicker}
                    onClose={() => setShowStartTimePicker(false)}
                    onSelect={(time: string) => setForm({ ...form, working_start: time })}
                    currentValue={form.working_start}
                    title="Pilih Jam Mulai"
                />
                <TimePickerModal
                    visible={showEndTimePicker}
                    onClose={() => setShowEndTimePicker(false)}
                    onSelect={(time: string) => setForm({ ...form, working_end: time })}
                    currentValue={form.working_end}
                    title="Pilih Jam Selesai"
                />

                <Toast />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}