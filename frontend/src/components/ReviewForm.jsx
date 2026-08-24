import { useState, useRef, useEffect } from 'react';
import { X, Send, Star, Search, Loader2 } from 'lucide-react';
import api from '../api/axios';
import styles from './ReviewForm.module.css';

function ReviewForm({ onClose, onReviewAdded, initialData = null, prefilledMovieTitle = '' }) {
  const [content, setContent] = useState(initialData?.content || '');
  const [movieTitle, setMovieTitle] = useState(initialData?.movie?.title || prefilledMovieTitle);
  const [selectedTmdbId, setSelectedTmdbId] = useState(initialData?.movie?.tmdb_id || null);
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.map(t => '#' + t.name).join('; ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(initialData?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMovieTitleChange = (e) => {
    const val = e.target.value;
    setMovieTitle(val);
    setSelectedTmdbId(null);
    
    if (val.trim().length >= 1) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await api.get(`movies/search_tmdb/?q=${encodeURIComponent(val)}`);
          setSearchResults(res.data);
          setShowDropdown(true);
        } catch (err) {
          console.error('Search error', err);
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelectMovie = (movie) => {
    setMovieTitle(movie.title);
    setSelectedTmdbId(movie.tmdb_id);
    setShowDropdown(false);
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    // 允許無內容的簡易評分貼文
    // if (!content.trim()) return setError('請填寫心得內容');
    if (!movieTitle.trim()) return setError('請填寫電影名稱');

    // 解析 Hashtags (用 # 切割並移除空白和分號)
    let parsedTags = [];
    if (tagsInput.trim()) {
      const rawTags = tagsInput.includes('#') ? tagsInput.split('#') : [tagsInput];
      rawTags.forEach(rawTag => {
        const cleanedTag = rawTag.replace(/[\s;]/g, '');
        if (cleanedTag && !parsedTags.includes(cleanedTag)) {
          parsedTags.push(cleanedTag);
        }
      });
      if (parsedTags.length === 0 && tagsInput.replace(/[\s;]/g, '').length > 0) {
        return setError('請使用 # 來標記標籤 (例如: #神作 #動作片)');
      }
    }

    // 將電影名稱自動加入 Hashtag
    const movieTag = movieTitle.trim();
    if (!parsedTags.includes(movieTag)) {
      parsedTags.push(movieTag);
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        movie_title: movieTitle.trim(),
        content: content,
        rating: rating,
        tag_names: parsedTags,
        is_spoiler: false
      };
      
      if (selectedTmdbId) {
        payload.tmdb_id = selectedTmdbId;
      }
      
      let response;
      if (initialData) {
        response = await api.patch(`reviews/${initialData.id}/`, payload);
      } else {
        response = await api.post('reviews/', payload);
      }
      
      // 若 API 呼叫成功，就直接關閉視窗，避免後續 UI callback 錯誤導致使用者誤以為發文失敗
      try {
        if (onReviewAdded) {
          onReviewAdded(response.data, !!initialData);
        }
      } catch (cbErr) {
        console.error("Callback error (ignored for submission):", cbErr);
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
            <div className={styles.autocompleteContainer} ref={dropdownRef}>
              <div className={styles.inputWrapper}>
                <input 
                  type="text"
                  className={styles.customInput} 
                  value={movieTitle}
                  onChange={handleMovieTitleChange}
                  placeholder="輸入電影名稱搜尋..."
                  disabled={isSubmitting}
                />
                {isSearching && <Loader2 className={styles.searchIcon} size={18} />}
                {!isSearching && selectedTmdbId && <div className={styles.successBadge}>已綁定</div>}
              </div>
              
              {showDropdown && searchResults.length > 0 && (
                <div className={styles.dropdownMenu}>
                  {searchResults.map((movie) => (
                    <div 
                      key={movie.tmdb_id} 
                      className={styles.dropdownItem}
                      onClick={() => handleSelectMovie(movie)}
                    >
                      {movie.poster_url ? (
                        <img src={movie.poster_url} alt="poster" className={styles.dropdownPoster} />
                      ) : (
                        <div className={styles.dropdownPosterPlaceholder}>無</div>
                      )}
                      <div className={styles.dropdownInfo}>
                        <div className={styles.dropdownTitle}>{movie.title}</div>
                        <div className={styles.dropdownMeta}>
                          {movie.original_title} ({movie.year})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              placeholder="(請以 # 開頭，例如：#動作片 #好雷,必看)"
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
