import { useState } from 'react';
import { X, MapPin, User } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './ReviewForm.module.css'; // Reuse ReviewForm styles

function EventForm({ onClose, onEventAdded }) {
  const { userProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    organizer_nickname: userProfile?.nickname || '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.time || !formData.location || !formData.organizer_nickname) {
      setError('請填寫所有必填欄位');
      return;
    }

    // Combine date and time
    const eventTime = new Date(`${formData.date}T${formData.time}`);
    if (eventTime < new Date()) {
      setError('活動時間不能是過去的時間');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        title: formData.title,
        location: formData.location,
        organizer_nickname: formData.organizer_nickname,
        description: formData.description,
        event_time: eventTime.toISOString()
      };
      const response = await api.post('events/', payload);
      onEventAdded(response.data);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || '發起活動失敗，請檢查欄位格式。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}>
      <div className={`glass ${styles.formContainer}`} onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', padding: '30px', borderRadius: '16px', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
        <button className={styles.closeBtn} onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 className={styles.title} style={{ marginBottom: '20px', color: 'var(--accent-primary)' }}>發起電影揪團活動</h2>
        
        {error && <div className={styles.error} style={{ color: '#ff4444', marginBottom: '16px', padding: '10px', background: 'rgba(255,68,68,0.1)', borderRadius: '8px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.formGroup}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>活動名稱 *</label>
            <input 
              type="text" name="title" value={formData.title} onChange={handleChange} 
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} placeholder="例如：全面啟動 IMAX 揪團" required 
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>活動日期 *</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <input 
                  type="date" name="date" value={formData.date} onChange={handleChange} 
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '12px', outline: 'none' }} required 
                />
              </div>
            </div>
            
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>活動時間 *</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <input 
                  type="time" name="time" value={formData.time} onChange={handleChange} 
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '12px', outline: 'none' }} required 
                />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>影城地點 *</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
              <MapPin size={18} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" name="location" value={formData.location} onChange={handleChange} 
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '12px', outline: 'none' }} placeholder="例如：信義威秀影城" required 
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>主辦人代稱 *</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
              <User size={18} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" name="organizer_nickname" value={formData.organizer_nickname} onChange={handleChange} 
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '12px', outline: 'none' }} required 
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>活動簡介</label>
            <textarea 
              name="description" value={formData.description} onChange={handleChange} 
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', resize: 'vertical' }} placeholder="介紹一下這次的活動吧..." rows="4"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '8px', marginTop: '10px' }} disabled={isSubmitting}>
            {isSubmitting ? '發布中...' : '確認發起'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EventForm;
