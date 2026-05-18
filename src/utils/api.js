import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'https://api.siappgo.id/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor untuk handle error 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired, hapus storage dan redirect ke login
            await AsyncStorage.multiRemove(['userToken', 'userData', 'userId']);
            // Redirect akan dihandle di AuthContext
        }
        return Promise.reject(error);
    }
);

export default api;