import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import liff from '@line/liff';

const CampaignScan = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('初始化中...');
  const [error, setError] = useState('');

  useEffect(() => {
    const campaignId = searchParams.get('campaign_id');
    const liffId = import.meta.env.VITE_LIFF_ID;
    
    if (!campaignId) {
      setError('無效的活動連結');
      return;
    }
    if (!liffId) {
      setError('VITE_LIFF_ID 未設定');
      return;
    }

    liff.init({ liffId })
      .then(() => {
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          handleCheckIn(campaignId);
        }
      })
      .catch((err) => {
        setError('LIFF 初始化失敗');
        console.error(err);
      });
  }, [searchParams]);

  const handleCheckIn = async (campaignId) => {
    setStatus('正在驗證身分並解鎖成就...');
    try {
      // 取得使用者的 Access Token 或 ID Token 傳給後端
      // const idToken = liff.getIDToken();
      // await axios.post('/api/campaigns/checkin/', { campaign_id: campaignId }, { headers: { Authorization: `Bearer ${idToken}` } });
      
      // 由於這是一個範例，我們模擬 API 呼叫延遲
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatus('✅ 成就解鎖成功！您已獲得光點駐店影評人徽章！');
      
      // 成功後也可以主動讓官方帳號發送確認訊息給用戶
      // 這邊可以透過 liff.sendMessages 發送一串特定文字，後端收到後回傳卡片
      await liff.sendMessages([
        {
          type: 'text',
          text: `#解鎖活動 ${campaignId}`
        }
      ]);
      
    } catch (err) {
      console.error(err);
      setError('解鎖失敗，請確認您是否已經領取過，或稍後再試。');
    }
  };

  if (error) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>❌</div>
        <div style={{ color: 'red', fontWeight: 'bold' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '40px 20px', 
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      {status.includes('成功') ? (
        <>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ color: '#06C755', marginBottom: '10px' }}>恭喜！</h2>
        </>
      ) : (
        <div style={{ fontSize: '40px', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>⏳</div>
      )}
      
      <p style={{ fontSize: '18px', lineHeight: '1.5', color: '#333' }}>
        {status}
      </p>
      
      {status.includes('成功') && (
        <button 
          onClick={() => liff.closeWindow()}
          style={{
            marginTop: '30px',
            backgroundColor: '#06C755',
            color: 'white',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '25px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          關閉視窗
        </button>
      )}
    </div>
  );
};

export default CampaignScan;
