import axios from 'axios';

// 建立 Axios 實體，自動讀取 Vite 環境變數
let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/';
if (!baseURL.endsWith('/')) {
  baseURL += '/';
}

const api = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: 自動夾帶 JWT Token (銜接後端的 IsAuthenticated 權限)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: 統一錯誤處理 (包含 Token 過期與自動刷新機制)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 若收到 401 Unauthorized，且尚未重試過
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      // 避免因為向 refresh 端點請求 401 而陷入無窮迴圈
      if (originalRequest.url === 'auth/refresh/') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_profile');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }

      if (refreshToken) {
        try {
          // 嘗試使用 refresh_token 換取新的 access_token
          const response = await axios.post(`${baseURL}auth/refresh/`, {
            refresh: refreshToken
          });
          
          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          
          // 更新原本請求的 Token 並重新發送
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // 若 refresh_token 也過期，則徹底清除本機狀態並登出
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_profile');
          window.dispatchEvent(new Event('auth:logout'));
          return Promise.reject(refreshError);
        }
      } else {
        // 沒有 refresh_token 的情況下，直接清除並登出
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_profile');
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
