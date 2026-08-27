import { useState, useRef } from 'react';
import { X, MapPin, User, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './ReviewForm.module.css';

function EventForm({ onClose, onEventAdded }) {
  const { userProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    durationMins: '120', // default 2 hours
    location: '',
    capacity: '',
    organizer_nickname: userProfile?.nickname || '',
    description: ''
  });
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('圖片大小不能超過 5MB');
        return;
      }
      setCoverImage(file);
      setCoverImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.time || !formData.location || !formData.organizer_nickname || !formData.description) {
      setError('請填寫所有必填欄位');
      return;
    }

    if (!coverImage) {
      setError('請上傳活動封面圖');
      return;
    }

    if (formData.description.trim().length < 15) {
      setError('活動簡介至少需要 15 個字，請提供足夠的活動資訊。');
      return;
    }

    if (!formData.capacity || parseInt(formData.capacity, 10) < 2 || parseInt(formData.capacity, 10) > 50) {
      setError('人數上限必須在 2 到 50 人之間');
      return;
    }

    const startTime = new Date(`${formData.date}T${formData.time}`);
    if (startTime < new Date()) {
      setError('活動時間不能是過去的時間');
      return;
    }

    const endTime = new Date(startTime.getTime() + (parseInt(formData.durationMins, 10) * 60 * 1000));

    setIsSubmitting(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('location', formData.location);
      payload.append('organizer_nickname', formData.organizer_nickname);
      payload.append('description', formData.description);
      payload.append('event_time', startTime.toISOString()); // For backward compatibility
      payload.append('start_time', startTime.toISOString());
      payload.append('end_time', endTime.toISOString());
      if (formData.capacity) {
        payload.append('capacity', parseInt(formData.capacity, 10));
      }
      if (coverImage) {
        payload.append('cover_image', coverImage);
      }

      const response = await api.post('events/', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
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

          <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', height: '160px', background: coverImagePreview ? `url(${coverImagePreview}) center/cover` : 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden' }}
            >
              {!coverImagePreview && (
                <>
                  <ImageIcon size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>點擊上傳活動封面照 *</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>(JPG/PNG/WebP，限制 5MB)</span>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>活動名稱 *</label>
            <input
              type="text" name="title" value={formData.title} onChange={handleChange}
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} placeholder="例如：全面啟動 IMAX 揪團" required
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>活動日期 *</label>
              <input
                type="date" name="date" value={formData.date} onChange={handleChange}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', outline: 'none' }} required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>時間 *</label>
              <input
                type="time" name="time" value={formData.time} onChange={handleChange}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', outline: 'none' }} required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>時長 *</label>
              <select
                name="durationMins" value={formData.durationMins} onChange={handleChange}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', outline: 'none', appearance: 'none' }} required
              >
                <option value="60" style={{ color: '#000' }}>1 小時 (60 mins)</option>
                <option value="90" style={{ color: '#000' }}>1.5 小時 (90 mins)</option>
                <option value="120" style={{ color: '#000' }}>2 小時 (120 mins)</option>
                <option value="150" style={{ color: '#000' }}>2.5 小時 (150 mins)</option>
                <option value="180" style={{ color: '#000' }}>3 小時 (180 mins)</option>
                <option value="240" style={{ color: '#000' }}>4 小時 (240 mins)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>地點 *</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
                <MapPin size={18} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text" name="location" value={formData.location} onChange={handleChange}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '12px', outline: 'none' }} placeholder="例如：信義威秀影城" required
                />
              </div>
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>人數上限 *</label>
              <input
                type="number" name="capacity" value={formData.capacity} onChange={handleChange} min="2" max="50" placeholder="2~50" required
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', outline: 'none' }}
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
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>活動簡介 * (至少 30 字)</label>
            <textarea
              name="description" value={formData.description} onChange={handleChange} required minLength="30"
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', resize: 'vertical' }} placeholder="引導填寫「活動流程、選片理由、費用說明（如：低消一杯飲料）」" rows="4"
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
