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
          className="glass hover-scale" 
          style={{ 
            marginBottom: '40px', 
            padding: '40px', 
            borderRadius: 'var(--radius-lg)', 
            display: 'flex', 
            gap: '40px', 
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.15) 0%, rgba(20, 20, 20, 0.6) 100%)',
            border: '1px solid rgba(245, 166, 35, 0.3)',
            cursor: 'pointer'
          }}
          onClick={() => navigate(`/movies/${heroMovie.id}`)}
        >
          <TmdbPoster title={heroMovie.title} style={{ width: '160px', height: '240px', borderRadius: '12px', flexShrink: 0, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Flame style={{ color: '#F5A623' }} size={24} />
              <span style={{ color: '#F5A623', fontWeight: 'bold', letterSpacing: '1px', fontSize: '1.1rem' }}>本週社群最高分推薦</span>
            </div>
            <h2 style={{ fontSize: '2.8rem', margin: '0 0 20px 0', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{heroMovie.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ 
                backgroundColor: 'rgba(245, 166, 35, 0.15)',
                padding: '8px 20px',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(245, 166, 35, 0.4)'
              }}>
                <Star size={24} fill="#F5A623" style={{ color: '#F5A623' }} />
                <span style={{ color: '#F5A623', fontSize: '1.4rem', fontWeight: 'bold' }}>{heroMovie.avg_rating ? heroMovie.avg_rating.toFixed(1) : '0.0'}</span>
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
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
                  className="glass hover-scale" 
                  style={{ 
                    padding: '16px 24px', 
                    borderRadius: 'var(--radius-md)', 
                    cursor: 'pointer', 
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => navigate(`/movies/${movie.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <TmdbPoster 
                      title={movie.title} 
                      style={{ width: '50px', height: '75px', borderRadius: '6px', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h3 style={{ color: '#F1F5F9', fontSize: '1.3rem', margin: 0 }}>
                        {movie.title}
                      </h3>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        #熱門討論 #社群精選
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      ({movie.review_count || 0} 則評價)
                    </span>
                    <div style={{ 
                      backgroundColor: 'rgba(245, 166, 35, 0.1)',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      color: '#F5A623', 
                      fontSize: '1.2rem', 
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid rgba(245, 166, 35, 0.25)'
                    }}>
                      <Star size={18} fill="#F5A623" style={{ color: '#F5A623' }} />
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
        <div style={{ position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div 
            className="glass hover-scale" 
            style={{ padding: '32px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(20, 20, 20, 0.4) 100%)' }}
            onClick={handleComposeClick}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#D8B4FE' }}>
              <Edit3 size={32} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>發布心得</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>撰寫完整影評，分享您的觀影感動</p>
            </div>
          </div>

          <div 
            className="glass hover-scale" 
            style={{ padding: '32px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 20, 20, 0.6) 100%)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
            onClick={() => {
              if (!isLoggedIn) {
                alert('請先登入才能使用急速評星。');
                navigate('/auth');
                return;
              }
              setIsSpeedRatingOpen(true);
            }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#10B981', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
              <FastForward size={32} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>急速評星</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>極簡輪播介面，一鍵快速給分</p>
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
