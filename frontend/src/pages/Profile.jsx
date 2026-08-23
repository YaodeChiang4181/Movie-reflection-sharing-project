import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, ThumbsUp, MessageSquare, Award, Star, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import ReviewModal from '../components/ReviewModal';
import styles from './Profile.module.css';

// 根據等級取得身分標章
function getBadge(level) {
  if (level >= 5) return { title: '青銅冒險家', emoji: '', color: '#CD7F32' };
  if (level >= 2) return { title: '唉呦不錯呦', emoji: '', color: '#FFD700' };
  if (level >= 1) return { title: '初出茅廬', emoji: '', color: '#6BCB77' };
  return { title: '新手影迷', emoji: '🎬', color: '#888888' };
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

  const handleReviewDeleted = (id) => {
    setReviews(reviews.filter(r => r.id !== id));
    setCommentedReviews(commentedReviews.filter(r => r.id !== id));
  };

  if (isLoading) {
    return (
      <div className={`container ${styles.pageWrapper}`} style={{ textAlign: 'center', paddingTop: '100px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
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

        {/* 頂部 UID */}
        <div className={styles.fanCardTopUID}>
          UID: {userData?.id?.toString().padStart(9, '0') || '000000000'}
        </div>

        <div className={styles.fanCardContent}>
          {/* 左側：頭像 + 基本資訊 */}
          <div className={styles.fanCardLeft}>
            <div className={styles.avatarContainer}>
              <div className={styles.avatar}>
                <span className={styles.avatarText}>
                  {(userData?.nickname || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              {/* 等級圈 */}
              <div className={styles.levelBadge}>Lv.{level}</div>
            </div>

            <div className={styles.nameSection}>
              <h1 className={styles.nickname}>{userData?.nickname || 'NCU User'}</h1>

              {/* 身分標章 */}
              <div className={styles.badgeTag} style={{ '--badge-color': badge.color }}>
                <span>{badge.emoji}</span>
                <span>{badge.title}</span>
              </div>

              <p className={styles.realInfo}>
                {userData?.real_name} · {userData?.department}
              </p>
              <p className={styles.campusId}>
                校園 ID: {userData?.campus_id}
              </p>
            </div>
          </div>

          {/* 右側：數據面板 */}
          <div className={styles.fanCardRight}>
            {/* 經驗值進度條 */}
            <div className={styles.expSection}>
              <div className={styles.expHeader}>
                <span className={styles.expLabel}>
                  <TrendingUp size={14} /> 經驗值
                </span>
                <span className={styles.expNumbers}>{exp} / {expNeeded}</span>
              </div>
              <div className={styles.expBarOuter}>
                <div className={styles.expBarInner} style={{ width: `${expProgress}%` }} />
              </div>
            </div>

            {/* 數據格子 */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <Film size={20} className={styles.statCardIcon} />
                <span className={styles.statCardValue}>{totalReviews}</span>
                <span className={styles.statCardLabel}>已發布心得</span>
              </div>
              <div className={styles.statCard}>
                <ThumbsUp size={20} className={styles.statCardIcon} />
                <span className={styles.statCardValue}>{totalVotes}</span>
                <span className={styles.statCardLabel}>獲得推薦</span>
              </div>
              <div className={styles.statCard}>
                <MessageSquare size={20} className={styles.statCardIcon} />
                <span className={styles.statCardValue}>{commentedReviews.length}</span>
                <span className={styles.statCardLabel}>留言互動</span>
              </div>
            </div>
          </div>
        </div>

        {/* 常用標籤 */}
        {userData?.common_tags?.length > 0 && (
          <div className={styles.tagsBar}>
            {userData.common_tags.map(tag => (
              <span key={tag} className={styles.commonTag}>#{tag}</span>
            ))}
          </div>
        )}
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
              {activeTab === 'my' ? '📝' : '💬'}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {(() => {
              const isSpeedRating = (r) => !r.content || r.content === "來自急速評星的無內文評價" || r.tags?.some(tag => tag.name === '急速評星');
              
              if (activeTab === 'commented') {
                return (
                  <div className={styles.reviewList}>
                    {currentReviews.map(review => (
                      <div key={review.id} className={styles.reviewCard} onClick={() => setSelectedReview(review)}>
                        <div className={styles.reviewCardHeader}>
                          <div>
                            <h3 className={styles.reviewTitle}>{review.movie?.title || '未命名電影'}</h3>
                            <span className={styles.reviewMeta}>
                              {new Date(review.created_at).toLocaleDateString('zh-TW')}
                              {` · 作者: ${review.user?.nickname}`}
                            </span>
                          </div>
                          <div className={styles.reviewRating}>
                            <Star size={14} fill="currentColor" /> {review.rating}/5
                          </div>
                        </div>
                        {(!isSpeedRating(review) && review.content) && (
                          <p className={styles.reviewContent}>{review.content}</p>
                        )}
                        {review.tags?.length > 0 && (
                          <div className={styles.tags}>
                            {review.tags.map(tag => (
                              <span key={tag.id} className={styles.tag}>#{tag.name}</span>
                            ))}
                          </div>
                        )}
                        <div className={styles.reviewFooter}>
                          <span><ThumbsUp size={14} /> {review.upvotes || 0}</span>
                          <span><MessageSquare size={14} /> {review.comments_count || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              // 'my' tab: split into text and rating-only
              const textReviews = currentReviews.filter(r => !isSpeedRating(r));
              const ratingReviews = currentReviews.filter(r => isSpeedRating(r));

              return (
                <>
                  {textReviews.length > 0 && (
                    <div>
                      <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem', paddingLeft: '8px', borderLeft: '4px solid var(--accent-primary)' }}>📝 我的影評貼文</h3>
                      <div className={styles.reviewList}>
                        {textReviews.map(review => (
                          <div key={review.id} className={styles.reviewCard} onClick={() => setSelectedReview(review)}>
                            <div className={styles.reviewCardHeader}>
                              <div>
                                <h3 className={styles.reviewTitle}>{review.movie?.title || '未命名電影'}</h3>
                                <span className={styles.reviewMeta}>{new Date(review.created_at).toLocaleDateString('zh-TW')}</span>
                              </div>
                              <div className={styles.reviewRating}>
                                <Star size={14} fill="currentColor" /> {review.rating}/5
                              </div>
                            </div>
                            <p className={styles.reviewContent}>{review.content}</p>
                            {review.tags?.length > 0 && (
                              <div className={styles.tags}>
                                {review.tags.map(tag => (
                                  <span key={tag.id} className={styles.tag}>#{tag.name}</span>
                                ))}
                              </div>
                            )}
                            <div className={styles.reviewFooter}>
                              <span><ThumbsUp size={14} /> {review.upvotes || 0}</span>
                              <span><MessageSquare size={14} /> {review.comments_count || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ratingReviews.length > 0 && (
                    <div>
                      <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem', paddingLeft: '8px', borderLeft: '4px solid #F5A623' }}>⭐️ 我的純評分紀錄</h3>
                      <div className={styles.reviewList}>
                        {ratingReviews.map(review => (
                          <div key={review.id} className={styles.reviewCard} onClick={() => setSelectedReview(review)}>
                            <div className={styles.reviewCardHeader}>
                              <div>
                                <h3 className={styles.reviewTitle}>{review.movie?.title || '未命名電影'}</h3>
                                <span className={styles.reviewMeta}>{new Date(review.created_at).toLocaleDateString('zh-TW')}</span>
                              </div>
                              <div className={styles.reviewRating} style={{ color: '#F5A623' }}>
                                <Star size={14} fill="currentColor" /> {review.rating}/5
                              </div>
                            </div>
                            {/* Hide content for rating only */}
                            {review.tags?.length > 0 && (
                              <div className={styles.tags}>
                                {review.tags.map(tag => (
                                  <span key={tag.id} className={styles.tag}>#{tag.name}</span>
                                ))}
                              </div>
                            )}
                            <div className={styles.reviewFooter}>
                              <span><ThumbsUp size={14} /> {review.upvotes || 0}</span>
                              <span><MessageSquare size={14} /> {review.comments_count || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
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
