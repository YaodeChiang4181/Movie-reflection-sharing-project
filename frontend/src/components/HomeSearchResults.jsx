import React from 'react';
import { ArrowLeft, MessageCircle, List as ListIcon, Star, Film } from 'lucide-react';
import ListCard from './ListCard';
import { decodeHtml } from '../utils/text';
import styles from './HomeSearchResults.module.css';

function HomeSearchResults({
  query,
  reviews = [],
  lists = [],
  isLoading = false,
  activeTab = 'all',
  setActiveTab,
  onSelectReview,
  onClearSearch,
  navigate,
}) {
  const reviewsCount = reviews.length;
  const listsCount = lists.length;
  const totalCount = reviewsCount + listsCount;

  return (
    <div className={styles.resultsWrapper}>
      {/* 頂部控制列：經典底線 Tabs 與 返回按鈕 */}
      <div className={styles.resultsHeader}>
        <div className={styles.tabsNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            全部結果 ({totalCount})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'reviews' ? styles.active : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <MessageCircle size={15} />
            影視作品 ({reviewsCount})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'lists' ? styles.active : ''}`}
            onClick={() => setActiveTab('lists')}
          >
            <ListIcon size={15} />
            主題片單 ({listsCount})
          </button>
        </div>

        <button
          type="button"
          className={styles.backBtn}
          onClick={onClearSearch}
          aria-label="返回首頁動態專區"
        >
          <ArrowLeft size={16} />
          返回動態專區
        </button>
      </div>

      {/* 載入中骨架畫面 */}
      {isLoading ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="glass"
              style={{
                padding: '20px 24px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
              }}
            >
              <div className="skeleton skeleton-poster" style={{ width: '70px', height: '100px', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="skeleton skeleton-title" style={{ width: '40%', height: '1.4rem' }} />
                <div className="skeleton skeleton-text" style={{ width: '25%', height: '0.9rem' }} />
                <div className="skeleton skeleton-text" style={{ width: '60%', height: '1rem', marginTop: '6px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : totalCount === 0 ? (
        /* 空狀態：沉穩典雅 */
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>未發現符合「{query}」的相關結果</h3>
          <p className={styles.emptyDesc}>試試換個片名、導演、或主題關鍵字搜尋看看。</p>
          <button type="button" className={styles.resetBtn} onClick={onClearSearch}>
            返回首頁動態流
          </button>
        </div>
      ) : (
        /* 搜尋結果列表 */
        <div>
          {/* 主題片單區塊 */}
          {(activeTab === 'all' || activeTab === 'lists') && lists.length > 0 && (
            <div className={styles.sectionBlock}>
              <h2 className={styles.sectionTitle}>
                <ListIcon size={20} color="var(--accent-primary)" />
                相關主題片單
                <span className={styles.sectionBadge}>({lists.length})</span>
              </h2>
              <div className="posterGrid">
                {lists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onClick={() => navigate(`/lists/${list.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 電影心得區塊 */}
          {(activeTab === 'all' || activeTab === 'reviews') && reviews.length > 0 && (
            <div className={styles.sectionBlock}>
              <h2 className={styles.sectionTitle}>
                <MessageCircle size={20} color="var(--accent-primary)" />
                相關影視作品
                <span className={styles.sectionBadge}>({reviews.length})</span>
              </h2>
              <div className="posterGrid">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="posterCard"
                    onClick={() => {
                      if (review.movie?.id) {
                        navigate(`/movies/${review.movie.id}`);
                      }
                    }}
                  >
                    <div className="posterWrapper" style={{ position: 'relative' }}>
                      {review.movie?.media_type && (
                        <span style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(20, 20, 20, 0.75)',
                          backdropFilter: 'blur(6px)',
                          WebkitBackdropFilter: 'blur(6px)',
                          border: '1px solid rgba(197, 160, 89, 0.35)',
                          color: '#C5A059',
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          zIndex: 2,
                          pointerEvents: 'none'
                        }}>
                          {review.movie.media_type === 'tv' ? '影集' : review.movie.media_type === 'anime' ? '動漫' : '電影'}
                        </span>
                      )}
                      {review.movie?.poster_url ? (
                        <img
                          src={review.movie.poster_url}
                          alt={review.movie.title || '海報'}
                          className="posterImg"
                          loading="lazy"
                        />
                      ) : (
                        <div className="posterPlaceholder">
                          <Film size={32} />
                        </div>
                      )}
                      <div className="posterOverlay">
                        <button
                          type="button"
                          className="overlayBtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectReview(review);
                          }}
                        >
                          <MessageCircle size={15} />
                          閱讀心得
                        </button>
                      </div>
                    </div>

                    <div className="posterInfo">
                      <div className="posterTitle" title={decodeHtml(review.movie?.title)}>
                        {decodeHtml(review.movie?.title || '未命名作品')}
                      </div>
                      <div className="posterMeta">
                        {review.rating !== null && review.rating > 0 && (
                          <span className="posterRating">
                            <Star size={12} fill="currentColor" /> {review.rating}/5
                          </span>
                        )}
                        <span className="posterDate">
                          {review.movie?.review_count > 1 ? (
                            `共 ${review.movie.review_count} 篇心得`
                          ) : (
                            new Date(review.effective_date || review.created_at).toLocaleDateString('zh-TW')
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HomeSearchResults;
