import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export default function Button({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    className = '',
    ...props
}: ButtonProps) {
    const variantStyles = {
        primary: 'bg-red-500 active:bg-red-600',
        secondary: 'bg-gray-500 active:bg-gray-600',
        outline: 'bg-transparent border border-red-500',
        danger: 'bg-red-600 active:bg-red-700',
    };

    const sizeStyles = {
        sm: 'px-4 py-2 rounded-lg',
        md: 'px-6 py-3 rounded-xl',
        lg: 'px-8 py-4 rounded-2xl',
    };

    const textSizeStyles = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    const textColorStyles = {
        primary: 'text-white',
        secondary: 'text-white',
        outline: 'text-red-500',
        danger: 'text-white',
    };

    return (
        <TouchableOpacity
            className={`${variantStyles[variant]} ${sizeStyles[size]} items-center justify-center ${loading ? 'opacity-50' : ''} ${className}`}
            disabled={loading}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color="white" size="small" />
            ) : (
                <Text className={`font-bold ${textSizeStyles[size]} ${textColorStyles[variant]}`}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}