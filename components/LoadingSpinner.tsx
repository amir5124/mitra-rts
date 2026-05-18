import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function LoadingSpinner({ message = 'Memuat...' }) {
    return (
        <View className="flex-1 justify-center items-center bg-white">
            <ActivityIndicator size="large" color="#FF0000" />
            <Text className="mt-4 text-gray-500">{message}</Text>
        </View>
    );
}