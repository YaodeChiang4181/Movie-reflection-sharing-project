import { useState, useEffect } from 'react';
import { Search as SearchIcon, MessageCircle, Film, Star } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReviewModal from '../components/ReviewModal';
import api from '../api/axios';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [recommendedTags, setRecommendedTags] = useState(['🔥 動作', '😂 喜劇', '🚀 科幻', '🎬 劇情']);

  useEffect(() => {
    const fetchLatestTags = async () => {
      const CACHE_KEY = 'recommended_tags';
      const CACHE_TIME_KEY = 'recommended_tags_time';
      const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

      const cachedTags = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

      if (cachedTags && cachedTime && (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
        setRecommendedTags(JSON.parse(cachedTags));
        return;
      }

      try {
        const res = await api.get('reviews/');
        const reviewsList = res.data.results || res.data;
        const tagCounts = {};
        
        reviewsList.forEach(review => {
          if (review.tags) {
            review.tags.forEach(tag => {
              tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1;
            });
          }
        });
        
        const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
        if (sortedTags.length > 0) {
          const topTags = sortedTags.slice(0, 4);
          setRecommendedTags(topTags);
          localStorage.setItem(CACHE_KEY, JSON.stringify(topTags));
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        }
      } catch (err) {
        console.error("Failed to fetch tags", err);
      }
    };
    fetchLatestTags();
  }, []);

  const performSearch = async (searchQuery) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await api.get(`reviews/search/?q=${encodeURIComponent(searchQuery)}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!query.trim()) return;
    performSearch(query.trim());
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialQuery = params.get('q');
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [location.search]);

  const handleReviewUpdated = () => {
    handleSearch({ preventDefault: () => {} });
  };

  const handleReviewDeleted = (id) => {
    setResults(results.filter(r => r.id !== id));
  };

  return (
    <div className="container" style={{ 
      paddingTop: '80px', 
      paddingBottom: '60px',
      minHeight: '100vh'
    }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '24px' }}>精準搜尋...</h1>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0', maxWidth: '600px', margin: '0 auto' }}>
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="輸入電影名稱或心得關鍵字..."
            style={{ 
              flex: 1, padding: '16px 24px', fontSize: '1.1rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRight: 'none',
              borderRadius: '30px 0 0 30px', color: 'white', outline: 'none'
            }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 24px', borderRadius: '0 30px 30px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={isLoading}>
            <SearchIcon size={20} />
          </button>
        </form>

        {!hasSearched && !isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            {recommendedTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  const keyword = tag.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s?/, ''); // Remove emoji prefix if any
                  setQuery(keyword);
                  performSearch(keyword);
                }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </header>

      {selectedReview && (
        <ReviewModal 
          review={selectedReview} 
          onClose={() => setSelectedReview(null)} 
          onReviewUpdated={handleReviewUpdated}
          onReviewDeleted={handleReviewDeleted}
        />
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gap: '24px' }}>
          {[1, 2, 3].map(n => (
            <div key={n} className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '24px' }}>
              <div className="skeleton skeleton-poster" style={{ width: '80px', height: '120px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="skeleton skeleton-title" style={{ width: '40%', height: '1.5rem', margin: 0 }} />
                <div className="skeleton skeleton-text" style={{ width: '20%', height: '1rem', margin: 0 }} />
                <div className="skeleton skeleton-text" style={{ width: '30%', height: '1.5rem', borderRadius: 'var(--radius-pill)', marginTop: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)' }}>未發現相關心得</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>試試換個關鍵字搜尋一次吧！</p>
        </div>
      ) : (
        <div className="posterGrid">
          {results.map(review => (
            <div key={review.id} className="posterCard" onClick={() => {
                if (review.movie?.id) navigate(`/movies/${review.movie.id}`);
            }}>
              <div className="posterWrapper">
                {review.movie?.poster_url ? (
                  <img src={review.movie.poster_url} alt="poster" className="posterImg" />
                ) : (
                  <div className="posterPlaceholder"><Film size={32} /></div>
                )}
                <div className="posterOverlay">
                  <button 
                    className="overlayBtn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReview(review);
                    }}
                  >
                    <MessageCircle size={16} /> 查看心得
                  </button>
                </div>
              </div>
              <div className="posterInfo">
                <div className="posterTitle">{review.movie?.title || '未命名電影'}</div>
                <div className="posterMeta">
                  {review.rating !== null && review.rating > 0 && (
                    <span className="posterRating"><Star size={12} fill="currentColor" /> {review.rating}/5</span>
                  )}
                  <span className="posterDate">{new Date(review.effective_date || review.created_at).toLocaleDateString('zh-TW')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
