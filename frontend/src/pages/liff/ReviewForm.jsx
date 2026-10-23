import React, { useState, useEffect } from 'react';
import liff from '@line/liff';

const PRESET_TAGS = ['院線熱映', '週末放鬆', '燒腦神作', '催淚神片', '冷門佳作'];

const ReviewForm = () => {
  const [movie, setMovie] = useState('');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 讀取 URL 預填參數
    const searchParams = new URLSearchParams(window.location.search);
    const prefilledTitle = searchParams.get('title') || '';
    const prefilledRating = parseInt(searchParams.get('rating'), 10);
    
    if (prefilledTitle) setMovie(prefilledTitle);
    if (prefilledRating && prefilledRating >= 1 && prefilledRating <= 5) {
      setRating(prefilledRating);
    }

    const liffId = import.meta.env.VITE_LIFF_ID;
    if (!liffId) {
      setIsLiffReady(true);
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
        console.error('LIFF 初始化失敗:', err);
        setIsLiffReady(true);
      });
  }, []);

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!movie.trim()) {
      alert('請填寫電影名稱');
      return;
    }

    setIsSubmitting(true);

    try {
      // 組合標籤與防雷前綴
      const tagsString = selectedTags.map((t) => `#${t}`).join(' ');
      const spoilerPrefix = isSpoiler ? '#防雷 ' : '';
      const fullText = `${spoilerPrefix}${content.trim()} ${tagsString}`.trim();

      if (liff.isLoggedIn()) {
        await liff.sendMessages([
          {
            type: 'text',
            text: fullText || `${movie} ${rating}星`
          }
        ]);
        liff.closeWindow();
      } else {
        alert('心得已就緒。請在聊天視窗中確認送出。');
      }
    } catch (err) {
      console.error(err);
      alert('傳送失敗，請重試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLiffReady) {
    return (
      <div style={{ backgroundColor: '#121212', minHeight: '100vh', color: '#888888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        載入中...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh', color: '#F0F0F0', padding: '24px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        <header style={{ marginBottom: '24px', borderBottom: '1px solid #262626', paddingBottom: '16px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: '#888888', fontWeight: 'bold', marginBottom: '6px' }}>
            REVIEW STUDIO / 觀影筆記
          </div>
          <h1 style={{ fontSize: '20px', margin: 0, fontWeight: '600', color: '#F0F0F0' }}>
            {movie ? `《${movie}》` : '撰寫觀影心得'}
          </h1>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!movie && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#AAAAAA', marginBottom: '8px' }}>
                電影名稱
              </label>
              <input
                type="text"
                value={movie}
                onChange={(e) => setMovie(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="例如：沙丘、奧本海默"
                required
              />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', color: '#AAAAAA' }}>評分</label>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#C5A059' }}>
                {rating}.0 / 5.0
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    backgroundColor: rating === num ? '#C5A059' : '#1A1A1A',
                    color: rating === num ? '#121212' : '#888888',
                    border: rating === num ? '1px solid #C5A059' : '1px solid #333333',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#AAAAAA', marginBottom: '8px' }}>
              心得短評
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: '#1A1A1A',
                border: '1px solid #333333',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '14px',
                lineHeight: '1.6',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
              placeholder="寫下這部電影留在你心底的台詞、氛圍或觀後感..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#AAAAAA', marginBottom: '8px' }}>
              情境標籤
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isSelected ? 'rgba(197, 160, 89, 0.15)' : '#1A1A1A',
                      color: isSelected ? '#C5A059' : '#888888',
                      border: isSelected ? '1px solid #C5A059' : '1px solid #2C2C2C',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '12px 14px', backgroundColor: '#1A1A1A', borderRadius: '6px', border: '1px solid #2A2A2A' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                style={{ accentColor: '#C5A059', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '13px', color: isSpoiler ? '#E07A5F' : '#AAAAAA' }}>
                防雷保護（內文包含關鍵情節或結局透露）
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '8px',
              padding: '14px',
              backgroundColor: '#C5A059',
              color: '#121212',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '1px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? '正在發布...' : '確認歸檔心得'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
