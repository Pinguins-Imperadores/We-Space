import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, AuthResponse } from '@wespace/api-client';

interface User {
  id: string;
  username: string;
  role: string;
  karma: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isOfflineMode: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (usernameOrEmail: string, pass: string) => Promise<void>;
  register: (username: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  toggleOfflineMode: () => void;
  checkBackendConnection: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('wespace_user');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && typeof parsed.id === 'string' && typeof parsed.username === 'string' ? parsed : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('wespace_access_token'));
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Periodic and initial healthcheck for Smart Offline Fallback
  const checkBackendConnection = async (): Promise<boolean> => {
    try {
      const isHealthy = await apiClient.checkHealth();
      setIsOfflineMode(!isHealthy);
      return isHealthy;
    } catch {
      setIsOfflineMode(true);
      return false;
    }
  };

  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const login = async (usernameOrEmail: string, pass: string) => {
    try {
      const auth: AuthResponse = await apiClient.login(usernameOrEmail, pass);
      const loggedUser: User = {
        id: auth.user_id,
        username: auth.username,
        role: auth.role,
        karma: 100.0,
      };
      setUser(loggedUser);
      setToken(auth.access_token);
      localStorage.setItem('wespace_user', JSON.stringify(loggedUser));
      setIsOfflineMode(false);
      closeAuthModal();
    } catch (err) {
      throw err;
    }
  };

  const register = async (username: string, email: string, pass: string) => {
    try {
      const auth: AuthResponse = await apiClient.register(username, email, pass);
      const newUser: User = {
        id: auth.user_id,
        username: auth.username,
        role: auth.role,
        karma: 100.0,
      };
      setUser(newUser);
      setToken(auth.access_token);
      localStorage.setItem('wespace_user', JSON.stringify(newUser));
      setIsOfflineMode(false);
      closeAuthModal();
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    apiClient.clearToken();
    localStorage.removeItem('wespace_user');
  };

  const toggleOfflineMode = () => setIsOfflineMode((prev) => !prev);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isOfflineMode,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        toggleOfflineMode,
        checkBackendConnection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
