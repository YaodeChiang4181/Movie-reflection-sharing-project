import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, ThumbsUp, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import ReviewModal from '../components/ReviewModal';
import styles from './Profile.module.css';

function Profile() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [commentedReviews, setCommentedReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);

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
    // 重新載入以獲取最新資料
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

  // Calculate stats
  const totalReviews = reviews.length;
  // If score is included in the backend, sum it up. Otherwise fallback to 0.
  const totalVotes = reviews.reduce((sum, review) => sum + (review.score || 0), 0);

  return (
    <div className={`container ${styles.pageWrapper}`}>
      {/* Profile Header Card */}
      <div className={`glass ${styles.profileCard}`}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatar}>
            <UserPlaceholder />
          </div>
        </div>
        <div className={styles.userInfo}>
          <h1 className={styles.username}>{userData?.nickname || 'NCU User'}</h1>
          <p className={styles.email}>真實姓名: {userData?.real_name} | 科系: {userData?.department}</p>
          <p className={styles.email} style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.7 }}>
            校園 ID: {userData?.campus_id}
          </p>
          
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <Film size={20} className={styles.statIcon} />
              <div className={styles.statData}>
                <span className={styles.statValue}>{totalReviews}</span>
                <span className={styles.statLabel}>已發布心得</span>
              </div>
            </div>
            <div className={styles.statBox}>
              <ThumbsUp size={20} className={styles.statIcon} />
              <div className={styles.statData}>
                <span className={styles.statValue}>{totalVotes}</span>
                <span className={styles.statLabel}>獲得推薦</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className={styles.reviewsSection}>
        <h2 className={styles.sectionTitle}>我的觀影心得</h2>
        
        {reviews.length === 0 ? (
          <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>這裡還空空如也</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              趕快回到首頁，建立您的第一座影像殿堂吧！
            </p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              去首頁發布心得
            </button>
          </div>
        ) : (
          <div className={styles.reviewList}>
            {reviews.map(review => (
              <div 
                key={review.id} 
                className={styles.reviewCard}
                onClick={() => setSelectedReview(review)}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <h3>{review.movie?.title || '未命名電影'}</h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: '12px' }}>
                  {new Date(review.created_at).toLocaleDateString('zh-TW')}
                </span>
                <p>{review.content}</p>
                <div className={styles.tags}>
                  {review.tags?.map(tag => (
                    <span key={tag.id} className={styles.tag}>{tag.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commented Reviews Section */}
      <div className={styles.reviewsSection} style={{ marginTop: '40px' }}>
        <h2 className={styles.sectionTitle}>我留言過的心得</h2>
        
        {commentedReviews.length === 0 ? (
          <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>您還沒有在任何心得下方留言過。</p>
          </div>
        ) : (
          <div className={styles.reviewList}>
            {commentedReviews.map(review => (
              <div 
                key={review.id} 
                className={styles.reviewCard} 
                onClick={() => setSelectedReview(review)}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <h3>{review.movie?.title || '未命名電影'}</h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: '12px' }}>
                  {new Date(review.created_at).toLocaleDateString('zh-TW')} • 作者: {review.user?.nickname}
                </span>
                <p style={{
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>
                  {review.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal for both sections */}
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

function UserPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '100%', height: '100%', color: '#a3a3a3'}}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

export default Profile;
