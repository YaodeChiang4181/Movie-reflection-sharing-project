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

// Response Interceptor: 統一錯誤處理 (例如 Token 過期 401 處理)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // 若收到 401 Unauthorized，代表 Token 過期或無效
    if (error.response && error.response.status === 401) {
      // 清除失效的 Token
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // 若有設定 routing，這邊可以強制導回登入頁
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
