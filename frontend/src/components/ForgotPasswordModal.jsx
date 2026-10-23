import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

const ForgotPasswordModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [step, setStep] = useState(1); // 1: 身分識別, 2: 驗證碼與新密碼, 3: 完成通知
  const [identifier, setIdentifier] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  
  // Step 2 表單狀態
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 狀態與錯誤反饋
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const identifierInputRef = useRef(null);
  const codeInputRef = useRef(null);

  // 彈窗開啟時重置狀態與聚焦
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIdentifier('');
      setTargetEmail('');
      setMaskedEmail('');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setTimeout(() => {
        identifierInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // 60 秒發信冷卻倒數計時
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 按 Esc 鍵快速關閉
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 步驟一：送出身分查詢並獲取驗證碼
  const handleRequestCode = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('請輸入常用信箱、學號或公開暱稱');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/forgot-password/', { identifier: identifier.trim() });
      const masked = res.data?.masked_email;
      setMaskedEmail(masked || '');
      // 若使用者當初輸入的就是信箱，直接帶入；若輸入學號/暱稱，由後端在重設時依該信箱或 identifier 查找
      setTargetEmail(identifier.includes('@') ? identifier.trim() : (res.data?.email || identifier.trim()));
      setStep(2);
      setCooldown(60);
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || '發送失敗，請稍後再試';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 重發驗證碼
  const handleResendCode = async () => {
    if (cooldown > 0 || isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password/', { identifier: identifier.trim() });
      setCooldown(60);
    } catch (err) {
      const errMsg = err.response?.data?.error || '重新發送失敗，請稍後再試';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 步驟二：送出驗證碼與設定新密碼
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!code.trim() || code.trim().length !== 6) {
      setError('請輸入 6 位數驗證碼');
      return;
    }
    if (!newPassword) {
      setError('請輸入新密碼');
      return;
    }
    if (newPassword.length < 8) {
      setError('新密碼長度至少需 8 個字元');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('兩次輸入的新密碼不一致');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post('/auth/reset-password/', {
        email: targetEmail,
        code: code.trim(),
        new_password: newPassword
      });

      setStep(3);

      // 步驟三：展示成功動畫並無縫自動登入
      setTimeout(() => {
        if (res.data?.user && onLoginSuccess) {
          onLoginSuccess(res.data.user);
        }
        onClose();
      }, 1600);

    } catch (err) {
      const errMsg = err.response?.data?.error || '驗證碼錯誤或過期，請確認後重試';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 8, 7, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          padding: '36px 32px',
          borderRadius: '24px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(224, 160, 58, 0.15)',
          animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 右上角關閉按鈕 */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: 'var(--text-muted)',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s, background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="關閉彈窗"
        >
          <X size={20} />
        </button>

        {/* 步驟 1：輸入信箱 / 學號 / 暱稱 */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(224, 160, 58, 0.15)',
                  border: '1px solid rgba(224, 160, 58, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)'
                }}
              >
                <Key size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                找回帳號與密碼
              </h3>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              請輸入您的常用信箱、學號或公開暱稱。系統將寄送包含您的專屬帳號資訊與 6 碼驗證碼至登記信箱。
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid var(--danger)',
                  color: '#fca5a5',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  marginBottom: '18px',
                  lineHeight: '1.4'
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleRequestCode} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  常用信箱、學號或公開暱稱
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    ref={identifierInputRef}
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="例: student@cc.ncu.edu.tw 或 學號"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                      e.target.style.boxShadow = '0 0 0 2px rgba(224, 160, 58, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginTop: '6px',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? '處理中...' : (
                  <>
                    <span>發送重設驗證信</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 步驟 2：輸入 6 碼驗證碼與設定新密碼 */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(224, 160, 58, 0.15)',
                  border: '1px solid rgba(224, 160, 58, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)'
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                輸入驗證碼並設定新密碼
              </h3>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {maskedEmail ? (
                <>
                  驗證信與帳號資訊已發送至 <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{maskedEmail}</span>
                </>
              ) : (
                '驗證信已發送至登記信箱，請至收件匣（或垃圾信件）收取 6 位數代碼。'
              )}
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid var(--danger)',
                  color: '#fca5a5',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                  lineHeight: '1.4'
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 驗證碼輸入 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    6 位數驗證碼
                  </label>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={cooldown > 0 || isLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: cooldown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                      fontSize: '0.82rem',
                      cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={12} />
                    {cooldown > 0 ? `${cooldown} 秒後可重發` : '重新發送'}
                  </button>
                </div>
                <input
                  ref={codeInputRef}
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="請輸入 6 碼數字"
                  maxLength={6}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '1.1rem',
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: '3px',
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent-primary)';
                    e.target.style.boxShadow = '0 0 0 2px rgba(224, 160, 58, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* 新密碼 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  設定新密碼 (至少 8 字元)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock
                    size={18}
                    style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)', pointerEvents: 'none' }}
                  />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="請輸入新密碼"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                      e.target.style.boxShadow = '0 0 0 2px rgba(224, 160, 58, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* 確認新密碼 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  確認新密碼
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock
                    size={18}
                    style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)', pointerEvents: 'none' }}
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次輸入新密碼"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                      e.target.style.boxShadow = '0 0 0 2px rgba(224, 160, 58, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    flex: '0 0 80px',
                    padding: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '10px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  上一步
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? '重設中...' : '確認重設並立即登入'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 步驟 3：成功回饋動畫 */}
        {step === 3 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '24px 0'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '2px solid var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
                marginBottom: '16px',
                animation: 'pulse 1.2s ease infinite'
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: 'var(--text-primary)' }}>
              密碼重設成功！
            </h3>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)' }}>
              已為您更新認證憑證，正在無縫進入映後時光...
            </p>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes scaleIn {
            from { transform: scale(0.93); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
          }
        `}
      </style>
    </div>
  );
};

export default ForgotPasswordModal;
