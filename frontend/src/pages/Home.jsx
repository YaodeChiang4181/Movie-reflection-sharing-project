import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Edit3, FastForward, Star, Flame, CalendarDays, Ticket } from 'lucide-react';
import TmdbPoster from '../components/TmdbPoster';
import ReviewForm from '../components/ReviewForm';
import SpeedRatingModal from '../components/SpeedRatingModal';
import EventForm from '../components/EventForm';
import FeedCard from '../components/FeedCard';
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
  
  const [heroEvent, setHeroEvent] = useState(null);
  
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
    if (currentPage === 1 && feedType === 'all') {
      fetchHeroEvent();
    }
  }, [currentPage, feedType]);

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

  const fetchHeroEvent = async () => {
    try {
      // Get the most upcoming active event
      const response = await api.get(`events/?status=UPCOMING`);
      const events = response.data.results || response.data;
      if (events && events.length > 0) {
        setHeroEvent(events[0]);
      } else {
        setHeroEvent(null);
      }
    } catch (err) {
      console.error("Failed to fetch hero event", err);
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
      navigate(`/events`);
      // Optionally we could open the event modal here, but navigating to /events is fine
    }
  };

  // Hero logic: Show Upcoming Event if available, otherwise show top movie if in 'all' or 'movies'
  const heroMovie = (!heroEvent && (feedType === 'all' || feedType === 'movies') && currentPage === 1 && feedItems.length > 0 && feedItems[0].feed_type === 'MOVIE') 
    ? feedItems[0] 
    : null;
    
  const displayItems = heroMovie ? feedItems.slice(1) : feedItems;

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
          onEventAdded={() => { fetchFeed(); fetchHeroEvent(); }} 
        />
      )}

      {isSpeedRatingOpen && (
        <SpeedRatingModal 
          onClose={() => setIsSpeedRatingOpen(false)} 
        />
      )}

      {/* 首頁焦點橫幅 (Hero Banner) - 活動優先 */}
      {!isLoading && heroEvent && (
        <div 
          className="glass hover-scale hero-banner" 
          onClick={() => navigate(`/events`)}
          style={{ backgroundImage: heroEvent.cover_image ? `url(${heroEvent.cover_image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}
        >
          {heroEvent.cover_image && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,10,25,0.9) 20%, rgba(15,10,25,0.4) 100%)' }}></div>}
          
          {!heroEvent.cover_image && <div style={{ padding: '40px' }}><Ticket size={64} opacity={0.2} /></div>}
          <div className="hero-content" style={{ position: 'relative', zIndex: 2 }}>
            <div className="hero-badge" style={{ background: '#F5A623', color: '#111' }}>
              <CalendarDays size={20} />
              <span style={{ fontWeight: 600 }}>近期最熱門實體活動</span>
            </div>
            <h2 style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{heroEvent.title}</h2>
            <div className="hero-stats">
              <span className="hero-review-count">
                報名進度：{heroEvent.registered_count} / {heroEvent.capacity || '無上限'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 首頁焦點橫幅 (Hero Banner) - 電影預設 */}
      {!isLoading && !heroEvent && heroMovie && (
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
                累積 {heroMovie.review_count || 0} 篇深度影評
              </span>
            </div>
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
              {displayItems.map(item => (
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
