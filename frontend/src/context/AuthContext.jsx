import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('leavetrack_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('leavetrack_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Synchronize authentication status on startup
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('leavetrack_token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await authApi.getCurrentUser();
        if (isMounted) {
          setUser(res.data);
          localStorage.setItem('leavetrack_user', JSON.stringify(res.data));
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err?.message);
        if (isMounted) {
          localStorage.removeItem('leavetrack_token');
          localStorage.removeItem('leavetrack_user');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifySession();

    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (usernameOrEmail, password) => {
    const res = await authApi.login({ usernameOrEmail, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('leavetrack_token', receivedToken);
    localStorage.setItem('leavetrack_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);

    return res.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('leavetrack_token');
      localStorage.removeItem('leavetrack_user');
      setToken(null);
      setUser(null);
    }
  };

  const hasRole = (roles) => {
    if (!user || !user.role) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const value = {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
