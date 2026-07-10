import { Film, ThumbsUp, MessageSquare } from 'lucide-react';
import styles from './Profile.module.css';

function Profile() {
  return (
    <div className={`container ${styles.pageWrapper}`}>
      {/* Profile Header Card */}
      <div className={`glass ${styles.profileCard}`}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatar}>
            <UserPlaceholder />
          </div>
        </div>
        <div className={styles.userInfo}>
          <h1 className={styles.username}>NCU Movie Fan</h1>
          <p className={styles.email}>student@g.ncu.edu.tw</p>
          
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <Film size={20} className={styles.statIcon} />
              <div className={styles.statData}>
                <span className={styles.statValue}>12</span>
                <span className={styles.statLabel}>已發布心得</span>
              </div>
            </div>
            <div className={styles.statBox}>
              <ThumbsUp size={20} className={styles.statIcon} />
              <div className={styles.statData}>
                <span className={styles.statValue}>340</span>
                <span className={styles.statLabel}>獲得推數</span>
              </div>
            </div>
            <div className={styles.statBox}>
              <MessageSquare size={20} className={styles.statIcon} />
              <div className={styles.statData}>
                <span className={styles.statValue}>45</span>
                <span className={styles.statLabel}>獲得留言</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className={styles.reviewsSection}>
        <h2 className={styles.sectionTitle}>我的觀影心得</h2>
        <div className={styles.reviewList}>
          {/* Placeholder for Review Card */}
          <div className={styles.reviewCard}>
            <h3>全面啟動</h3>
            <p>劇情非常精彩，諾蘭導演的敘事手法依舊讓人驚艷...</p>
            <div className={styles.tags}>
              <span className={styles.tag}>科幻</span>
              <span className={styles.tag}>燒腦</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '100%', height: '100%', color: '#a3a3a3'}}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

export default Profile;
