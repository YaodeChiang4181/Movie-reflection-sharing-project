import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import ReviewForm from '../components/ReviewForm';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const [isComposing, setIsComposing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedReviews, setExpandedReviews] = useState({});
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const toggleReview = (id) => {
    setExpandedReviews(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      // Fetch trending or all reviews
      const response = await api.get('reviews/trending/');
      setReviews(response.data.results || response.data);
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewAdded = (newReview) => {
    // Refresh the list when a new review is added
    fetchReviews();
  };

  const handleComposeClick = () => {
    if (!isLoggedIn) {
      alert('請先登入後再發布心得！');
      navigate('/auth');
      return;
    }
    setIsComposing(true);
  };

  const handleVote = async (reviewId) => {
    if (!isLoggedIn) {
      alert('必須登入才能對心得進行評價！');
      navigate('/auth');
      return;
    }
    try {
      await api.post(`reviews/${reviewId}/vote/`, { vote_type: 1 });
      fetchReviews(); // Re-fetch to update scores
    } catch (err) {
      console.error(err);
      alert('評價失敗，請稍後再試。');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
      <header className="flex-between" style={{ marginBottom: '40px' }}>
        <h1>探索熱門電影心得</h1>
        <button className="btn-primary" onClick={handleComposeClick}>
          發布心得
        </button>
      </header>
      
      {isComposing && (
        <ReviewForm 
          onClose={() => setIsComposing(false)} 
          onReviewAdded={handleReviewAdded} 
        />
      )}

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
      ) : reviews.length === 0 ? (
        <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>目前沒有心得</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            這座城市還缺少您的觀影回憶。
          </p>
          <button className="btn-primary" onClick={handleComposeClick}>
            現在來寫第一篇吧！
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {reviews.map(review => (
            <div 
              key={review.id} 
              className="glass" 
              style={{ padding: '24px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => toggleReview(review.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--accent-primary)', fontSize: '1.4rem' }}>
                  {review.movie?.title}
                </h3>
                <span style={{ color: 'var(--text-muted)' }}>
                  {new Date(review.created_at).toLocaleDateString('zh-TW')}
                </span>
              </div>
              <p style={{ 
                color: 'var(--text-primary)', 
                fontSize: '1.1rem', 
                lineHeight: '1.6', 
                marginBottom: '20px',
                ...(expandedReviews[review.id] ? {} : {
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                })
              }}>
                {review.content}
              </p>
              
              {/* Tags */}
              {review.tags && review.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {review.tags.map(tag => (
                    <span key={tag.id} style={{ 
                      backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                      color: 'var(--accent-secondary)', 
                      padding: '4px 12px', 
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.9rem'
                    }}>
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                   推薦指數 {review.rating}/5
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserIcon nickname={review.user?.nickname} /> {review.user?.nickname || '未知使用者'}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleVote(review.id); }}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'var(--text-primary)', padding: '4px 12px', borderRadius: '20px',
                    cursor: 'pointer', transition: 'all 0.2s ease', marginLeft: 'auto'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                >
                  <ThumbsUp size={16} /> 推薦 ({review.score || 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple helper component
function UserIcon({ nickname }) {
  return (
    <div style={{
      width: '24px', height: '24px', borderRadius: '50%', 
      backgroundColor: 'var(--accent-primary)', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.8rem', fontWeight: 'bold'
    }}>
      {nickname ? nickname.charAt(0).toUpperCase() : '?'}
    </div>
  );
}

export default Home;
