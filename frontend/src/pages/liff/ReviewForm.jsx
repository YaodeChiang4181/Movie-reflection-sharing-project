import React, { useState, useEffect } from 'react';
import liff from '@line/liff';

const ReviewForm = () => {
  const [movie, setMovie] = useState('');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 嚴謹的變數宣告與環境確認
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
        }
      })
      .catch((err) => {
        setError('LIFF 初始化失敗');
        console.error(err);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!movie.trim() || !content.trim()) {
      alert('請填寫完整資訊');
      return;
    }

    try {
      // 假設後端有一個專門收 LIFF 心得的 API
      // const idToken = liff.getIDToken();
      // await axios.post('/api/line/liff/review/', { movie, rating, content }, { headers: { Authorization: `Bearer ${idToken}` } });
      
      // 實務上也可以直接利用 liff.sendMessages 傳送字串讓後端 webhook 處理
      await liff.sendMessages([
        {
          type: 'text',
          text: `#心得\n電影：${movie}\n評分：${rating}\n心得：\n${content}`
        }
      ]);
      
      // 送出後關閉 LIFF 視窗
      liff.closeWindow();
    } catch (err) {
      console.error(err);
      alert('傳送失敗，請重試');
    }
  };

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  }

  if (!isLiffReady) {
    return <div style={{ padding: 20 }}>載入中...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: 'bold' }}>發布心得</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>電影名稱</label>
          <input 
            type="text" 
            value={movie}
            onChange={(e) => setMovie(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            placeholder="請輸入電影名稱"
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>評分 (1-5)</label>
          <input 
            type="number" 
            min="1" max="5"
            value={rating}
            onChange={(e) => setRating(parseInt(e.target.value) || 5)}
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>心得內容</label>
          <textarea 
            rows="5"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            placeholder="請輸入您的心得..."
            required
          ></textarea>
        </div>
        <button 
          type="submit" 
          style={{ 
            backgroundColor: '#06C755', 
            color: 'white', 
            padding: '12px', 
            border: 'none', 
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
          送出心得
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;
