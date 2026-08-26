import { useState, useEffect } from 'react';
import { X, ThumbsUp, ThumbsDown, MessageCircle, MoreVertical, Edit2, Trash2, Send } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import ReviewForm from './ReviewForm';
import UserCardModal from './UserCardModal';

function getBadge(level) {
  if (level >= 10) return { title: '影評達人', emoji: '', color: '#8B5CF6' };
  if (level >= 8) return { title: '黃金觀影人', emoji: '', color: '' }
  if (level >= 5) return { title: '白銀觀影人', emoji: '', color: '#CD7F32' };
  if (level >= 3) return { title: '青銅觀影人', emoji: '', color: '' }
  if (level >= 2) return { title: '唉呦不錯呦', emoji: '', color: '#FFD700' };
  if (level >= 1) return { title: '初出茅廬', emoji: '', color: '#6BCB77' };
  return { title: '新手影迷', emoji: '🎬', color: '#888888' };
}

function ReviewModal({ review, onClose, onReviewUpdated, onReviewDeleted }) {
  const { isLoggedIn, userProfile } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentReview, setCurrentReview] = useState(review);
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedUserCampusId, setSelectedUserCampusId] = useState(null);

  useEffect(() => {
    fetchComments();
  }, [currentReview.id]);

  const fetchComments = async () => {
    try {
      const res = await api.get(`reviews/${currentReview.id}/comments/`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (voteType) => {
    if (!isLoggedIn) {
      alert('必須登入才能對心得進行評價！');
      return;
    }

    const prevReview = currentReview;
    const currentVote = prevReview.user_voted || 0;

    let newUpvotes = prevReview.upvotes || 0;
    let newDownvotes = prevReview.downvotes || 0;
    let newCurrentVote = voteType;

    if (currentVote === voteType) {
      newCurrentVote = 0;
      if (voteType === 1) newUpvotes -= 1;
      if (voteType === -1) newDownvotes -= 1;
    } else {
      if (currentVote === 1) newUpvotes -= 1;
      if (currentVote === -1) newDownvotes -= 1;
      if (voteType === 1) newUpvotes += 1;
      if (voteType === -1) newDownvotes += 1;
    }

    setCurrentReview(prev => ({
      ...prev,
      user_voted: newCurrentVote,
      upvotes: newUpvotes,
      downvotes: newDownvotes
    }));

    try {
      await api.post(`reviews/${currentReview.id}/vote/`, { vote_type: voteType });
      if (onReviewUpdated) onReviewUpdated();
    } catch (err) {
      console.error(err);
      setCurrentReview(prevReview);
      if (err.response?.status === 401) {
        alert('請先登入才能投票！');
      } else {
        alert('投票失敗，請稍後再試。');
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !isLoggedIn) return;
    try {
      const res = await api.post(`reviews/${currentReview.id}/comments/`, { content: newComment });
      setComments([res.data, ...comments]);
      setNewComment('');
      if (onReviewUpdated) onReviewUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("確定要刪除這篇心得嗎？")) {
      try {
        await api.delete(`reviews/${currentReview.id}/`);
        if (onReviewDeleted) onReviewDeleted(currentReview.id);
        onClose();
      } catch (err) {
        alert("刪除失敗");
      }
    }
  };

  const isAuthor = isLoggedIn && userProfile?.campus_id === currentReview.user?.campus_id;

  if (isEditing) {
    return (
      <ReviewForm
        initialData={currentReview}
        onClose={() => setIsEditing(false)}
        onReviewAdded={(updatedData) => {
          setCurrentReview(updatedData);
          setIsEditing(false);
          if (onReviewUpdated) onReviewUpdated();
        }}
      />
    );
  }

  return (
    <>
      <div style={overlayStyle} onClick={onClose}>
        <style>{`
        .modal-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .modal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
        <div style={modalStyle} className="modal-scroll" onClick={e => e.stopPropagation()}>
          <button style={closeBtnStyle} onClick={onClose}><X size={24} /></button>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
            {/* 左側：片名、評分、作者 */}
            <div style={{ flex: '1 1 250px', minWidth: 0 }}>
              <div style={{ marginBottom: '8px' }}>
                <h2 style={{ color: 'var(--accent-primary)', fontSize: '1.8rem', margin: 0, wordBreak: 'break-word' }}>
                  {currentReview.movie?.title}
                </h2>
              </div>

              <div style={{ color: '#F59E0B', fontSize: '1.1rem', display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '16px' }}>
                {'★'.repeat(currentReview.rating)}{'☆'.repeat(5 - currentReview.rating)}
                <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>{currentReview.rating.toFixed(1)}</span>
              </div>

              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentReview.user?.campus_id) setSelectedUserCampusId(currentReview.user.campus_id);
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                  {currentReview.user?.avatar ? (
                    <img src={currentReview.user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (currentReview.user?.nickname || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.95rem' }} className="hover-bg-tertiary">{currentReview.user?.nickname}</span>
                    <span style={{ color: getBadge(currentReview.user?.level || 1).color, fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: `1px solid ${getBadge(currentReview.user?.level || 1).color}`, whiteSpace: 'nowrap' }}>
                      Lv.{currentReview.user?.level || 1} {getBadge(currentReview.user?.level || 1).title}
                    </span>
                  </div>
                  <span style={{ color: '#94A3B8', fontSize: '0.82rem' }}>{new Date(currentReview.created_at).toLocaleDateString('zh-TW')}</span>
                </div>
              </div>
            </div>

            {/* 右側：狀態膠囊、操作按鈕 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', flexShrink: 0 }}>
              {currentReview.is_spoiler && (
                <span style={{ 
                  background: 'rgba(245, 158, 11, 0.15)', 
                  color: '#F59E0B', 
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  fontSize: '0.85rem', 
                  fontWeight: 'bold', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  ⚠️ 含劇透內容
                </span>
              )}
              
              {isAuthor && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={actionBtnStyle} onClick={() => setIsEditing(true)}>
                    <Edit2 size={16} /> 編輯
                  </button>
                  <button style={{ ...actionBtnStyle, color: '#ff4444', borderColor: 'rgba(255, 68, 68, 0.3)', background: 'rgba(255, 68, 68, 0.05)' }} onClick={handleDelete}>
                    <Trash2 size={16} /> 刪除
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <div
              style={{
                color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                transition: 'filter 0.3s ease',
                ...(currentReview.is_spoiler && !isRevealed ? { filter: 'blur(8px)', userSelect: 'none', cursor: 'pointer' } : {})
              }}
              onClick={() => { if (currentReview.is_spoiler && !isRevealed) setIsRevealed(true); }}
            >
              {currentReview.content}
            </div>

            {currentReview.is_spoiler && !isRevealed && (
              <div
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  zIndex: 10
                }}
                onClick={() => setIsRevealed(true)}
              >
                <div style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '12px 24px',
                  borderRadius: '30px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                  transition: 'background 0.2s ease, transform 0.2s ease'
                }} 
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  👁️ 本篇含有關鍵劇情，點擊展開閱讀
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {(() => {
            if (!currentReview.tags || currentReview.tags.length === 0) return null;
            
            // 1. 過濾防雷標籤
            let validTags = currentReview.tags.filter(t => !['無雷', '有雷', '含劇透'].includes(t.name));
            
            // 2. 去重 (忽略大小寫與繁簡差異可由 Set 單純比對名稱，此處以 exact name 為主)
            const uniqueNames = new Set();
            validTags = validTags.filter(tag => {
              const nameLower = tag.name.toLowerCase();
              if (uniqueNames.has(nameLower)) return false;
              uniqueNames.add(nameLower);
              return true;
            });

            if (validTags.length === 0) return null;

            // 3. 限制最多顯示 5 個
            const displayTags = validTags.slice(0, 5);
            const remainingCount = validTags.length - 5;

            return (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`.tags-container::-webkit-scrollbar { display: none; }`}</style>
                <div className="tags-container" style={{ display: 'flex', gap: '8px' }}>
                  {displayTags.map(tag => (
                    <span key={tag.id} style={{...tagStyle, flexShrink: 0}}>#{tag.name}</span>
                  ))}
                  {remainingCount > 0 && (
                    <span style={{...tagStyle, flexShrink: 0, background: 'rgba(255,255,255,0.05)', color: '#94A3B8', borderColor: 'rgba(255,255,255,0.1)'}}>
                      +{remainingCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Vote Buttons */}
          <div style={{ display: 'flex', marginBottom: '32px', gap: '12px' }}>
            <button
              onClick={() => handleVote(1)}
              style={{
                ...voteBtnStyle,
                borderColor: currentReview.user_voted === 1 ? '#8E52F5' : 'rgba(255, 255, 255, 0.15)',
                background: currentReview.user_voted === 1 ? 'rgba(142, 82, 245, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: currentReview.user_voted === 1 ? '#8E52F5' : '#CBD5E1'
              }}
            >
              <ThumbsUp size={18} />
              {currentReview.upvotes || 0} 推
            </button>

            <button
              onClick={() => handleVote(-1)}
              style={{
                ...voteBtnStyle,
                borderColor: currentReview.user_voted === -1 ? '#F87171' : 'rgba(255, 255, 255, 0.15)',
                background: currentReview.user_voted === -1 ? 'rgba(248, 113, 113, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: currentReview.user_voted === -1 ? '#F87171' : '#CBD5E1'
              }}
            >
              <ThumbsDown size={18} />
              {currentReview.downvotes || 0} 倒讚
            </button>
          </div>

          {/* Comments Section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={20} /> 留言區 ({comments.length})
            </h3>

            {/* Comment Input */}
            {isLoggedIn ? (
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="留下您的評論..."
                  style={commentInputStyle}
                />
                <button type="submit" style={commentSubmitBtnStyle} disabled={!newComment.trim()}>
                  <Send size={18} />
                </button>
              </form>
            ) : (
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>請先登入後再留言。</p>
            )}

            {/* Comment List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {comments.map(c => (
                <div key={c.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{c.user?.nickname}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString('zh-TW')}</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                    {c.content}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>目前還沒有留言，來搶頭香吧！</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedUserCampusId && (
        <UserCardModal
          campusId={selectedUserCampusId}
          onClose={() => setSelectedUserCampusId(null)}
        />
      )}
    </>
  );
}

// Inline Styles
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(5px)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalStyle = {
  background: '#1a1a2e',
  width: '100%', maxWidth: '700px', maxHeight: '90vh',
  borderRadius: '16px',
  padding: '32px',
  position: 'relative',
  overflowY: 'auto',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
};

const closeBtnStyle = {
  position: 'absolute', top: '16px', right: '16px',
  background: 'transparent', border: 'none', color: 'var(--text-muted)',
  cursor: 'pointer'
};

const tagStyle = {
  backgroundColor: 'rgba(139, 92, 246, 0.12)',
  border: '1px solid rgba(139, 92, 246, 0.25)',
  color: '#DDD6FE',
  padding: '4px 12px',
  borderRadius: '20px',
  fontSize: '0.9rem'
};

const actionBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '6px',
  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
  color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '8px',
  cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s'
};

const voteBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '8px',
  border: '1px solid var(--accent-primary)',
  padding: '8px 20px', borderRadius: '24px',
  cursor: 'pointer', transition: 'all 0.2s ease',
  fontSize: '1rem', fontWeight: '500'
};

const commentInputStyle = {
  flex: 1, padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', color: 'var(--text-primary)',
  outline: 'none'
};

const commentSubmitBtnStyle = {
  background: 'var(--accent-primary)', border: 'none',
  color: 'white', padding: '0 20px', borderRadius: '8px',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
};

export default ReviewModal;
