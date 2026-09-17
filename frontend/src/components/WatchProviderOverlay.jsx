import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Tv } from 'lucide-react';
import api from '../api/axios';
import styles from './WatchProviderOverlay.module.css';

// In-memory cache to avoid re-fetching same movie
const providerCache = new Map();

/**
 * WatchProviderOverlay — 串流平台導覽元件
 * 
 * 兩種模式：
 * 1. Overlay 模式 (variant="overlay")：懸浮在 Hero Banner 上
 * 2. Inline 模式 (variant="inline")：常駐在 MovieDetail 頁面
 * 
 * @param {number} movieId - 電影 ID (資料庫 PK)
 * @param {boolean} isVisible - 控制是否顯示 (overlay 模式用)
 * @param {"overlay"|"inline"} variant - 顯示模式
 */
function WatchProviderOverlay({ movieId, isVisible = true, variant = 'overlay' }) {
  const [providers, setProviders] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Reset when movieId changes
    hasFetched.current = false;
    setProviders(null);
    setHasError(false);
  }, [movieId]);

  useEffect(() => {
    if (!isVisible || !movieId || hasFetched.current) return;

    const fetchProviders = async () => {
      // Check in-memory cache first
      if (providerCache.has(movieId)) {
        setProviders(providerCache.get(movieId));
        hasFetched.current = true;
        return;
      }

      setIsLoading(true);
      setHasError(false);
      try {
        const res = await api.get(`movies/${movieId}/watch_providers/`);
        const data = res.data;
        providerCache.set(movieId, data);
        setProviders(data);
      } catch (err) {
        // 404 = no tmdb_id, other errors = network issue
        setProviders({});
        setHasError(err.response?.status !== 404);
      } finally {
        setIsLoading(false);
        hasFetched.current = true;
      }
    };

    // Debounce: wait 300ms before fetching (avoid rapid hover triggers)
    const timer = setTimeout(fetchProviders, variant === 'overlay' ? 300 : 0);
    return () => clearTimeout(timer);
  }, [isVisible, movieId, variant]);

  // Don't render anything for overlay mode when not visible
  if (variant === 'overlay' && !isVisible) return null;

  // Inline mode: render the persistent section
  if (variant === 'inline') {
    return <InlineSection providers={providers} isLoading={isLoading} hasError={hasError} />;
  }

  // Overlay mode
  return <OverlaySection providers={providers} isLoading={isLoading} />;
}

function OverlaySection({ providers, isLoading }) {
  if (isLoading) {
    return (
      <div className={styles.overlay} onClick={(e) => e.stopPropagation()}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <span>查詢串流平台中...</span>
        </div>
      </div>
    );
  }

  if (!providers || (!providers.flatrate?.length && !providers.rent?.length && !providers.buy?.length)) {
    return null; // Don't show overlay if no providers found
  }

  const allProviders = [
    ...(providers.flatrate || []),
    ...(providers.rent || []),
    ...(providers.buy || []),
  ];

  // Deduplicate by provider_id
  const seen = new Set();
  const uniqueProviders = allProviders.filter(p => {
    if (seen.has(p.provider_id)) return false;
    seen.add(p.provider_id);
    return true;
  });

  return (
    <div className={styles.overlay} onClick={(e) => e.stopPropagation()}>
      <div className={styles.overlayTitle}>
        <Tv size={16} />
        在哪裡看？
      </div>

      <div className={styles.providerRow}>
        {uniqueProviders.slice(0, 6).map((p) => (
          <div key={p.provider_id} className={styles.tooltip} data-tooltip={p.provider_name}>
            {p.logo_url ? (
              <img
                src={p.logo_url}
                alt={p.provider_name}
                className={styles.providerIcon}
                onClick={(e) => {
                  e.stopPropagation();
                  if (providers.link) window.open(providers.link, '_blank');
                }}
              />
            ) : (
              <div className={styles.providerIcon} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>
                {p.provider_name?.slice(0, 2)}
              </div>
            )}
          </div>
        ))}
      </div>

      {providers.link && (
        <a
          href={providers.link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.watchLink}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
          查看完整平台列表
        </a>
      )}
    </div>
  );
}

function InlineSection({ providers, isLoading, hasError }) {
  if (isLoading) {
    return (
      <div className={styles.inlineSection}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <span>正在查詢串流平台資訊...</span>
        </div>
      </div>
    );
  }

  const hasFlatrate = providers?.flatrate?.length > 0;
  const hasRent = providers?.rent?.length > 0;
  const hasBuy = providers?.buy?.length > 0;
  const hasAny = hasFlatrate || hasRent || hasBuy;

  if (!hasAny) {
    return (
      <div className={styles.inlineSection}>
        <div className={styles.inlineSectionTitle}>
          <Tv size={18} />
          線上觀看
        </div>
        <div className={styles.inlineEmptyState}>
          {hasError ? '查詢失敗，請稍後再試' : '目前尚無串流平台資料'}
        </div>
      </div>
    );
  }

  const renderProviderGroup = (label, list) => {
    if (!list?.length) return null;
    return (
      <div>
        <div className={styles.sectionLabel}>{label}</div>
        <div className={styles.inlineProviderRow}>
          {list.map((p) => (
            <div
              key={p.provider_id}
              className={styles.inlineProviderItem}
              onClick={() => { if (providers.link) window.open(providers.link, '_blank'); }}
            >
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.provider_name} className={styles.inlineProviderIcon} />
              ) : (
                <div className={styles.inlineProviderIcon} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>
                  {p.provider_name?.slice(0, 3)}
                </div>
              )}
              <span className={styles.inlineProviderName}>{p.provider_name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.inlineSection}>
      <div className={styles.inlineSectionTitle}>
        <Tv size={18} />
        線上觀看
      </div>

      {renderProviderGroup('訂閱觀看', providers.flatrate)}
      {renderProviderGroup('租借', providers.rent)}
      {renderProviderGroup('購買', providers.buy)}

      {providers.link && (
        <a
          href={providers.link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.inlineWatchLink}
        >
          <ExternalLink size={14} />
          查看完整平台列表
        </a>
      )}
    </div>
  );
}

export default WatchProviderOverlay;
