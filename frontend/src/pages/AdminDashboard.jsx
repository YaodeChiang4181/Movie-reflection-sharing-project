import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldAlert, UserX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import styles from './AdminDashboard.module.css';

function AdminDashboard() {
  const { isLoggedIn, userProfile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}

export default AdminDashboard;
