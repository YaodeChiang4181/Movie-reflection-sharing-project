import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Edit3, FastForward, Star, Flame } from 'lucide-react';
import TmdbPoster from '../components/TmdbPoster';
import ReviewForm from '../components/ReviewForm';
import SpeedRatingModal from '../components/SpeedRatingModal';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const [isComposing, setIsComposing] = useState(false);
  const [isSpeedRatingOpen, setIsSpeedRatingOpen] = useState(false);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchMovies();
  }, [currentPage]);

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
    fetchMovies();
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
      fetchMovies(); // Re-fetch to update scores
    } catch (err) {
      console.error(err);
      alert('評價失敗，請稍後再試。');
    }
  };

  const heroMovie = currentPage === 1 && movies.length > 0 ? movies[0] : null;
  const displayMovies = currentPage === 1 && movies.length > 0 ? movies.slice(1) : movies;

  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>探索電影心得</h1>
      </header>
      
      {isComposing && (
        <ReviewForm 
          onClose={() => setIsComposing(false)} 
          onReviewAdded={handleReviewAdded} 
        />
      )}

      {isSpeedRatingOpen && (
        <SpeedRatingModal 
          onClose={() => setIsSpeedRatingOpen(false)} 
        />
      )}

      {/* 首頁焦點橫幅 (Hero Banner) */}
      {!isLoading && heroMovie && (
        <div 
          className="glass hover-scale hero-banner" 
          onClick={() => navigate(`/movies/${heroMovie.id}`)}
        >
          <TmdbPoster title={heroMovie.title} className="hero-poster" />
          <div className="hero-content">
            <div className="hero-badge">
              <Flame size={24} />
              <span>本週社群最高分推薦</span>
            </div>
            <h2>{heroMovie.title}</h2>
            {heroMovie.original_title && (
              <div className="hero-original-title">
                {heroMovie.original_title}
              </div>
            )}
            {!heroMovie.original_title && <div style={{ marginBottom: '20px' }}></div>}
            <div className="hero-stats">
              <div className="hero-rating">
                <Star size={24} fill="#F5A623" />
                <span>{heroMovie.avg_rating ? heroMovie.avg_rating.toFixed(1) : '0.0'}</span>
              </div>
              <span className="hero-review-count">
                累積 {heroMovie.review_count || 0} 則深度影評
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="home-layout">
        {/* 左側 70%：電影列表 */}
        <div>
          {isLoading ? (
            <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
          ) : movies.length === 0 ? (
            <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>目前沒有任何電影資料</h2>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {displayMovies.map(movie => (
                <div 
                  key={movie.id} 
                  className="glass hover-scale movie-list-item" 
                  onClick={() => navigate(`/movies/${movie.id}`)}
                >
                  <div className="movie-list-left">
                    <TmdbPoster 
                      title={movie.title} 
                      className="movie-list-poster"
                    />
                    <div className="movie-list-info">
                      <h3>{movie.title}</h3>
                      {movie.original_title && (
                        <span className="movie-original-title">
                          {movie.original_title}
                        </span>
                      )}
                      <span className="movie-list-tags">
                        {currentPage === 1 ? '#熱門討論 #社群精選' : '#新鮮討論 #冷門話題'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="movie-list-right">
                    <span className="movie-review-count">
                      ({movie.review_count || 0} 則評價)
                    </span>
                    <div className="movie-list-rating">
                      <Star size={18} fill="#F5A623" />
                      <span>{movie.avg_rating ? movie.avg_rating.toFixed(1) : '0.0'}</span>
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

        {/* 右側 30%：功能操作面板 */}
        <div className="home-action-panel">
          
          <div 
            className="glass hover-scale action-card action-card-compose"
            onClick={handleComposeClick}
          >
            <div className="action-card-icon">
              <Edit3 size={32} />
            </div>
            <div className="action-card-text">
              <h2>發布心得</h2>
              <p>撰寫完整影評，分享您的觀影感動</p>
            </div>
          </div>

          <div 
            className="glass hover-scale action-card action-card-speed"
            onClick={() => {
              if (!isLoggedIn) {
                alert('請先登入才能使用急速評星。');
                navigate('/auth');
                return;
              }
              setIsSpeedRatingOpen(true);
            }}
          >
            <div className="action-card-icon">
              <FastForward size={32} />
            </div>
            <div className="action-card-text">
              <h2>急速評星</h2>
              <p>極簡輪播介面，一鍵快速給分</p>
            </div>
          </div>

        </div>
      </div>
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
