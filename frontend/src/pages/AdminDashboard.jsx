import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldAlert, UserX, Trash2, X, RefreshCw } from 'lucide-react';
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

  useEffect(() => {
    if (!isLoggedIn || !userProfile?.is_staff) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [isLoggedIn, userProfile, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('admin/users/');
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
        await api.delete(`admin/users/${campus_id}/`);
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

  if (loading) return <div className={styles.container}>載入中...</div>;

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.header}>
        <ShieldAlert size={32} className={styles.headerIcon} />
        <h1 className={styles.title}>系統管理後台</h1>
        <p className={styles.subtitle}>帳戶剔除區與安全管理</p>
      </div>
      
      {error && <div className={styles.errorBox}>{error}</div>}

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
                <th>科系</th>
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
                    <td>{user.department || 'N/A'}</td>
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
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>目前沒有其他使用者。</td>
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
