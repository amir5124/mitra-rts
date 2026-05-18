import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
    };
    created_at: string;
}

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchOrderDetail = async () => {
        try {
            const response = await api.get(`/mitra/orders/${id}`);
            if (response.data.success) {
                setOrder(response.data.data.order);
            }
        } catch (error) {
            console.error('Error fetching order:', error);
            Alert.alert('Error', 'Gagal memuat detail pesanan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetail();
    }, [id]);

    const handleAcceptOrder = async () => {
        Alert.alert('Konfirmasi', 'Apakah Anda menerima pesanan ini?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Terima',
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        const response = await api.post(`/mitra/orders/${id}/accept`);
                        if (response.data.success) {
                            Alert.alert('Berhasil', 'Pesanan diterima');
                            fetchOrderDetail();
                        }
                    } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.message || 'Gagal menerima pesanan');
                    } finally {
                        setActionLoading(false);
                    }
                },
            },
        ]);
    };

    const handleRejectOrder = async () => {
        Alert.alert('Konfirmasi', 'Apakah Anda menolak pesanan ini?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Tolak',
                style: 'destructive',
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        const response = await api.post(`/mitra/orders/${id}/reject`);
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
        ]);
    };

    const handleStartOrder = async () => {
        Alert.alert('Mulai Pekerjaan', 'Apakah Anda siap memulai pekerjaan?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Mulai',
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        const response = await api.post(`/mitra/orders/${id}/start`);
                        if (response.data.success) {
                            Alert.alert('Berhasil', 'Pekerjaan dimulai');
                            fetchOrderDetail();
                        }
                    } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.message || 'Gagal memulai pekerjaan');
                    } finally {
                        setActionLoading(false);
                    }
                },
            },
        ]);
    };

    const handleCompleteOrder = async () => {
        Alert.alert('Selesaikan Pesanan', 'Apakah pekerjaan sudah selesai?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Selesaikan',
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        const response = await api.post(`/mitra/orders/${id}/complete`);
                        if (response.data.success) {
                            Alert.alert('Berhasil', 'Pesanan selesai');
                            fetchOrderDetail();
                        }
                    } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.message || 'Gagal menyelesaikan pesanan');
                    } finally {
                        setActionLoading(false);
                    }
                },
            },
        ]);
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

    const getStatusText = (status: string) => {
        const map: Record<string, string> = {
            pending_payment: 'Menunggu Pembayaran',
            paid: 'Menunggu Konfirmasi',
            accepted: 'Pesanan Diterima',
            otw: 'Dalam Perjalanan',
            ongoing: 'Sedang Berlangsung',
            completed: 'Selesai',
            cancelled: 'Dibatalkan',
        };
        return map[status] || status;
    };

    const showActionButtons = () => {
        if (!order) return null;

        switch (order.status) {
            case 'paid':
                return (
                    <View className="flex-row space-x-3">
                        <Button
                            title="Tolak Pesanan"
                            variant="outline"
                            className="flex-1 mr-2"
                            onPress={handleRejectOrder}
                            loading={actionLoading}
                        />
                        <Button
                            title="Terima Pesanan"
                            className="flex-1 ml-2"
                            onPress={handleAcceptOrder}
                            loading={actionLoading}
                        />
                    </View>
                );
            case 'accepted':
                return (
                    <Button
                        title="Mulai Pekerjaan"
                        onPress={handleStartOrder}
                        loading={actionLoading}
                    />
                );
            case 'ongoing':
            case 'otw':
                return (
                    <Button
                        title="Selesaikan Pesanan"
                        onPress={handleCompleteOrder}
                        loading={actionLoading}
                    />
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#FF0000" />
            </View>
        );
    }

    if (!order) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500">Pesanan tidak ditemukan</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-5 pt-4 pb-2 border-b border-gray-100">
                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-gray-400 text-xs">KODE PESANAN</Text>
                        <Text className="font-mono text-sm font-bold">{order.order_code}</Text>
                    </View>
                    <View className="px-3 py-1 bg-red-50 rounded-full">
                        <Text className="text-red-500 text-xs font-bold">{getStatusText(order.status)}</Text>
                    </View>
                </View>
            </View>

            {/* Customer Info */}
            <View className="bg-white px-5 py-4 mt-3">
                <Text className="text-gray-800 font-bold text-base mb-3">Informasi Pelanggan</Text>
                <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center">
                        <Ionicons name="person" size={24} color="#666" />
                    </View>
                    <View className="ml-3 flex-1">
                        <Text className="font-bold text-gray-800">{order.customer.name}</Text>
                        <Text className="text-gray-500 text-sm">{order.customer.phone}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={callCustomer}
                        className="w-10 h-10 bg-green-500 rounded-full items-center justify-center"
                    >
                        <Ionicons name="call" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Service Info */}
            <View className="bg-white px-5 py-4 mt-3">
                <Text className="text-gray-800 font-bold text-base mb-3">Layanan</Text>
                <Text className="text-gray-800 font-medium">{order.service.name}</Text>
                <Text className="text-gray-500 text-sm mt-1">{order.service.description}</Text>
                <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-gray-600">Harga</Text>
                    <Text className="font-bold text-gray-800">
                        Rp {order.service.base_price.toLocaleString('id-ID')}
                    </Text>
                </View>
            </View>

            {/* Location */}
            <TouchableOpacity
                onPress={openLocation}
                className="bg-white px-5 py-4 mt-3 active:bg-gray-50"
            >
                <Text className="text-gray-800 font-bold text-base mb-3">Lokasi</Text>
                <View className="flex-row items-start">
                    <Ionicons name="location-outline" size={20} color="#666" />
                    <View className="flex-1 ml-2">
                        <Text className="text-gray-600">{order.location.address}</Text>
                        {order.location.detail && (
                            <Text className="text-gray-400 text-sm mt-1">{order.location.detail}</Text>
                        )}
                    </View>
                    <Ionicons name="open-outline" size={16} color="#666" />
                </View>
            </TouchableOpacity>

            {/* Schedule */}
            <View className="bg-white px-5 py-4 mt-3">
                <Text className="text-gray-800 font-bold text-base mb-3">Jadwal</Text>
                <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <Text className="text-gray-600 ml-2">
                        {format(new Date(order.scheduled_at), "EEEE, d MMMM yyyy")}
                    </Text>
                </View>
                <View className="flex-row items-center mt-2">
                    <Ionicons name="time-outline" size={20} color="#666" />
                    <Text className="text-gray-600 ml-2">
                        {format(new Date(order.scheduled_at), "HH:mm")} WIB
                    </Text>
                </View>
            </View>

            {/* Payment */}
            <View className="bg-white px-5 py-4 mt-3 mb-5">
                <Text className="text-gray-800 font-bold text-base mb-3">Rincian Pembayaran</Text>
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500">Harga Layanan</Text>
                    <Text className="text-gray-800">
                        Rp {order.service.base_price.toLocaleString('id-ID')}
                    </Text>
                </View>
                <View className="flex-row justify-between pt-2 mt-2 border-t border-gray-100">
                    <Text className="font-bold text-gray-800">Total</Text>
                    <Text className="font-bold text-red-500">
                        Rp {order.total_amount.toLocaleString('id-ID')}
                    </Text>
                </View>
                <View className="mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-gray-500 text-xs">Metode Pembayaran</Text>
                    <Text className="text-gray-800 font-medium mt-1">
                        {order.payment.method === 'VA' ? 'Transfer Bank (Virtual Account)' : 'QRIS'}
                    </Text>
                </View>
            </View>

            {/* Notes */}
            {order.note && (
                <View className="bg-white px-5 py-4 mt-3 mb-5">
                    <Text className="text-gray-800 font-bold text-base mb-3">Catatan</Text>
                    <Text className="text-gray-600">{order.note}</Text>
                </View>
            )}

            {/* Action Buttons */}
            <View className="px-5 mb-10">
                {showActionButtons()}
            </View>
        </ScrollView>
    );
}