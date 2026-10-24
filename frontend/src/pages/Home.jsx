import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Edit3, FastForward, Star, Flame, CalendarDays, Ticket } from 'lucide-react';
import TmdbPoster from '../components/TmdbPoster';
import ReviewForm from '../components/ReviewForm';
import SpeedRatingModal from '../components/SpeedRatingModal';
import EventForm from '../components/EventForm';
import FeedCard from '../components/FeedCard';
import EventDetailModal from '../components/EventDetailModal';
import DriftBottleModal from '../components/DriftBottleModal';
import WatchProviderOverlay from '../components/WatchProviderOverlay';
import SEO from '../components/SEO';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from '../components/EventFilterTabs.module.css';
import CuratorStudioModal from '../components/CuratorStudioModal';
import HomeSearch from '../components/HomeSearch';
import HomeSearchResults from '../components/HomeSearchResults';
import ReviewModal from '../components/ReviewModal';

function truncateAtSentence(text, maxLen = 40) {
  if (!text) return '';
  const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;

  const sub = clean.slice(0, maxLen);
  const lastPunctuation = Math.max(
    sub.lastIndexOf('。'),
    sub.lastIndexOf('！'),
    sub.lastIndexOf('？'),
    sub.lastIndexOf('…')
  );

  if (lastPunctuation > 10) {
    return sub.slice(0, lastPunctuation + 1);
  }
  return sub + '…';
}

function formatTimeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  if (diffHr < 24) return `${diffHr} 小時前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  return `${Math.floor(diffDay / 30)} 個月前`;
}

function Home() {
  const [isComposing, setIsComposing] = useState(false);
  const [isEventComposing, setIsEventComposing] = useState(false);
  const [isSpeedRatingOpen, setIsSpeedRatingOpen] = useState(false);
  const [isDriftBottleOpen, setIsDriftBottleOpen] = useState(false);
  const [isCuratorStudioOpen, setIsCuratorStudioOpen] = useState(false);

  const [feedItems, setFeedItems] = useState([]);
  const [feedType, setFeedType] = useState('movies'); // 'movies' (左), 'tv' (中), 'anime' (右)
  const [isLoading, setIsLoading] = useState(true);

  const [heroItems, setHeroItems] = useState([]);
  const [heroQuotes, setHeroQuotes] = useState({});
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [heroHovered, setHeroHovered] = useState(false);

  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 搜尋融合狀態機
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState([]);
  const [listResults, setListResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(searchParams.get('q')?.trim()));
  const [searchActiveTab, setSearchActiveTab] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [recommendedTags, setRecommendedTags] = useState(['院線熱映', '週末放鬆', '燒腦神作', '催淚神片', '冷門佳作']);
  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);

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

    const handleOpenCuratorStudio = (e) => {
      if (!isLoggedIn) {
        alert('請先登入後再建立片單！');
        navigate('/auth');
        return;
      }
      setIsCuratorStudioOpen(e.detail?.searchTitle || true);
    };

    window.addEventListener('open-review-form', handleOpenReviewForm);
    window.addEventListener('open-event-form', handleOpenEventForm);
    window.addEventListener('open-curator-studio', handleOpenCuratorStudio);

    return () => {
      window.removeEventListener('open-review-form', handleOpenReviewForm);
      window.removeEventListener('open-event-form', handleOpenEventForm);
      window.removeEventListener('open-curator-studio', handleOpenCuratorStudio);
    };
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    fetchFeed();
  }, [currentPage, feedType]);

  useEffect(() => {
    fetchHeroItems();
  }, []);

  // 標籤統計推薦（1 小時 localStorage 快取）
  useEffect(() => {
    const fetchLatestTags = async () => {
      const CACHE_KEY = 'recommended_tags';
      const CACHE_TIME_KEY = 'recommended_tags_time';
      const CACHE_DURATION = 60 * 60 * 1000;

      const cachedTags = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

      if (cachedTags && cachedTime && (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
        try {
          setRecommendedTags(JSON.parse(cachedTags));
          return;
        } catch {
          // ignore cache parse error
        }
      }

      try {
        const res = await api.get('reviews/');
        const reviewsList = res.data.results || res.data;
        const tagCounts = {};

        if (Array.isArray(reviewsList)) {
          reviewsList.forEach(review => {
            if (review.tags && Array.isArray(review.tags)) {
              review.tags.forEach(tag => {
                const name = tag?.name || tag;
                if (name) tagCounts[name] = (tagCounts[name] || 0) + 1;
              });
            }
          });
        }

        const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
        if (sortedTags.length > 0) {
          const topTags = sortedTags.slice(0, 4);
          setRecommendedTags(topTags);
          localStorage.setItem(CACHE_KEY, JSON.stringify(topTags));
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        }
      } catch (err) {
        console.error("Failed to fetch tags for homepage search", err);
      }
    };
    fetchLatestTags();
  }, []);

  // 雙核心搜尋執行函式
  const performSearch = async (term) => {
    const cleanTerm = term?.trim();
    if (!cleanTerm) {
      setSearchResults([]);
      setListResults([]);
      setHasSearched(false);
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);
    setHasSearched(true);
    try {
      const [reviewsRes, listsRes] = await Promise.all([
        api.get(`reviews/search/?q=${encodeURIComponent(cleanTerm)}`),
        api.get(`lists/search/?q=${encodeURIComponent(cleanTerm)}`)
      ]);
      const rawReviews = Array.isArray(reviewsRes.data) ? reviewsRes.data : (reviewsRes.data?.results || []);
      const seenMovieIds = new Set();
      const dedupedReviews = rawReviews.filter(r => {
        const mid = r.movie?.id;
        if (mid) {
          if (seenMovieIds.has(mid)) return false;
          seenMovieIds.add(mid);
        }
        return true;
      });
      setSearchResults(dedupedReviews);
      setListResults(Array.isArray(listsRes.data) ? listsRes.data : (listsRes.data?.results || []));
    } catch (err) {
      console.error("Home search failed:", err);
      setSearchResults([]);
      setListResults([]);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSearchQueryChange = (val) => {
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!val.trim()) {
      setHasSearched(false);
      setSearchResults([]);
      setListResults([]);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('q');
      setSearchParams(newParams, { replace: true });
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      const clean = val.trim();
      const newParams = new URLSearchParams(searchParams);
      newParams.set('q', clean);
      setSearchParams(newParams, { replace: true });
      performSearch(clean);
    }, 300);
  };

  const handleSearchSubmit = (val) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const clean = (val || searchQuery).trim();
    if (!clean) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', clean);
    setSearchParams(newParams, { replace: true });
    performSearch(clean);
  };

  const handleClearSearch = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchQuery('');
    setHasSearched(false);
    setSearchResults([]);
    setListResults([]);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    setSearchParams(newParams, { replace: true });
  };

  const handleTagClick = (tag) => {
    const cleanTag = tag.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s?/, '').replace(/^#/, '');
    setSearchQuery(cleanTag);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', cleanTag);
    setSearchParams(newParams, { replace: true });
    performSearch(cleanTag);
  };

  // URL 參數與焦點同步
  useEffect(() => {
    const qParam = searchParams.get('q');
    const focusParam = searchParams.get('focus');

    if (focusParam === 'search') {
      setTimeout(() => {
        searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInputRef.current?.focus();
      }, 150);
    }

    if (qParam !== null && qParam !== undefined) {
      if (qParam.trim()) {
        if (qParam !== searchQuery) {
          setSearchQuery(qParam);
        }
        performSearch(qParam);
      }
    }
  }, [searchParams]);

  const handleReviewUpdated = () => {
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim());
    }
    fetchFeed();
  };

  const handleReviewDeleted = (deletedId) => {
    setSearchResults(prev => prev.filter(r => r.id !== deletedId));
    fetchFeed();
  };

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
      const raw = response.data;
      const items = Array.isArray(raw?.results) ? raw.results : (Array.isArray(raw) ? raw : []);
      setFeedItems(items);
      if (raw?.count && typeof raw.count === 'number') {
        setTotalPages(Math.ceil(raw.count / 20));
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to fetch feed", err);
      setFeedItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHeroItems = async () => {
    try {
      // Fetch upcoming events and top movies simultaneously
      const results = await Promise.allSettled([
        api.get(`events/?status=UPCOMING`),
        api.get(`movies/`) // This endpoint returns movies sorted by popularity
      ]);

      const eventsRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const moviesRes = results[1].status === 'fulfilled' ? results[1].value : null;

      const upcomingEvents = Array.isArray(eventsRes?.data?.results)
        ? eventsRes.data.results
        : (Array.isArray(eventsRes?.data) ? eventsRes.data : []);
      const topMovies = Array.isArray(moviesRes?.data?.results)
        ? moviesRes.data.results
        : (Array.isArray(moviesRes?.data) ? moviesRes.data : []);

      const mixed = [];
      if (upcomingEvents.length > 0) mixed.push({ ...upcomingEvents[0], feed_type: 'EVENT' });
      if (upcomingEvents.length > 1) mixed.push({ ...upcomingEvents[1], feed_type: 'EVENT' });
      if (topMovies.length > 0) mixed.push({ ...topMovies[0], feed_type: 'MOVIE' });
      if (topMovies.length > 1) mixed.push({ ...topMovies[1], feed_type: 'MOVIE' });
      if (upcomingEvents.length > 2) mixed.push({ ...upcomingEvents[2], feed_type: 'EVENT' });
      if (topMovies.length > 2) mixed.push({ ...topMovies[2], feed_type: 'MOVIE' });

      const finalItems = mixed.slice(0, 5);
      setHeroItems(finalItems);

      // 非同步抓取各電影的最新短評
      fetchHeroQuotes(finalItems);
    } catch (err) {
      console.error("Failed to fetch hero items", err);
      setHeroItems([]);
    }
  };

  const fetchHeroQuotes = async (items) => {
    const quotes = {};

    await Promise.allSettled(
      items.map(async (item) => {
        if (item.feed_type === 'MOVIE' && item.id) {
          try {
            const res = await api.get(`reviews/`, {
              params: { movie: item.id, page_size: 5 }
            });
            const raw = res.data;
            const reviews = Array.isArray(raw?.results) ? raw.results : (Array.isArray(raw) ? raw : []);

            // 找第一則有內容且非爆雷的心得，並過濾掉預設的急速評星文字
            const pick = reviews.find(r =>
              r && r.content && r.content.trim().length > 0 && !r.is_spoiler && r.content.trim() !== '來自急速評星的無內文評價'
            );

            if (pick) {
              quotes[item.id] = {
                nickname: pick.user?.nickname || pick.user?.campus_id || '匿名影迷',
                createdAt: pick.effective_date || pick.created_at,
                excerpt: truncateAtSentence(pick.content, 40),
              };
            }
          } catch (e) {
            console.error(`Failed to fetch quote for movie ${item.id}`, e);
          }
        }
      })
    );

    setHeroQuotes(quotes);
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
    if (item.feed_type === 'EVENT') {
      setSelectedEvent(item);
    } else {
      navigate(`/movies/${item.id}`);
    }
  };
  const handleDriftClick = () => {
    if (!isLoggedIn) {
      alert('請先登入後再使用片單漂流瓶！');
      navigate('/auth');
      return;
    }
    setIsDriftBottleOpen(true);
  };


  return (
    <div className="container" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
      <SEO />

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
      {isLoading && heroItems.length === 0 ? (
        <div style={{ marginBottom: '24px' }}>
          <div className="glass hero-banner" style={{ marginBottom: '16px', display: 'flex', gap: '40px', alignItems: 'center' }}>
            <div className="skeleton skeleton-poster" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="skeleton skeleton-text" style={{ width: '120px', height: '36px', borderRadius: '8px', marginBottom: '16px' }} />
              <div className="skeleton skeleton-title" style={{ width: '80%', height: '3rem', marginBottom: '24px' }} />
              <div className="skeleton skeleton-text" style={{ width: '40%', height: '2rem' }} />
            </div>
          </div>
        </div>
      ) : heroItems.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {(() => {
            const item = heroItems[currentHeroIndex];
            if (!item) return null;
            return item.feed_type === 'EVENT' ? (
              <div
                className="hero-banner"
                onClick={() => setSelectedEvent(item)}
              >
                {item.cover_image ? (
                  <img src={item.cover_image} alt={item.title} className="hero-poster" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="hero-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                    <Ticket size={48} opacity={0.5} />
                  </div>
                )}
                <div className="hero-content" style={{ flex: 1 }}>
                  <div className="hero-badge">
                    № 01　近期最熱門
                  </div>
                  <h2>{item.title}</h2>
                  <div className="hero-stats">
                    <span className="hero-review-count">
                      報名進度：{item.registered_count} / {item.capacity || '無上限'}
                    </span>
                  </div>
                </div>
                <div className="hero-quote-block">
                  <div className="hero-quote-author">
                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>王小姐</span>
                    <span>•</span>
                    <span>5 小時前</span>
                  </div>
                  <div className="hero-quote-content">
                    <div className="hero-quote-mark">“</div>
                    <div className="hero-quote-text">
                      「{item.quote || "這場放映活動絕對是不容錯過的精彩體驗，推薦大家一起來。"}」
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="hero-banner"
                onClick={() => navigate(`/movies/${item.id}`)}
                style={{ position: 'relative' }}
              >
                <div
                  style={{ position: 'relative', flexShrink: 0 }}
                  onMouseEnter={() => setHeroHovered(true)}
                  onMouseLeave={() => setHeroHovered(false)}
                >
                  <TmdbPoster title={item.title} posterUrl={item.poster_url} className="hero-poster" />
                  {heroHovered && item.feed_type === 'MOVIE' && (
                    <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                      <WatchProviderOverlay movieId={item.id} isVisible={heroHovered} variant="overlay" />
                    </div>
                  )}
                </div>
                <div className="hero-content" style={{ flex: 1 }}>
                  <div className="hero-badge">
                    № 01　近期最熱門
                  </div>
                  <h2>{item.title}</h2>
                  {item.original_title && (
                    <div className="hero-original-title">
                      {item.original_title}
                    </div>
                  )}
                  {!item.original_title && <div style={{ marginBottom: '20px' }}></div>}
                  <div className="hero-stats">
                    <div className="hero-rating" style={{ color: 'var(--text-secondary)' }}>
                      {item.avg_rating > 0 ? `${item.avg_rating.toFixed(1)} \u00A0\u00A0 ${item.review_count || 0} 則心得` : `無評分 \u00A0\u00A0 ${item.review_count || 0} 則心得`}
                    </div>
                  </div>
                </div>
                <div className="hero-quote-block">
                  {heroQuotes[item.id] ? (
                    <>
                      <div className="hero-quote-author">
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {heroQuotes[item.id].nickname}
                        </span>
                        <span>•</span>
                        <span>{formatTimeAgo(heroQuotes[item.id].createdAt)}</span>
                      </div>
                      <div className="hero-quote-content">
                        <div className="hero-quote-mark">“</div>
                        <div className="hero-quote-text">
                          「{heroQuotes[item.id].excerpt}」
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="hero-quote-content">
                      <div className="hero-quote-mark">“</div>
                      <div className="hero-quote-text" style={{ color: 'var(--text-muted)', fontStyle: 'normal' }}>
                        這部作品在等你的意見呢
                      </div>
                    </div>
                  )}
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

      {/* 首頁融合搜尋組件 (Anti-Generic AI Aesthetic) */}
      <HomeSearch
        query={searchQuery}
        onChange={handleSearchQueryChange}
        onSearch={handleSearchSubmit}
        onClear={handleClearSearch}
        recommendedTags={recommendedTags}
        onTagClick={handleTagClick}
        isLoading={isSearchLoading}
        inputRef={searchInputRef}
      />

      {hasSearched ? (
        /* 狀態 2：搜尋結果視圖（異質層次呈現） */
        <HomeSearchResults
          query={searchQuery}
          reviews={searchResults}
          lists={listResults}
          isLoading={isSearchLoading}
          activeTab={searchActiveTab}
          setActiveTab={setSearchActiveTab}
          onSelectReview={setSelectedReview}
          onClearSearch={handleClearSearch}
          navigate={navigate}
        />
      ) : (
        /* 狀態 1：預設首頁動態流 */
        <>
          {/* 三大影視專區分段切換（電影最左、影集中間、動漫最右） */}
          <div className={styles.tabsContainer} style={{ marginBottom: '24px' }}>
            <button
              className={`${styles.tab} ${feedType === 'movies' ? styles.active : ''}`}
              onClick={() => { setFeedType('movies'); setCurrentPage(1); }}
            >
              電影專區
            </button>
            <button
              className={`${styles.tab} ${feedType === 'tv' ? styles.active : ''}`}
              onClick={() => { setFeedType('tv'); setCurrentPage(1); }}
            >
              影集專區
            </button>
            <button
              className={`${styles.tab} ${feedType === 'anime' ? styles.active : ''}`}
              onClick={() => { setFeedType('anime'); setCurrentPage(1); }}
            >
              動漫專區
            </button>
          </div>

          <div className="home-layout">
            {/* 左側 70%：資訊流 */}
            <div>
              {isLoading ? (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="glass" style={{ padding: '16px 24px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                        <div className="skeleton skeleton-list-poster" />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div className="skeleton skeleton-title" style={{ width: '50%', height: '1.5rem', marginBottom: '8px' }} />
                          <div className="skeleton skeleton-text" style={{ width: '30%', height: '1rem', marginBottom: '0' }} />
                        </div>
                      </div>
                      <div className="skeleton skeleton-text" style={{ width: '80px', height: '2rem', borderRadius: '20px', marginBottom: '0' }} />
                    </div>
                  ))}
                </div>
              ) : feedItems.length === 0 ? (
                <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>目前沒有任何動態</h2>
                </div>
              ) : (
                <div className="posterGrid">
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
              <div className="editorial-action-block">
                <div className="editorial-header">人群散場後</div>
                <div className="editorial-content">
                  <p>這部作品，</p>
                  <p>你看完想說什麼？</p>
                </div>

                <button className="editorial-btn" onClick={handleComposeClick}>
                  [ 寫下觀後感 ]
                </button>

                <div className="editorial-or">或</div>

                <button className="editorial-btn" onClick={() => {
                  if (!isLoggedIn) {
                    alert('請先登入才能使用急速評星。');
                    navigate('/auth');
                    return;
                  }
                  setIsSpeedRatingOpen(true);
                }}>
                  [ 急速評星 ]
                </button>

                <button className="editorial-btn-secondary" onClick={handleDriftClick} style={{ marginTop: '32px' }}>
                  尋找影迷漂流瓶
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isComposing && (
        <ReviewForm onClose={() => setIsComposing(false)} />
      )}

      {isEventComposing && (
        <EventForm onClose={() => setIsEventComposing(false)} />
      )}

      {isSpeedRatingOpen && (
        <SpeedRatingModal onClose={() => setIsSpeedRatingOpen(false)} />
      )}

      {isDriftBottleOpen && (
        <DriftBottleModal onClose={() => setIsDriftBottleOpen(false)} />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Curator Studio Modal */}
      {isCuratorStudioOpen && (
        <CuratorStudioModal
          onClose={() => setIsCuratorStudioOpen(false)}
          onSuccess={(newList) => {
            setIsCuratorStudioOpen(false);
            navigate(`/lists/${newList.id}`);
          }}
          initialSearchQuery={typeof isCuratorStudioOpen === 'string' ? isCuratorStudioOpen : ''}
        />
      )}

      {/* 影評詳情彈窗（自搜尋結果或動態流觸發） */}
      {selectedReview && (
        <ReviewModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onReviewUpdated={handleReviewUpdated}
          onReviewDeleted={handleReviewDeleted}
        />
      )}
    </div>
  );
}

export default Home;
