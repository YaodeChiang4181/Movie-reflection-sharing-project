import React from 'react';
import { Calendar, MapPin, Clock, Users, MessageCircle } from 'lucide-react';
import styles from './EventCard.module.css';

function EventCard({ event, onClick }) {
  const isUpcoming = event.status === 'UPCOMING';
  const progress = event.capacity > 0 
    ? Math.min((event.registered_count / event.capacity) * 100, 100) 
    : 0;
  
  const isFull = event.capacity > 0 && event.registered_count >= event.capacity;
  
  const formatDate = (dateString) => {
    if (!dateString) return '未定';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`glass hover-scale ${styles.card}`} onClick={onClick}>
      <div className={styles.coverWrapper}>
        {event.cover_image ? (
          <img src={event.cover_image} alt={event.title} className={styles.coverImage} />
        ) : (
          <div className={styles.coverPlaceholder}>
            <Calendar size={32} opacity={0.5} />
          </div>
        )}
        <div className={styles.statusBadge}>
          {isUpcoming ? '即將舉辦' : '活動回顧'}
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>{event.title}</h3>
        
        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <Clock size={14} className={styles.icon} />
            <span>{formatDate(event.start_time)}</span>
          </div>
          <div className={styles.infoItem}>
            <MapPin size={14} className={styles.icon} />
            <span>{event.location}</span>
          </div>
        </div>

        <div className={styles.footer}>
          {isUpcoming ? (
            <div className={styles.registrationInfo}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>報名進度</span>
                <span className={styles.progressCount}>{event.registered_count} / {event.capacity || '無上限'}</span>
              </div>
              <div className={styles.progressBarBg}>
                <div 
                  className={`${styles.progressBarFill} ${isFull ? styles.full : ''}`} 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <button 
                className={`btn btn-primary ${styles.actionBtn}`} 
                disabled={isFull && !event.has_registered}
              >
                {event.has_registered ? '您已報名' : (isFull ? '已額滿' : '立即報名')}
              </button>
            </div>
          ) : (
            <div className={styles.completedInfo}>
              <div className={styles.commentsBadge}>
                <MessageCircle size={14} />
                <span>{event.comment_count || 0} 則討論</span>
              </div>
              <button className={`btn btn-outline ${styles.actionBtn}`}>
                查看回顧
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventCard;
