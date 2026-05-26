import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
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

// 🔥 Fungsi untuk menyesuaikan timezone (karena MySQL Coolify selisih 7 jam)
const adjustTimezone = (dateString: string): Date => {
  if (!dateString) return new Date();
  const date = new Date(dateString);
  date.setHours(date.getHours() + 7);
  return date;
};

// 🔥 Fungsi untuk cek apakah tanggal hari ini
const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

// 🔥 Fungsi untuk cek apakah tanggal dalam bulan ini
const isThisMonth = (date: Date): boolean => {
  const now = new Date();
  return date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleAnim] = useState(new Animated.Value(stats?.is_online ? 1 : 0));

  // 🔥 Ambil semua data (dashboard + orders) dalam satu fungsi
  const fetchAllData = async () => {
    if (!user?.id) {
      console.log('User ID not found');
      setLoading(false);
      return;
    }

    try {
      console.log('📡 [DASHBOARD] Fetching data for user_id:', user.id);

      // 🔥 Ambil data dashboard (hanya untuk status online dan jumlah pesanan)
      const dashboardResponse = await api.get(`/mitra/dashboard/${user.id}`);
      console.log('📦 [DASHBOARD] Dashboard response:', dashboardResponse.data);

      if (dashboardResponse.data.success) {
        setStats(dashboardResponse.data.data);
        Animated.timing(toggleAnim, {
          toValue: dashboardResponse.data.data.is_online ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }

      // 🔥 Ambil semua pesanan - INI SUMBER UTAMA UNTUK PENDAPATAN
      const ordersResponse = await api.get(`/orders/mitra/${user.id}`);
      console.log('📦 [DASHBOARD] Orders response:', ordersResponse.data);

      if (ordersResponse.data.success) {
        const allOrders = ordersResponse.data.data.orders || [];
        // Filter hanya yang status completed
        const completed = allOrders.filter((order: Order) => order.status === 'completed');
        setCompletedOrders(completed);
        console.log(`✅ [DASHBOARD] Found ${completed.length} completed orders`);
      }

    } catch (error: any) {
      console.error('❌ [DASHBOARD] Error fetching data:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      } else if (error.request) {
        console.error('No response from server. Check network connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [DASHBOARD] Screen focused, refreshing data...');
      fetchAllData();
    }, [user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const toggleOnlineStatus = async () => {
    if (!user?.id || isToggling) return;

    setIsToggling(true);
    const newStatus = !stats?.is_online;

    Animated.timing(toggleAnim, {
      toValue: newStatus ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    try {
      const response = await api.patch(`/mitra/toggle-online/${user.id}`);
      if (response.data.success) {
        setStats(prev => prev ? { ...prev, is_online: newStatus } : null);
        console.log(`Status ${newStatus ? 'Online' : 'Offline'} berhasil diupdate`);
      } else {
        Animated.timing(toggleAnim, {
          toValue: stats?.is_online ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      Animated.timing(toggleAnim, {
        toValue: stats?.is_online ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } finally {
      setIsToggling(false);
    }
  };

  // 🔥 SEMUA PERHITUNGAN PENDAPATAN BERDASARKAN COMPLETED ORDERS
  // Total pendapatan bersih (semua completed orders)
  const totalNetEarnings = completedOrders.reduce((sum, order) => {
    const serviceFee = order.service?.base_price || order.total_amount;
    return sum + serviceFee;
  }, 0);

  // Pendapatan hari ini dari completed orders
  const todayEarnings = completedOrders
    .filter(order => isToday(adjustTimezone(order.created_at)))
    .reduce((sum, order) => sum + (order.service?.base_price || order.total_amount), 0);

  // Pendapatan bulan ini dari completed orders
  const monthEarnings = completedOrders
    .filter(order => isThisMonth(adjustTimezone(order.created_at)))
    .reduce((sum, order) => sum + (order.service?.base_price || order.total_amount), 0);

  // Jumlah pesanan hari ini dari completed orders
  const todayOrdersCount = completedOrders.filter(order => isToday(adjustTimezone(order.created_at))).length;

  // Jumlah pesanan bulan ini dari completed orders
  const monthOrdersCount = completedOrders.filter(order => isThisMonth(adjustTimezone(order.created_at))).length;

  // 🔥 Ambil 5 pesanan terbaru yang completed
  const recentCompletedOrders = [...completedOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (loading) {
    return <LoadingSpinner />;
  }

  const statCards = [
    {
      title: 'Order Selesai(Hari Ini)',
      value: todayOrdersCount,
      icon: 'calendar-outline',
      color: '#FF0000',
      bgColor: '#FFE5E5',
    },
    {
      title: 'Pendapatan(Hari Ini)',
      value: `Rp ${todayEarnings.toLocaleString('id-ID')}`,
      icon: 'cash-outline',
      color: '#FF0000',
      bgColor: '#FFE5E5',
    },
    {
      title: 'Order Selesai(Bulan Ini)',
      value: monthOrdersCount,
      icon: 'stats-chart-outline',
      color: '#FF0000',
      bgColor: '#FFE5E5',
    },
    {
      title: 'Pendapatan(Bulan Ini)',
      value: `Rp ${monthEarnings.toLocaleString('id-ID')}`,
      icon: 'trending-up-outline',
      color: '#FF0000',
      bgColor: '#FFE5E5',
    },
    {
      title: 'Rating Terapis',
      value: stats?.rating?.toFixed(1) || '0.0',
      icon: 'star-outline',
      color: '#FFB800',
      bgColor: '#FFF8E5',
      suffix: '⭐',
    },
    {
      title: 'Total Pesanan Selesai',
      value: completedOrders.length,
      icon: 'checkmark-done-outline',
      color: '#22C55E',
      bgColor: '#E5F9E5',
    },
  ];

  const translateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  const backgroundColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#FF0000'],
  });

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF0000']} tintColor="#FF0000" />
      }
    >
      {/* Header */}
      <View className="bg-[#FF0000] px-5 pt-12 pb-8 rounded-b-3xl shadow-lg">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-white/80 text-sm font-medium">Selamat Datang,</Text>
            <Text className="text-white text-2xl font-bold mt-1" numberOfLines={1}>
              {user?.name || 'Terapis'}
            </Text>
            <View className="flex-row items-center mt-2">
              <View className={`w-2 h-2 rounded-full ${stats?.is_online ? 'bg-green-400' : 'bg-gray-400'} mr-2`} />
              <Text className="text-white/70 text-xs">
                {stats?.is_online ? 'Online - Menerima Pesanan' : 'Offline - Tidak Menerima Pesanan'}
              </Text>
            </View>
          </View>
          <View className="w-14 h-14 bg-white/20 rounded-full items-center justify-center">
            <Ionicons name="medical-outline" size={28} color="white" />
          </View>
        </View>
      </View>

      {/* Stat Cards Grid - SEMUA DARI COMPLETED ORDERS */}
      <View className="flex-row flex-wrap px-4 -mt-4">
        {statCards.map((card, index) => (
          <View key={index} className="w-1/2 p-2">
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <View
                className="w-12 h-12 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: card.bgColor }}
              >
                <Ionicons name={card.icon as any} size={24} color={card.color} />
              </View>
              <Text className="text-gray-500 text-xs">{card.title}</Text>
              <View className="flex-row items-baseline mt-1">
                <Text className="text-gray-800 font-bold text-lg">{card.value}</Text>
                {card.suffix && <Text className="text-gray-500 text-sm ml-1">{card.suffix}</Text>}
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Total Pendapatan Bersih Card */}
      <View className="px-4 mt-2">
        <View className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white/80 text-xs">💰 Total Pendapatan Bersih</Text>
              <Text className="text-white text-2xl font-bold mt-1">
                Rp {totalNetEarnings.toLocaleString('id-ID')}
              </Text>
              <Text className="text-white/60 text-[10px] mt-1">
                *Dari {completedOrders.length} pesanan yang sudah SELESAI
              </Text>
            </View>
            <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
              <Ionicons name="wallet-outline" size={24} color="white" />
            </View>
          </View>
        </View>
      </View>

      {/* Pesanan Selesai Terbaru Section */}
      <View className="px-5 mt-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-800 font-bold text-lg">📋 Pesanan Selesai Terbaru</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
            <Text className="text-red-500 text-xs font-semibold">Lihat Semua →</Text>
          </TouchableOpacity>
        </View>

        {recentCompletedOrders.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
            <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-400 text-center mt-2">Belum ada pesanan selesai</Text>
          </View>
        ) : (
          recentCompletedOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              onPress={() => router.push(`/order/${order.id}`)}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-mono text-xs text-gray-500">{order.order_code}</Text>
                  <Text className="font-bold text-gray-800 mt-1">{order.service?.name || 'Layanan'}</Text>
                </View>
                <View className="bg-green-100 px-2 py-1 rounded-lg">
                  <Text className="text-green-600 text-[10px] font-bold">✓ Selesai</Text>
                </View>
              </View>

              <View className="flex-row items-center mt-2">
                <Ionicons name="person-outline" size={14} color="#6B7280" />
                <Text className="text-gray-600 text-xs ml-1">{order.customer?.name || 'Pelanggan'}</Text>
              </View>

              <View className="flex-row items-center mt-1">
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text className="text-gray-500 text-xs ml-1">
                  {order.scheduled_at
                    ? format(adjustTimezone(order.scheduled_at), "dd MMM yyyy • HH:mm", { locale: id })
                    : 'Tanggal tidak tersedia'}
                </Text>
              </View>

              <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <View>
                  <Text className="text-gray-400 text-[10px]">Pendapatan</Text>
                  <Text className="font-bold text-green-600 text-sm">
                    Rp {(order.service?.base_price || order.total_amount).toLocaleString('id-ID')}
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
      </View>

      {/* Menu Layanan Section */}
      <View className="px-5 mt-6">
        <Text className="text-gray-800 font-bold text-lg mb-3">Layanan Saya</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 items-center"
            onPress={() => router.push('/(tabs)/orders')}
            activeOpacity={0.7}
          >
            <View className="w-14 h-14 bg-purple-50 rounded-full items-center justify-center mb-2">
              <Ionicons name="document-text-outline" size={32} color="#8B5CF6" />
            </View>
            <Text className="text-gray-800 font-semibold">Riwayat Pesanan</Text>
            <Text className="text-gray-400 text-xs mt-1">Lihat semua pesanan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 items-center"
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
          >
            <View className="w-14 h-14 bg-green-50 rounded-full items-center justify-center mb-2">
              <Ionicons name="person-outline" size={32} color="#22C55E" />
            </View>
            <Text className="text-gray-800 font-semibold">Profil Saya</Text>
            <Text className="text-gray-400 text-xs mt-1">Kelola data diri</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toggle Online Status */}
      <View className="px-5 mt-6 mb-10">
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-gray-800 font-bold text-base">Status Layanan</Text>
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full ${stats?.is_online ? 'bg-green-500' : 'bg-gray-400'} mr-2`} />
              <Text className={`text-sm font-medium ${stats?.is_online ? 'text-green-600' : 'text-gray-500'}`}>
                {stats?.is_online ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <Text className="text-gray-500 text-sm mb-4">
            {stats?.is_online
              ? 'Anda sedang online dan dapat menerima pesanan dari customer'
              : 'Anda sedang offline, customer tidak dapat memesan layanan Anda'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleOnlineStatus}
            disabled={isToggling}
          >
            <Animated.View
              style={{
                width: '100%',
                height: 56,
                borderRadius: 28,
                backgroundColor: backgroundColor,
                justifyContent: 'center',
                paddingHorizontal: 8,
              }}
            >
              <Animated.View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'white',
                  transform: [{ translateX: translateX }],
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={stats?.is_online ? 'checkmark' : 'close'}
                  size={20}
                  color={stats?.is_online ? '#FF0000' : '#9CA3AF'}
                />
              </Animated.View>

              <View
                style={{
                  position: 'absolute',
                  right: 20,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                  {stats?.is_online ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}