import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, Users, Star, MessageSquare, Send, User, Trash2, QrCode } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './EventDetailModal.module.css';
import SpeedRatingModal from './SpeedRatingModal';
import UserCardModal from './UserCardModal';
import AttendanceDashboard from './AttendanceDashboard';
import HostQrProjectorModal from './HostQrProjectorModal';

function EventDetailModal({ event, onClose, onUpdate }) {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('DETAILS'); // DETAILS, RECAP, COMMENTS
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSpeedRating, setShowSpeedRating] = useState(false);
  const [selectedUserCampusId, setSelectedUserCampusId] = useState(null);
  const [isEditingRecap, setIsEditingRecap] = useState(false);
  const [editRecapText, setEditRecapText] = useState('');
  const [editRecapUrl, setEditRecapUrl] = useState('');
  const [selectedImages, setSelectedImages] = useState(null);
  const [showQrProjector, setShowQrProjector] = useState(false);

  const isUpcoming = event.status === 'UPCOMING';
  const isFull = event.capacity > 0 && event.registered_count >= event.capacity;
  
  const isAuthor = userProfile?.id === event.user?.id;
  const isAdmin = userProfile?.is_staff;

  const handleDeleteEvent = async () => {
    if (window.confirm("確定要刪除這個活動嗎？刪除後無法恢復。")) {
      try {
        setIsSubmitting(true);
        await api.delete(`events/${event.id}/`);
        onUpdate();
        onClose();
      } catch (error) {
        alert("刪除失敗");
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  const getDuration = () => {
    if (!event.start_time || !event.end_time) return '未定';
    const diff = (new Date(event.end_time) - new Date(event.start_time)) / 60000;
    if (diff < 60) return `${diff} 分鐘`;
    const hours = (diff / 60).toFixed(1).replace('.0', '');
    return `${hours} 小時 (${diff} mins)`;
  };
  
  // Update active tab based on status
  useEffect(() => {
    if (event.status === 'COMPLETED') {
      setActiveTab('RECAP');
    } else {
      setActiveTab('DETAILS');
    }
  }, [event.status]);

  useEffect(() => {
    if (activeTab === 'COMMENTS') {
      fetchComments();
    }
  }, [activeTab]);

  const fetchComments = async () => {
    try {
      const response = await api.get(`events/${event.id}/list_comments/`);
      setComments(response.data);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

  const handleRegister = async () => {
    try {
      setIsSubmitting(true);
      await api.post(`events/${event.id}/register/`);
      alert("報名成功！");
      onUpdate();
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || "報名失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      setIsSubmitting(true);
      await api.post(`events/${event.id}/comments/`, { content: newComment });
      setNewComment('');
      fetchComments();
      onUpdate(); // update comment count in list
    } catch (error) {
      alert("留言失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRecap = async () => {
    try {
      setIsSubmitting(true);
      await api.patch(`events/${event.id}/`, { 
        recap_text: editRecapText,
        recap_url: editRecapUrl
      });
      
      if (selectedImages && selectedImages.length > 0) {
        const formData = new FormData();
        Array.from(selectedImages).forEach(file => {
          formData.append('images', file);
        });
        await api.post(`events/${event.id}/upload_recap_images/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      setIsEditingRecap(false);
      setSelectedImages(null);
      onUpdate(); 
      alert("活動花絮已更新！");
    } catch (error) {
      alert(error.response?.data?.detail || "更新活動花絮失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未定';
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`glass ${styles.modalContent}`} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        {(isAuthor || isAdmin) && (
          <button 
            className={styles.closeBtn} 
            style={{ top: '64px', background: 'rgba(220, 38, 38, 0.7)' }} 
            onClick={handleDeleteEvent}
            title="刪除活動"
          >
            <Trash2 size={20} />
          </button>
        )}

        <div className={styles.header}>
          {event.cover_image ? (
            <img src={event.cover_image} alt={event.title} className={styles.coverImage} />
          ) : (
            <div className={styles.coverPlaceholder}>
              <Calendar size={48} opacity={0.3} />
            </div>
          )}
          <div className={styles.headerOverlay}>
            <span className={styles.statusBadge}>
              {isUpcoming ? '即將舉辦' : '活動回顧'}
            </span>
            <h2 className={styles.title}>{event.title}</h2>
            <div 
              className={styles.hostInfo} 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (event.user?.campus_id) setSelectedUserCampusId(event.user.campus_id); 
              }}
            >
              <User size={16} />
              <span>主辦：{event.organizer_nickname}</span>
            </div>
          </div>
        </div>

        <div className={styles.navTabs}>
          {isUpcoming ? (
            <>
              <button className={`${styles.navTab} ${activeTab === 'DETAILS' ? styles.active : ''}`} onClick={() => setActiveTab('DETAILS')}>活動詳情</button>
              {isAuthor && <button className={`${styles.navTab} ${activeTab === 'DASHBOARD' ? styles.active : ''}`} onClick={() => setActiveTab('DASHBOARD')}>管理看板</button>}
            </>
          ) : (
            <>
              <button className={`${styles.navTab} ${activeTab === 'RECAP' ? styles.active : ''}`} onClick={() => setActiveTab('RECAP')}>活動花絮</button>
              <button className={`${styles.navTab} ${activeTab === 'COMMENTS' ? styles.active : ''}`} onClick={() => setActiveTab('COMMENTS')}>交流留言 ({event.comment_count || 0})</button>
              {isAuthor && <button className={`${styles.navTab} ${activeTab === 'DASHBOARD' ? styles.active : ''}`} onClick={() => setActiveTab('DASHBOARD')}>管理看板</button>}
            </>
          )}
        </div>

        <div className={styles.body}>
          {activeTab === 'DETAILS' && (
            <div className={styles.detailsSection}>
              <div className={styles.infoGrid}>
                <div className={styles.infoBox}>
                  <Clock size={20} className={styles.infoIcon} />
                  <div>
                    <div className={styles.infoLabel}>開始時間</div>
                    <div className={styles.infoValue}>{formatDate(event.start_time)}</div>
                  </div>
                </div>
                <div className={styles.infoBox}>
                  <Clock size={20} className={styles.infoIcon} />
                  <div>
                    <div className={styles.infoLabel}>預計時長</div>
                    <div className={styles.infoValue}>{getDuration()}</div>
                  </div>
                </div>
                <div className={styles.infoBox}>
                  <MapPin size={20} className={styles.infoIcon} />
                  <div>
                    <div className={styles.infoLabel}>集合地點</div>
                    <div className={styles.infoValue}>{event.location}</div>
                  </div>
                </div>
                <div className={styles.infoBox}>
                  <Users size={20} className={styles.infoIcon} />
                  <div>
                    <div className={styles.infoLabel}>報名進度</div>
                    <div className={styles.infoValue}>{event.registered_count} / {event.capacity || '無上限'} 席</div>
                  </div>
                </div>
              </div>

              <div className={styles.description}>
                <h3>關於活動</h3>
                <p>{event.description}</p>
              </div>

              {isUpcoming && (
                <div className={styles.actionSection}>
                  <div className={styles.progressContainer}>
                    <span className={styles.progressText}>進度：</span>
                    <div className={styles.progressBarWrapper}>
                      <div 
                        className={styles.progressBarFill} 
                        style={{ 
                          width: `${event.capacity > 0 ? Math.min((event.registered_count / event.capacity) * 100, 100) : 0}%`, 
                          minWidth: event.registered_count > 0 ? '5%' : '0%',
                          background: isFull ? 'var(--danger-color, #ff4d4f)' : 'var(--primary-color)' 
                        }}
                      />
                    </div>
                    <span className={styles.progressText}>
                      {event.capacity > 0 ? `${Math.round((event.registered_count / event.capacity) * 100)}% (剩餘 ${event.capacity - event.registered_count} 席)` : '無人數上限'}
                    </span>
                  </div>
                  <button 
                    className={`btn btn-primary ${styles.registerBtn}`}
                    onClick={isAuthor ? () => setShowQrProjector(true) : handleRegister}
                    disabled={!isAuthor && (isSubmitting || (isFull && !event.has_registered))}
                    style={isAuthor ? { background: 'var(--accent-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' } : {}}
                  >
                    {isAuthor ? <><QrCode size={18} /> 開啟現場投影 QR Code</> : (event.has_registered ? '您已報名' : (isFull ? '已額滿' : '立即報名'))}
                  </button>
                </div>
              )}
              

            </div>
          )}

          {activeTab === 'DASHBOARD' && isAuthor && (
            <div className={styles.dashboardSection}>
              <AttendanceDashboard event={event} inline={true} onOpenQr={() => setShowQrProjector(true)} />
            </div>
          )}

          {activeTab === 'RECAP' && !isUpcoming && (
            <div className={styles.recapSection}>
              {isAuthor && !isEditingRecap && (
                <button onClick={() => { 
                  setIsEditingRecap(true); 
                  setEditRecapText(event.recap_text || ''); 
                  setEditRecapUrl(event.recap_url || '');
                  setSelectedImages(null);
                }} className="btn btn-outline" style={{ marginBottom: '16px' }}>
                  {event.recap_text || (event.recap_images && event.recap_images.length > 0) ? '編輯活動花絮' : '新增活動花絮'}
                </button>
              )}
              {isAuthor && isEditingRecap ? (
                <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea 
                    value={editRecapText}
                    onChange={(e) => setEditRecapText(e.target.value)}
                    style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', resize: 'vertical' }}
                    placeholder="分享一下這次活動的精彩時刻吧！"
                  />
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>上傳活動照片 (單張限制 2MB)</label>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={(e) => setSelectedImages(e.target.files)}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>外部回顧連結 (選填)</label>
                    <input 
                      type="url" 
                      value={editRecapUrl}
                      onChange={(e) => setEditRecapUrl(e.target.value)}
                      placeholder="https://..."
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setIsEditingRecap(false)} className="btn btn-outline">取消</button>
                    <button onClick={handleSaveRecap} className="btn btn-primary" disabled={isSubmitting}>儲存</button>
                  </div>
                </div>
              ) : (event.recap_text || (event.recap_images && event.recap_images.length > 0) || event.recap_url) ? (
                <div className={styles.recapContent}>
                  {event.recap_text && <p style={{ marginBottom: '16px', whiteSpace: 'pre-wrap' }}>{event.recap_text}</p>}
                  
                  {event.recap_images && event.recap_images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                      {event.recap_images.map((imgUrl, idx) => (
                        <img key={idx} src={imgUrl} alt={`Recap ${idx + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                      ))}
                    </div>
                  )}
                  
                  {event.recap_url && (
                    <a href={event.recap_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      🔗 點連結看更多詳細資訊...
                    </a>
                  )}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  主辦方尚未上傳回顧花絮
                </div>
              )}

              {event.movie && (
                <div className={styles.movieIntegration}>
                  <h3>為這場活動的電影評分</h3>
                  <div className={styles.movieCard}>
                    <div className={styles.movieInfo}>
                      <span className={styles.movieTitle}>{event.movie.title}</span>
                    </div>
                    <button className="btn btn-outline" onClick={() => setShowSpeedRating(true)}>
                      <Star size={16} /> 極速評星
                    </button>
                  </div>
                </div>
              )}


            </div>
          )}

          {activeTab === 'COMMENTS' && !isUpcoming && (
            <div className={styles.commentsSection}>
              <div className={styles.commentInputBox}>
                <textarea 
                  className={styles.commentInput}
                  placeholder="寫下你的心得或給主辦方的話..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <button 
                  className={`btn btn-primary ${styles.submitCommentBtn}`}
                  onClick={handlePostComment}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  <Send size={16} /> 留言
                </button>
              </div>

              <div className={styles.commentsList}>
                {comments.length === 0 ? (
                  <div className={styles.emptyComments}>還沒有人留言，搶先第一位！</div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className={styles.commentItem}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentUser}>{comment.user.nickname}</span>
                        {comment.user_tag && (
                          <span className={`${styles.userTag} ${styles[comment.user_tag === '主辦方' ? 'tagHost' : comment.user_tag === '現場觀眾' ? 'tagAttendee' : 'tagFan']}`}>
                            {comment.user_tag}
                          </span>
                        )}
                        <span className={styles.commentTime}>{formatDate(comment.created_at)}</span>
                      </div>
                      <div className={styles.commentContent}>
                        {comment.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showSpeedRating && (
        <SpeedRatingModal onClose={() => setShowSpeedRating(false)} />
      )}
      {selectedUserCampusId && (
        <UserCardModal 
          campusId={selectedUserCampusId} 
          onClose={() => setSelectedUserCampusId(null)} 
        />
      )}
      {showQrProjector && (
        <HostQrProjectorModal 
          eventId={event.id} 
          eventTitle={event.title}
          onClose={() => setShowQrProjector(false)} 
        />
      )}
    </div>
  );
}

export default EventDetailModal;
