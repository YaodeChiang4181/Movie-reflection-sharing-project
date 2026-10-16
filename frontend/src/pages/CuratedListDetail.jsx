import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Bookmark, Share2, User, Clock, Film, Edit2, Trash2, 
  Plus, X, Search, Loader2, Check, Sparkles 
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import CollageCover from '../components/CollageCover';
import WatchProviderOverlay from '../components/WatchProviderOverlay';
import styles from './CuratedListDetail.module.css';

function CuratedListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, isLoggedIn } = useAuth();
  
  const [listData, setListData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMovieId, setHoveredMovieId] = useState(null);

  // ─── Inline Editing State ───
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editHashtags, setEditHashtags] = useState([]);
  const [editItems, setEditItems] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');

  // ─── Bottom Movie Search State ───
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await api.get(`lists/${id}/`);
        setListData(res.data);
      } catch (err) {
        console.error(err);
        alert('找不到該片單或已被刪除！');
        navigate('/events');
      } finally {
        setIsLoading(false);
      }
    };
    fetchList();
  }, [id, navigate]);

  const isOwnerOrAdmin = isLoggedIn && userProfile && listData && (
    (userProfile.campus_id || userProfile.id) === (listData.creator_info?.campus_id || listData.creator_info?.user_id) || userProfile.is_staff
  );

  // ─── 進入編輯模式 ───
  const handleStartEdit = () => {
    setEditTitle(listData.title || '');
    setEditDescription(listData.description || '');
    setEditHashtags(listData.hashtags || []);
    setEditItems(listData.items ? [...listData.items] : []);
    setSearchQuery('');
    setSearchResults([]);
    setIsEditing(true);
  };

  // ─── 取消編輯 ───
  const handleCancelEdit = () => {
    if (window.confirm('確定要放棄尚未儲存的修改嗎？')) {
      setIsEditing(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // ─── 儲存編輯 ───
  const handleSaveList = async () => {
    if (!editTitle.trim()) {
      alert('片單標題不能為空！');
      return;
    }
    if (editItems.length < 2) {
      alert('片單至少需要收錄 2 部電影！');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        hashtags: editHashtags,
        items: editItems.map((item, index) => ({
          movie_id: item.movie?.id || item.movie_id,
          curator_note: item.curator_note || '',
          order_index: index
        }))
      };

      const res = await api.put(`lists/${id}/`, payload);
      setListData(res.data);
      setIsEditing(false);
      alert('片單修改已成功儲存！');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || '儲存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── 單部電影操作 ───
  const handleRemoveMovie = (index) => {
    if (editItems.length <= 2) {
      alert('片單至少需要保留 2 部電影喔！');
      return;
    }
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleNoteChange = (index, value) => {
    setEditItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], curator_note: value };
      return updated;
    });
  };

  // ─── 底端新增電影搜尋 ───
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length >= 1) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await api.get(`movies/search_tmdb/?q=${encodeURIComponent(query)}`);
          setSearchResults(res.data.results || res.data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      }, 400);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddMovie = async (movie) => {
    const movieId = movie.tmdb_id || movie.id;
    if (editItems.length >= 15) {
      alert('片單最多只能收錄 15 部電影！');
      return;
    }
    if (editItems.some(it => it.movie?.tmdb_id === movieId || it.movie?.id === movieId || it.movie_id === movieId)) {
      alert('這部電影已經在片單中了！');
      return;
    }

    setIsSyncing(true);
    try {
      const syncRes = await api.post('movies/sync/', { tmdb_id: movieId });
      const localMovie = syncRes.data;

      const newItem = {
        id: 'temp-' + Date.now(),
        movie: {
          id: localMovie.id,
          title: movie.title || localMovie.title,
          original_title: movie.original_title || '',
          poster_url: movie.poster_url || '',
          release_year: movie.release_year || 2024,
          tmdb_id: movieId
        },
        movie_id: localMovie.id,
        curator_note: '',
        order_index: editItems.length
      };

      setEditItems(prev => [...prev, newItem]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error(err);
      alert('同步電影資料失敗，請稍後再試');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── 標籤操作 ───
  const handleRemoveTag = (tagToRemove) => {
    setEditHashtags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleAddTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      const cleanTag = newTagInput.replace(/[\s;#,]/g, '').trim();
      if (cleanTag && !editHashtags.includes(cleanTag)) {
        if (editHashtags.length >= 5) {
          alert('最多只能設定 5 個主題標籤！');
        } else {
          setEditHashtags(prev => [...prev, cleanTag]);
        }
      }
      setNewTagInput('');
    }
  };

  // ─── 收藏 / 分享 / 刪除 ───
  const handleBookmark = async () => {
    if (!isLoggedIn) {
      alert('請先登入後再收藏片單！');
      navigate('/auth');
      return;
    }
    try {
      const res = await api.post(`lists/${id}/bookmark/`);
      setListData(prev => ({
        ...prev,
        is_bookmarked: res.data.bookmarked,
        bookmark_count: res.data.bookmark_count
      }));
    } catch (err) {
      alert(err.response?.data?.error || '收藏失敗');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listData.title,
        text: listData.description || '來看看這個精選片單！',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('片單連結已複製至剪貼簿！');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('確定要刪除這個片單嗎？此操作無法復原。')) {
      try {
        await api.delete(`lists/${id}/`);
        alert('片單已刪除');
        navigate('/events');
      } catch (err) {
        alert(err.response?.data?.error || '刪除失敗');
      }
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: '16px' }} />
      </div>
    );
  }

  if (!listData) return null;

  // 編輯模式時即時預覽前 4 張海報
  const currentCoverPosters = isEditing 
    ? editItems.slice(0, 4).map(it => it.movie?.poster_url).filter(Boolean)
    : listData.cover_posters;

  const currentItems = isEditing ? editItems : (listData.items || []);

  return (
    <div className={styles.container}>
      {/* 編輯模式橫幅提示 */}
      {isEditing && (
        <div className={styles.editBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} />
            <span>正在編輯片單：可直接修改標題、簡介，在單部電影旁修改短評或刪除，並可在底部新增電影</span>
          </div>
          <button 
            onClick={handleCancelEdit} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ─── 頂部標頭 ─── */}
      <header className={styles.header}>
        <CollageCover posters={currentCoverPosters} size="large" />
        
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <div>
              <input
                type="text"
                className={styles.editTitleInput}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="輸入片單標題..."
                maxLength={60}
              />
              <textarea
                className={styles.editDescInput}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="為這個片單寫一段情境引言..."
                maxLength={255}
              />
            </div>
          ) : (
            <>
              <h1 className={styles.title}>{listData.title}</h1>
              <p className={styles.description}>"{listData.description || '這個片單還沒有引言喔！'}"</p>
            </>
          )}
          
          <div className={styles.meta}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> 
              <span>{listData.creator_info?.nickname || listData.creator_info?.campus_id}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                (Lv.{listData.creator_info?.level || 1})
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={16} /> 
              <span>{listData.bookmark_count} 次收藏</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} />
              <span>{new Date(listData.created_at).toLocaleDateString('zh-TW')} 建立</span>
            </div>
          </div>
          
          {/* 主題標籤 */}
          <div className={styles.tags}>
            {isEditing ? (
              <>
                {editHashtags.map(tag => (
                  <span key={tag} className={styles.tagEditable}>
                    #{tag}
                    <button 
                      type="button" 
                      className={styles.tagDeleteBtn} 
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {editHashtags.length < 5 && (
                  <input
                    type="text"
                    className={styles.tagAddInput}
                    placeholder="+ 標籤 (按Enter)"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTagKeyDown}
                  />
                )}
              </>
            ) : (
              listData.hashtags?.map(tag => (
                <span key={tag} className={styles.tag}>#{tag}</span>
              ))
            )}
          </div>
        </div>
      </header>

      {/* ─── 電影時間軸清單 ─── */}
      <div className={styles.timeline}>
        {currentItems.map((item, idx) => (
          <div key={item.id || idx} className={styles.listItem}>
            <div className={styles.orderBadge}>{idx + 1}</div>
            
            <div className={styles.itemContent}>
              <div 
                className={`${styles.movieCard} ${isEditing ? styles.movieCardEditing : ''}`}
                onClick={() => {
                  if (!isEditing) navigate(`/movies/${item.movie.id}`);
                }}
                onMouseEnter={() => !isEditing && setHoveredMovieId(item.movie.id)}
                onMouseLeave={() => !isEditing && setHoveredMovieId(null)}
              >
                {/* 編輯模式下的單部電影移除按鈕 */}
                {isEditing && (
                  <button 
                    type="button" 
                    className={styles.removeMovieBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMovie(idx);
                    }}
                    title="從此片單移除電影"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div style={{ position: 'relative' }}>
                  {item.movie?.poster_url ? (
                    <img src={item.movie.poster_url} alt={item.movie.title} className={styles.poster} />
                  ) : (
                    <div className={styles.poster} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333' }}>
                      <Film size={24} color="#666" />
                    </div>
                  )}
                  {!isEditing && hoveredMovieId === item.movie?.id && item.movie?.tmdb_id && (
                    <WatchProviderOverlay tmdbId={item.movie.tmdb_id} />
                  )}
                </div>
                
                <div className={styles.movieInfo}>
                  <h3 className={styles.movieTitle}>{item.movie?.title}</h3>
                  <div className={styles.movieYear}>{item.movie?.original_title}</div>
                  <div className={styles.movieYear} style={{ marginTop: '4px' }}>{item.movie?.release_year}</div>
                </div>
              </div>
              
              {/* 策展人短評：編輯模式下直接可編輯 */}
              {isEditing ? (
                <textarea
                  className={styles.editNoteInput}
                  value={item.curator_note || ''}
                  onChange={(e) => handleNoteChange(idx, e.target.value)}
                  placeholder="為這部電影撰寫一句話推薦短評（最多 100 字，選填）..."
                  maxLength={100}
                />
              ) : (
                item.curator_note && (
                  <div className={styles.curatorNote}>
                    {item.curator_note}
                  </div>
                )
              )}
            </div>
          </div>
        ))}

        {/* ─── 編輯模式：最底端【新增收錄電影】 ─── */}
        {isEditing && (
          <div className={styles.addMovieSection}>
            <div className={styles.addMovieHeader}>
              <Plus size={20} />
              <span>新增收錄電影 ({editItems.length} / 15 部)</span>
            </div>

            <div className={styles.searchBoxWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.addSearchInput}
                placeholder="搜尋電影名稱以收錄至片單..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {(isSearching || isSyncing) && (
                <Loader2 size={18} className={`animate-spin ${styles.searchLoader}`} />
              )}

              {/* 搜尋結果下拉選單 */}
              {searchResults.length > 0 && (
                <div className={styles.searchResultsDropdown}>
                  {searchResults.map(movie => {
                    const mId = movie.tmdb_id || movie.id;
                    const isAlreadyAdded = editItems.some(it => it.movie?.tmdb_id === mId || it.movie?.id === mId || it.movie_id === mId);

                    return (
                      <div 
                        key={mId} 
                        className={styles.searchResultItem}
                        onClick={() => !isAlreadyAdded && handleAddMovie(movie)}
                        style={{ opacity: isAlreadyAdded ? 0.5 : 1, cursor: isAlreadyAdded ? 'not-allowed' : 'pointer' }}
                      >
                        {movie.poster_url ? (
                          <img src={movie.poster_url} alt={movie.title} className={styles.searchItemPoster} />
                        ) : (
                          <div className={styles.searchItemPoster} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Film size={16} color="#666" />
                          </div>
                        )}
                        <div className={styles.searchItemInfo}>
                          <div className={styles.searchItemTitle}>{movie.title}</div>
                          <div className={styles.searchItemMeta}>
                            {movie.release_year || '年份未知'} · {movie.original_title || ''}
                          </div>
                        </div>
                        {isAlreadyAdded ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>已收錄</span>
                        ) : (
                          <Plus size={18} className={styles.addIcon} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── 底部懸浮操作列 ─── */}
      <div className={styles.actionBar}>
        {isEditing ? (
          <>
            <button 
              className={`${styles.actionBtn} ${styles.primary}`}
              onClick={handleSaveList}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              <span>{isSaving ? '儲存中...' : '儲存變更'}</span>
            </button>
            <button 
              className={`${styles.actionBtn} ${styles.secondary}`}
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <X size={18} />
              <span>放棄修改</span>
            </button>
          </>
        ) : (
          <>
            <button 
              className={`${styles.actionBtn} ${listData.is_bookmarked ? styles.secondary : styles.primary}`}
              onClick={handleBookmark}
            >
              <Bookmark size={20} fill={listData.is_bookmarked ? "currentColor" : "none"} />
              {listData.is_bookmarked ? '已收藏' : '收藏片單'}
            </button>
            <button className={`${styles.actionBtn} ${styles.secondary}`} onClick={handleShare}>
              <Share2 size={20} />
              分享
            </button>

            {isOwnerOrAdmin && (
              <>
                <button className={`${styles.actionBtn} ${styles.secondary}`} onClick={handleStartEdit}>
                  <Edit2 size={20} />
                  編輯片單
                </button>
                <button 
                  className={styles.actionBtn} 
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} 
                  onClick={handleDelete}
                >
                  <Trash2 size={20} />
                  刪除
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CuratedListDetail;
