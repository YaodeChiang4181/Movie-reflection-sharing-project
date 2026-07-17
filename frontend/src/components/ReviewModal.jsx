import { useState, useEffect } from 'react';
import { X, ThumbsUp, MessageCircle, Edit2, Trash2, Send } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import ReviewForm from './ReviewForm';

function ReviewModal({ review, onClose, onReviewUpdated, onReviewDeleted }) {
  const { isLoggedIn, userProfile } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentReview, setCurrentReview] = useState(review);
  
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

  const handleVote = async () => {
    if (!isLoggedIn) {
      alert('必須登入才能對心得進行評價！');
      return;
    }
    try {
      const res = await api.post(`reviews/${currentReview.id}/vote/`, { vote_type: 1 });
      const isAdded = res.data.message === 'Vote added.' || res.data.message === 'Vote updated.';
      setCurrentReview(prev => ({
        ...prev,
        user_voted: !prev.user_voted,
        score: prev.score + (prev.user_voted ? -1 : 1) 
      }));
      if (onReviewUpdated) onReviewUpdated();
    } catch (err) {
      console.error(err);
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
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose}><X size={24} /></button>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: 'var(--accent-primary)', fontSize: '1.8rem', marginBottom: '8px' }}>
              {currentReview.movie?.title}
            </h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', gap: '12px' }}>
              <span>推薦指數 {currentReview.rating}/5</span>
              <span>•</span>
              <span>{new Date(currentReview.created_at).toLocaleDateString('zh-TW')}</span>
              <span>•</span>
              <span>作者: {currentReview.user?.nickname}</span>
            </div>
          </div>
          
          {isAuthor && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={actionBtnStyle} onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> 編輯
              </button>
              <button style={{...actionBtnStyle, color: '#ff4444', borderColor: '#ff4444'}} onClick={handleDelete}>
                <Trash2 size={16} /> 刪除
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {currentReview.content}
        </div>

        {/* Tags */}
        {currentReview.tags && currentReview.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {currentReview.tags.map(tag => (
              <span key={tag.id} style={tagStyle}>#{tag.name}</span>
            ))}
          </div>
        )}

        {/* Vote Button */}
        <div style={{ display: 'flex', marginBottom: '32px' }}>
          <button 
            onClick={handleVote}
            style={{ 
              ...voteBtnStyle, 
              background: currentReview.user_voted ? 'var(--accent-primary)' : 'transparent',
              color: currentReview.user_voted ? '#fff' : 'var(--text-primary)'
            }}
          >
            <ThumbsUp size={18} /> 
            {currentReview.user_voted ? '已推薦' : '推薦'} ({currentReview.score || 0})
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
  backgroundColor: 'rgba(139, 92, 246, 0.2)', 
  color: 'var(--accent-secondary)', 
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
