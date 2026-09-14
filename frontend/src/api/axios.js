import axios from 'axios';

// 建立 Axios 實體，自動讀取 Vite 環境變數
let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/';
if (!baseURL.endsWith('/')) {
  baseURL += '/';
}

const api = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: 不再手動夾帶 Token，由瀏覽器自動帶上 Cookie
// Response Interceptor: 統一錯誤處理 (包含 Token 過期與自動刷新機制)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        if (originalRequest.url === 'auth/refresh/') {
          window.dispatchEvent(new Event('auth:logout'));
          return Promise.reject(error);
        }

        try {
          // Cookie 會自動帶上 refresh_token
          await axios.post(`${baseURL}auth/refresh/`, {}, { withCredentials: true });
          
          // 重發原本的請求（瀏覽器會自動帶上新的 access_token Cookie）
          return api(originalRequest);
        } catch (refreshError) {
          window.dispatchEvent(new Event('auth:logout'));
          return Promise.reject(refreshError);
        }
      } else {
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
