import React from 'react';
import { Bookmark, User } from 'lucide-react';
import CollageCover from './CollageCover';

const ListCard = ({ list, onClick }) => {
  const { title, description, hashtags, bookmark_count, creator_info, cover_posters, movie_titles_preview } = list;

  return (
    <div className="posterCard" onClick={onClick}>
      <div className="posterWrapper">
        <CollageCover posters={cover_posters} size="small" />
        <div className="posterOverlay" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '12px' }}>
          <div style={{ color: 'white', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Bookmark size={14} /> {bookmark_count} 次收藏
          </div>
          {creator_info && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
              由 {creator_info.nickname || creator_info.campus_id} 建立
            </div>
          )}
        </div>
      </div>
      <div className="posterInfo" style={{ padding: '12px', background: 'rgba(19,23,34,0.8)' }}>
        <div className="posterTitle line-clamp-1" style={{ fontSize: '1rem', marginBottom: '4px', color: 'white' }}>
          {title}
        </div>
        <div className="posterMeta" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          收錄: {movie_titles_preview?.length ? movie_titles_preview.slice(0,2).join('、') + (movie_titles_preview.length > 2 ? '...' : '') : '暫無'}
        </div>
        {hashtags && hashtags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
              #{hashtags[0]}
            </span>
            {hashtags.length > 1 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{hashtags.length - 1}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListCard;
