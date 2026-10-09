import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bookmark, Share2, User, Clock, Film, Edit2, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import CollageCover from '../components/CollageCover';
import WatchProviderOverlay from '../components/WatchProviderOverlay';
import CuratorStudioModal from '../components/CuratorStudioModal';
import styles from './CuratedListDetail.module.css';

function CuratedListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  
  const [listData, setListData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMovieId, setHoveredMovieId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await api.get(`lists/${id}/`);
        setListData(res.data);
      } catch (err) {
        console.error(err);
        alert('找不到該片單或已被刪除！');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchList();
  }, [id, navigate]);

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
    // 實作分享裂變卡片 (此處先使用原生分享，後續可擴充 Canvas 繪製功能)
    if (navigator.share) {
      navigator.share({
        title: listData.title,
        text: listData.description || '來看看這個精選片單！',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('連結已複製！');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('確定要刪除這個片單嗎？此操作無法復原。')) {
      try {
        await api.delete(`lists/${id}/`);
        alert('片單已刪除');
        navigate('/events'); // Return to events/wall
      } catch (err) {
        alert(err.response?.data?.error || '刪除失敗');
      }
    }
  };

  const isOwnerOrAdmin = isLoggedIn && user && listData && (
    user.id === listData.creator_info?.user_id || user.is_staff
  );

  if (isLoading) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: '16px' }}></div>
      </div>
    );
  }

  if (!listData) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <CollageCover posters={listData.cover_posters} size="large" />
        
        <div style={{ flex: 1 }}>
          <h1 className={styles.title}>{listData.title}</h1>
          <p className={styles.description}>"{listData.description || '這個片單還沒有引言喔！'}"</p>
          
          <div className={styles.meta}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> 
              <span>{listData.creator_info?.nickname || listData.creator_info?.campus_id}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>(Lv.{listData.creator_info?.level || 1})</span>
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
          
          <div className={styles.tags}>
            {listData.hashtags?.map(tag => (
              <span key={tag} className={styles.tag}>#{tag}</span>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.timeline}>
        {listData.items?.map((item, idx) => (
          <div key={item.id} className={styles.listItem}>
            <div className={styles.orderBadge}>{idx + 1}</div>
            
            <div className={styles.itemContent}>
              <div 
                className={styles.movieCard} 
                onClick={() => navigate(`/movies/${item.movie.id}`)}
                onMouseEnter={() => setHoveredMovieId(item.movie.id)}
                onMouseLeave={() => setHoveredMovieId(null)}
              >
                <div style={{ position: 'relative' }}>
                  {item.movie.poster_url ? (
                    <img src={item.movie.poster_url} alt={item.movie.title} className={styles.poster} />
                  ) : (
                    <div className={styles.poster} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333' }}>
                      <Film size={24} color="#666" />
                    </div>
                  )}
                  {hoveredMovieId === item.movie.id && item.movie.tmdb_id && (
                    <WatchProviderOverlay tmdbId={item.movie.tmdb_id} />
                  )}
                </div>
                
                <div className={styles.movieInfo}>
                  <h3 className={styles.movieTitle}>{item.movie.title}</h3>
                  <div className={styles.movieYear}>{item.movie.original_title}</div>
                  <div className={styles.movieYear} style={{ marginTop: '4px' }}>{item.movie.release_year}</div>
                </div>
              </div>
              
              {item.curator_note && (
                <div className={styles.curatorNote}>
                  {item.curator_note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actionBar}>
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
            <button className={`${styles.actionBtn} ${styles.secondary}`} onClick={() => setShowEditModal(true)}>
              <Edit2 size={20} />
              編輯片單
            </button>
            <button className={`${styles.actionBtn}`} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={handleDelete}>
              <Trash2 size={20} />
              刪除
            </button>
          </>
        )}
      </div>

      {showEditModal && (
        <CuratorStudioModal
          editData={listData}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updatedData) => {
            setListData(updatedData);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

export default CuratedListDetail;
