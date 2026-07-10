import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import styles from './SpoilerGuard.module.css';

function SpoilerGuard({ isSpoiler, children }) {
  const [isRevealed, setIsRevealed] = useState(!isSpoiler);

  if (isRevealed) {
    return <div className={styles.content}>{children}</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.blurredContent} aria-hidden="true">
        {children}
      </div>
      
      <button 
        type="button" 
        className={styles.overlay} 
        onClick={() => setIsRevealed(true)}
        aria-label="點擊顯示有雷內容"
      >
        <EyeOff size={32} className={styles.icon} />
        <span className={styles.text}>此內容含有劇透，點擊以顯示</span>
      </button>
    </div>
  );
}

export default SpoilerGuard;
