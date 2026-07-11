import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // 檢查 localStorage 中是否有 token
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user_profile');
    
    if (token && savedUser) {
      setIsLoggedIn(true);
      setUserProfile(JSON.parse(savedUser));
    }
    setIsAuthLoading(false);
  }, []);

  const login = (token, user) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_profile', JSON.stringify(user));
    setIsLoggedIn(true);
    setUserProfile(user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_profile');
    setIsLoggedIn(false);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userProfile, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
