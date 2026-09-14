import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    // 監聽來自 Axios 攔截器的全局登出事件
    const handleLogout = () => {
      setIsLoggedIn(false);
      setUserProfile(null);
    };
    window.addEventListener('auth:logout', handleLogout);

    // 檢查 URL 中是否有 auto-login code (來自 LINE Bot 等)
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('auth_code');
    
    // 一次性清理舊的 localStorage Token (因改版廢棄)
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    if (authCode) {
      // 為了畫面乾淨，把 URL 上的 auth_code 參數移除
      urlParams.delete('auth_code');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, document.title, newUrl);
      
      api.post('/auth/exchange-code/', { code: authCode })
        .then(res => {
          login(res.data.user);
        })
        .catch(err => {
          console.error("Auto login failed", err);
          fallbackToLiffOrLocal();
        });
    } else {
      fallbackToLiffOrLocal();
    }

    async function fallbackToLiffOrLocal() {
      // 嘗試 LIFF 自動登入
      if (window.liff && import.meta.env.VITE_LIFF_ID) {
        try {
          await window.liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
          if (window.liff.isInClient() || window.liff.isLoggedIn()) {
            const accessToken = window.liff.getAccessToken();
            if (accessToken) {
              const res = await api.post('/auth/line-login/', { access_token: accessToken });
              login(res.data.user);
              return;
            }
          }
        } catch (err) {
          console.error('LIFF Login failed', err);
        }
      }
      checkLocalToken();
    }

    async function checkLocalToken() {
      const savedUser = localStorage.getItem('user_profile');
      
      // 就算 localStorage 沒存 user_profile，也可能存在 HttpOnly Cookie，所以主動向後端確認
      try {
        const res = await api.get('/users/me/');
        login(res.data);
      } catch (err) {
        // 如果連線失敗或 Cookie 真的無效 (401)，則視為未登入
        setIsLoggedIn(false);
        setUserProfile(null);
        localStorage.removeItem('user_profile');
        setIsAuthLoading(false);
      }
    }

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  useEffect(() => {
    let intervalId;
    if (isLoggedIn) {
      // 初始取得未讀通知
      fetchUnreadCount();
      // 30秒輪詢一次
      intervalId = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoggedIn]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread_count/');
      setUnreadCount(res.data.count || 0);
      setNotificationCount(res.data.notification_count || 0);
      setMessageCount(res.data.message_count || 0);
    } catch (error) {
      console.error("Failed to fetch notifications count", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/users/me/');
      setUserProfile(res.data);
      localStorage.setItem('user_profile', JSON.stringify(res.data));
    } catch (err) {
      console.error("Failed to fetch user profile", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const login = (user) => {
    // 不再儲存 Token！Cookie 由後端控制
    localStorage.setItem('user_profile', JSON.stringify(user));
    setIsLoggedIn(true);
    setUserProfile(user);
    setIsAuthLoading(false);  // 確保 login() 後 loading 狀態一定歸 false
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
    localStorage.removeItem('user_profile');
    setIsLoggedIn(false);
    setUserProfile(null);
    if (window.liff && typeof window.liff.isLoggedIn === 'function' && window.liff.isLoggedIn()) {
      window.liff.logout();
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userProfile, isAuthLoading, login, logout, fetchUserProfile, unreadCount, setUnreadCount, notificationCount, setNotificationCount, messageCount, setMessageCount }}>
      {children}
    </AuthContext.Provider>
  );
};
