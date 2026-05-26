import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/utils/api';

interface Order {
    id: number;
    order_code: string;
    status: string;
    total_amount: number;
    scheduled_at: string;
    customer: {
        id: number;
        name: string;
        phone: string;
    };
    service: {
        id: number;
        name: string;
        base_price: number;
    };
    location: {
        address: string;
        detail: string;
    };
    payment: {
        method: string;
        status: string;
    };
    created_at: string;
}

type TabType = 'pending' | 'ongoing' | 'completed';

export default function OrdersScreen() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const tabs = [
        { key: 'pending', label: 'Menunggu', icon: 'time-outline', status: ['pending', 'paid', 'pending_payment'] },
        { key: 'ongoing', label: 'Berlangsung', icon: 'hand-left-outline', status: ['otw', 'ongoing'] },
        { key: 'completed', label: 'Selesai', icon: 'checkmark-circle-outline', status: ['completed'] },
    ];

    const filterOrdersByTab = (ordersList: Order[], tab: TabType): Order[] => {
        const validStatuses = tabs.find(t => t.key === tab)?.status || [];
        return ordersList.filter(order => validStatuses.includes(order.status));
    };

    const fetchOrders = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            const response = await api.get(`/orders/mitra/${user.id}`);

            if (response.data.success) {
                const allOrders = response.data.data.orders || [];
                const filteredOrders = filterOrdersByTab(allOrders, activeTab);
                setOrders(filteredOrders);
            } else {
                setOrders([]);
            }
        } catch (error: any) {
            console.error('Error fetching orders:', error.message);
            setOrders([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (activeTab) {
            const filterAndSetOrders = async () => {
                if (!user?.id) return;
                try {
                    const response = await api.get(`/orders/mitra/${user.id}`);
                    if (response.data.success) {
                        const allOrders = response.data.data.orders || [];
                        const filteredOrders = filterOrdersByTab(allOrders, activeTab);
                        setOrders(filteredOrders);
                    }
                } catch (error) {
                    console.error('Error re-filtering orders:', error);
                } finally {
                    setLoading(false);
                }
            };
            setLoading(true);
            filterAndSetOrders();
        }
    }, [activeTab]);

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        }, [activeTab])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
            case 'pending_payment':
            case 'paid':
                return 'bg-yellow-50 border-yellow-200';
            case 'otw':
                return 'bg-purple-50 border-purple-200';
            case 'ongoing':
                return 'bg-blue-50 border-blue-200';
            case 'completed':
                return 'bg-green-50 border-green-200';
            case 'cancelled':
                return 'bg-red-50 border-red-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        const map: Record<string, string> = {
            pending_payment: 'Menunggu Bayar',
            paid: 'Sudah Dibayar',
            pending: 'Menunggu Konfirmasi',
            accepted: 'Diterima',
            otw: 'Dalam Perjalanan 🚗',
            ongoing: 'Sedang Berlangsung 💆',
            completed: 'Selesai ✅',
            cancelled: 'Dibatalkan ❌',
        };
        return map[status] || status;
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'pending':
            case 'pending_payment':
            case 'paid':
                return 'bg-yellow-100 text-yellow-700';
            case 'otw':
                return 'bg-purple-100 text-purple-700';
            case 'ongoing':
                return 'bg-blue-100 text-blue-700';
            case 'completed':
                return 'bg-green-100 text-green-700';
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
            case 'pending_payment':
            case 'paid':
                return 'hourglass-outline';
            case 'otw':
                return 'car-outline';
            case 'ongoing':
                return 'hand-left-outline';
            case 'completed':
                return 'checkmark-circle-outline';
            default:
                return 'document-text-outline';
        }
    };

    if (loading && !refreshing) {
        return <LoadingSpinner />;
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
                <Text className="text-2xl font-bold text-gray-800">Pesanan Saya</Text>
                <Text className="text-gray-500 text-sm mt-1">
                    Kelola pesanan yang masuk
                </Text>
            </View>

            {/* Tabs */}
            <View className="bg-white flex-row px-2 border-b border-gray-200">
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key as TabType)}
                        className={`flex-1 py-3 items-center ${activeTab === tab.key ? 'border-b-2 border-red-500' : ''}`}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={22}
                            color={activeTab === tab.key ? '#FF0000' : '#9CA3AF'}
                        />
                        <Text className={`text-xs mt-1 ${activeTab === tab.key ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Orders List */}
            <ScrollView
                className="px-4 pt-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF0000']} />
                }
            >
                {orders.length === 0 ? (
                    <View className="py-20 items-center">
                        <Ionicons name="document-text-outline" size={80} color="#D1D5DB" />
                        <Text className="text-gray-400 text-center mt-4">
                            Tidak ada pesanan {activeTab === 'pending' ? 'menunggu' : activeTab === 'ongoing' ? 'berlangsung' : 'selesai'}
                        </Text>
                    </View>
                ) : (
                    orders.map((order) => (
                        <TouchableOpacity
                            key={order.id}
                            onPress={() => router.push(`/order/${order.id}`)}
                            className={`bg-white rounded-xl p-4 mb-3 shadow-sm border ${getStatusColor(order.status)}`}
                            activeOpacity={0.7}
                        >
                            <View className="flex-row justify-between items-start">
                                <View className="flex-1">
                                    <Text className="font-mono text-xs text-gray-500">{order.order_code}</Text>
                                    <Text className="font-bold text-gray-800 mt-1 text-base">
                                        {order.service?.name || 'Layanan'}
                                    </Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Ionicons
                                        name={getStatusIcon(order.status) as any}
                                        size={14}
                                        color={order.status === 'ongoing' ? '#3B82F6' : '#6B7280'}
                                    />
                                    <View className={`px-2 py-1 rounded-lg ml-1 ${getStatusBadgeColor(order.status)}`}>
                                        <Text className={`text-[10px] font-bold`}>
                                            {getStatusText(order.status)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View className="flex-row items-center mt-3">
                                <Ionicons name="person-outline" size={14} color="#6B7280" />
                                <Text className="text-gray-600 text-xs ml-1">
                                    {order.customer?.name || 'Pelanggan'}
                                </Text>
                            </View>

                            {/* 🔥 LANGSUNG FORMAT TANPA KONVERSI (backend sudah return WIB) */}
                            <View className="flex-row items-center mt-1">
                                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                                <Text className="text-gray-600 text-xs ml-1">
                                    {order.scheduled_at
                                        ? format(new Date(order.scheduled_at), "EEEE, d MMMM yyyy • HH:mm", { locale: id })
                                        : 'Tanggal belum ditentukan'}
                                </Text>
                            </View>

                            {order.location?.address && (
                                <View className="flex-row items-start mt-1">
                                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                                    <Text className="text-gray-500 text-xs ml-1 flex-1" numberOfLines={1}>
                                        {order.location.address}
                                    </Text>
                                </View>
                            )}

                            <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                <View>
                                    <Text className="text-gray-400 text-[10px]">Total Pembayaran</Text>
                                    <Text className="font-bold text-red-500 text-base">
                                        Rp {order.total_amount?.toLocaleString('id-ID') || 0}
                                    </Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Text className="text-gray-400 text-xs mr-1">Detail</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View className="h-10" />
            </ScrollView>
        </View>
    );
}