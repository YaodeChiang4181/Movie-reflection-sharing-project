import React from 'react';
import { Star, Clock, MapPin, MessageCircle, Flame, Users, CalendarDays, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TmdbPoster from './TmdbPoster';
import styles from './EventCard.module.css';

function FeedCard({ item, onClick }) {
  if (item.feed_type === 'MOVIE') {
    return (
      <div 
        className="glass hover-scale" 
        style={{ padding: '20px', borderRadius: '16px', display: 'flex', gap: '16px', cursor: 'pointer' }}
        onClick={onClick}
      >
        <div style={{ flexShrink: 0, width: '100px' }}>
          <TmdbPoster title={item.title} className="movie-list-poster" style={{ width: '100px', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{item.title}</h3>
            {item.original_title && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                {item.original_title}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {item.tags && item.tags.map((tag, index) => (
                <span key={tag.id || index} style={{ fontSize: '0.85rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  <Flame size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              累積 {item.review_count || 0} 則深度影評
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F5A623', fontWeight: 'bold' }}>
              <Star size={16} fill="#F5A623" />
              <span>{item.avg_rating ? item.avg_rating.toFixed(1) : '0.0'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (item.feed_type === 'EVENT') {
    const progress = item.capacity > 0 
      ? Math.min((item.registered_count / item.capacity) * 100, 100) 
      : 0;
    const isFull = item.capacity > 0 && item.registered_count >= item.capacity;

    return (
      <div className={`glass hover-scale ${styles.card}`} onClick={onClick}>
        <div className={styles.coverWrapper}>
          {item.cover_image ? (
            <img src={item.cover_image} alt={item.title} className={styles.coverImage} />
          ) : (
            <div className={styles.coverPlaceholder}>
              <Ticket size={32} opacity={0.5} />
            </div>
          )}
          <div className={`${styles.statusBadge} ${styles.statusCompleted}`} style={{ background: 'rgba(167,139,250,0.8)' }}>
            <CalendarDays size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            活動回顧
          </div>
        </div>
        
        <div className={styles.content}>
          <h3 className={styles.title}>{item.title}</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            <Users size={14} style={{ color: '#F5A623' }} />
            <span style={{ fontWeight: 500 }}>主辦：{item.user?.nickname || item.user?.campus_id}</span>
          </div>

          <div className={styles.footer} style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <div className={styles.completedInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} />
                  <span>{item.registered_count} 人到場</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageCircle size={16} />
                  <span>{item.comment_count || 0} 則迴響</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default FeedCard;
