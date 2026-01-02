import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi, tokenStorage } from '@/services/api';

interface User {
    id: number;
    username: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    register: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await authApi.login(username, password);
            await tokenStorage.set(response.token);
            setUser(response.user as User);
            setToken(response.token);
            setIsAuthenticated(true);
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Login failed');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await authApi.register(username, password);
            await tokenStorage.set(response.token);
            setUser(response.user as User);
            setToken(response.token);
            setIsAuthenticated(true);
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Registration failed');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await tokenStorage.remove();
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        setError(null);
    };

    const loadToken = async () => {
        try {
            const storedToken = await tokenStorage.get();
            if (storedToken) {
                setToken(storedToken);
                // Ideally verify token or get user profile here
                // For now assume valid until 401
                setIsAuthenticated(true);
                // You might want to fetch user profile here if the API supports it
                // setUser({ username: 'User' }); 
            }
        } catch (e) {
            console.error('Failed to load token', e);
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);

    // Load token on mount
    useEffect(() => {
        loadToken();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated,
                isLoading,
                error,
                login,
                register,
                logout,
                loadToken,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
