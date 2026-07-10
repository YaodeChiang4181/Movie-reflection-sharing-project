import { useState } from 'react';
import { Star, Clock, Calendar, ThumbsUp, ThumbsDown } from 'lucide-react';
import api from '../api/axios';
import styles from './MovieDetail.module.css';

// Mock review data for demonstration
const mockReviewId = 1;

function MovieDetail() {
  return (
    <div className={`container ${styles.pageWrapper}`}>
      <div className={styles.gridContainer}>
        {/* Left Column: Poster */}
        <div className={styles.posterWrapper}>
          <img 
            src="https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1000&auto=format&fit=crop" 
            alt="Movie Poster Placeholder" 
            className={styles.poster}
          />
        </div>

        {/* Right Column: Details */}
        <div className={styles.detailsWrapper}>
          <h1 className={styles.title}>全面啟動 (Inception)</h1>
          
          <div className={styles.metaInfo}>
            <span className={styles.metaItem}><Calendar size={16}/> 2010</span>
            <span className={styles.metaItem}><Clock size={16}/> 148 分鐘</span>
            <span className={styles.metaItem}>導演: Christopher Nolan</span>
          </div>

          <div className={styles.ratingBox}>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={24} className={styles.starIcon} fill="currentColor" />
              ))}
            </div>
            <span className={styles.ratingText}>4.8 / 5.0 (來自 342 則影評)</span>
          </div>

          <div className={styles.plotBox}>
            <h3>劇情簡介</h3>
            <p>
              唐姆·柯伯是一名「盜夢者」，與搭檔亞瑟利用潛意識進入別人夢境竊取商業機密。
              在一次任務失敗後，他被要求執行一項看似不可能的任務：「植入想法」...
            </p>
          </div>

          <div className={styles.reviewSection}>
            <h3>熱門影評</h3>
            <ReviewCard reviewId={mockReviewId} initialVoteCount={120} />
          </div>

          <button className="btn-primary" style={{marginTop: '24px'}}>
            撰寫影評
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ reviewId, initialVoteCount }) {
  // 樂觀 UI (Optimistic UI) 狀態管理
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [currentVote, setCurrentVote] = useState(0); // 1 = up, -1 = down, 0 = none
  const [isVoting, setIsVoting] = useState(false);

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
      // 如果原本有投過票，要先扣除原本的，加上新的
      const diff = voteType - currentVote;
      newVoteCount = voteCount + diff;
    }

    setCurrentVote(newCurrentVote);
    setVoteCount(newVoteCount);

    // 2. 發送背景 API 請求
    try {
      await api.post(`reviews/${reviewId}/vote/`, { vote_type: voteType });
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
      <p className={styles.reviewText}>
        這是我看過最震撼的科幻電影！配樂跟剪輯真的是神作等級，強烈建議去電影院看 IMAX。
      </p>
      
      <div className={styles.voteActions}>
        <button 
          className={`${styles.voteBtn} ${currentVote === 1 ? styles.voteActive : ''}`}
          onClick={() => handleVote(1)}
          disabled={isVoting}
          aria-label="推"
        >
          <ThumbsUp size={18} />
        </button>
        
        <span className={styles.voteCount} style={{
          color: currentVote === 1 ? 'var(--success)' : currentVote === -1 ? 'var(--danger)' : 'inherit'
        }}>
          {voteCount > 0 ? '+' : ''}{voteCount}
        </span>

        <button 
          className={`${styles.voteBtn} ${currentVote === -1 ? styles.voteActiveDown : ''}`}
          onClick={() => handleVote(-1)}
          disabled={isVoting}
          aria-label="噓"
        >
          <ThumbsDown size={18} />
        </button>
      </div>
    </div>
  );
}

export default MovieDetail;
