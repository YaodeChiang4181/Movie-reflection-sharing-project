import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, MapPin, Clock, Users, Star, MessageSquare, Send, User, Trash2, QrCode, MoreVertical, Edit2 } from 'lucide-react';
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
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [mentionableUsers, setMentionableUsers] = useState([]);
  const [mentionDropdown, setMentionDropdown] = useState({ show: false, query: '', isEdit: false });
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
      fetchMentionableUsers();
    }
  }, [activeTab]);

  const fetchMentionableUsers = async () => {
    try {
      const response = await api.get(`events/${event.id}/mentionable_users/`);
      setMentionableUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch mentionable users:", error);
    }
  };

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
      setMentionDropdown({ show: false, query: '', isEdit: false });
      fetchComments();
      onUpdate(); // update comment count in list
    } catch (error) {
      alert("留言失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editCommentContent.trim()) return;
    try {
      setIsSubmitting(true);
      await api.patch(`event-comments/${commentId}/`, { content: editCommentContent });
      setEditingCommentId(null);
      setMentionDropdown({ show: false, query: '', isEdit: false });
      fetchComments();
    } catch (error) {
      alert("更新失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("確定要刪除這則留言嗎？")) return;
    try {
      await api.delete(`event-comments/${commentId}/`);
      fetchComments();
      onUpdate();
    } catch (error) {
      alert("刪除失敗");
    }
  };

  const handleCommentChange = (e, isEdit = false) => {
    const val = e.target.value;
    if (isEdit) setEditCommentContent(val);
    else setNewComment(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([^\s]*)$/);

    if (match) {
      setMentionDropdown({ show: true, query: match[1], isEdit });
    } else {
      setMentionDropdown({ show: false, query: '', isEdit });
    }
  };

  const insertMention = (nickname, isEdit = false) => {
    const currentVal = isEdit ? editCommentContent : newComment;
    const setter = isEdit ? setEditCommentContent : setNewComment;
    const match = currentVal.match(/@([^\s]*)$/);
    if (match) {
      const newVal = currentVal.slice(0, match.index) + `@${nickname} ` + currentVal.slice(match.index + match[0].length);
      setter(newVal);
    }
    setMentionDropdown({ show: false, query: '', isEdit: false });
  };

  const formatCommentContent = (content) => {
    const parts = content.split(/(@[^\s]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{part}</span>;
      }
      return part;
    });
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
              <button className={`${styles.navTab} ${activeTab === 'COMMENTS' ? styles.active : ''}`} onClick={() => setActiveTab('COMMENTS')}>交流留言 ({Math.max(comments.length, event.comment_count || 0)})</button>
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
            <div className={styles.commentsSection} onClick={() => setActiveMenuId(null)}>
              <div className={styles.commentInputBox} style={{ position: 'relative' }}>
                <textarea 
                  className={styles.commentInput}
                  placeholder="寫下你的心得或給主辦方的話... (輸入 @ 標記參與者)"
                  value={newComment}
                  onChange={(e) => handleCommentChange(e, false)}
                  rows={3}
                />
                <button 
                  className={`btn btn-primary ${styles.submitCommentBtn}`}
                  onClick={handlePostComment}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  <Send size={16} /> 留言
                </button>
                {mentionDropdown.show && !mentionDropdown.isEdit && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, width: '200px', maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    {mentionableUsers.filter(u => u.nickname.toLowerCase().includes(mentionDropdown.query.toLowerCase())).length === 0 && (
                      <div style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>找不到符合的參與者</div>
                    )}
                    {mentionableUsers.filter(u => u.nickname.toLowerCase().includes(mentionDropdown.query.toLowerCase())).map(u => (
                      <div 
                        key={u.campus_id} 
                        onClick={() => insertMention(u.nickname, false)}
                        style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        className="hover-bg-tertiary"
                      >
                        {u.nickname}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.commentsList}>
                {comments.length === 0 ? (
                  <div className={styles.emptyComments}>還沒有人留言，搶先第一位！</div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className={styles.commentItem}>
                      <div className={styles.commentHeader} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between' }}>
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (comment.user?.campus_id) setSelectedUserCampusId(comment.user.campus_id); 
                          }}
                        >
                          <div className="clickable-avatar" style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                            {comment.user?.avatar ? (
                              <img src={comment.user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              comment.user?.nickname ? comment.user.nickname.charAt(0).toUpperCase() : '?'
                            )}
                          </div>
                          <span className={`${styles.commentUser} hover-text-accent`} style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {comment.user?.nickname || '未知使用者'}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {comment.user_tag && (
                            <span className={`${styles.userTag} ${styles[comment.user_tag === '主辦方' ? 'tagHost' : comment.user_tag === '現場觀眾' ? 'tagAttendee' : 'tagFan']}`}>
                              {comment.user_tag}
                            </span>
                          )}
                          <span className={styles.commentTime}>{formatDate(comment.created_at)}</span>
                          
                          {(userProfile?.id === comment.user?.id || userProfile?.is_staff) && (
                            <div style={{ position: 'relative' }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === comment.id ? null : comment.id); }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                              >
                                <MoreVertical size={16} />
                              </button>
                              
                              {activeMenuId === comment.id && (
                                <div style={{ 
                                  position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                  borderRadius: '8px', overflow: 'hidden', zIndex: 10, minWidth: '100px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                }}>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingCommentId(comment.id); setEditCommentContent(comment.content); setActiveMenuId(null); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}
                                    className="hover-bg-tertiary"
                                  >
                                    <Edit2 size={14} /> 編輯
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); setActiveMenuId(null); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}
                                    className="hover-bg-tertiary"
                                  >
                                    <Trash2 size={14} /> 刪除
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {editingCommentId === comment.id ? (
                        <div style={{ marginTop: '12px', position: 'relative' }}>
                          <textarea 
                            value={editCommentContent}
                            onChange={(e) => handleCommentChange(e, true)}
                            style={{ width: '100%', minHeight: '60px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', resize: 'vertical', fontSize: '0.9rem' }}
                          />
                          {mentionDropdown.show && mentionDropdown.isEdit && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, width: '200px', maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                              {mentionableUsers.filter(u => u.nickname.toLowerCase().includes(mentionDropdown.query.toLowerCase())).length === 0 && (
                                <div style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>找不到符合的參與者</div>
                              )}
                              {mentionableUsers.filter(u => u.nickname.toLowerCase().includes(mentionDropdown.query.toLowerCase())).map(u => (
                                <div 
                                  key={u.campus_id} 
                                  onClick={() => insertMention(u.nickname, true)}
                                  style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                  className="hover-bg-tertiary"
                                >
                                  {u.nickname}
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditingCommentId(null); setMentionDropdown({ show: false, query: '', isEdit: false }); }} className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.85rem' }}>取消</button>
                            <button onClick={() => handleUpdateComment(comment.id)} className="btn btn-primary" disabled={isSubmitting} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>儲存</button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.commentContent} style={{ whiteSpace: 'pre-wrap' }}>
                          {formatCommentContent(comment.content)}
                        </div>
                      )}
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
