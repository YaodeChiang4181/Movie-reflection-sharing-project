import { useState } from 'react';
import { X, Send } from 'lucide-react';
import api from '../api/axios';
import styles from './ReviewForm.module.css';

function ReviewForm({ onClose, onReviewAdded }) {
  const [content, setContent] = useState('');
  const [movieId, setMovieId] = useState(''); // We'll use this state for movie_title now
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');



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
      const response = await api.post('reviews/', {
        movie_title: movieId.trim(),
        content: content,
        rating: 5, // 預設滿分，因使用者要求移除評分表單
        tag_names: parsedTags,
        is_spoiler: false
      });
      
      if (onReviewAdded) {
        onReviewAdded(response.data);
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        setError('請先登入後再發布心得！');
      } else {
        setError('發布失敗，請稍後再試。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formOverlay}>
      <div className={`glass ${styles.formContainer}`}>
        <div className={styles.formHeader}>
          <h2>撰寫電影心得</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        {error && <div className="errorBox">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.formBody}>
          <div className="formGroup">
            <textarea
              className={`inputField ${styles.largeTextarea}`}
              placeholder="分享你對這部電影最真實的感受..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="formGroup">
            <label>輸入電影名稱</label>
            <input 
              type="text"
              className="inputField" 
              placeholder="例如: 奧本海默"
              value={movieId}
              onChange={(e) => setMovieId(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="formGroup">
            <label>Hashtag 標籤 (請使用分號 ; 區隔，並以 # 開頭)</label>
            <input 
              type="text"
              className="inputField" 
              placeholder="例如: #神作;#必看"
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
            {isSubmitting ? '發布中...' : (
              <>
                <Send size={18} /> 發布心得
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReviewForm;
