import React from 'react';
import { Film } from 'lucide-react';
import styles from './CollageCover.module.css';

const CollageCover = ({ posters, size = 'normal', className = '' }) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return styles.sizeSmall;
      case 'large':
        return styles.sizeLarge;
      case 'normal':
      default:
        return styles.sizeNormal;
    }
  };

  const displayPosters = (posters || []).filter(Boolean).slice(0, 4);

  return (
    <div className={`${styles.container} ${getSizeClass()} ${className}`}>
      {displayPosters.length === 0 ? (
        <div className={styles.emptyState}>
          <Film size={size === 'large' ? 44 : 26} />
        </div>
      ) : displayPosters.length === 1 ? (
        <img src={displayPosters[0]} alt="cover" className={styles.singleImage} />
      ) : displayPosters.length === 2 ? (
        <div className={styles.grid2}>
          <img src={displayPosters[0]} alt="cover 1" />
          <img src={displayPosters[1]} alt="cover 2" />
        </div>
      ) : displayPosters.length === 3 ? (
        <div className={styles.grid3}>
          <img src={displayPosters[0]} alt="cover 1" />
          <img src={displayPosters[1]} alt="cover 2" />
          <img src={displayPosters[2]} alt="cover 3" />
        </div>
      ) : (
        <div className={styles.grid4}>
          {displayPosters.map((src, idx) => (
            <img key={idx} src={src} alt={`cover ${idx + 1}`} />
          ))}
        </div>
      )}

      {/* 質感漸層疊加層 */}
      <div className={styles.overlay} />
    </div>
  );
};

export default CollageCover;
