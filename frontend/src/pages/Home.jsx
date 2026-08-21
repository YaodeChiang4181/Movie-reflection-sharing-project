import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import TmdbPoster from '../components/TmdbPoster';
import ReviewForm from '../components/ReviewForm';
import ReviewModal from '../components/ReviewModal';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const [isComposing, setIsComposing] = useState(false);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOption, setSortOption] = useState('popular');

  useEffect(() => {
    fetchMovies();
  }, [currentPage, sortOption]);

  const fetchMovies = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`movies/?page=${currentPage}`);
      setMovies(response.data.results || response.data);
      if (response.data.count) {
        setTotalPages(Math.ceil(response.data.count / 20)); // PAGE_SIZE = 20
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to fetch movies", err);
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
            <option value="popular">熱門電影</option>
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

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
      ) : movies.length === 0 ? (
        <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>目前沒有任何電影資料</h2>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {movies.map(movie => (
            <div 
              key={movie.id} 
              className="glass" 
              style={{ 
                padding: '24px', 
                borderRadius: 'var(--radius-md)', 
                cursor: 'pointer', 
                transition: 'all 0.3s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onClick={() => navigate(`/movies/${movie.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <TmdbPoster 
                  title={movie.title} 
                  style={{ width: '60px', height: '90px', borderRadius: '8px', flexShrink: 0 }}
                />
                <h3 style={{ color: '#F1F5F9', fontSize: '1.4rem', margin: 0 }}>
                  {movie.title}
                </h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                  ({movie.review_count || 0} 則評價)
                </span>
                <div style={{ 
                  backgroundColor: 'rgba(142, 82, 245, 0.15)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  color: 'var(--text-primary)', 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid rgba(142, 82, 245, 0.3)'
                }}>
                  <ThumbsUp size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ color: '#D8B4FE' }}>{movie.avg_rating ? movie.avg_rating.toFixed(1) : '0.0'}</span>
                </div>
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
