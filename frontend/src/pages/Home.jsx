import { useState, useEffect } from 'react';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import ReviewForm from '../components/ReviewForm';
import api from '../api/axios';

function Home() {
  const [isComposing, setIsComposing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
      <header className="flex-between" style={{ marginBottom: '40px' }}>
        <h1>探索熱門電影心得</h1>
        <button className="btn-primary" onClick={() => setIsComposing(true)}>
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
          <button className="btn-primary" onClick={() => setIsComposing(true)}>
            現在來寫第一篇吧！
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {reviews.map(review => (
            <div key={review.id} className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--accent-primary)', fontSize: '1.4rem' }}>
                  {review.movie?.title}
                </h3>
                <span style={{ color: 'var(--text-muted)' }}>
                  {new Date(review.created_at).toLocaleDateString('zh-TW')}
                </span>
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '20px' }}>
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
                  <ThumbsUp size={16} /> 推薦指數 {review.rating}/5
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserIcon username={review.user?.username} /> {review.user?.username}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple helper component
function UserIcon({ username }) {
  return (
    <div style={{
      width: '24px', height: '24px', borderRadius: '50%', 
      backgroundColor: 'var(--accent-primary)', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.8rem', fontWeight: 'bold'
    }}>
      {username ? username.charAt(0).toUpperCase() : '?'}
    </div>
  );
}

export default Home;
