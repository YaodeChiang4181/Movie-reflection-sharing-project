import axios from 'axios';

// 透過 Vercel Rewrite 或 Vite Proxy 將請求轉發至後端，以解決跨網域 Cookie 被阻擋的問題
const baseURL = '/api/';

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
    // 防呆機制：若後端未正確轉發導致回傳了 index.html 前端頁面
    if (typeof response.data === 'string' && (response.data.trim().toLowerCase().startsWith('<!doctype') || response.data.trim().toLowerCase().startsWith('<html'))) {
      const err = new Error('API 端點回傳了 HTML 而非預期的 JSON（後端路由轉發異常）');
      err.response = response;
      return Promise.reject(err);
    }
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
