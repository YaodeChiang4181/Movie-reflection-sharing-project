import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ProfileCard = () => {
  const { userProfile, isAuthLoading } = useAuth();
  
  const handleShare = async () => {
    if (!window.liff || !window.liff.isApiAvailable('shareTargetPicker')) {
      alert('您的環境不支援轉發功能');
      return;
    }
    
    try {
      await window.liff.shareTargetPicker([
        {
          type: 'text',
          text: `嗨！我是 ${userProfile?.line_display_name || userProfile?.username}，快來看看我的專屬影迷名片！`
        }
      ]);
      alert('分享成功！');
    } catch (err) {
      console.error(err);
    }
  };

  if (isAuthLoading) return <div style={{ padding: 20 }}>載入中...</div>;
  if (!userProfile) return <div style={{ padding: 20, color: 'red' }}>無法取得使用者資料，請確認已登入或綁定 LINE 帳號。</div>;

  // 嘗試取得使用者經驗值與等級
  const level = userProfile.experience?.level || 1;
  const exp = userProfile.experience?.exp || 0;

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '400px', 
      margin: '0 auto', 
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
        borderRadius: '15px',
        padding: '30px',
        color: 'white',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        marginBottom: '20px'
      }}>
        {/* 如果有 LINE 的頭像就顯示，沒有就顯示預設圖 */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ccc', margin: '0 auto 15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
           <span style={{fontSize: '40px'}}>🎬</span>
        </div>
        <h2 style={{ margin: '0 0 10px 0' }}>{userProfile.line_display_name || userProfile.username}</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>Lv. {level} 影迷 (EXP: {exp})</p>
        
        <div style={{
          marginTop: '20px',
          height: '200px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <p style={{ margin: 0 }}>[ 影迷風格雷達圖 ]</p>
        </div>
      </div>
      
      <button 
        onClick={handleShare}
        style={{ 
          backgroundColor: '#06C755', 
          color: 'white', 
          padding: '12px 24px', 
          border: 'none', 
          borderRadius: '25px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          width: '100%'
        }}>
        轉發我的名片
      </button>
    </div>
  );
};

export default ProfileCard;
