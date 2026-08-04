import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // 監聽來自 Axios 攔截器的全局登出事件
    const handleLogout = () => {
      setIsLoggedIn(false);
      setUserProfile(null);
    };
    window.addEventListener('auth:logout', handleLogout);

    // 檢查 URL 中是否有 auto-login token (例如來自 LINE Bot 的跳轉)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
      // 為了畫面乾淨且防止 token 外洩，把 URL 上的 token 參數移除
      urlParams.delete('token');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, document.title, newUrl);
      
      // 使用 token 拿取使用者資料
      api.get('/users/me/', { headers: { Authorization: `Bearer ${urlToken}` } })
        .then(res => {
          login(urlToken, res.data);
          setIsAuthLoading(false);
        })
        .catch(err => {
          console.error("Auto login failed", err);
          checkLocalToken(); // 若失敗，退回檢查 local storage
        });
    } else {
      checkLocalToken();
    }

    function checkLocalToken() {
      // 檢查 localStorage 中是否有 token
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user_profile');
      
      if (token && savedUser) {
        setIsLoggedIn(true);
        setUserProfile(JSON.parse(savedUser));
      }
      setIsAuthLoading(false);
    }

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
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
