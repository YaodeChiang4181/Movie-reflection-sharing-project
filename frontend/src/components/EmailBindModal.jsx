import React, { useState } from 'react';
import { Mail, Shield, Check, X, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import styles from './EmailBindModal.module.css';

export default function EmailBindModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: Input Email, 2: Input Code
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { fetchUserProfile } = useAuth();

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      alert('請輸入有效的信箱');
      return;
    }
    
    try {
      setIsLoading(true);
      await api.post('/auth/send-verification/', { email });
      setStep(2);
      setCountdown(60);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err) {
      alert(err.response?.data?.error || '發送失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      alert('請輸入 6 碼驗證碼');
      return;
    }
    
    try {
      setIsLoading(true);
      const res = await api.post('/auth/bind-email/', { email, code });
      
      alert(`🎉 綁定成功！您獲得了 20 EXP！`);
      
      // Refresh user profile
      if (fetchUserProfile) await fetchUserProfile();
      
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || '驗證失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className={styles.iconContainer}>
          <Shield size={32} className={styles.icon} />
        </div>
        
        <h2 className={styles.title}>綁定電子信箱</h2>
        <p className={styles.desc}>
          綁定常用信箱，即可解鎖「每晚 21:00 影迷日報」功能！完成綁定後再送您 <strong style={{ color: '#a855f7' }}>+20 EXP</strong> 獎勵！
        </p>

        {step === 1 ? (
          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input
                type="email"
                placeholder="輸入您的常用信箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
            </div>
            <button 
              className={styles.primaryBtn} 
              onClick={handleSendCode}
              disabled={isLoading || !email}
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : '發送驗證碼'}
            </button>
          </div>
        ) : (
          <div className={styles.inputGroup}>
            <p className={styles.hint}>驗證碼已發送至 {email}</p>
            <div className={styles.inputWrapper}>
              <Check className={styles.inputIcon} size={18} />
              <input
                type="text"
                maxLength={6}
                placeholder="輸入 6 碼驗證碼"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={styles.input}
                style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </div>
            <button 
              className={styles.primaryBtn} 
              onClick={handleVerify}
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : '確認綁定'}
            </button>
            <button 
              className={styles.secondaryBtn} 
              onClick={handleSendCode}
              disabled={countdown > 0 || isLoading}
            >
              {countdown > 0 ? `${countdown}秒後可重新發送` : '重新發送驗證碼'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
