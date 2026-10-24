import React from 'react';
import { Star, Clock, MapPin, MessageCircle, Flame, Users, CalendarDays, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TmdbPoster from './TmdbPoster';
import styles from './EventCard.module.css';

function FeedCard({ item, onClick }) {
  if (item.feed_type === 'MOVIE' || item.feed_type === 'TV' || item.feed_type === 'ANIME' || !item.feed_type) {
    const isTv = item.feed_type === 'TV';
    const isAnime = item.feed_type === 'ANIME';
    const label = isTv ? '影集' : isAnime ? '動漫' : '電影';

    return (
      <div 
        className="posterCard" 
        onClick={onClick}
      >
        <div className="posterWrapper" style={{ position: 'relative' }}>
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
            {label}
          </span>
          <TmdbPoster title={item.title} posterUrl={item.poster_url} className="posterImg" />
          <div className="posterOverlay">
            <button className="overlayBtn">
              <MessageCircle size={16} /> 查看{label}
            </button>
          </div>
        </div>
        <div className="posterInfo">
          <div className="posterTitle">{item.title}</div>
          <div className="posterMeta">
            {item.avg_rating > 0 ? (
              <span className="posterRating">{item.avg_rating.toFixed(1)}/5</span>
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
