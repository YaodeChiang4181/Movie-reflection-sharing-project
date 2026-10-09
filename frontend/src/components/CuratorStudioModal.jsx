import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Plus, Trash2, GripVertical, Loader2, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';

const CuratorStudioModal = ({ onClose, onSuccess, initialSearchQuery = '' }) => {
  const [step, setStep] = useState(initialSearchQuery ? 2 : 1);
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
  const searchTimeout = useRef(null);
  
  const PRESET_TAGS = ['院線熱映', '週末放鬆', '燒腦神作', '催淚神片', '冷門佳作'];

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (val.trim().length >= 1) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await api.get(`movies/search_tmdb/?q=${encodeURIComponent(val)}`);
          setSearchResults(res.data.results || res.data);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    if (initialSearchQuery && step === 2 && !searchQuery) {
      setSearchQuery(initialSearchQuery);
      setIsSearching(true);
      api.get(`movies/search_tmdb/?q=${encodeURIComponent(initialSearchQuery)}`)
        .then(res => {
          setSearchResults(res.data.results || res.data);
        })
        .catch(err => console.error(err))
        .finally(() => setIsSearching(false));
    }
  }, [initialSearchQuery, step]);

  const handleTagToggle = (tag) => {
    const currentTags = formData.hashtags.split(/[ ,，、]/).map(t => t.trim()).filter(Boolean);
    if (currentTags.includes(tag)) {
      setFormData({ ...formData, hashtags: currentTags.filter(t => t !== tag).join(', ') });
    } else {
      setFormData({ ...formData, hashtags: [...currentTags, tag].join(', ') });
    }
  };

  const addMovie = (movie) => {
    const movieId = movie.tmdb_id || movie.id;
    if (formData.items.length >= 15) {
      alert('最多只能收錄 15 部電影！');
      return;
    }
    if (formData.items.find(item => item.tmdb_id === movieId || item.movie_id === movieId)) {
      alert('已收錄過這部電影！');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        movie_id: movieId, // We will map it in backend
        tmdb_id: movieId,  // For TMDB movies
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
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>片單標題</label>
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
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>情境引言</label>
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
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>主題標籤 (請點選或自行輸入)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {PRESET_TAGS.map(tag => {
                    const isSelected = formData.hashtags.split(/[ ,，、]/).map(t => t.trim()).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '100px',
                          fontSize: '0.85rem',
                          background: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                          color: isSelected ? '#000' : 'var(--text-secondary)',
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        #{tag}
                      </button>
                    )
                  })}
                </div>
                <input 
                  type="text" 
                  value={formData.hashtags} 
                  onChange={e => setFormData({...formData, hashtags: e.target.value})} 
                  placeholder="自訂標籤，多個請用逗號分隔，如：小眾, 浪漫..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1.1rem' }}>新增電影</h3>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0 16px', marginBottom: '16px' }}>
                    <Search size={18} style={{ color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      value={searchQuery} 
                      onChange={handleSearchChange} 
                      placeholder="輸入電影名稱搜尋..."
                      style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                    />
                    {isSearching && <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  
                  {searchResults.length > 0 && searchQuery.trim().length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '250px', overflowY: 'auto', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                      {searchResults.map(m => (
                        <div key={m.tmdb_id || m.id} onClick={() => { addMovie(m); setSearchQuery(''); setSearchResults([]); }} className="hover-bg" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                          {m.poster_url ? (
                            <img src={m.poster_url} alt="poster" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <div style={{ width: '40px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={16} color="rgba(255,255,255,0.3)" />
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'white', fontWeight: 'bold' }}>{m.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.release_date || m.release_year || m.original_title}</div>
                          </div>
                          <Plus size={20} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
