import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './Auth.module.css';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('student'); // 'student' or 'outsider'
  const [formData, setFormData] = useState({
    campus_id: '',
    password: '',
    real_name: '',
    department: '',
    school_email: '',
    nickname: '',
    email: '',
    occupation: ''
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



    try {
      if (isLogin) {
        // 登入流程
        const loginData = {
          campus_id: role === 'outsider' ? formData.email : formData.campus_id,
          password: formData.password
        };
        const response = await api.post('auth/login/', loginData);
        
        // CustomTokenObtainPairSerializer 會回傳 access, refresh 與 user 資訊
        login(response.data.access, response.data.user);
        localStorage.setItem('refresh_token', response.data.refresh);
        
        navigate('/'); // 登入後回到首頁，或由路由守衛決定跳轉
      } else {
        // 註冊流程
        let registerData = {
          password: formData.password,
          real_name: formData.real_name,
          nickname: formData.nickname
        };

        if (role === 'outsider') {
          registerData = {
            ...registerData,
            is_outsider: true,
            email: formData.email,
            occupation: formData.occupation
          };
        } else {
          registerData = {
            ...registerData,
            is_outsider: false,
            campus_id: formData.campus_id,
            department: formData.department,
            school_email: formData.school_email
          };
        }
        await api.post('auth/register/', registerData);
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
            className={`${styles.roleTab} ${role === 'student' ? styles.activeRole : ''}`}
            onClick={() => { setRole('student'); setError(''); }}
          >
            校內教職/學生
          </button>
          <button 
            type="button" 
            className={`${styles.roleTab} ${role === 'outsider' ? styles.activeRole : ''}`}
            onClick={() => { setRole('outsider'); setError(''); }}
          >
            校外使用者
          </button>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {role === 'student' ? (
            <div className={styles.inputGroup}>
              <label>校園 ID / 學號 (Campus ID)</label>
              <input 
                type="text" 
                name="campus_id" 
                value={formData.campus_id} 
                onChange={handleChange} 
                required 
                pattern="[a-zA-Z0-9]{9}"
                title="請輸入剛好 9 碼的學號"
                placeholder="例如: xxxxxxxxx"
              />
            </div>
          ) : (
            <div className={styles.inputGroup}>
              <label>登入信箱 (Email)</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                placeholder="您的常用信箱"
              />
            </div>
          )}

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
              
              {role === 'student' ? (
                <>
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
                    <label>學校信箱 (School Email)</label>
                    <input 
                      type="email" 
                      name="school_email" 
                      value={formData.school_email} 
                      onChange={handleChange} 
                      required={!isLogin} 
                      pattern=".*@cc\.ncu\.edu\.tw$"
                      title="必須使用中央大學信箱 (結尾為 @cc.ncu.edu.tw)"
                      placeholder="student@cc.ncu.edu.tw"
                    />
                  </div>
                </>
              ) : (
                <div className={styles.inputGroup}>
                  <label>職業 (Occupation)</label>
                  <input 
                    type="text" 
                    name="occupation" 
                    value={formData.occupation} 
                    onChange={handleChange} 
                    required={!isLogin} 
                  />
                </div>
              )}

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
