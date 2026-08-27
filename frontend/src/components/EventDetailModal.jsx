import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, Users, Star, MessageSquare, Send, User } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './EventDetailModal.module.css';
import SpeedRatingModal from './SpeedRatingModal';
import UserCardModal from './UserCardModal';

function EventDetailModal({ event, onClose, onUpdate }) {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('DETAILS'); // DETAILS, RECAP, COMMENTS
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSpeedRating, setShowSpeedRating] = useState(false);
  const [selectedUserCampusId, setSelectedUserCampusId] = useState(null);

  const isUpcoming = event.status === 'UPCOMING';
  const isFull = event.capacity > 0 && event.registered_count >= event.capacity;
  
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

  const formatDate = (dateString) => {
    if (!dateString) return '未定';
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`glass ${styles.modalContent}`} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>

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
            <button className={`${styles.navTab} ${activeTab === 'DETAILS' ? styles.active : ''}`} onClick={() => setActiveTab('DETAILS')}>活動詳情</button>
          ) : (
            <>
              <button className={`${styles.navTab} ${activeTab === 'RECAP' ? styles.active : ''}`} onClick={() => setActiveTab('RECAP')}>活動花絮</button>
              <button className={`${styles.navTab} ${activeTab === 'COMMENTS' ? styles.active : ''}`} onClick={() => setActiveTab('COMMENTS')}>交流留言 ({event.comment_count || 0})</button>
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
                        style={{ width: `${event.capacity > 0 ? Math.min((event.registered_count / event.capacity) * 100, 100) : 0}%`, background: isFull ? 'var(--danger-color, #ff4d4f)' : 'var(--primary-color)' }}
                      />
                    </div>
                    <span className={styles.progressText}>
                      {event.capacity > 0 ? `${Math.round((event.registered_count / event.capacity) * 100)}% (剩餘 ${event.capacity - event.registered_count} 席)` : '無人數上限'}
                    </span>
                  </div>
                  <button 
                    className={`btn btn-primary ${styles.registerBtn}`}
                    onClick={handleRegister}
                    disabled={isSubmitting || (isFull && !event.has_registered)}
                  >
                    {event.has_registered ? '您已報名' : (isFull ? '已額滿' : '立即報名')}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'RECAP' && !isUpcoming && (
            <div className={styles.recapSection}>
              {event.recap_text ? (
                <div className={styles.recapContent}>
                  <p>{event.recap_text}</p>
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
    </div>
  );
}

export default EventDetailModal;
