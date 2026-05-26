// src/context/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    profile_pic: string | null;
    is_active: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    authToken: string | null;  // ✅ TAMBAHKAN INI
    login: (token: string, userData: User) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(null);  // ✅ TAMBAHKAN STATE
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        try {
            const [token, userData] = await Promise.all([
                AsyncStorage.getItem('userToken'),
                AsyncStorage.getItem('userData'),
            ]);

            if (token && userData) {
                setAuthToken(token);  // ✅ SET TOKEN
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            console.error('Error loading stored data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (token: string, userData: User) => {
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('userId', String(userData.id));
        setAuthToken(token);  // ✅ SET TOKEN
        setUser(userData);
    };

    const logout = async () => {
        await AsyncStorage.multiRemove(['userToken', 'userData', 'userId']);
        setAuthToken(null);  // ✅ CLEAR TOKEN
        setUser(null);
        router.replace('/(auth)/login');
    };

    const updateUser = (userData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isLoggedIn: !!user,
                authToken,  // ✅ EXPORT TOKEN
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};