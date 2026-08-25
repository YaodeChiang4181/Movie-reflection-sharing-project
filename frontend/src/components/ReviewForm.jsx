import { useState, useRef, useEffect } from 'react';
import { X, Star, Search, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import styles from './ReviewForm.module.css';
import { useAuth } from '../contexts/AuthContext';

function ReviewForm({ onClose, onReviewAdded, initialData = null, prefilledMovieTitle = '' }) {
  const { fetchUserProfile } = useAuth();
  const [content, setContent] = useState(initialData?.content || '');
  const [movieTitle, setMovieTitle] = useState(initialData?.movie?.title || prefilledMovieTitle);
  const [selectedMovie, setSelectedMovie] = useState(initialData?.movie || null);
  const [selectedTmdbId, setSelectedTmdbId] = useState(initialData?.movie?.tmdb_id || null);
  
  const [tags, setTags] = useState(initialData?.tags?.map(t => t.name) || []);
  const [tagInputText, setTagInputText] = useState('');
  
  const [isSpoiler, setIsSpoiler] = useState(initialData?.is_spoiler || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(initialData?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef(null);
  const dropdownRef = useRef(null);
  const textareaRef = useRef(null);

  const PRESET_TAGS = ['院線熱映', '二刷', '神作'];

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
    setSelectedMovie(movie);
    setMovieTitle(movie.title);
    setSelectedTmdbId(movie.tmdb_id);
    setShowDropdown(false);
  };

  const handleChangeMovie = () => {
    setSelectedMovie(null);
    setSelectedTmdbId(null);
    setMovieTitle('');
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addTag(tagInputText);
    }
  };

  const addTag = (val) => {
    let cleanTag = val.replace(/[\s;#,]/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInputText('');
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!movieTitle.trim() && !selectedMovie) return setError('請填寫或選擇電影名稱');

    const movieTag = (selectedMovie ? selectedMovie.title : movieTitle).trim();
    let finalTags = [...tags];
    if (!finalTags.includes(movieTag)) {
      finalTags.push(movieTag);
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        movie_title: movieTag,
        content: content,
        rating: rating,
        tag_names: finalTags,
        is_spoiler: isSpoiler
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
      
      try {
        if (onReviewAdded) {
          onReviewAdded(response.data, !!initialData);
        }
      } catch (cbErr) {
        console.error("Callback error (ignored for submission):", cbErr);
      }
      
      fetchUserProfile(); // 及時更新 EXP
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
        <h2 className={styles.modalTitle}>{initialData ? '編輯電影心得' : '撰寫電影心得'}</h2>
        
        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.formBody}>
          {/* Step 1 & 2: Movie Selection and Rating */}
          <div className={styles.section}>
            {!selectedMovie ? (
              <div className={styles.autocompleteContainer} ref={dropdownRef}>
                <div className={styles.inputWrapper}>
                  <Search size={18} className={styles.inputIconLeft} />
                  <input 
                    type="text"
                    className={`${styles.customInput} ${styles.searchInput}`} 
                    value={movieTitle}
                    onChange={handleMovieTitleChange}
                    placeholder="輸入電影名稱搜尋..."
                    disabled={isSubmitting}
                  />
                  {isSearching && <Loader2 className={styles.searchIcon} size={18} />}
                </div>
                {showDropdown && searchResults.length > 0 && (
                  <div className={styles.dropdownMenu}>
                    {searchResults.map((movie) => (
                      <div key={movie.tmdb_id} className={styles.dropdownItem} onClick={() => handleSelectMovie(movie)}>
                        {movie.poster_url ? (
                          <img src={movie.poster_url} alt="poster" className={styles.dropdownPoster} />
                        ) : (
                          <div className={styles.dropdownPosterPlaceholder}><ImageIcon size={16}/></div>
                        )}
                        <div className={styles.dropdownInfo}>
                          <div className={styles.dropdownTitle}>{movie.title}</div>
                          <div className={styles.dropdownMeta}>{movie.original_title} ({movie.year})</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.moviePreviewCard}>
                <div className={styles.previewLeft}>
                  {selectedMovie.poster_url ? (
                    <img src={selectedMovie.poster_url} alt="poster" className={styles.previewPoster} />
                  ) : (
                    <div className={styles.previewPosterPlaceholder}><ImageIcon size={24}/></div>
                  )}
                  <div className={styles.previewInfo}>
                    <div className={styles.previewTitle}>
                      {selectedMovie.title} {selectedMovie.year ? `(${selectedMovie.year})` : ''}
                    </div>
                    
                    <div className={styles.starRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={24}
                          fill={(hoverRating || rating) >= star ? '#F59E0B' : 'none'}
                          color={(hoverRating || rating) >= star ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          style={{ transition: 'all 0.2s ease', outline: 'none', cursor: 'pointer' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <button type="button" className={styles.changeMovieBtn} onClick={handleChangeMovie}>
                  更換電影
                </button>
              </div>
            )}
            
            {/* Show standalone rating if movie is not selected yet */}
            {!selectedMovie && (
              <div className={styles.starRating} style={{ marginTop: '8px', paddingLeft: '4px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginRight: '8px', display: 'flex', alignItems: 'center' }}>推薦指數:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    fill={(hoverRating || rating) >= star ? '#F59E0B' : 'none'}
                    color={(hoverRating || rating) >= star ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    style={{ transition: 'all 0.2s ease', outline: 'none', cursor: 'pointer' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Textarea */}
          <div className={styles.section}>
            <textarea
              ref={textareaRef}
              className={styles.largeTextarea}
              placeholder="分享你對這部電影最真實的感受..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (textareaRef.current) {
                  textareaRef.current.style.height = '140px';
                  textareaRef.current.style.height = `${Math.max(140, textareaRef.current.scrollHeight)}px`;
                }
              }}
              disabled={isSubmitting}
            />
            <div className={styles.wordCount}>{content.length} / 1000 字</div>
          </div>

          {/* Step 4: Hashtags & Spoiler */}
          <div className={styles.sectionFooter}>
            <div className={styles.tagSection}>
              <div className={styles.tagChips}>
                {tags.map(tag => (
                  <span key={tag} className={styles.tagChip}>
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)}><X size={12}/></button>
                  </span>
                ))}
                <div className={styles.tagInputWrapper}>
                  <input 
                    type="text"
                    className={styles.tagInput}
                    placeholder="＋ 新增標籤"
                    value={tagInputText}
                    onChange={(e) => setTagInputText(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={() => addTag(tagInputText)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className={styles.presetTagsContainer}>
                {PRESET_TAGS.filter(t => !tags.includes(t)).map(tag => (
                  <button type="button" key={tag} className={styles.presetTagBtn} onClick={() => addTag(tag)}>
                    +#{tag}
                  </button>
                ))}
              </div>
            </div>
            
            <label className={styles.spoilerToggleLabel}>
              <div className={`${styles.toggleSwitch} ${isSpoiler ? styles.toggleOn : ''}`}>
                <input 
                  type="checkbox" 
                  checked={isSpoiler} 
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                  hidden
                />
                <div className={styles.toggleKnob}></div>
              </div>
              <span className={isSpoiler ? styles.spoilerTextOn : styles.spoilerTextOff}>
                <AlertTriangle size={16} /> 本文含有劇透 / 爆雷內容
              </span>
            </label>
          </div>

          {/* Step 5: Submit */}
          <div className={styles.submitSection}>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? (initialData ? '更新中...' : '發布中...') : (initialData ? '儲存變更' : '發布心得')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewForm;
