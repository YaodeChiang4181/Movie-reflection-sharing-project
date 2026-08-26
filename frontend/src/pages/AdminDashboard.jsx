import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldAlert, UserX, Trash2, X, RefreshCw, Image, Link as LinkIcon, Upload, Activity, BarChart2, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import styles from './AdminDashboard.module.css';

function AdminDashboard() {
  const { isLoggedIn, userProfile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [deletedReviews, setDeletedReviews] = useState([]);
  
  // Advertisement states
  const [advertisements, setAdvertisements] = useState([]);
  const [adTitle, setAdTitle] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [adImage, setAdImage] = useState(null);
  const [adUploading, setAdUploading] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState(null);

  // System Tools states
  const [ghostId, setGhostId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [isToolRunning, setIsToolRunning] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !userProfile?.is_staff) {
      navigate('/');
      return;
    }
    fetchUsers();
    fetchAdvertisements();
    fetchStats();
  }, [isLoggedIn, userProfile, navigate]);

  const fetchStats = async () => {
    try {
      const res = await api.get('auth/admin/stats/');
      setStats(res.data);
    } catch(err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchAdvertisements = async () => {
    try {
      const response = await api.get('admin/advertisements/');
      setAdvertisements(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to fetch ads', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('auth/admin/users/');
      setUsers(response.data.results || response.data);
      setLoading(false);
    } catch (err) {
      setError('無法載入使用者清單。');
      setLoading(false);
    }
  };

  const handleKick = async (campus_id, nickname) => {
    if (window.confirm(`確定要徹底刪除使用者 ${nickname} (學號: ${campus_id}) 嗎？此操作無法復原。`)) {
      try {
        await api.delete(`auth/admin/users/${campus_id}/`);
        setUsers(users.filter(u => u.campus_id !== campus_id));
        alert(`已成功剔除使用者 ${nickname}`);
      } catch (err) {
        alert('剔除失敗，這可能是一名受保護的管理員或發生錯誤。');
      }
    }
  };

  const fetchDeletedReviews = async () => {
    try {
      const res = await api.get('reviews/deleted_reviews/');
      setDeletedReviews(res.data);
    } catch(err) {
      console.error(err);
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.post(`reviews/${id}/restore/`);
      setDeletedReviews(deletedReviews.filter(r => r.id !== id));
      alert('文章已成功復原！');
    } catch(err) {
      console.error(err);
      alert('復原失敗');
    }
  };

  const handleForceDelete = async (id) => {
    if (window.confirm("確定要永久刪除這篇文章嗎？此動作絕對無法復原。")) {
      try {
        await api.delete(`reviews/${id}/force_delete/`);
        setDeletedReviews(deletedReviews.filter(r => r.id !== id));
      } catch (err) {
        console.error(err);
        alert('刪除失敗');
      }
    }
  };

  const handleUploadAd = async (e) => {
    e.preventDefault();
    if (!adImage || !adTitle) {
      alert('請填寫標題並選擇圖片');
      return;
    }
    setAdUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', adTitle);
      formData.append('image', adImage);
      if (adUrl) formData.append('url', adUrl);
      
      await api.post('admin/advertisements/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('廣告上傳成功！');
      setAdTitle('');
      setAdUrl('');
      setAdImage(null);
      // clear file input
      document.getElementById('adImageInput').value = '';
      fetchAdvertisements();
    } catch (err) {
      console.error(err);
      alert('廣告上傳失敗');
    } finally {
      setAdUploading(false);
    }
  };

  const handleDeleteAd = async (id) => {
    if (window.confirm("確定要刪除這個廣告嗎？")) {
      try {
        await api.delete(`admin/advertisements/${id}/`);
        setAdvertisements(advertisements.filter(ad => ad.id !== id));
      } catch (err) {
        alert('刪除失敗');
      }
    }
  };

  const handleMergeGhost = async (e) => {
    e.preventDefault();
    if (!ghostId || !targetId) return;
    if (!window.confirm(`確定要將幽靈帳號 ${ghostId} 的所有資料合併到 ${targetId} 嗎？此操作無法復原！`)) return;
    
    setIsToolRunning(true);
    try {
      const res = await api.post('auth/admin/merge-ghost/', { ghost_id: ghostId, target_id: targetId });
      alert(`合併成功！\n轉移心得: ${res.data.merged_reviews}\n轉移留言: ${res.data.merged_comments}\n轉移活動: ${res.data.merged_events}`);
      setGhostId('');
      setTargetId('');
      fetchStats();
    } catch (err) {
      alert(`合併失敗: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsToolRunning(false);
    }
  };

  const handleRecalculateExp = async () => {
    if (!window.confirm('確定要重新計算全站使用者的經驗值嗎？這可能會花費一些時間。')) return;
    
    setIsToolRunning(true);
    try {
      const res = await api.post('auth/admin/recalculate-exp/');
      alert(`重新計算成功！共更新了 ${res.data.users_updated !== undefined ? res.data.users_updated : res.data.message} 位使用者的經驗值。`);
      fetchStats();
    } catch (err) {
      alert(`重新計算失敗: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsToolRunning(false);
    }
  };

  if (loading) return <div className={styles.container}>載入中...</div>;

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>系統管理後台</h1>
        <p className={styles.subtitle}>帳戶剔除區與安全管理</p>
      </div>
      
      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={`glass ${styles.card}`} style={{ marginBottom: '40px' }}>
        <div className={styles.cardHeader}>
          <Image size={20} />
          <h2>廣告投放區</h2>
        </div>
        
        <form onSubmit={handleUploadAd} className={styles.uploadForm}>
          <div className={styles.formGroup}>
            <label>廣告標題</label>
            <input 
              type="text" 
              value={adTitle} 
              onChange={e => setAdTitle(e.target.value)} 
              className={styles.formInput} 
              placeholder="輸入廣告標題"
              required 
            />
          </div>
          <div className={styles.formGroup}>
            <label>廣告連結 (選填)</label>
            <input 
              type="url" 
              value={adUrl} 
              onChange={e => setAdUrl(e.target.value)} 
              className={styles.formInput} 
              placeholder="https://..."
            />
          </div>
          <div className={styles.formGroup}>
            <label>上傳圖片</label>
            <input 
              id="adImageInput"
              type="file" 
              accept="image/*"
              onChange={e => setAdImage(e.target.files[0])} 
              className={styles.fileInput}
              required 
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={adUploading}>
            {adUploading ? '上傳中...' : <><Upload size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>新增廣告</>}
          </button>
        </form>

        <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '30px' }}>已上架廣告列表</h3>
        {advertisements.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>目前沒有任何廣告。</p>
        ) : (
          <div className={styles.adGrid}>
            {advertisements.map(ad => (
              <div key={ad.id} className={styles.adItem}>
                <img src={ad.image} alt={ad.title} className={styles.adImage} />
                <div className={styles.adInfo}>
                  <div className={styles.adTitle}>{ad.title}</div>
                  <div className={styles.adActions}>
                    {ad.url ? (
                      <a href={ad.url} target="_blank" rel="noreferrer" className={styles.adLink}>
                        <LinkIcon size={14} style={{display:'inline', marginRight:'4px', verticalAlign:'text-bottom'}}/> 
                        前往連結
                      </a>
                    ) : <span></span>}
                    <button onClick={() => handleDeleteAd(ad.id)} className={styles.deleteAdBtn}>
                      <Trash2 size={14} style={{display:'inline', marginRight:'4px', verticalAlign:'text-bottom'}}/> 
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`glass ${styles.card}`} style={{ marginBottom: '40px' }}>
        <div className={styles.cardHeader}>
          <ShieldAlert size={20} />
          <h2>系統維護工具 (System Tools)</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {/* Merge Ghost Account */}
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', margin: '0 0 15px 0' }}>合併幽靈帳號</h3>
            <form onSubmit={handleMergeGhost} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="幽靈帳號 ID (被合併者)"
                value={ghostId}
                onChange={(e) => setGhostId(e.target.value)}
                className={styles.formInput}
                required
                disabled={isToolRunning}
              />
              <input
                type="text"
                placeholder="目標帳號 ID (接收者)"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className={styles.formInput}
                required
                disabled={isToolRunning}
              />
              <button type="submit" className={styles.submitBtn} disabled={isToolRunning} style={{ background: '#ef4444' }}>
                {isToolRunning ? '處理中...' : '執行合併'}
              </button>
            </form>
          </div>

          {/* Recalculate EXP */}
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', margin: '0 0 15px 0' }}>重新計算全站經驗值</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>
              如果系統的經驗值規則有變更，或者發生資料不一致的問題，您可以點擊下方按鈕，系統會重新掃描所有文章並校正每位用戶的經驗值與等級。
            </p>
            <button onClick={handleRecalculateExp} className={styles.submitBtn} disabled={isToolRunning} style={{ background: '#10b981' }}>
              {isToolRunning ? '處理中...' : <><RefreshCw size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>一鍵重新校正</>}
            </button>
          </div>
        </div>
      </div>

      <div className={`glass ${styles.card}`} style={{ marginBottom: '40px' }}>
        <div className={styles.cardHeader}>
          <Activity size={20} />
          <h2>平台數據觀測</h2>
        </div>
        
        {stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>活躍比 (活躍用戶 / 註冊數)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                {stats.active_ratio}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {stats.active_users} / {stats.total_users} 人
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                *發布過心得且經驗值高於0
              </div>
            </div>

            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>使用比 (使用過 / 註冊數)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
                {stats.usage_ratio}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {stats.used_users} / {stats.total_users} 人
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                *經驗值高於0
              </div>
            </div>

            <div 
              style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'background 0.2s' }}
              className="hover-bg-tertiary"
              onClick={() => {
                alert(`【排除急速評星的總貼文分母作比率】\n${stats.text_engagement_ratio}% (${stats.engaged_text_posts} / ${stats.text_posts} 篇)\n\n【無篩選條件的總貼文分母比率】\n${stats.engagement_ratio}% (${stats.engaged_posts} / ${stats.total_posts} 篇)`);
              }}
              title="點擊查看詳細比率"
            >
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>活用比 (互動貼文 / 總貼文)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
                {stats.engagement_ratio}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {stats.engaged_posts} / {stats.total_posts} 篇
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                *收到評論、按讚或倒讚之貼文 (點擊看詳細)
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
        )}
      </div>

      <div className={`glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <Shield size={20} />
          <h2>帳戶剔除區</h2>
        </div>
        <p className={styles.warningText}>警告：以下操作將會連帶刪除該使用者的所有貼文與活動紀錄。</p>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>校園 ID (學號)</th>
                <th>公開暱稱</th>
                <th>真實姓名</th>
                <th>信箱</th>
                <th>身分類別</th>
                <th>註冊時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.campus_id}>
                    <td>{user.campus_id}</td>
                    <td>{user.nickname}</td>
                    <td>{user.real_name || 'N/A'}</td>
                    <td>{user.email || 'N/A'}</td>
                    <td>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: user.user_type === '校內' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                        color: user.user_type === '校內' ? '#22c55e' : '#fbbf24',
                        border: `1px solid ${user.user_type === '校內' ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`
                      }}>
                        {user.user_type || '未知'}
                      </span>
                    </td>
                    <td>{new Date(user.date_joined).toLocaleDateString('zh-TW')}</td>
                    <td>
                      <button 
                        onClick={() => handleKick(user.campus_id, user.nickname)}
                        className={styles.kickBtn}
                      >
                        <UserX size={16} /> 剔除
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>目前沒有其他使用者。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Button */}
      <button 
        onClick={() => { setShowTrashModal(true); fetchDeletedReviews(); }}
        style={{
          position: 'fixed', bottom: '40px', right: '40px',
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          color: 'white', padding: '12px 24px', borderRadius: '30px',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer', zIndex: 1000,
          backdropFilter: 'blur(5px)',
          transition: 'all 0.2s'
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 1)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.8)'}
      >
        <Trash2 size={20} /> 已刪除列表
      </button>

      {/* Trash Modal */}
      {showTrashModal && (
        <div style={trashOverlayStyle} onClick={() => setShowTrashModal(false)}>
          <div style={trashModalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4444', margin: 0 }}>
                <Trash2 size={24} /> 資源回收筒 (已刪除心得)
              </h2>
              <button onClick={() => setShowTrashModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            {deletedReviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>目前沒有已刪除的心得。</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {deletedReviews.map(r => (
                  <div key={r.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                      <h3 style={{ color: 'var(--accent-primary)', margin: 0, fontSize: '1.2rem' }}>{r.movie?.title}</h3>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleRestore(r.id)} style={restoreBtnStyle}>
                          <RefreshCw size={16}/> 復原
                        </button>
                        <button onClick={() => handleForceDelete(r.id)} style={forceDeleteBtnStyle}>
                          <Trash2 size={16}/> 永久刪除
                        </button>
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px', marginTop: '4px' }}>
                      作者: {r.user?.nickname} • 發表於 {new Date(r.created_at).toLocaleString('zh-TW')}
                    </p>
                    <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                      {r.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Styles for Trash UI
const trashOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(5px)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1001,
  padding: '20px'
};

const trashModalStyle = {
  background: '#1a1a2e',
  width: '100%', maxWidth: '800px', maxHeight: '85vh',
  borderRadius: '16px',
  padding: '32px',
  position: 'relative',
  overflowY: 'auto',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
};

const restoreBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '4px',
  background: 'transparent', border: '1px solid #10b981', color: '#10b981',
  padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
  transition: 'all 0.2s'
};

const forceDeleteBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '4px',
  background: 'transparent', border: '1px solid #ff4444', color: '#ff4444',
  padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
  transition: 'all 0.2s'
};

export default AdminDashboard;
