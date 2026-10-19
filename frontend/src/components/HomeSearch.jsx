import React from 'react';
import { Search as SearchIcon, X, Loader2 } from 'lucide-react';
import styles from './HomeSearch.module.css';

function HomeSearch({
  query,
  onChange,
  onSearch,
  onClear,
  recommendedTags = [],
  onTagClick,
  isLoading = false,
  inputRef,
}) {
  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onSearch) onSearch(query);
  };

  return (
    <div className={styles.searchContainer}>
      <form onSubmit={handleSubmit} className={styles.searchInputWrapper}>
        <div className={styles.searchIcon}>
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" color="var(--accent-primary)" />
          ) : (
            <SearchIcon size={18} />
          )}
        </div>

        <input
          ref={inputRef}
          id="home-search-input"
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="搜尋電影、心得、主題片單..."
          className={styles.searchInput}
          autoComplete="off"
          aria-label="搜尋電影、心得、主題片單"
        />

        {query && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={onClear}
            aria-label="清空搜尋內容"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {/* 編輯精選關鍵字（低調細線框，非彩色膠囊） */}
      {recommendedTags && recommendedTags.length > 0 && (
        <div className={styles.keywordList}>
          <span className={styles.keywordLabel}>編輯精選</span>
          {recommendedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.keywordItem}
              onClick={() => onTagClick(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomeSearch;
