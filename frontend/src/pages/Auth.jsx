import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import styles from './Auth.module.css';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    nickname: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        // 登入流程
        const response = await api.post('auth/login/', {
          username: formData.username,
          password: formData.password
        });
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        navigate('/profile');
      } else {
        // 註冊流程：前端先初步檢核網域
        if (!formData.email.endsWith('@g.ncu.edu.tw')) {
          setError('必須使用 @g.ncu.edu.tw 網域的信箱進行註冊。');
          return;
        }
        
        await api.post('auth/register/', formData);
        alert('註冊成功！請登入。');
        setIsLogin(true); // 切換回登入畫面
      }
    } catch (err) {
      if (err.response && err.response.data) {
        // 擷取 Django DRF 回傳的第一個錯誤訊息
        const errorMsg = Object.values(err.response.data).flat()[0];
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
        
        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>帳號 (Username)</label>
            <input 
              type="text" 
              name="username" 
              value={formData.username} 
              onChange={handleChange} 
              required 
            />
          </div>

          {!isLogin && (
            <>
              <div className={styles.inputGroup}>
                <label>學校信箱 (@g.ncu.edu.tw)</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required={!isLogin} 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>暱稱 (Nickname)</label>
                <input 
                  type="text" 
                  name="nickname" 
                  value={formData.nickname} 
                  onChange={handleChange} 
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
