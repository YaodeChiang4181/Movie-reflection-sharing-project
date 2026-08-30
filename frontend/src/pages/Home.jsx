import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Edit3, FastForward, Star, Flame, CalendarDays, Ticket } from 'lucide-react';
import TmdbPoster from '../components/TmdbPoster';
import ReviewForm from '../components/ReviewForm';
import SpeedRatingModal from '../components/SpeedRatingModal';
import EventForm from '../components/EventForm';
import FeedCard from '../components/FeedCard';
import EventDetailModal from '../components/EventDetailModal';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from '../components/EventFilterTabs.module.css';

function Home() {
  const [isComposing, setIsComposing] = useState(false);
  const [isEventComposing, setIsEventComposing] = useState(false);
  const [isSpeedRatingOpen, setIsSpeedRatingOpen] = useState(false);
  
  const [feedItems, setFeedItems] = useState([]);
  const [feedType, setFeedType] = useState('all'); // 'all', 'movies', 'events'
  const [isLoading, setIsLoading] = useState(true);
  
  const [heroItems, setHeroItems] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Global event listeners for Navbar buttons
  useEffect(() => {
    const handleOpenReviewForm = () => {
      if (!isLoggedIn) {
        alert('請先登入後再寫心得！');
        navigate('/auth');
        return;
      }
      setIsComposing(true);
    };

    const handleOpenEventForm = () => {
      if (!isLoggedIn) {
        alert('請先登入後再發起揪團活動！');
        navigate('/auth');
        return;
      }
      setIsEventComposing(true);
    };

    window.addEventListener('open-review-form', handleOpenReviewForm);
    window.addEventListener('open-event-form', handleOpenEventForm);
    
    return () => {
      window.removeEventListener('open-review-form', handleOpenReviewForm);
      window.removeEventListener('open-event-form', handleOpenEventForm);
    };
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    fetchFeed();
  }, [currentPage, feedType]);

  useEffect(() => {
    fetchHeroItems();
  }, []);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroItems.length]);

  const fetchFeed = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`feed/?type=${feedType}&page=${currentPage}`);
      setFeedItems(response.data.results || response.data);
      if (response.data.count) {
        setTotalPages(Math.ceil(response.data.count / 20));
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to fetch feed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHeroItems = async () => {
    try {
      // Fetch upcoming events and top movies simultaneously
      const [eventsRes, moviesRes] = await Promise.all([
        api.get(`events/?status=UPCOMING`),
        api.get(`movies/`) // This endpoint returns movies sorted by popularity
      ]);
      const upcomingEvents = eventsRes.data.results || eventsRes.data || [];
      const topMovies = moviesRes.data.results || moviesRes.data || [];
      
      const mixed = [];
      if (upcomingEvents.length > 0) mixed.push({...upcomingEvents[0], feed_type: 'EVENT'});
      if (upcomingEvents.length > 1) mixed.push({...upcomingEvents[1], feed_type: 'EVENT'});
      if (topMovies.length > 0) mixed.push({...topMovies[0], feed_type: 'MOVIE'});
      if (topMovies.length > 1) mixed.push({...topMovies[1], feed_type: 'MOVIE'});
      if (upcomingEvents.length > 2) mixed.push({...upcomingEvents[2], feed_type: 'EVENT'});
      if (topMovies.length > 2) mixed.push({...topMovies[2], feed_type: 'MOVIE'});
      
      setHeroItems(mixed.slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch hero items", err);
    }
  };

  const handleComposeClick = () => {
    if (!isLoggedIn) {
      alert('請先登入後再發布心得！');
      navigate('/auth');
      return;
    }
    setIsComposing(true);
  };

  const handleCardClick = (item) => {
    if (item.feed_type === 'MOVIE') {
      navigate(`/movies/${item.id}`);
    } else {
      setSelectedEvent(item);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
      
      {isComposing && (
        <ReviewForm 
          onClose={() => setIsComposing(false)} 
          onReviewAdded={fetchFeed} 
        />
      )}
      
      {isEventComposing && (
        <EventForm 
          onClose={() => setIsEventComposing(false)} 
          onEventAdded={() => { fetchFeed(); fetchHeroItems(); }} 
        />
      )}

      {isSpeedRatingOpen && (
        <SpeedRatingModal 
          onClose={() => setIsSpeedRatingOpen(false)} 
        />
      )}

      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)}
          onUpdate={fetchFeed}
        />
      )}

      {/* 焦點橫幅輪播 (Hero Carousel) */}
      {heroItems.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {(() => {
            const item = heroItems[currentHeroIndex];
            if (!item) return null;
            return item.feed_type === 'EVENT' ? (
              <div 
                className="glass hover-scale hero-banner" 
                onClick={() => setSelectedEvent(item)}
                style={{ marginBottom: '16px' }}
              >
                {item.cover_image ? (
                  <img src={item.cover_image} alt={item.title} className="hero-poster" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="hero-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                    <Ticket size={48} opacity={0.5} />
                  </div>
                )}
                <div className="hero-content">
                  <div className="hero-badge" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', color: '#111', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <CalendarDays size={20} />
                    <span style={{ fontWeight: 600, marginLeft: '4px' }}>近期最熱門</span>
                  </div>
                  <h2>{item.title}</h2>
                  <div className="hero-stats">
                    <span className="hero-review-count">
                      報名進度：{item.registered_count} / {item.capacity || '無上限'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="glass hover-scale hero-banner" 
                onClick={() => navigate(`/movies/${item.id}`)}
                style={{ marginBottom: '16px' }}
              >
                <TmdbPoster title={item.title} className="hero-poster" />
                <div className="hero-content">
                  <div className="hero-badge" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', color: '#111', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <Flame size={20} />
                    <span style={{ fontWeight: 600, marginLeft: '4px' }}>近期最熱門</span>
                  </div>
                  <h2>{item.title}</h2>
                  {item.original_title && (
                    <div className="hero-original-title">
                      {item.original_title}
                    </div>
                  )}
                  {!item.original_title && <div style={{ marginBottom: '20px' }}></div>}
                  <div className="hero-stats">
                    <div className="hero-rating">
                      <Star size={24} fill="#F5A623" />
                      <span>{item.avg_rating ? item.avg_rating.toFixed(1) : '0.0'}</span>
                    </div>
                    <span className="hero-review-count">
                      累積 {item.review_count || 0} 篇深度影評
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {heroItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentHeroIndex(idx)}
                style={{
                  width: idx === currentHeroIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: idx === currentHeroIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  padding: 0,
                  cursor: 'pointer'
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 膠囊快篩 */}
      <div className={styles.tabsContainer} style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
        <button 
          className={`${styles.tab} ${feedType === 'all' ? styles.active : ''}`}
          onClick={() => { setFeedType('all'); setCurrentPage(1); }}
        >
          全部動態
        </button>
        <button 
          className={`${styles.tab} ${feedType === 'movies' ? styles.active : ''}`}
          onClick={() => { setFeedType('movies'); setCurrentPage(1); }}
        >
          電影專區
        </button>
        <button 
          className={`${styles.tab} ${feedType === 'events' ? styles.active : ''}`}
          onClick={() => { setFeedType('events'); setCurrentPage(1); }}
        >
          活動回顧
        </button>
      </div>

      <div className="home-layout">
        {/* 左側 70%：資訊流 */}
        <div>
          {isLoading ? (
            <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
          ) : feedItems.length === 0 ? (
            <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>目前沒有任何動態</h2>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {feedItems.map(item => (
                <FeedCard key={`${item.feed_type}-${item.id}`} item={item} onClick={() => handleCardClick(item)} />
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

export default Home;
