import React, { useState, useEffect, useRef } from 'react';
import { Mail, X, Send, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

export default function CinemaMailboxDrawer({ isOpen, onClose, unreadCount = 0, initialPartner = null }) {
  const { userProfile, setUnreadCount } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const MAX_CHAR = 200;

  useEffect(() => {
    if (isOpen) {
      if (initialPartner) {
        setActivePartner(initialPartner);
      }
      fetchConversations();
    } else {
      setActivePartner(null);
    }
  }, [isOpen, initialPartner]);

  useEffect(() => {
    if (activePartner) {
      setMessages([]); // Clear previous messages while loading
      fetchMessages(activePartner.id);
      markAsRead(activePartner.id);
    }
  }, [activePartner]);

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

  const fetchMessages = async (partnerId) => {
    try {
      const res = await api.get(`/messages/?partner_id=${partnerId}`);
      setMessages(res.data.reverse()); // order chronologically for chat
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const markAsRead = async (partnerId) => {
    try {
      await api.patch('/messages/mark-read/', { partner_id: partnerId });
      // Update global unread count
      setUnreadCount(prev => Math.max(0, prev - (conversations.find(c => c.partner.id === partnerId)?.unread_count || 0)));
      // Update local state
      setConversations(prev => prev.map(c => 
        c.partner.id === partnerId ? { ...c, unread_count: 0 } : c
      ));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleSend = async () => {
    if (!content.trim() || !activePartner) return;
    try {
      const res = await api.post('/messages/', {
        receiver_id: activePartner.id,
        content: content.trim()
      });
      setContent('');
      setMessages([...messages, res.data]);
      fetchConversations(); // refresh latest message in list
    } catch (err) {
      console.error('Send error', err);
      alert('發送失敗');
    }
  };

  const openConversation = (partner) => {
    setActivePartner(partner);
  };

  return (
    <>
      {/* 背景遮罩 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      {/* 右側滑出抽屜 */}
      <aside 
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: '400px',
          background: 'rgba(19, 23, 34, 0.95)', backdropFilter: 'blur(16px)', borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 1001, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        {/* 頂部欄位 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activePartner ? (
              <button onClick={() => setActivePartner(null)} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={20} />
              </button>
            ) : (
              <Mail size={20} color="#a78bfa" />
            )}
            <h2 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 600 }}>
              {activePartner ? activePartner.nickname : '影迷信箱'}
            </h2>
            {!activePartner && unreadCount > 0 && (
              <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '9999px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                {unreadCount} 未讀
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* 訊息內容列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!activePartner ? (
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
                      background: isMe ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', 
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
          )}
        </div>

        {/* 底部輸入框 */}
        {activePartner && (
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(13, 16, 23, 0.8)' }}>
            <div style={{ position: 'relative' }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHAR))}
                placeholder="發送 200 字以內的影迷交流..."
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
    </>
  );
}
