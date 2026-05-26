import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/utils/api';

interface Service {
    id: number;
    service_name: string;
    description: string;
    service_image: string | null;
    created_at: string;
}

interface MitraProfile {
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
    is_verified: boolean;
    is_online: boolean;
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

const TIME_OPTIONS = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00',
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
    '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

// Modal Pilih Spesialisasi (Multi-select dari database)
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
                                className={`py-3 px-4 border-b border-gray-100 flex-row items-center justify-between ${selectedValues.includes(service.service_name) ? 'bg-red-50' : ''
                                    }`}
                                onPress={() => onSelect(service.service_name)}
                            >
                                <View className="flex-1">
                                    <Text className={`text-base ${selectedValues.includes(service.service_name) ? 'text-red-500 font-bold' : 'text-gray-600'
                                        }`}>
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

// Modal Pilih Waktu
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

export default function EditMitraProfileScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data dari API
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [mitraProfile, setMitraProfile] = useState<MitraProfile | null>(null);

    // Form state
    const [specializations, setSpecializations] = useState<string[]>([]);
    const [address, setAddress] = useState('');
    const [serviceRadius, setServiceRadius] = useState('10');
    const [workingDays, setWorkingDays] = useState<string[]>([]);
    const [workingStart, setWorkingStart] = useState('09:00');
    const [workingEnd, setWorkingEnd] = useState('17:00');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');

    // Modal states
    const [showSpecializationPicker, setShowSpecializationPicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    // Fetch services from database
    const fetchServices = async () => {
        try {
            setLoadingServices(true);
            const response = await api.get('/services');

            if (response.data.success === true && Array.isArray(response.data.data)) {
                setServices(response.data.data);
            } else if (response.data.status === true && response.data.data) {
                setServices(response.data.data);
            } else if (Array.isArray(response.data)) {
                setServices(response.data);
            }
        } catch (error: any) {
            console.error('Error fetching services:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Gagal memuat data spesialisasi'
            });
        } finally {
            setLoadingServices(false);
        }
    };

    // Fetch mitra profile data
    const fetchMitraProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mitra/profile/${user?.id}`);

            console.log('Mitra profile response:', response.data);

            if (response.data.success) {
                const data = response.data.data;
                setMitraProfile(data);

                // Set form values
                setSpecializations(data.specialization || []);
                setAddress(data.address || '');
                setServiceRadius(data.service_radius_km?.toString() || '10');
                setWorkingDays(data.working_days || []);
                setWorkingStart(data.working_start || '09:00');
                setWorkingEnd(data.working_end || '17:00');
                setBankName(data.bank_name || '');
                setBankAccountNumber(data.bank_account_number || '');
                setBankAccountName(data.bank_account_name || '');
            }
        } catch (error: any) {
            console.error('Error fetching mitra profile:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Gagal memuat data profil terapis'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
        fetchMitraProfile();
    }, []);

    const toggleSpecialization = (serviceName: string) => {
        if (specializations.includes(serviceName)) {
            setSpecializations(specializations.filter(s => s !== serviceName));
        } else {
            setSpecializations([...specializations, serviceName]);
        }
    };

    const toggleWorkingDay = (day: string) => {
        if (workingDays.includes(day)) {
            setWorkingDays(workingDays.filter(d => d !== day));
        } else {
            setWorkingDays([...workingDays, day]);
        }
    };

    const handleSave = async () => {
        // Validasi
        if (specializations.length === 0) {
            Toast.show({ type: 'error', text1: 'Validasi', text2: 'Pilih minimal satu spesialisasi' });
            return;
        }
        if (!address.trim()) {
            Toast.show({ type: 'error', text1: 'Validasi', text2: 'Alamat praktik wajib diisi' });
            return;
        }
        if (workingDays.length === 0) {
            Toast.show({ type: 'error', text1: 'Validasi', text2: 'Pilih minimal satu hari kerja' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                specialization: specializations,
                address: address,
                service_radius_km: parseInt(serviceRadius),
                working_days: workingDays,
                working_start: workingStart,
                working_end: workingEnd,
                bank_name: bankName,
                bank_account_number: bankAccountNumber,
                bank_account_name: bankAccountName
            };

            const response = await api.put(`/mitra/profile/${user?.id}`, payload);

            if (response.data.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Berhasil',
                    text2: 'Profil terapis berhasil diperbarui'
                });
                setTimeout(() => router.back(), 1500);
            }
        } catch (error: any) {
            console.error('Error saving mitra profile:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Gagal menyimpan perubahan'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#FF0000" />
                <Text className="mt-4 text-gray-500">Memuat data profil terapis...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="p-1">
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-800">Edit Profil Terapis</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Status Verifikasi */}
                <View className={`rounded-xl p-4 mb-6 flex-row items-center ${mitraProfile?.is_verified ? 'bg-green-50' : 'bg-yellow-50'
                    }`}>
                    <Ionicons
                        name={mitraProfile?.is_verified ? "checkmark-circle" : "time-outline"}
                        size={24}
                        color={mitraProfile?.is_verified ? "#22C55E" : "#EAB308"}
                    />
                    <Text className={`flex-1 text-sm ml-3 ${mitraProfile?.is_verified ? 'text-green-700' : 'text-yellow-700'
                        }`}>
                        {mitraProfile?.is_verified
                            ? '✓ Akun Anda sudah terverifikasi'
                            : '⏳ Akun Anda menunggu verifikasi admin'}
                    </Text>
                </View>

                {/* Spesialisasi - dari database */}
                <Text className="text-gray-800 font-bold text-base mb-3">
                    Spesialisasi * <Text className="text-xs text-gray-400">(bisa pilih lebih dari satu)</Text>
                </Text>
                <TouchableOpacity
                    onPress={() => setShowSpecializationPicker(true)}
                    className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50 mb-4"
                >
                    <Ionicons name="medkit-outline" size={20} color="#9CA3AF" />
                    <Text className="flex-1 ml-2 text-sm text-gray-800">
                        {specializations.length > 0 ? specializations.join(', ') : 'Pilih Spesialisasi'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {specializations.length > 0 && (
                    <View className="flex-row flex-wrap mb-4">
                        {specializations.map((spec, index) => (
                            <View key={index} className="bg-red-100 px-3 py-1 rounded-full mr-2 mb-2 flex-row items-center">
                                <Text className="text-red-600 text-xs">{spec}</Text>
                                <TouchableOpacity onPress={() => toggleSpecialization(spec)} className="ml-2">
                                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Alamat Praktik */}
                <Text className="text-gray-800 font-bold text-base mb-3 mt-2">Alamat Praktik *</Text>
                <TextInput
                    className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50"
                    placeholder="Masukkan alamat lengkap praktik Anda"
                    multiline
                    numberOfLines={3}
                    value={address}
                    onChangeText={setAddress}
                />

                {/* Radius Layanan */}
                <Text className="text-gray-800 font-bold text-base mb-3">Radius Layanan (km)</Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 mb-4">
                    <TextInput
                        className="flex-1 p-4"
                        placeholder="10"
                        keyboardType="numeric"
                        value={serviceRadius}
                        onChangeText={setServiceRadius}
                    />
                    <Text className="text-gray-400 mr-4">km</Text>
                </View>

                {/* Hari Kerja */}
                <Text className="text-gray-800 font-bold text-base mb-3">
                    Hari Kerja * <Text className="text-xs text-gray-400">(bisa pilih lebih dari satu)</Text>
                </Text>
                <View className="flex-row flex-wrap mb-4">
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day.id}
                            onPress={() => toggleWorkingDay(day.id)}
                            className={`mr-2 mb-2 px-4 py-2 rounded-full border ${workingDays.includes(day.id)
                                    ? 'bg-[#FF0000] border-[#FF0000]'
                                    : 'bg-white border-gray-300'
                                }`}
                        >
                            <Text className={`text-sm ${workingDays.includes(day.id) ? 'text-white' : 'text-gray-700'}`}>
                                {day.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Jam Kerja */}
                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1">
                        <Text className="text-gray-800 font-bold text-base mb-3">Jam Mulai</Text>
                        <TouchableOpacity
                            className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50"
                            onPress={() => setShowStartTimePicker(true)}
                        >
                            <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                            <Text className="flex-1 ml-2 text-sm text-gray-800">{workingStart}</Text>
                            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                        <Text className="text-gray-800 font-bold text-base mb-3">Jam Selesai</Text>
                        <TouchableOpacity
                            className="h-14 border border-gray-200 rounded-xl flex-row items-center px-4 bg-gray-50"
                            onPress={() => setShowEndTimePicker(true)}
                        >
                            <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                            <Text className="flex-1 ml-2 text-sm text-gray-800">{workingEnd}</Text>
                            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Informasi Bank */}
                <Text className="text-gray-800 font-bold text-base mb-4 mt-2">Informasi Bank</Text>

                <Text className="text-gray-600 text-sm mb-2">Nama Bank</Text>
                <TextInput
                    className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50"
                    placeholder="Contoh: Bank BRI, Bank BCA, dll"
                    value={bankName}
                    onChangeText={setBankName}
                />

                <Text className="text-gray-600 text-sm mb-2">Nomor Rekening</Text>
                <TextInput
                    className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50"
                    placeholder="Masukkan nomor rekening"
                    keyboardType="numeric"
                    value={bankAccountNumber}
                    onChangeText={setBankAccountNumber}
                />

                <Text className="text-gray-600 text-sm mb-2">Nama Pemilik Rekening</Text>
                <TextInput
                    className="border border-gray-200 rounded-xl p-4 mb-6 bg-gray-50"
                    placeholder="Sesuai dengan nama rekening bank"
                    value={bankAccountName}
                    onChangeText={setBankAccountName}
                />

                {/* Tombol Simpan */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className={`py-4 rounded-xl items-center mt-4 ${saving ? 'bg-gray-400' : 'bg-[#FF0000]'
                        }`}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Simpan Perubahan</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Modal Pilih Spesialisasi */}
            <SpecializationPickerModal
                visible={showSpecializationPicker}
                onClose={() => setShowSpecializationPicker(false)}
                onSelect={toggleSpecialization}
                selectedValues={specializations}
                services={services}
                loading={loadingServices}
            />

            {/* Modal Pilih Waktu */}
            <TimePickerModal
                visible={showStartTimePicker}
                onClose={() => setShowStartTimePicker(false)}
                onSelect={(time: string) => setWorkingStart(time)}
                currentValue={workingStart}
                title="Pilih Jam Mulai"
            />
            <TimePickerModal
                visible={showEndTimePicker}
                onClose={() => setShowEndTimePicker(false)}
                onSelect={(time: string) => setWorkingEnd(time)}
                currentValue={workingEnd}
                title="Pilih Jam Selesai"
            />

            <Toast />
        </SafeAreaView>
    );
}