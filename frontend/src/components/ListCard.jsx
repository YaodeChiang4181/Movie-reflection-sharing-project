import React from 'react';
import { Bookmark, User } from 'lucide-react';
import CollageCover from './CollageCover';

const ListCard = ({ list, onClick }) => {
  const { title, description, hashtags, bookmark_count, creator_info, cover_posters, movie_titles_preview } = list;

  return (
    <div 
      className="glass hover-scale" 
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '16px',
        cursor: 'pointer',
        display: 'flex',
        gap: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(19, 23, 34, 0.8)',
      }}
    >
      <CollageCover posters={cover_posters} size="small" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }} className="line-clamp-1">
          {title}
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={14} /> 
            <span>{creator_info?.nickname || creator_info?.campus_id} <span style={{ color: 'var(--accent-primary)' }}>(Lv.{creator_info?.level || 1})</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Bookmark size={14} />
            <span>{bookmark_count} 次收藏</span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          收錄：{movie_titles_preview?.join('、') || '暫無電影'}...
        </p>
        
        {description && (
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            "{description}"
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
          {hashtags?.map(tag => (
            <span key={tag} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListCard;
