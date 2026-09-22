import React, { createContext, useContext, useState } from 'react';
import { User, Role } from '../types';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  login: (usernameOrEmail: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  loginAsRole: (role: Role, opdKey?: string) => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  setSessionUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(() => authService.getCurrentUser());

  const setSessionUser = (user: User | null) => {
    authService.setCurrentUser(user);
    setCurrentUserState(user);
  };

  const login = async (usernameOrEmail: string, pass: string) => {
    const res = await authService.login(usernameOrEmail, pass);
    if (res.success && res.user) {
      setCurrentUserState(res.user);
      return { success: true };
    }
    return { success: false, message: res.message || 'Login gagal' };
  };

  const loginAsRole = (role: Role, opdKey?: string) => {
    const user = authService.loginAsRole(role, opdKey);
    setCurrentUserState(user);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error logging out from Supabase:', err);
    }
    await authService.logout();
    setCurrentUserState(null);
  };

  const updateProfile = (data: Partial<User>) => {
    const updated = authService.updateProfile(data);
    setCurrentUserState(updated);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        login,
        loginAsRole,
        logout,
        updateProfile,
        setSessionUser,
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
