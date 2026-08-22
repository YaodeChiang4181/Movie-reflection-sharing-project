import { useState, useEffect } from 'react';
import { Search as SearchIcon, ThumbsUp, MessageCircle } from 'lucide-react';
import ReviewModal from '../components/ReviewModal';
import TmdbPoster from '../components/TmdbPoster';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [recommendedTags, setRecommendedTags] = useState(['🔥 動作', '😂 喜劇', '🚀 科幻', '🎬 劇情']);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    const fetchLatestTags = async () => {
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
          setRecommendedTags(sortedTags.slice(0, 4));
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
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('q');
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, []);

  const handleReviewUpdated = () => {
    handleSearch({ preventDefault: () => {} });
  };

  const handleReviewDeleted = (id) => {
    setResults(results.filter(r => r.id !== id));
  };

  const handleVote = async (reviewId) => {
    if (!isLoggedIn) {
      alert('必須登入才能對心得進行評價！');
      return;
    }
    try {
      await api.post(`reviews/${reviewId}/vote/`, { vote_type: 1 });
      handleSearch({ preventDefault: () => {} });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container" style={{ 
      paddingTop: '80px', 
      paddingBottom: '60px',
      minHeight: '100vh'
    }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '24px' }}>電影心得精準搜尋</h1>
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
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>搜尋中...</p>
      ) : hasSearched && results.length === 0 ? (
        <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)' }}>未發現您想要找的心得</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>試著更換關鍵字再搜尋一次吧！</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {results.map(review => (
            <div 
              key={review.id} 
              className="glass hover-scale" 
              style={{ padding: '24px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', gap: '24px' }}
              onClick={() => setSelectedReview(review)}
            >
              <div style={{ flexShrink: 0 }}>
                <TmdbPoster 
                  title={review.movie?.title} 
                  style={{ width: '100px', height: '150px', borderRadius: '12px' }} 
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ color: 'var(--accent-primary)', fontSize: '1.4rem', margin: 0 }}>
                    {review.movie?.title}
                  </h3>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {new Date(review.created_at).toLocaleDateString('zh-TW')}
                  </span>
                </div>
                {review.content && review.content !== "來自急速評星的無內文評價" && (
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
                )}
                
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

                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', marginTop: 'auto' }}>
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

export default Search;
