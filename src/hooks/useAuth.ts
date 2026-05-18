import { useAuth as useAuthContext } from '../context/AuthContext';

export const useAuth = () => {
    const auth = useAuthContext(); // Memanggil dari file lain
    return auth;
};