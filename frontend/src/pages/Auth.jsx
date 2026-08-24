import { useState, useEffect } from 'react';
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
  
  // Verification states
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendVerification = async () => {
    const emailToVerify = role === 'student' ? formData.school_email : formData.email;
    if (!emailToVerify) {
      setError('請先填寫信箱');
      return;
    }
    
    setIsSendingCode(true);
    setError('');
    try {
      await api.post('auth/send-verification/', { email: emailToVerify });
      alert('驗證碼已發送，請至信箱收取');
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || '發送驗證碼失敗');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    const emailToVerify = role === 'student' ? formData.school_email : formData.email;
    if (!emailToVerify || !verificationCode) {
      setError('請輸入驗證碼');
      return;
    }
    
    try {
      await api.post('auth/verify-email/', { email: emailToVerify, code: verificationCode });
      setIsEmailVerified(true);
      setError('');
      alert('信箱驗證成功！');
    } catch (err) {
      setError(err.response?.data?.error || '驗證碼錯誤或已過期');
    }
  };

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
        if (!isEmailVerified) {
          setError('請先完成信箱驗證');
          return;
        }
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

  const handleLineLogin = async () => {
    try {
      if (window.liff && import.meta.env.VITE_LIFF_ID) {
        if (!window.liff.isLoggedIn()) {
          // 初始化 LIFF
          await window.liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
          // 導向至 LINE 登入頁面 (登入後會回到當前網址 /auth)
          window.liff.login({ redirectUri: window.location.href }); 
        } else {
           alert('已經使用 LINE 登入了');
        }
      } else {
        alert('未配置 LINE 登入 (LIFF ID 缺失)');
      }
    } catch (err) {
      console.error('LINE 登入錯誤:', err);
      setError('LINE 登入發生錯誤');
    }
  };

  const handleGoogleLogin = () => {
    alert('Google 登入功能即將推出！');
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
                disabled={!isLogin && isEmailVerified}
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
                      disabled={isEmailVerified}
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

              {/* 信箱驗證區塊 (註冊時顯示) */}
              <div className={styles.inputGroup}>
                <label>信箱驗證</label>
                {!isEmailVerified ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={handleSendVerification}
                      disabled={isSendingCode || cooldown > 0}
                      className={styles.verifyBtn}
                      style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: (isSendingCode || cooldown > 0) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {isSendingCode ? '發送中...' : cooldown > 0 ? `${cooldown}秒後重試` : '發送驗證碼'}
                    </button>
                    <input 
                      type="text" 
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="6位數驗證碼"
                      maxLength={6}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    <button 
                      type="button"
                      onClick={handleVerifyEmail}
                      style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      驗證
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', fontWeight: 'bold' }}>
                    ✅ 信箱已驗證成功
                  </div>
                )}
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

          <button 
            type="submit" 
            className={`btn-primary ${styles.submitBtn}`}
            disabled={!isLogin && !isEmailVerified}
            style={(!isLogin && !isEmailVerified) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            {isLogin ? '登入' : '註冊'}
          </button>
        </form>

        {isLogin && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>或</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleLineLogin}
                style={{
                  flex: 1,
                  backgroundColor: '#06C755',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  {/* 對話框背景 */}
                  <path fill="currentColor" d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.12.298.079.76.038 1.077l-.164.982c-.05.302-.236 1.152 1.011.627 1.246-.525 6.723-3.957 8.949-6.615C22.956 14.542 24 12.562 24 10.304z" />
                  {/* LINE 文字 (綠色) - 使用標準 text 標籤確保 100% 不破圖 */}
                  <text x="12" y="11" fill="#06C755" fontSize="6.5" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" dominantBaseline="central" letterSpacing="-0.3">LINE</text>
                </svg>
                <span>LINE 登入</span>
              </button>
              
              <button
                type="button"
                onClick={handleGoogleLogin}
                style={{
                  flex: 1,
                  backgroundColor: 'white',
                  color: '#3c4043',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <svg width="28" height="28" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>Gmail 登入</span>
              </button>
            </div>
          </div>
        )}

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
