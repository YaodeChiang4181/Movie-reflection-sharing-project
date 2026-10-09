import { useState, useEffect } from 'react';
import { Search as SearchIcon, MessageCircle, Film, Star, List } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReviewModal from '../components/ReviewModal';
import ListCard from '../components/ListCard';
import api from '../api/axios';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [listResults, setListResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, reviews, lists
  const navigate = useNavigate();
  const location = useLocation();
  const [recommendedTags, setRecommendedTags] = useState(['動作', '喜劇', '科幻', '劇情']);

  useEffect(() => {
    const fetchLatestTags = async () => {
      const CACHE_KEY = 'recommended_tags';
      const CACHE_TIME_KEY = 'recommended_tags_time';
      const CACHE_DURATION = 60 * 60 * 1000;

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
      const [reviewsRes, listsRes] = await Promise.all([
        api.get(`reviews/search/?q=${encodeURIComponent(searchQuery)}`),
        api.get(`lists/search/?q=${encodeURIComponent(searchQuery)}`)
      ]);
      setResults(reviewsRes.data);
      setListResults(listsRes.data);
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
    handleSearch({ preventDefault: () => { } });
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
            placeholder="輸入關鍵字..."
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
                  const keyword = tag.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s?/, '');
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

      {hasSearched && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{ padding: '8px 24px', borderRadius: '20px', background: activeTab === 'all' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', color: activeTab === 'all' ? 'var(--bg-primary)' : 'white', fontWeight: 'bold' }}
          >
            全部
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            style={{ padding: '8px 24px', borderRadius: '20px', background: activeTab === 'reviews' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', color: activeTab === 'reviews' ? 'var(--bg-primary)' : 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <MessageCircle size={16} /> 心得
          </button>
          <button
            onClick={() => setActiveTab('lists')}
            style={{ padding: '8px 24px', borderRadius: '20px', background: activeTab === 'lists' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', color: activeTab === 'lists' ? 'var(--bg-primary)' : 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <List size={16} /> 你的片單
          </button>
        </div>
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
      ) : hasSearched ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

          {/* 片單結果 */}
          {(activeTab === 'all' || activeTab === 'lists') && listResults.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <List size={24} color="var(--accent-primary)" /> 相關主題片單
              </h2>
              <div className="posterGrid">
                {listResults.map(list => (
                  <ListCard key={list.id} list={list} onClick={() => navigate(`/lists/${list.id}`)} />
                ))}
              </div>
            </div>
          )}

          {/* 心得結果 */}
          {(activeTab === 'all' || activeTab === 'reviews') && results.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={24} color="var(--accent-primary)" /> 相關影評心得
              </h2>
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
            </div>
          )}

          {results.length === 0 && listResults.length === 0 && (
            <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)' }}>未發現相關結果</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>試試換個關鍵字搜尋一次吧！</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default Search;
