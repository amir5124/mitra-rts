import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../global.css';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/utils/api';

interface DashboardStats {
  total_orders_today: number;
  total_earnings_today: number;
  total_orders_month: number;
  total_earnings_month: number;
  rating: number;
  pending_orders: number;
  ongoing_orders: number;
  completed_orders: number;
  is_online: boolean;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    if (!user?.id) {
      console.log('User ID not found');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching dashboard for user_id:', user.id);
      // ✅ Perbaiki: tambahkan user_id ke URL
      const response = await api.get(`/mitra/dashboard/${user.id}`);
      console.log('Dashboard response:', response.data);

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      console.error('Response:', error.response?.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const toggleOnlineStatus = async () => {
    if (!user?.id) return;

    try {
      // ✅ Perbaiki: tambahkan user_id ke URL
      const response = await api.patch(`/mitra/toggle-online/${user.id}`);
      if (response.data.success) {
        // Refresh dashboard
        fetchDashboard();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const statCards = [
    {
      title: 'Pesanan Hari Ini',
      value: stats?.total_orders_today || 0,
      icon: 'calendar-outline',
      color: 'bg-blue-500',
    },
    {
      title: 'Pendapatan Hari Ini',
      value: `Rp ${(stats?.total_earnings_today || 0).toLocaleString('id-ID')}`,
      icon: 'cash-outline',
      color: 'bg-green-500',
    },
    {
      title: 'Pesanan Bulan Ini',
      value: stats?.total_orders_month || 0,
      icon: 'stats-chart-outline',
      color: 'bg-purple-500',
    },
    {
      title: 'Rating',
      value: stats?.rating?.toFixed(1) || '0.0',
      icon: 'star-outline',
      color: 'bg-yellow-500',
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF0000']} />
      }
    >
      {/* Header */}
      <View className="bg-red-500 px-5 pt-12 pb-6 rounded-b-3xl">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-sm opacity-90">Selamat Datang,</Text>
            <Text className="text-white text-2xl font-bold mt-1">{user?.name}</Text>
          </View>
          <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
            <Ionicons name="medical" size={24} color="white" />
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap px-5 mt-6">
        {statCards.map((card, index) => (
          <View key={index} className="w-1/2 p-2">
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <View className={`w-10 h-10 ${card.color} rounded-full items-center justify-center mb-3`}>
                <Ionicons name={card.icon as any} size={20} color="white" />
              </View>
              <Text className="text-gray-500 text-xs">{card.title}</Text>
              <Text className="text-gray-800 font-bold text-lg mt-1">{card.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View className="px-5 mt-4">
        <Text className="text-gray-800 font-bold text-lg mb-3">Aksi Cepat</Text>
        <View className="flex-row">
          <TouchableOpacity
            className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm items-center"
            onPress={() => {
              // Navigate ke orders dengan filter pending
            }}
          >
            <Ionicons name="time-outline" size={30} color="#FF0000" />
            <Text className="text-gray-800 font-bold mt-2">Pesanan Masuk</Text>
            {stats && stats.pending_orders > 0 && (
              <View className="bg-red-500 rounded-full px-2 py-0.5 mt-1">
                <Text className="text-white text-xs font-bold">{stats.pending_orders}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm items-center"
            onPress={() => {
              // Navigate ke orders dengan filter ongoing
            }}
          >
            <Ionicons name="car-outline" size={30} color="#FF0000" />
            <Text className="text-gray-800 font-bold mt-2">Berlangsung</Text>
            {stats && stats.ongoing_orders > 0 && (
              <View className="bg-green-500 rounded-full px-2 py-0.5 mt-1">
                <Text className="text-white text-xs font-bold">{stats.ongoing_orders}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Online Toggle */}
      <View className="px-5 mt-6 mb-10">
        <TouchableOpacity
          className="bg-white rounded-xl p-4 shadow-sm flex-row justify-between items-center"
          onPress={toggleOnlineStatus}
        >
          <View className="flex-row items-center">
            <View className={`w-3 h-3 rounded-full ${stats?.is_online ? 'bg-green-500' : 'bg-gray-400'} mr-3`} />
            <Text className="text-gray-800 font-medium">
              {stats?.is_online ? 'Online - Menerima Pesanan' : 'Offline - Tidak Menerima Pesanan'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}