import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../src/utils/api';

interface Order {
    id: number;
    order_code: string;
    status: string;
    total_amount: number;
    scheduled_at: string;
    customer_name: string;
    service_name: string;
    location_address: string;
}

type TabType = 'pending' | 'ongoing' | 'completed';

export default function OrdersScreen() {
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const tabs = [
        { key: 'pending', label: 'Menunggu', icon: 'time-outline' },
        { key: 'ongoing', label: 'Berlangsung', icon: 'car-outline' },
        { key: 'completed', label: 'Selesai', icon: 'checkmark-circle-outline' },
    ];

    const fetchOrders = async () => {
        try {
            const response = await api.get(`/mitra/orders?status=${activeTab}`);
            if (response.data.success) {
                setOrders(response.data.data.orders || []);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [activeTab]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-yellow-50 border-yellow-200';
            case 'accepted':
                return 'bg-blue-50 border-blue-200';
            case 'otw':
                return 'bg-purple-50 border-purple-200';
            case 'ongoing':
                return 'bg-orange-50 border-orange-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        const map: Record<string, string> = {
            pending_payment: 'Menunggu Bayar',
            paid: 'Menunggu Konfirmasi',
            accepted: 'Diterima',
            otw: 'Dalam Perjalanan',
            ongoing: 'Sedang Berlangsung',
            completed: 'Selesai',
            cancelled: 'Dibatalkan',
        };
        return map[status] || status;
    };

    if (loading && !refreshing) {
        return <LoadingSpinner />;
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Tabs */}
            <View className="bg-white flex-row px-2 pt-4 border-b border-gray-200">
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key as TabType)}
                        className={`flex-1 py-3 items-center ${activeTab === tab.key ? 'border-b-2 border-red-500' : ''
                            }`}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={20}
                            color={activeTab === tab.key ? '#FF0000' : '#9CA3AF'}
                        />
                        <Text
                            className={`text-xs mt-1 ${activeTab === tab.key ? 'text-red-500 font-bold' : 'text-gray-400'
                                }`}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Orders List */}
            <ScrollView
                className="px-4 pt-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF0000']} />
                }
            >
                {orders.length === 0 ? (
                    <View className="py-20 items-center">
                        <Ionicons name="document-text-outline" size={80} color="#D1D5DB" />
                        <Text className="text-gray-400 text-center mt-4">Tidak ada pesanan</Text>
                    </View>
                ) : (
                    orders.map((order) => (
                        <TouchableOpacity
                            key={order.id}
                            onPress={() => router.push(`/order/${order.id}`)}
                            className={`bg-white rounded-xl p-4 mb-3 shadow-sm border ${getStatusColor(order.status)}`}
                        >
                            <View className="flex-row justify-between items-start">
                                <View>
                                    <Text className="font-mono text-xs text-gray-500">{order.order_code}</Text>
                                    <Text className="font-bold text-gray-800 mt-1">{order.service_name}</Text>
                                </View>
                                <View className="px-2 py-1 bg-red-50 rounded-lg">
                                    <Text className="text-red-500 text-[10px] font-bold">
                                        {getStatusText(order.status)}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row items-center mt-3">
                                <Ionicons name="person-outline" size={14} color="#666" />
                                <Text className="text-gray-600 text-xs ml-1">{order.customer_name}</Text>
                            </View>

                            <View className="flex-row items-center mt-1">
                                <Ionicons name="calendar-outline" size={14} color="#666" />
                                <Text className="text-gray-600 text-xs ml-1">
                                    {format(new Date(order.scheduled_at), "EEEE, d MMMM yyyy • HH:mm", { locale: id })}
                                </Text>
                            </View>

                            <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                <Text className="font-bold text-red-500">
                                    Rp {order.total_amount.toLocaleString('id-ID')}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#CCC" />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View className="h-10" />
            </ScrollView>
        </View>
    );
}