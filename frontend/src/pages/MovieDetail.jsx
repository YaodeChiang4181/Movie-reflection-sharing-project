import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, Calendar, ThumbsUp, ThumbsDown, User, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import styles from './MovieDetail.module.css';

function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        setIsLoading(true);
        // 1. Fetch movie details
        const movieRes = await api.get(`movies/${id}/`);
        setMovie(movieRes.data);
        
        // 2. Fetch reviews for this movie, backend handles ordering by '-created_at' by default
        // We will fetch and then sort them by score in the frontend for "hot" reviews
        const reviewsRes = await api.get(`reviews/?movie=${id}`);
        // Sort by score (hotness) descending, then created_at
        const sortedReviews = reviewsRes.data.results || reviewsRes.data;
        sortedReviews.sort((a, b) => {
          const scoreA = a.score || 0;
          const scoreB = b.score || 0;
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        setReviews(sortedReviews);
      } catch (error) {
        console.error("Failed to fetch movie details:", error);
        if (error.response?.status === 404) {
          alert('找不到該部電影！');
          navigate('/');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchMovieData();
    }
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className={`container ${styles.pageWrapper}`} style={{ textAlign: 'center', paddingTop: '100px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
      </div>
    );
  }

  if (!movie) return null;

  // Calculate average rating
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className={`container ${styles.pageWrapper}`}>
      <div className={styles.gridContainer}>
        {/* Left Column: Poster */}
        <div className={styles.posterWrapper}>
          <img 
            src={movie.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1000&auto=format&fit=crop"} 
            alt={movie.title} 
            className={styles.poster}
          />
        </div>

        {/* Right Column: Details */}
        <div className={styles.detailsWrapper}>
          <h1 className={styles.title}>{movie.title}</h1>
          
          <div className={styles.metaInfo}>
            <span className={styles.metaItem}><Calendar size={16}/> {movie.release_year || '未知年份'}</span>
            <span className={styles.metaItem}>導演: {movie.director || '未知'}</span>
          </div>

          <div className={styles.ratingBox}>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star 
                  key={star} 
                  size={24} 
                  className={styles.starIcon} 
                  fill={star <= Math.round(avgRating) ? "currentColor" : "none"} 
                  style={{ color: star <= Math.round(avgRating) ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                />
              ))}
            </div>
            <span className={styles.ratingText}>{avgRating} / 5.0 (來自 {reviews.length} 則影評)</span>
          </div>

          <div className={styles.plotBox}>
            <h3>劇情簡介</h3>
            <p>
              {movie.description || '目前尚無劇情簡介。'}
            </p>
          </div>

          <div className={styles.reviewSection}>
            <h3>熱門影評</h3>
            {reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>目前還沒有影評，來成為第一位評論的人吧！</p>
            )}
          </div>

          <button className="btn-primary" style={{marginTop: '24px'}} onClick={() => navigate('/')}>
            回首頁看更多
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  // 樂觀 UI (Optimistic UI) 狀態管理
  const [voteCount, setVoteCount] = useState(review.score || 0);
  const [currentVote, setCurrentVote] = useState(review.user_voted ? 1 : 0); // 簡化版，預設為1或0
  const [isVoting, setIsVoting] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleVote = async (voteType) => {
    if (isVoting) return;
    
    // 儲存先前的狀態，以便失敗時復原
    const prevVote = currentVote;
    const prevCount = voteCount;
    
    // 1. 樂觀地立即更新畫面 (Optimistic Update)
    setIsVoting(true);
    let newVoteCount = voteCount;
    let newCurrentVote = voteType;

    if (currentVote === voteType) {
      // 收回投票
      newCurrentVote = 0;
      newVoteCount = voteCount - voteType;
    } else {
      // 改變投票或新投票
      const diff = voteType - currentVote;
      newVoteCount = voteCount + diff;
    }

    setCurrentVote(newCurrentVote);
    setVoteCount(newVoteCount);

    // 2. 發送背景 API 請求
    try {
      await api.post(`reviews/${review.id}/vote/`, { vote_type: voteType });
    } catch (error) {
      // 3. 失敗處理：退回原狀態並提示錯誤
      setCurrentVote(prevVote);
      setVoteCount(prevCount);
      
      if (error.response?.status === 401) {
        alert('請先登入才能投票！');
      } else {
        alert('投票失敗，請稍後再試。');
      }
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className={styles.reviewCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            {review.user?.nickname ? review.user.nickname.charAt(0).toUpperCase() : '?'}
          </div>
          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{review.user?.nickname || '未知使用者'}</span>
          <span>給了 {review.rating} 顆星</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {new Date(review.created_at).toLocaleDateString('zh-TW')}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <p 
          className={styles.reviewText}
          style={review.is_spoiler && !isRevealed ? { filter: 'blur(8px)', userSelect: 'none', cursor: 'pointer' } : {}}
          onClick={() => { if(review.is_spoiler && !isRevealed) setIsRevealed(true); }}
        >
          {review.content}
        </p>
        
        {review.is_spoiler && !isRevealed && (
          <div 
            style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 'bold', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}
            onClick={() => setIsRevealed(true)}
          >
            ⚠️ 包含劇透，點擊解鎖
          </div>
        )}
      </div>
      
      {review.tags && review.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          {review.tags.map(tag => (
            <span 
              key={tag.id} 
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--accent-primary)',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.85rem',
                fontWeight: '500'
              }}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}      
      <div className={styles.voteActions} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
            <button 
              className={`${styles.voteBtn} ${currentVote === 1 ? styles.voteActive : ''}`}
              onClick={() => handleVote(1)}
              disabled={isVoting}
              aria-label="推"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: currentVote === 1 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
            >
              <ThumbsUp size={16} />
            </button>
            
            <span className={styles.voteCount} style={{
              color: currentVote === 1 ? 'var(--accent-primary)' : currentVote === -1 ? 'var(--danger)' : 'var(--text-primary)',
              fontWeight: 'bold', minWidth: '20px', textAlign: 'center'
            }}>
              {voteCount}
            </span>

            <button 
              className={`${styles.voteBtn} ${currentVote === -1 ? styles.voteActiveDown : ''}`}
              onClick={() => handleVote(-1)}
              disabled={isVoting}
              aria-label="噓"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: currentVote === -1 ? 'var(--danger)' : 'var(--text-secondary)' }}
            >
              <ThumbsDown size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <MessageCircle size={16} /> 留言 ({review.comments_count || 0})
        </div>
      </div>
    </div>
  );
}

export default MovieDetail;

