import { useState } from 'react';
import { X, Send, Star } from 'lucide-react';
import api from '../api/axios';
import styles from './ReviewForm.module.css';

function ReviewForm({ onClose, onReviewAdded, initialData = null }) {
  const [content, setContent] = useState(initialData?.content || '');
  const [movieId, setMovieId] = useState(initialData?.movie?.title || '');
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.map(t => '#' + t.name).join('; ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(initialData?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return setError('請填寫心得內容');
    if (!movieId.trim()) return setError('請填寫電影名稱');

    // 解析 Hashtags
    let parsedTags = [];
    if (tagsInput.trim()) {
      const rawTags = tagsInput.split(';');
      for (let t of rawTags) {
        const cleanTag = t.trim();
        if (cleanTag) {
          if (!cleanTag.startsWith('#')) {
            return setError('Hashtag 標籤必須以 # 號開頭 (例如: #神作)');
          }
          // 移除 # 號後傳給後端
          parsedTags.push(cleanTag.substring(1));
        }
      }
    }

    // 將電影名稱自動加入 Hashtag
    const movieTag = movieId.trim();
    if (!parsedTags.includes(movieTag)) {
      parsedTags.push(movieTag);
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        movie_title: movieId.trim(),
        content: content,
        rating: rating,
        tag_names: parsedTags,
        is_spoiler: false
      };
      
      let response;
      if (initialData) {
        response = await api.patch(`reviews/${initialData.id}/`, payload);
      } else {
        response = await api.post('reviews/', payload);
      }
      
      if (onReviewAdded) {
        onReviewAdded(response.data, !!initialData);
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        setError('請先登入後再發布心得！');
      } else {
        const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        setError(`發布失敗，請稍後再試。錯誤訊息: ${errorMsg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formOverlay}>
      <div className={styles.formContainer}>
        <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>

        {error && <div className="errorBox">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.formBody}>
          <div className={styles.formGroupTop}>
            <label className={styles.mainLabel}>{initialData ? '編輯電影心得：' : '撰寫電影心得：'}</label>
            <textarea
              className={styles.largeTextarea}
              placeholder="分享你對這部電影最真實的感受..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroupInline}>
            <label>電影名稱：</label>
            <input 
              type="text"
              className={styles.customInput} 
              value={movieId}
              onChange={(e) => setMovieId(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroupInline}>
            <label>推薦指數：</label>
            <div style={{ display: 'flex', gap: '8px', cursor: 'pointer', padding: '10px 0' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  fill={(hoverRating || rating) >= star ? 'var(--accent-primary)' : 'none'}
                  color={(hoverRating || rating) >= star ? 'var(--accent-primary)' : 'var(--text-muted)'}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  style={{ transition: 'all 0.2s ease', outline: 'none' }}
                />
              ))}
            </div>
          </div>

          <div className={styles.formGroupInline}>
            <label>Hashtag 標籤：</label>
            <input 
              type="text"
              className={styles.customInput} 
              placeholder="(請使用分號 ; 區隔，並以 # 開頭)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button 
            type="submit" 
            className={`btn-primary ${styles.submitBtn}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (initialData ? '更新中...' : '發布中...') : (
              <>
                <Send size={18} /> {initialData ? '儲存變更' : '發布心得'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReviewForm;
