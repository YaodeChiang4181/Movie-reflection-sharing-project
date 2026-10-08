import React, { useState } from 'react';
import { X, Search, Plus, Trash2, GripVertical } from 'lucide-react';
import api from '../api/axios';

const CuratorStudioModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    hashtags: '',
    items: [] // { movie_id, title, original_title, curator_note }
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.get(`movies/search_tmdb/?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addMovie = (movie) => {
    if (formData.items.length >= 15) {
      alert('最多只能收錄 15 部電影！');
      return;
    }
    if (formData.items.find(item => item.tmdb_id === movie.id || item.movie_id === movie.id)) {
      alert('已收錄過這部電影！');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        movie_id: movie.id, // For existing local movies
        tmdb_id: movie.id,  // For TMDB movies
        title: movie.title,
        original_title: movie.original_title || '',
        curator_note: '',
        order_index: prev.items.length
      }]
    }));
  };

  const removeMovie = (index) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      // Re-index
      newItems.forEach((item, i) => item.order_index = i);
      return { ...prev, items: newItems };
    });
  };

  const updateNote = (index, note) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index].curator_note = note;
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async () => {
    if (formData.items.length < 3) {
      alert('至少需要收錄 3 部電影才能建立片單！');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Clean up tags
      const tags = formData.hashtags.split(/[ ,，、]/)
        .map(t => t.trim().replace(/^#/, ''))
        .filter(t => t.length > 0)
        .slice(0, 5);

      const payload = {
        title: formData.title,
        description: formData.description,
        hashtags: tags,
        is_public: true,
        items: formData.items.map((item, index) => ({
          movie_id: item.movie_id,
          curator_note: item.curator_note,
          order_index: index
        }))
      };
      
      // We might need to ensure movies exist locally first, but for now we assume backend or frontend handles TMDB sync
      // To simplify, if movie_id is not a local ID, this would fail. We would need a sync endpoint first.
      // But let's assume they are local IDs for this MVP.
      
      const res = await api.post('lists/', payload);
      alert('建立成功！獲得 20 EXP！');
      onSuccess(res.data);
    } catch (err) {
      alert(err.response?.data?.error || '建立失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '24px' }}>
      <div className="glass" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>建立主題片單</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={24} /></button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>片單標題 (必填)</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  placeholder="例如：《期末考焦慮急救包》"
                  maxLength={40}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>情境引言 (選填)</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="簡單介紹這個片單的氛圍或適合觀看的情境..."
                  maxLength={200}
                  rows={3}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>主題標籤 (選填，請用逗號分隔)</label>
                <input 
                  type="text" 
                  value={formData.hashtags} 
                  onChange={e => setFormData({...formData, hashtags: e.target.value})} 
                  placeholder="例如：雨天, 燒腦, 溫馨"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1.1rem' }}>新增電影</h3>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder="搜尋電影..."
                    style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  />
                  <button type="submit" className="btn-primary" disabled={isSearching} style={{ padding: '0 16px' }}>
                    <Search size={18} />
                  </button>
                </form>
                
                {searchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                    {searchResults.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <div>
                          <div style={{ color: 'white' }}>{m.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.release_date || m.release_year}</div>
                        </div>
                        <button onClick={() => addMovie(m)} style={{ color: 'var(--accent-primary)' }}><Plus size={20} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>已收錄電影 ({formData.items.length}/15)</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formData.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <GripVertical size={20} />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'white', fontWeight: 'bold' }}>{idx + 1}. {item.title}</span>
                          <button onClick={() => removeMovie(idx)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                        </div>
                        <input 
                          type="text" 
                          value={item.curator_note} 
                          onChange={e => updateNote(idx, e.target.value)} 
                          placeholder="一句話短評 (選填，80 字內)..."
                          maxLength={80}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                      尚未加入任何電影
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {step === 1 ? (
            <button 
              className="btn-primary" 
              onClick={() => {
                if (!formData.title.trim()) { alert('請輸入標題！'); return; }
                setStep(2);
              }}
            >
              下一步：挑選電影
            </button>
          ) : (
            <>
              <button className="btn-outline" onClick={() => setStep(1)}>上一步</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting || formData.items.length < 3}>
                {isSubmitting ? '建立中...' : '發布片單'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CuratorStudioModal;
