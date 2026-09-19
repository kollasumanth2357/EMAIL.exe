import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, registerApi, demoAuthApi, loadDemoInbox } from '../api';

export interface User {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  isDemo?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const DEFAULT_DEMO_USER: User = {
  id: 'user-sai',
  name: 'Sai',
  email: 'sai@mailpilot.demo',
  isDemo: true
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'mailpilot_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse auth user from localStorage:', e);
    }
    // No logged-in user by default — requires Login or One-Click Demo
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    const authenticatedUser = await loginApi(email, password);
    const newUser: User = {
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      isDemo: false
    };
    setUser(newUser);
  };

  const register = async (name: string, email: string, password: string) => {
    const registeredUser = await registerApi(name, email, password);
    const newUser: User = {
      id: registeredUser.id,
      name: registeredUser.name,
      email: registeredUser.email,
      isDemo: false
    };
    setUser(newUser);
  };

  const loginDemo = async () => {
    try {
      await demoAuthApi();
      await loadDemoInbox().catch(() => {});
    } catch (err) {
      console.warn('Demo init note:', err);
    }
    setUser(DEFAULT_DEMO_USER);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        loginDemo,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
