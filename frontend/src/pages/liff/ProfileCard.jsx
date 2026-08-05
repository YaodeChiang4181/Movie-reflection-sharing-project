import React, { useState, useEffect } from 'react';
import liff from '@line/liff';

const ProfileCard = () => {
  const [profile, setProfile] = useState(null);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const liffId = import.meta.env.VITE_LIFF_ID;
    if (!liffId) {
      setError('VITE_LIFF_ID 未設定');
      return;
    }

    liff.init({ liffId })
      .then(() => {
        setIsLiffReady(true);
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          liff.getProfile().then(p => setProfile(p));
        }
      })
      .catch((err) => {
        setError('LIFF 初始化失敗');
        console.error(err);
      });
  }, []);

  const handleShare = async () => {
    if (!liff.isApiAvailable('shareTargetPicker')) {
      alert('您的環境不支援轉發功能');
      return;
    }
    
    try {
      await liff.shareTargetPicker([
        {
          type: 'text',
          text: `嗨！我是 ${profile?.displayName}，快來看看我的專屬影迷名片！`
        }
        // 實務上可以傳送 Flex Message 卡片，包含 Canva 繪製的雷達圖截圖 URL
      ]);
      alert('分享成功！');
    } catch (err) {
      console.error(err);
    }
  };

  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  if (!isLiffReady || !profile) return <div style={{ padding: 20 }}>載入中...</div>;

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '400px', 
      margin: '0 auto', 
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      {/* 這裡可以疊加由 Canva 設計的背景圖 */}
      <div style={{
        background: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
        borderRadius: '15px',
        padding: '30px',
        color: 'white',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        marginBottom: '20px'
      }}>
        <img 
          src={profile.pictureUrl} 
          alt="Avatar" 
          style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '15px' }}
        />
        <h2 style={{ margin: '0 0 10px 0' }}>{profile.displayName}</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>Lv. 10 獨立製片信徒</p>
        
        {/* 雷達圖 Canvas 區塊 (預留給 Chart.js) */}
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
