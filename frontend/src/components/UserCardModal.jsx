import React, { useState, useEffect } from 'react';
import { X, ChevronRight, MessageCircle, ThumbsUp, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import styles from './UserCardModal.module.css';

// 影迷等級的對應邏輯 (與 Profile.jsx 共用)
function getBadge(level) {
  if (level >= 10) return { title: '資深影評', color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)' };
  if (level >= 8) return { title: '黃金觀影人', color: '#FFD700', glow: 'rgba(255, 215, 0, 0.5)' };
  if (level >= 5) return { title: '白銀觀影人', color: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.5)' };
  if (level >= 3) return { title: '青銅觀影人', color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.5)' };
  if (level >= 2) return { title: '唉呦不錯呦', color: '#10B981', glow: 'rgba(16, 185, 129, 0.5)' };
  if (level >= 1) return { title: '初出茅廬', color: '#6BCB77', glow: 'rgba(107, 203, 119, 0.5)' };
  return { title: '新手影迷', color: '#9CA3AF', glow: 'rgba(156, 163, 175, 0.5)' };
}

function UserCardModal({ campusId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`users/${campusId}/public_profile/`);
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to fetch public profile', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (campusId) {
      fetchProfile();
    }
  }, [campusId]);

  if (isLoading) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-secondary)' }}>載入中...</div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const badgeInfo = getBadge(profile.level);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        {/* 頂部身分徽章 */}
        <div className={styles.modalHeader}>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatarGlow} style={{ boxShadow: `0 0 15px ${badgeInfo.glow}, inset 0 0 10px ${badgeInfo.glow}` }}></div>
            {profile.avatar ? (
              <img src={profile.avatar} alt="avatar" />
            ) : (
              profile.nickname ? profile.nickname.charAt(0).toUpperCase() : '?'
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
            <h2 className={styles.nickname}>{profile.nickname}</h2>
            <span
              className={styles.levelBadge}
              style={{
                color: badgeInfo.color,
                border: `1px solid ${badgeInfo.color}`,
                backgroundColor: `${badgeInfo.color}15`
              }}
            >
              Lv.{profile.level} {badgeInfo.title}
            </span>
          </div>

          <div className={styles.identityLabel}>
            {profile.identity_label}
          </div>

          {profile.top_tags && profile.top_tags.length > 0 && (
            <div className={styles.tagsWrapper}>
              {profile.top_tags.map(tag => (
                <span key={tag} className={styles.tag}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* 中段品味數據 */}
        <div className={styles.statsSection}>
          <div className={styles.statBox}>
            <div className={styles.statValue}>
              <Edit3 size={16} color="var(--text-secondary)" /> {profile.stats.reviews_count}
            </div>
            <div className={styles.statLabel}>發布心得</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>
              <ThumbsUp size={16} color="var(--text-secondary)" /> {profile.stats.likes_received}
            </div>
            <div className={styles.statLabel}>獲得推薦</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>
              <MessageCircle size={16} color="var(--text-secondary)" /> {profile.stats.comments_count}
            </div>
            <div className={styles.statLabel}>留言互動</div>
          </div>
        </div>



        {/* 底部精選足跡 (近期心得) */}
        {profile.recent_reviews && profile.recent_reviews.length > 0 && (
          <div className={styles.recentSection}>
            <div className={styles.recentTitle}>
              近期公開心得
            </div>
            <div className={styles.recentList}>
              {profile.recent_reviews.map(review => (
                <div
                  key={review.id}
                  className={styles.recentItem}
                  onClick={() => {
                    onClose();
                    navigate(`/movies/${review.movie_id}`);
                  }}
                >
                  <div className={styles.recentHeader}>
                    <span className={styles.recentMovieTitle}>{review.movie_title}</span>
                    <span className={styles.recentRating}>
                      {Array.from({ length: review.rating }).map((_, i) => '★').join('')}
                      {Array.from({ length: 5 - review.rating }).map((_, i) => '☆').join('')} {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className={styles.recentContent}>
                    {review.content}
                  </div>
                  <div className={styles.recentArrow}>
                    <ChevronRight size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserCardModal;
