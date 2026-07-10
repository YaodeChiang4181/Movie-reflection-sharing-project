import { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import StarRating from './StarRating';
import TagInput from './TagInput';
import api from '../api/axios';
import styles from './ReviewForm.module.css';

function ReviewForm({ onClose, onReviewAdded }) {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [movieId, setMovieId] = useState('');
  const [movies, setMovies] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch available movies for the dropdown
    const fetchMovies = async () => {
      try {
        const response = await api.get('movies/');
        setMovies(response.data.results || response.data);
      } catch (err) {
        console.error("Failed to fetch movies", err);
      }
    };
    fetchMovies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return setError('請填寫心得內容');
    if (!movieId) return setError('請選擇一部電影');
    if (rating === 0) return setError('請給予評分');

    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('reviews/', {
        movie_id: movieId,
        content: content,
        rating: rating,
        tag_names: tags,
        is_spoiler: false
      });
      
      if (onReviewAdded) {
        onReviewAdded(response.data);
      }
      onClose(); // 關閉表單
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
            <label>選擇電影名稱</label>
            <select 
              className="inputField" 
              value={movieId}
              onChange={(e) => setMovieId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">-- 請選擇電影 --</option>
              {movies.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label>評分</label>
            <div style={{ marginTop: '8px' }}>
              <StarRating initialRating={rating} onChange={setRating} />
            </div>
          </div>

          <div className="formGroup">
            <label>Hashtag 標籤 (按 Enter 建立)</label>
            <TagInput tags={tags} setTags={setTags} placeholder="例如: 神作, 必看" />
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
