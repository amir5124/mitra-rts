import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id'; // ✅ Perubahan: langsung ke file id
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
    completed_at: string | null;
}

export default function HistoryScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHistory = async () => {
        try {
            const response = await api.get('/mitra/orders/history');
            if (response.data.success) {
                setOrders(response.data.data.orders || []);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50 px-4 pt-4"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF0000']} />
            }
        >
            <Text className="text-xl font-bold text-gray-800 mb-4">Riwayat Pesanan</Text>

            {orders.length === 0 ? (
                <View className="py-20 items-center">
                    <Ionicons name="time-outline" size={80} color="#D1D5DB" />
                    <Text className="text-gray-400 text-center mt-4">Belum ada riwayat pesanan</Text>
                </View>
            ) : (
                orders.map((order) => (
                    <TouchableOpacity
                        key={order.id}
                        onPress={() => router.push(`/order/${order.id}`)}
                        className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                    >
                        <View className="flex-row justify-between items-start">
                            <View className="flex-1">
                                <Text className="font-mono text-xs text-gray-500">{order.order_code}</Text>
                                <Text className="font-bold text-gray-800 mt-1">{order.service_name}</Text>
                            </View>
                            <View className="px-2 py-1 bg-green-50 rounded-lg">
                                <Text className="text-green-600 text-[10px] font-bold">SELESAI</Text>
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

                        {order.completed_at && (
                            <View className="flex-row items-center mt-1">
                                <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                                <Text className="text-green-600 text-xs ml-1">
                                    Selesai: {format(new Date(order.completed_at), "dd MMM yyyy", { locale: id })}
                                </Text>
                            </View>
                        )}

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
    );
}