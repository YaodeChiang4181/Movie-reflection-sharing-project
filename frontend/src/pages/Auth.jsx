import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './Auth.module.css';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('user'); // 'user' or 'admin'
  const [formData, setFormData] = useState({
    campus_id: '',
    password: '',
    real_name: '',
    department: '',
    nickname: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (role === 'admin') {
      setError('管理者功能尚在開發中，請先使用一般使用者登入！');
      return;
    }

    try {
      if (isLogin) {
        // 登入流程
        const response = await api.post('auth/login/', {
          campus_id: formData.campus_id,
          password: formData.password
        });
        
        // CustomTokenObtainPairSerializer 會回傳 access, refresh 與 user 資訊
        login(response.data.access, response.data.user);
        localStorage.setItem('refresh_token', response.data.refresh);
        
        navigate('/'); // 登入後回到首頁，或由路由守衛決定跳轉
      } else {
        // 註冊流程
        await api.post('auth/register/', formData);
        alert('註冊成功！請登入。');
        setIsLogin(true); // 切換回登入畫面
      }
    } catch (err) {
      if (err.response && err.response.data) {
        // 擷取 Django DRF 回傳的第一個錯誤訊息
        const errorMsg = typeof err.response.data === 'object' 
          ? Object.values(err.response.data).flat()[0] 
          : err.response.data;
        setError(errorMsg || '發生錯誤，請稍後再試。');
      } else {
        setError('無法連線到伺服器。');
      }
    }
  };

  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={`glass ${styles.authCard}`}>
        <h2 className={styles.title}>{isLogin ? '登入影像製作所' : '註冊專屬帳號'}</h2>
        
        {/* 身分組選擇 */}
        <div className={styles.roleTabs}>
          <button 
            type="button" 
            className={`${styles.roleTab} ${role === 'user' ? styles.activeRole : ''}`}
            onClick={() => { setRole('user'); setError(''); }}
          >
            使用者
          </button>
          <button 
            type="button" 
            className={`${styles.roleTab} ${role === 'admin' ? styles.activeRole : ''}`}
            onClick={() => { setRole('admin'); setError(''); }}
          >
            管理者
          </button>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>校園 ID (Campus ID)</label>
            <input 
              type="text" 
              name="campus_id" 
              value={formData.campus_id} 
              onChange={handleChange} 
              required 
            />
          </div>

          {!isLogin && (
            <>
              <div className={styles.inputGroup}>
                <label>真實姓名 (Real Name)</label>
                <input 
                  type="text" 
                  name="real_name" 
                  value={formData.real_name} 
                  onChange={handleChange} 
                  required={!isLogin} 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>科系 (Department)</label>
                <input 
                  type="text" 
                  name="department" 
                  value={formData.department} 
                  onChange={handleChange} 
                  required={!isLogin} 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>公開登入代碼/暱稱 (Nickname)</label>
                <input 
                  type="text" 
                  name="nickname" 
                  value={formData.nickname} 
                  onChange={handleChange} 
                  required={!isLogin} 
                />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label>密碼 (Password)</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
            />
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
            {isLogin ? '登入' : '註冊'}
          </button>
        </form>

        <p className={styles.toggleText}>
          {isLogin ? '還沒有帳號嗎？' : '已經有帳號了？'}
          <button type="button" onClick={() => setIsLogin(!isLogin)} className={styles.toggleBtn}>
            {isLogin ? '立即註冊' : '馬上登入'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
