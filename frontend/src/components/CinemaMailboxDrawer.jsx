import React, { useState, useEffect, useRef } from 'react';
import { Mail, X, Send, ArrowLeft, Bell } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import ProgressiveBindingBanner from './ProgressiveBindingBanner';
import EmailBindModal from './EmailBindModal';

export default function CinemaMailboxDrawer({ isOpen, onClose, initialPartner = null }) {
  const { userProfile, setUnreadCount, messageCount, setMessageCount, notificationCount, setNotificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'notifications'
  
  // Messages state
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  
  // Notifications state
  const [notifications, setNotifications] = useState([]);
  // notificationUnreadCount is now managed by AuthContext
  
  const [isLoading, setIsLoading] = useState(false);
  const [isBindModalOpen, setIsBindModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const MAX_CHAR = 200;

  useEffect(() => {
    if (isOpen) {
      if (initialPartner) {
        setActivePartner(initialPartner);
        setActiveTab('messages');
      }
      fetchConversations();
      fetchNotifications();
    } else {
      setActivePartner(null);
    }
  }, [isOpen, initialPartner]);

  useEffect(() => {
    if (activePartner && activeTab === 'messages') {
      setMessages([]); // Clear previous messages while loading
      fetchMessages(activePartner.campus_id);
      markAsRead(activePartner.campus_id);
    }
  }, [activePartner, activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/messages/conversations/');
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      const dataList = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setNotifications(dataList);
      const unreadRes = await api.get('/notifications/unread_count/');
      setNotificationCount(unreadRes.data.notification_count || 0);
      setMessageCount(unreadRes.data.message_count || 0);
      setUnreadCount(unreadRes.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };
  
  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.post('/notifications/mark_all_read/');
      setNotificationCount(0);
      setUnreadCount(prev => Math.max(0, prev - notificationCount));
      setNotifications(notifications.map(n => ({...n, is_read: true})));
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  };

  const fetchMessages = async (partnerId) => {
    try {
      const res = await api.get(`/messages/?partner_id=${partnerId}`);
      const dataList = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setMessages([...dataList].reverse());
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const markAsRead = async (partnerId) => {
    try {
      await api.patch('/messages/mark-read/', { partner_id: partnerId });
      const conv = conversations.find(c => c.partner.campus_id === partnerId);
      if (conv && conv.unread_count > 0) {
        setMessageCount(prev => Math.max(0, prev - conv.unread_count));
        setUnreadCount(prev => Math.max(0, prev - conv.unread_count));
      }
      setConversations(prev => prev.map(c => 
        c.partner.campus_id === partnerId ? { ...c, unread_count: 0 } : c
      ));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleSend = async () => {
    if (!content.trim() || !activePartner) return;
    try {
      const res = await api.post('/messages/', {
        receiver_id: activePartner.campus_id,
        content: content.trim()
      });
      setContent('');
      setMessages([...messages, res.data]);
      fetchConversations();
    } catch (err) {
      console.error('Send error', err);
      alert('發送失敗');
    }
  };

  const openConversation = (partner) => {
    setActivePartner(partner);
  };

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '8px', padding: '0 20px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <button 
        onClick={() => { setActiveTab('messages'); setActivePartner(null); }}
        style={{
          background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer',
          color: activeTab === 'messages' ? 'white' : '#94a3b8',
          borderBottom: activeTab === 'messages' ? '2px solid #a855f7' : '2px solid transparent',
          fontWeight: activeTab === 'messages' ? 600 : 400,
          display: 'flex', alignItems: 'center', gap: '6px'
        }}
      >
        <Mail size={16} /> 訊息
        {messageCount > 0 && <span style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px' }}>{messageCount}</span>}
      </button>
      <button 
        onClick={() => { setActiveTab('notifications'); setActivePartner(null); handleMarkAllNotificationsRead(); }}
        style={{
          background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer',
          color: activeTab === 'notifications' ? 'white' : '#94a3b8',
          borderBottom: activeTab === 'notifications' ? '2px solid #a855f7' : '2px solid transparent',
          fontWeight: activeTab === 'notifications' ? 600 : 400,
          display: 'flex', alignItems: 'center', gap: '6px'
        }}
      >
        <Bell size={16} /> 通知
        {notificationCount > 0 && <span style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px' }}>{notificationCount}</span>}
      </button>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      <aside 
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: '400px',
          background: 'rgba(19, 23, 34, 0.95)', backdropFilter: 'blur(16px)', borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 1001, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', paddingBottom: activePartner ? '16px' : '4px', borderBottom: activePartner ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activePartner ? (
              <button onClick={() => setActivePartner(null)} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={20} />
              </button>
            ) : (
              <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>信箱與通知</h2>
            )}
            {activePartner && (
              <h2 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                {activePartner.nickname}
              </h2>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {!activePartner && renderTabs()}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {/* Progressive Binding Banner */}
          {!activePartner && userProfile && (
            <ProgressiveBindingBanner 
              isBound={userProfile.email_verified}
              onClick={() => {
                if (!userProfile.email_verified) setIsBindModalOpen(true);
              }} 
            />
          )}

          <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeTab === 'messages' && (
              !activePartner ? (
                // 對話列表
                isLoading ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>載入中...</div>
                ) : conversations.length === 0 ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>目前沒有對話紀錄</div>
                ) : (
                  conversations.map(conv => (
                    <div 
                      key={conv.partner.id}
                      onClick={() => openConversation(conv.partner)}
                      style={{ 
                        padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', 
                        borderRadius: '12px', cursor: 'pointer', transition: 'border 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e9d5ff' }}>{conv.partner.nickname}</span>
                          {conv.unread_count > 0 && (
                            <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }}></span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {new Date(conv.last_message.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.last_message.sender.id === userProfile.id ? '你: ' : ''}{conv.last_message.content}
                      </p>
                    </div>
                  ))
                )
              ) : (
                // 單一對話視窗
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {messages.map((msg) => {
                    const isMe = msg.sender.id === userProfile.id;
                    return (
                      <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                        <div style={{ 
                          background: isMe ? 'var(--accent-primary, #9333ea)' : 'rgba(255,255,255,0.1)', 
                          color: 'white', padding: '8px 12px', borderRadius: '12px', 
                          borderBottomRightRadius: isMe ? '4px' : '12px',
                          borderBottomLeftRadius: isMe ? '12px' : '4px',
                          fontSize: '0.875rem', lineHeight: 1.4
                        }}>
                          {msg.content}
                        </div>
                        <div style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )
            )}

            {activeTab === 'notifications' && !activePartner && (
              notifications.length === 0 ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>目前沒有新通知</div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id}
                    onClick={() => { if(notif.target_url) window.location.href = notif.target_url; }}
                    style={{ 
                      padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', 
                      borderRadius: '12px', cursor: notif.target_url ? 'pointer' : 'default', transition: 'border 0.2s',
                      opacity: notif.is_read ? 0.7 : 1
                    }}
                    onMouseOver={(e) => notif.target_url && (e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)')}
                    onMouseOut={(e) => notif.target_url && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ marginTop: '2px', color: notif.type === 'new_event' ? '#38bdf8' : '#a855f7' }}>
                        <Bell size={16} />
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#f8fafc', lineHeight: 1.4 }}>
                          {notif.title}
                        </p>
                        <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {activePartner && activeTab === 'messages' && (
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(13, 16, 23, 0.8)' }}>
            <div style={{ position: 'relative' }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHAR))}
                placeholder="最多 200 字以內的影迷交流..."
                rows={3}
                style={{ 
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '8px', padding: '12px', color: '#e2e8f0', fontSize: '0.75rem', resize: 'none', outline: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  {content.length} / {MAX_CHAR} 字
                </span>
                <button 
                  disabled={!content.trim()}
                  onClick={handleSend}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', 
                    background: content.trim() ? '#9333ea' : 'rgba(147, 51, 234, 0.4)', 
                    color: 'white', fontSize: '0.75rem', fontWeight: 500, borderRadius: '6px', 
                    border: 'none', cursor: content.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s'
                  }}
                >
                  <Send size={14} />
                  發送
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
      
      <EmailBindModal isOpen={isBindModalOpen} onClose={() => setIsBindModalOpen(false)} />
    </>
  );
}
