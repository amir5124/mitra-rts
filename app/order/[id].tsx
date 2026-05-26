import { AntDesign, Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Button from '../../components/Button';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/utils/api';

interface OrderDetail {
    id: number;
    order_code: string;
    status: string;
    total_amount: number;
    scheduled_at: string;
    note: string | null;
    customer: {
        id: number;
        name: string;
        phone: string;
        profile_pic: string | null;
    };
    service: {
        id: number;
        name: string;
        base_price: number;
        description: string;
    };
    location: {
        address: string;
        detail: string;
        latitude: number;
        longitude: number;
    };
    payment: {
        id: number;
        method: string;
        status: string;
        amount: number;
        va_number?: string | null;
        qris_url?: string | null;
    };
    created_at: string;
}

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        console.log(`📱 [ORDER_DETAIL] Screen mounted for order ID: ${id}`);

        return () => {
            console.log(`📱 [ORDER_DETAIL] Screen unmounted for order ID: ${id}`);
            isMountedRef.current = false;
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [id]);

    const fetchOrderDetail = async () => {
        const orderId = parseInt(id as string);
        if (isNaN(orderId) || orderId <= 0) {
            if (isMountedRef.current) setLoading(false);
            return;
        }

        try {
            console.log(`🔄 [ORDER_DETAIL] Fetching order detail for ID: ${orderId}`);
            const response = await api.get(`/orders/mitra/order/${orderId}`);

            if (!isMountedRef.current) return;

            if (response.data.success) {
                const orderData = response.data.data.order;
                setOrder(orderData);

                const orderStatus = orderData.status;
                const isOrderAccepted = orderStatus === 'pending' ||
                    orderStatus === 'otw' ||
                    orderStatus === 'ongoing' ||
                    orderStatus === 'completed';

                console.log(`📌 isAccepted: ${isOrderAccepted}, status: ${orderStatus}`);
                setIsAccepted(isOrderAccepted);
            }
        } catch (error: any) {
            console.error('Error fetching order:', error.message);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetail();
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [id]);

    // ========== ACTION HANDLERS ==========

    const handleAcceptOrder = async () => {
        if (isAccepted) {
            Alert.alert('Info', 'Pesanan sudah diterima sebelumnya.');
            return;
        }

        Alert.alert(
            'Terima Pesanan',
            'Setelah menerima, data pelanggan akan terbuka. Apakah Anda yakin?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Terima Pesanan',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const response = await api.post(`/orders/mitra/order/${id}/accept`);
                            if (response.data.success) {
                                setIsAccepted(true);
                                await fetchOrderDetail();
                                Alert.alert('Berhasil', 'Pesanan diterima.');
                            }
                        } catch (error: any) {
                            if (error.response?.data?.message?.includes('sudah diterima')) {
                                setIsAccepted(true);
                                await fetchOrderDetail();
                            } else {
                                Alert.alert('Error', error.response?.data?.message || 'Gagal menerima pesanan');
                            }
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleRejectOrder = async () => {
        Alert.alert(
            'Tolak Pesanan',
            'Apakah Anda yakin ingin menolak pesanan ini?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Tolak',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const response = await api.post(`/orders/mitra/order/${id}/reject`);
                            if (response.data.success) {
                                Alert.alert('Berhasil', 'Pesanan ditolak');
                                router.back();
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Gagal menolak pesanan');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // 🔥 TOMBOL OTW - Dalam Perjalanan ke Lokasi Customer
    const handleOtwOrder = async () => {
        Alert.alert(
            'Dalam Perjalanan',
            'Konfirmasi bahwa Anda sedang dalam perjalanan ke lokasi pelanggan?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Ya, Saya OTW',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const response = await api.post(`/orders/mitra/order/${id}/otw`);
                            console.log(`📦 OTW response:`, response.data);
                            if (response.data.success) {
                                await fetchOrderDetail();
                                Alert.alert('Berhasil', 'Status diperbarui: Dalam Perjalanan 🚗');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Gagal update status');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // 🔥 TOMBOL MULAI KERJA - Setelah sampai di lokasi
    const handleStartOrder = async () => {
        Alert.alert(
            'Mulai Pekerjaan',
            'Apakah Anda sudah sampai di lokasi dan siap memulai pekerjaan?',
            [
                { text: 'Belum', style: 'cancel' },
                {
                    text: 'Mulai Sekarang',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const response = await api.post(`/orders/mitra/order/${id}/start`);
                            if (response.data.success) {
                                await fetchOrderDetail();
                                Alert.alert('Berhasil', 'Pekerjaan dimulai! 💪');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Gagal memulai pekerjaan');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // 🔥 TOMBOL SELESAI - Setelah pekerjaan selesai
    const handleCompleteOrder = async () => {
        Alert.alert(
            'Selesaikan Pesanan',
            'Apakah pekerjaan sudah selesai 100%?',
            [
                { text: 'Belum', style: 'cancel' },
                {
                    text: 'Selesai',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const response = await api.post(`/orders/mitra/order/${id}/complete`);
                            if (response.data.success) {
                                await fetchOrderDetail();
                                Alert.alert('Berhasil', '🎉 Pesanan selesai! Terima kasih.');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Gagal menyelesaikan pesanan');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const openLocation = () => {
        if (order?.location.latitude && order?.location.longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${order.location.latitude},${order.location.longitude}`;
            Linking.openURL(url);
        }
    };

    const callCustomer = () => {
        if (order?.customer.phone) {
            Linking.openURL(`tel:${order.customer.phone}`);
        }
    };

    // ========== RENDER FUNCTIONS ==========

    const renderPendingOrder = () => {
        return (
            <View className="flex-1 bg-white">
                <View className="bg-orange-500 px-5 pt-12 pb-8">
                    <View className="items-center">
                        <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-3">
                            <AntDesign name="inbox" size={40} color="white" />
                        </View>
                        <Text className="text-white text-xl font-bold">Konfirmasi Pesanan</Text>
                        <Text className="text-white/80 text-center mt-1">
                            Anda memiliki pesanan baru. Silakan konfirmasi terlebih dahulu.
                        </Text>
                    </View>
                </View>

                <View className="p-5">
                    <View className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <Text className="text-gray-400 text-xs mb-1">KODE PESANAN</Text>
                        <Text className="font-mono text-lg font-bold text-gray-800">{order?.order_code}</Text>
                        <View className="h-px bg-gray-100 my-3" />
                        <Text className="text-gray-400 text-xs mb-1">LAYANAN</Text>
                        <Text className="text-gray-800 font-semibold text-base">{order?.service.name}</Text>
                        <View className="flex-row justify-between mt-3">
                            <View>
                                <Text className="text-gray-400 text-xs">TANGGAL</Text>
                                <Text className="text-gray-700 text-sm">
                                    {order?.scheduled_at && format(new Date(order.scheduled_at), "dd/MM/yyyy")}
                                </Text>
                            </View>
                            <View>
                                <Text className="text-gray-400 text-xs">JAM</Text>
                                <Text className="text-gray-700 text-sm">
                                    {order?.scheduled_at && format(new Date(order.scheduled_at), "HH:mm")} WIB
                                </Text>
                            </View>
                            <View>
                                <Text className="text-gray-400 text-xs">TOTAL</Text>
                                <Text className="text-red-500 font-bold">
                                    Rp {order?.total_amount?.toLocaleString('id-ID')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="px-5 mb-5">
                    <View className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="lock-closed" size={18} color="#D97706" />
                            <Text className="text-amber-700 font-semibold ml-2">Data Pelanggan Terkunci</Text>
                        </View>
                        <Text className="text-gray-600 text-sm">
                            Data lengkap pelanggan akan muncul setelah Anda menekan tombol "Terima Pesanan".
                        </Text>
                    </View>
                </View>

                <View className="px-5 pb-10 mt-auto">
                    <TouchableOpacity
                        className="bg-gray-200 py-4 rounded-xl mb-3"
                        onPress={handleRejectOrder}
                        disabled={actionLoading}
                    >
                        <Text className="text-gray-600 text-center font-semibold">Tolak Pesanan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="bg-green-500 py-4 rounded-xl shadow-lg"
                        onPress={handleAcceptOrder}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="white" /> : <Text className="text-white text-center font-bold text-lg">✓ Terima Pesanan</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderAcceptedOrder = () => {
        const currentStatus = order?.status || 'pending';

        return (
            <ScrollView className="flex-1 bg-gray-50">
                <View className="bg-green-500 px-5 pt-10 pb-5">
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-white text-xs opacity-80">KODE PESANAN</Text>
                            <Text className="text-white font-bold text-lg">{order?.order_code}</Text>
                        </View>
                        <View className="bg-white/20 px-3 py-1 rounded-full">
                            <Text className="text-white text-xs font-semibold">
                                {currentStatus === 'otw' ? '🚗 Dalam Perjalanan' :
                                    currentStatus === 'ongoing' ? '🔧 Sedang Bekerja' :
                                        currentStatus === 'completed' ? '✅ Selesai' : '✓ Pesanan Aktif'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Informasi Pelanggan */}
                <View className="bg-white px-5 py-4 mt-3 shadow-sm">
                    <Text className="text-gray-800 font-bold text-base mb-3">
                        <Ionicons name="person-circle-outline" size={20} /> Informasi Pelanggan
                    </Text>
                    <View className="flex-row items-center">
                        <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center">
                            <Ionicons name="person" size={24} color="#666" />
                        </View>
                        <View className="ml-3 flex-1">
                            <Text className="font-bold text-gray-800 text-base">{order?.customer.name}</Text>
                            <Text className="text-gray-500">{order?.customer.phone}</Text>
                        </View>
                        <TouchableOpacity onPress={callCustomer} className="bg-green-500 px-4 py-2 rounded-lg flex-row items-center">
                            <Ionicons name="call" size={16} color="white" />
                            <Text className="text-white ml-1 font-medium">Hubungi</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Lokasi */}
                <TouchableOpacity onPress={openLocation} className="bg-white px-5 py-4 mt-3 flex-row items-start shadow-sm">
                    <Ionicons name="location" size={22} color="#EF4444" />
                    <View className="flex-1 ml-3">
                        <Text className="text-gray-800 font-semibold">Lokasi Pelanggan</Text>
                        <Text className="text-gray-500 text-sm mt-1">{order?.location.address}</Text>
                        {order?.location.detail && <Text className="text-gray-400 text-xs mt-1">Catatan: {order.location.detail}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Detail Layanan */}
                <View className="bg-white px-5 py-4 mt-3 shadow-sm">
                    <Text className="text-gray-800 font-bold text-base mb-2">Detail Layanan</Text>
                    <Text className="text-gray-800 font-medium">{order?.service.name}</Text>
                    <Text className="text-gray-500 text-sm mt-1">{order?.service.description}</Text>
                    <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
                        <Text className="text-gray-600">Harga Layanan</Text>
                        <Text className="font-bold text-gray-800">Rp {order?.service.base_price?.toLocaleString('id-ID')}</Text>
                    </View>
                </View>

                {/* Jadwal */}
                <View className="bg-white px-5 py-4 mt-3 shadow-sm">
                    <Text className="text-gray-800 font-bold text-base mb-2">Jadwal Pekerjaan</Text>
                    <View className="flex-row items-center">
                        <Ionicons name="calendar" size={18} color="#666" />
                        <Text className="text-gray-600 ml-2">{order?.scheduled_at && format(new Date(order.scheduled_at), "EEEE, d MMMM yyyy")}</Text>
                    </View>
                    <View className="flex-row items-center mt-2">
                        <Ionicons name="time" size={18} color="#666" />
                        <Text className="text-gray-600 ml-2">{order?.scheduled_at && format(new Date(order.scheduled_at), "HH:mm")} WIB</Text>
                    </View>
                </View>

                {/* Pembayaran */}
                <View className="bg-white px-5 py-4 mt-3 shadow-sm">
                    <Text className="text-gray-800 font-bold text-base mb-2">Rincian Pembayaran</Text>
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Subtotal</Text>
                        <Text className="text-gray-800">Rp {order?.service.base_price?.toLocaleString('id-ID')}</Text>
                    </View>
                    <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-100">
                        <Text className="font-bold text-gray-800">Total</Text>
                        <Text className="font-bold text-red-500 text-lg">Rp {order?.total_amount?.toLocaleString('id-ID')}</Text>
                    </View>
                </View>

                {order?.note && (
                    <View className="bg-white px-5 py-4 mt-3 shadow-sm">
                        <Text className="text-gray-800 font-bold text-base mb-2">Catatan Pelanggan</Text>
                        <Text className="text-gray-600">{order.note}</Text>
                    </View>
                )}

                {/* ========== FLOW TOMBOL LENGKAP ========== */}
                <View className="p-5 mb-10">
                    {/* Status: pending → Tombol OTW */}
                    {currentStatus === 'pending' && (
                        <Button title="🚗 Dalam Perjalanan (OTW)" onPress={handleOtwOrder} loading={actionLoading} />
                    )}

                    {/* Status: otw → Tombol Mulai Pekerjaan */}
                    {currentStatus === 'otw' && (
                        <Button title="🔧 Mulai Pekerjaan" onPress={handleStartOrder} loading={actionLoading} />
                    )}

                    {/* Status: ongoing → Tombol Selesai */}
                    {currentStatus === 'ongoing' && (
                        <Button title="✅ Selesaikan Pesanan" onPress={handleCompleteOrder} loading={actionLoading} />
                    )}

                    {/* Status: completed → Pesan Sukses */}
                    {currentStatus === 'completed' && (
                        <View className="items-center py-6">
                            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
                            <Text className="text-green-600 font-bold text-lg mt-2">Pesanan Selesai!</Text>
                            <Text className="text-gray-500 text-center mt-1">Terima kasih telah menyelesaikan pekerjaan.</Text>
                        </View>
                    )}

                    {/* Progress Indicator */}
                    <View className="mt-6">
                        <View className="flex-row justify-between items-center">
                            <View className="flex-1 flex-row items-center">
                                <View className={`w-8 h-8 rounded-full items-center justify-center ${currentStatus !== 'pending' ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <Ionicons name="checkmark" size={16} color="white" />
                                </View>
                                <View className={`flex-1 h-1 ${currentStatus !== 'pending' ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </View>
                            <View className="flex-1 flex-row items-center">
                                <View className={`w-8 h-8 rounded-full items-center justify-center ${currentStatus === 'otw' || currentStatus === 'ongoing' || currentStatus === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    {currentStatus === 'otw' ? <Ionicons name="car" size={14} color="white" /> : <Ionicons name="checkmark" size={16} color="white" />}
                                </View>
                                <View className={`flex-1 h-1 ${currentStatus === 'ongoing' || currentStatus === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </View>
                            <View className="flex-1 flex-row items-center">
                                <View className={`w-8 h-8 rounded-full items-center justify-center ${currentStatus === 'ongoing' || currentStatus === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    {currentStatus === 'ongoing' ? <Ionicons name="construct" size={14} color="white" /> : <Ionicons name="checkmark" size={16} color="white" />}
                                </View>
                                <View className={`flex-1 h-1 ${currentStatus === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </View>
                            <View className="w-8 h-8 rounded-full items-center justify-center ${currentStatus === 'completed' ? 'bg-green-500' : 'bg-gray-300'}">
                                {currentStatus === 'completed' ? <Ionicons name="checkmark" size={16} color="white" /> : <Ionicons name="flag" size={14} color="#9CA3AF" />}
                            </View>
                        </View>
                        <View className="flex-row justify-between mt-2 px-1">
                            <Text className="text-[10px] text-gray-400">Diterima</Text>
                            <Text className="text-[10px] text-gray-400">OTW</Text>
                            <Text className="text-[10px] text-gray-400">Bekerja</Text>
                            <Text className="text-[10px] text-gray-400">Selesai</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FF0000" />
                <Text className="mt-4 text-gray-500">Memuat detail pesanan...</Text>
            </View>
        );
    }

    if (!order) {
        return (
            <View className="flex-1 justify-center items-center bg-white p-5">
                <Ionicons name="sad-outline" size={64} color="#9CA3AF" />
                <Text className="text-gray-500 text-lg font-semibold mt-4">Pesanan Tidak Ditemukan</Text>
                <TouchableOpacity className="bg-red-500 px-6 py-3 rounded-xl mt-6" onPress={() => router.back()}>
                    <Text className="text-white font-semibold">Kembali</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isAccepted) {
        return renderAcceptedOrder();
    }
    return renderPendingOrder();
}