import React from 'react';
import { Text, View } from 'react-native';

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const getStatusConfig = (status: string) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            pending_payment: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu Bayar' },
            paid: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sudah Dibayar' },
            accepted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Diterima' },
            otw: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Dalam Perjalanan' },
            ongoing: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Sedang Berlangsung' },
            completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Selesai' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Dibatalkan' },
        };
        return config[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    };

    const config = getStatusConfig(status);

    return (
        <View className={`px-2 py-1 rounded-full ${config.bg}`}>
            <Text className={`text-xs font-medium ${config.text}`}>{config.label}</Text>
        </View>
    );
}