import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, ThumbsUp, MessageSquare, Star, TrendingUp, RefreshCw, Camera, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import ReviewModal from '../components/ReviewModal';
import styles from './Profile.module.css';

// 根據等級取得身分標章
function getBadge(level) {
  if (level >= 10) return { title: '資深影評', color: '#F59E0B' };
  if (level >= 8) return { title: '黃金觀影人', color: '#8B5CF6' };
  if (level >= 5) return { title: '白銀觀影人', color: '#3B82F6' };
  if (level >= 3) return { title: '青銅觀影人', color: '#10B981' };
  if (level >= 2) return { title: '唉呦不錯呦', color: '#10B981' };
  if (level >= 1) return { title: '初出茅廬', color: '#6BCB77' };
  return { title: '新手影迷', color: '#9CA3AF' };
}

function Profile() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [commentedReviews, setCommentedReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'commented'
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [editNicknameValue, setEditNicknameValue] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const fetchUserData = async () => {
    try {
      const res = await api.get('users/me/');
      setUserData(res.data);
    } catch (err) {
      console.error("Failed to fetch user data", err);
    }
  };

  const handleEditNickname = () => {
    setEditNicknameValue(userData?.nickname || '');
    setIsEditingNickname(true);
  };

  const handleCancelEditNickname = () => {
    setIsEditingNickname(false);
    setEditNicknameValue('');
  };

  const handleSaveNickname = async () => {
    const currentNickname = userData?.nickname || '';
    const newNickname = editNicknameValue.trim();
    
    if (newNickname === '') {
       setIsEditingNickname(false);
       return;
    }
    if (newNickname === currentNickname) {
       setIsEditingNickname(false);
       return;
    }
    if (newNickname.length > 50) {
      alert('暱稱長度不能超過 50 個字元！');
      return;
    }

    setIsSavingNickname(true);
    try {
      const res = await api.patch('/auth/update-nickname/', {
        nickname: newNickname
      });
      alert(res.data.message);
      await fetchUserData();
      setIsEditingNickname(false);
    } catch (err) {
      console.error('Failed to update nickname', err);
      const errorMsg = err.response?.data?.error || '修改暱稱發生錯誤，請稍後再試。';
      alert(errorMsg);
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("大頭貼圖片大小不能超過 5MB");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('/auth/avatar/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUserData(prev => ({ ...prev, avatar: res.data.avatar_url }));
      alert("大頭貼上傳成功！");
    } catch (err) {
      console.error("Upload avatar failed", err);
      alert(err.response?.data?.error || "上傳失敗，請稍後再試");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }

    const fetchProfileData = async () => {
      try {
        const [userRes, reviewsRes, commentedRes] = await Promise.all([
          api.get('users/me/'),
          api.get('reviews/me/'),
          api.get('reviews/commented_by_me/')
        ]);
        setUserData(userRes.data);
        setReviews(reviewsRes.data);
        setCommentedReviews(commentedRes.data);
      } catch (err) {
        console.error("Failed to fetch profile", err);
        if (err.response?.status === 401) {
          logout();
          navigate('/auth');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [isLoggedIn, navigate, logout]);

  const handleReviewUpdated = () => {
    api.get('reviews/me/').then(res => setReviews(res.data));
    api.get('reviews/commented_by_me/').then(res => setCommentedReviews(res.data));
  };

  const handleSyncExp = async () => {
    setIsSyncing(true);
    try {
      const res = await api.post('/auth/sync-exp/');
      // 重抓使用者資料
      const userRes = await api.get('users/me/');
      setUserData(userRes.data);
      alert(res.data.message || '經驗值同步成功！');
    } catch (err) {
      alert(`同步失敗: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReviewDeleted = (id) => {
    setReviews(reviews.filter(r => r.id !== id));
    setCommentedReviews(commentedReviews.filter(r => r.id !== id));
  };

  if (isLoading) {
    return (
      <div className={`container ${styles.pageWrapper}`} style={{ paddingTop: '80px', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Profile Card Skeleton */}
        <div className="glass" style={{ padding: '40px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '120px', height: '120px', borderRadius: '50%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div className="skeleton skeleton-title" style={{ width: '200px', height: '2rem', margin: 0 }} />
              <div className="skeleton skeleton-text" style={{ width: '150px', height: '1.2rem', margin: 0 }} />
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <div className="skeleton skeleton-text" style={{ width: '80px', height: '2rem', borderRadius: 'var(--radius-pill)', margin: 0 }} />
                <div className="skeleton skeleton-text" style={{ width: '80px', height: '2rem', borderRadius: 'var(--radius-pill)', margin: 0 }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
            <div className="skeleton skeleton-text" style={{ width: '100px', height: '3rem', margin: 0 }} />
            <div className="skeleton skeleton-text" style={{ width: '100px', height: '3rem', margin: 0 }} />
            <div className="skeleton skeleton-text" style={{ width: '100px', height: '3rem', margin: 0 }} />
          </div>
        </div>
        
        {/* Tabs Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <div className="skeleton skeleton-text" style={{ width: '120px', height: '3rem', borderRadius: 'var(--radius-pill)' }} />
          <div className="skeleton skeleton-text" style={{ width: '120px', height: '3rem', borderRadius: 'var(--radius-pill)' }} />
        </div>

        {/* Reviews List Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(n => (
            <div key={n} className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="skeleton skeleton-text" style={{ width: '150px', height: '1.2rem' }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '4rem' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalReviews = reviews.length;
  const totalVotes = reviews.reduce((sum, review) => sum + (review.upvotes || 0), 0);
  const level = userData?.level || 0;
  const exp = userData?.exp || 0;
  const badge = getBadge(level);
  const expNeeded = Math.max(level, 1) * 100;
  const expProgress = Math.min((exp / expNeeded) * 100, 100);

  const currentReviews = activeTab === 'my' ? reviews : commentedReviews;

  return (
    <div className={`container ${styles.pageWrapper}`}>
      {/* ===== 影迷卡片 ===== */}
      <div className={styles.fanCard}>
        <div className={styles.fanCardGlow} />


        <div className={styles.fanCardContent}>
          {/* 左側：頭像 + 基本資訊 + 標籤 */}
          <div className={styles.leftColumn}>
            <div className={styles.fanCardLeft}>
              <div className={styles.avatarContainer}>
                <div
                  className={styles.avatar}
                  onClick={handleAvatarClick}
                  style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                  {userData?.avatar ? (
                    <img src={userData.avatar} alt="avatar" className={styles.avatarImage} />
                  ) : (
                    <span className={styles.avatarText}>
                      {(userData?.nickname || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}

                  <div className={styles.avatarHoverOverlay}>
                    <Camera size={24} />
                  </div>
                  {isUploading && (
                    <div className={styles.avatarUploadingOverlay}>
                      <RefreshCw size={24} className={styles.spin} />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
                {/* 等級圈 */}
                <div className={styles.levelBadge}>Lv.{level}</div>
              </div>

              <div className={styles.nameSection}>
                <div className={styles.nameRow}>
                  <div className={styles.nicknameWrapper}>
                    {isEditingNickname ? (
                      <div className={styles.inlineEditContainer}>
                        <input
                          type="text"
                          value={editNicknameValue}
                          onChange={(e) => setEditNicknameValue(e.target.value)}
                          className={styles.inlineEditInput}
                          placeholder="新的暱稱..."
                          autoFocus
                          maxLength={50}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNickname();
                            if (e.key === 'Escape') handleCancelEditNickname();
                          }}
                          disabled={isSavingNickname}
                        />
                        <button className={`${styles.inlineActionBtn} ${styles.inlineSaveBtn}`} onClick={handleSaveNickname} disabled={isSavingNickname} title="儲存 (Enter)">
                          {isSavingNickname ? <RefreshCw size={18} className={styles.spin} /> : <Check size={18} />}
                        </button>
                        <button className={`${styles.inlineActionBtn} ${styles.inlineCancelBtn}`} onClick={handleCancelEditNickname} disabled={isSavingNickname} title="取消 (Esc)">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h1 className={styles.nickname}>{userData?.nickname || 'NCU User'}</h1>
                        <button className={styles.editNicknameBtn} onClick={handleEditNickname} title="修改暱稱">
                          <Edit2 size={18} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* 身分標章 */}
                  <div className={styles.badgeTag} style={{ '--badge-color': badge.color }}>
                    <span>{badge.emoji}</span>
                    <span>{badge.title}</span>
                  </div>
                </div>

                <p className={styles.realInfo}>
                  {userData?.real_name} · {userData?.department}
                </p>
                <p className={styles.campusId}>
                  {(!userData?.campus_id?.match(/^\d+$/) && userData?.campus_id) ? '會員 ID' : '校園 ID'}: {userData?.campus_id}
                </p>
              </div>
            </div>

            {/* 常用標籤 */}
            {userData?.common_tags?.length > 0 && (
              <div className={styles.tagsBar}>
                <div className={styles.tagsSubtitle}>觀影偏好</div>
                <div className={styles.tagsList}>
                  {userData.common_tags.map(tag => (
                    <span 
                      key={tag} 
                      className={styles.commonTag}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/search?q=${encodeURIComponent(tag)}`);
                      }}
                      style={{ cursor: 'pointer' }}
                    >#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右側：數據面板 */}
          <div className={styles.fanCardRight}>
            {/* 經驗值進度條 */}
            <div className={styles.expSection}>
              <div className={styles.expHeader}>
                <span className={styles.expLabel}>
                  <TrendingUp size={14} /> 距離 Lv.{level + 1} 還差 {Math.max(0, expNeeded - exp)} EXP
                  <button
                    onClick={handleSyncExp}
                    disabled={isSyncing}
                    className={styles.syncBtn}
                    title="手動同步最新經驗值"
                  >
                    <RefreshCw size={14} className={isSyncing ? styles.spin : ''} />
                  </button>
                </span>
                <span className={styles.expNumbers}>
                  <span className={styles.expCurrent}>{exp}</span> / {expNeeded} EXP
                </span>
              </div>
              <div className={styles.expBarOuter}>
                <div className={styles.expBarInner} style={{ width: `${expProgress}%` }} />
              </div>
            </div>

            {/* 數據格子 */}
            <div className={styles.statsGrid}>
              {(() => {
                const stats = [
                  { icon: Film, value: userData?.total_movies_reviewed || totalReviews, label: '已評電影' },
                  { icon: ThumbsUp, value: totalVotes, label: '獲得推薦' },
                  { icon: MessageSquare, value: commentedReviews.length, label: '留言互動' }
                ];
                return stats
                  .map((stat, idx) => (
                    <div key={idx} className={styles.statCard}>
                      <stat.icon size={20} className={styles.statCardIcon} />
                      <span className={styles.statCardValue}>{stat.value}</span>
                      <span className={styles.statCardLabel}>{stat.label}</span>
                    </div>
                  ));
              })()}
            </div>

            {/* 個人標籤紀錄與評分分佈 */}
            <div className={styles.personalStatsContainer}>
              <div className={styles.personalStatsBox}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '0.95rem' }}>個人標籤紀錄</h4>
                <div className={styles.tagsList}>
                  {userData?.all_user_tags?.length > 0 ? (
                    userData.all_user_tags.map(tag => (
                      <span 
                        key={tag.name} 
                        className={styles.commonTag}
                        onClick={(e) => { e.stopPropagation(); navigate(`/search?q=${encodeURIComponent(tag.name)}`); }}
                        style={{ cursor: 'pointer' }}
                      >
                        #{tag.name} <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>({tag.count})</span>
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>尚無標籤紀錄</span>
                  )}
                </div>
              </div>
              <div className={styles.personalStatsBox}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '0.95rem' }}>評分分佈</h4>
                <div className={styles.ratingChart}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = userData?.rating_distribution?.[star] || 0;
                    const maxCount = Math.max(...Object.values(userData?.rating_distribution || {1:0}), 1);
                    const width = `${(count / maxCount) * 100}%`;
                    return (
                      <div key={star} className={styles.chartRow}>
                        <span className={styles.chartLabel}>{star}★</span>
                        <div className={styles.chartBarTrack}>
                          <div className={styles.chartBarFill} style={{ width: width }}></div>
                        </div>
                        <span className={styles.chartCount}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* ===== Tabs 切換 ===== */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'my' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('my')}
        >
          <Film size={16} /> 我的心得 ({reviews.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'commented' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('commented')}
        >
          <MessageSquare size={16} /> 留言過的 ({commentedReviews.length})
        </button>
      </div>

      {/* ===== 心得列表 ===== */}
      <div className={styles.reviewsSection}>
        {currentReviews.length === 0 ? (
          <div className="glass" style={{ padding: '48px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
              {activeTab === 'my' ? '影評' : '💬'}
            </div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.2rem' }}>
              {activeTab === 'my' ? '這裡還空空如也' : '您還沒有在任何心得下方留言過'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {activeTab === 'my'
                ? '趕快回到首頁，建立您的第一座影像殿堂吧！'
                : '到首頁逛逛，留下你的想法吧！'}
            </p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              去首頁看看
            </button>
          </div>
        ) : (
          <div className="posterGrid">
            {currentReviews.map(review => (
              <div key={review.id} className="posterCard" onClick={() => {
                  if (review.movie?.id) navigate(`/movies/${review.movie.id}`);
              }}>
                <div className="posterWrapper">
                  {review.movie?.poster_url ? (
                    <img src={review.movie.poster_url} alt="poster" className="posterImg" />
                  ) : (
                    <div className="posterPlaceholder"><Film size={32} /></div>
                  )}
                  <div className="posterOverlay">
                    <button 
                      className="overlayBtn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReview(review);
                      }}
                    >
                      <MessageSquare size={16} /> 查看心得
                    </button>
                  </div>
                </div>
                <div className="posterInfo">
                  <div className="posterTitle">{review.movie?.title || '未命名電影'}</div>
                  <div className="posterMeta">
                    {review.rating !== null && review.rating > 0 && (
                      <span className="posterRating"><Star size={12} fill="currentColor" /> {review.rating}/5</span>
                    )}
                    <span className="posterDate">{new Date(review.effective_date || review.created_at).toLocaleDateString('zh-TW')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReview && (
        <ReviewModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onReviewUpdated={handleReviewUpdated}
          onReviewDeleted={handleReviewDeleted}
        />
      )}
    </div>
  );
}

export default Profile;
