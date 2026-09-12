import React from 'react';
import { Star, Clock, MapPin, MessageCircle, Flame, Users, CalendarDays, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TmdbPoster from './TmdbPoster';
import styles from './EventCard.module.css';

function FeedCard({ item, onClick }) {
  if (item.feed_type === 'MOVIE') {
    return (
      <div 
        className="posterCard" 
        onClick={onClick}
      >
        <div className="posterWrapper">
          <TmdbPoster title={item.title} className="posterImg" />
          <div className="posterOverlay">
            <button className="overlayBtn">
              <MessageCircle size={16} /> 查看電影
            </button>
          </div>
        </div>
        <div className="posterInfo">
          <div className="posterTitle">{item.title}</div>
          <div className="posterMeta">
            {item.avg_rating > 0 ? (
              <span className="posterRating"><Star size={12} fill="currentColor" /> {item.avg_rating.toFixed(1)}/5</span>
            ) : (
              <span className="posterDate" style={{ color: 'var(--text-muted)' }}>無評分</span>
            )}
            <span className="posterDate">{item.review_count || 0} 則心得</span>
          </div>
        </div>
      </div>
    );
  } else if (item.feed_type === 'EVENT') {
    return (
      <div 
        className="posterCard" 
        onClick={onClick}
      >
        <div className="posterWrapper">
          {item.cover_image ? (
            <img src={item.cover_image} alt={item.title} className="posterImg" />
          ) : (
            <div className="posterPlaceholder"><Ticket size={32} /></div>
          )}
          <div className="posterOverlay">
            <button className="overlayBtn">
              <CalendarDays size={16} /> 查看活動
            </button>
          </div>
        </div>
        <div className="posterInfo">
          <div className="posterTitle">{item.title}</div>
          <div className="posterMeta">
            <span className="posterDate" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {item.registered_count} 人</span>
            <span className="posterDate">{item.comment_count || 0} 則迴響</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default FeedCard;
