import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import ReviewForm from '../components/ReviewForm';
import ReviewModal from '../components/ReviewModal';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const [isComposing, setIsComposing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleReviewUpdated = () => {
    fetchReviews();
  };

  const handleReviewDeleted = (id) => {
    setReviews(reviews.filter(r => r.id !== id));
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOption, setSortOption] = useState('hot');

  useEffect(() => {
    fetchReviews();
  }, [currentPage, sortOption]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`reviews/?sort=${sortOption}&page=${currentPage}`);
      setReviews(response.data.results || response.data);
      if (response.data.count) {
        setTotalPages(Math.ceil(response.data.count / 20)); // Assuming PAGE_SIZE is 20
      } else {
        setTotalPages(1);
      }
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
      <header className="flex-between" style={{ marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <h1>探索電影心得</h1>
          <select 
            value={sortOption} 
            onChange={(e) => {
              setSortOption(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
              borderRadius: '8px',
              outline: 'none',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            <option value="hot">最熱門</option>
            <option value="newest">最新發布</option>
            <option value="oldest">最早發布</option>
          </select>
        </div>
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

      {selectedReview && (
        <ReviewModal 
          review={selectedReview} 
          onClose={() => setSelectedReview(null)} 
          onReviewUpdated={handleReviewUpdated}
          onReviewDeleted={handleReviewDeleted}
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
              onClick={() => setSelectedReview(review)}
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
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '16px' }}>
                  <MessageCircle size={16} /> {review.comments_count || 0}
                </span>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); handleVote(review.id); }}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    background: review.user_voted === 1 ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: review.user_voted === 1 ? 'var(--accent-primary)' : 'var(--text-primary)',
                    padding: '4px 12px', borderRadius: '20px',
                    cursor: 'pointer', transition: 'all 0.2s ease', marginLeft: 'auto'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.background = review.user_voted === 1 ? 'rgba(139, 92, 246, 0.2)' : 'transparent'; 
                    e.currentTarget.style.color = review.user_voted === 1 ? 'var(--accent-primary)' : 'var(--text-primary)'; 
                  }}
                >
                  <ThumbsUp size={16} /> 推薦 ({review.upvotes || 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            上一頁
          </button>
          <span style={{ color: 'var(--text-secondary)' }}>第 {currentPage} 頁 / 共 {totalPages} 頁</span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            下一頁
          </button>
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
