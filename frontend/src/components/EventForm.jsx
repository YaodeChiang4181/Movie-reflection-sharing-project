import { useState, useRef } from 'react';
import { X, MapPin, User, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './ReviewForm.module.css';

function EventForm({ onClose, onEventAdded, initialEvent = null }) {
  const { userProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: initialEvent?.title || '',
    date: initialEvent?.start_time ? new Date(initialEvent.start_time).toLocaleDateString('en-CA') : '',
    time: initialEvent?.start_time ? new Date(initialEvent.start_time).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : '',
    durationMins: initialEvent?.end_time && initialEvent?.start_time ? String(Math.round((new Date(initialEvent.end_time) - new Date(initialEvent.start_time))/60000)) : '120',
    location: initialEvent?.location || '',
    capacity: initialEvent?.capacity ? String(initialEvent.capacity) : '',
    organizer_nickname: initialEvent?.organizer_nickname || userProfile?.nickname || '',
    description: initialEvent?.description || '',
    requires_check_out: initialEvent?.requires_check_out || false,
    hours_tag: initialEvent?.hours_tag || ''
  });
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(initialEvent?.cover_image || null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
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

    if (!initialEvent && !coverImage) {
      setError('請上傳活動封面圖');
      return;
    }

    if (formData.description.trim().length < 15) {
      setError('活動簡介至少需要 15 個字，請提供足夠的活動資訊。');
      return;
    }

    if (!formData.capacity || parseInt(formData.capacity, 10) < 2 || parseInt(formData.capacity, 10) > 100) {
      setError('人數上限必須在 2 到 100 人之間');
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
      payload.append('requires_check_out', formData.requires_check_out);
      if (formData.hours_tag) {
        payload.append('hours_tag', formData.hours_tag);
      }
      if (coverImage) {
        payload.append('cover_image', coverImage);
      }

      let response;
      if (initialEvent) {
        response = await api.patch(`events/${initialEvent.id}/`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post('events/', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
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

        <h2 className={styles.title} style={{ marginBottom: '20px', color: 'var(--accent-primary)' }}>{initialEvent ? '編輯活動' : '發起電影揪團活動'}</h2>

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
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', outline: 'none', opacity: initialEvent ? 0.6 : 1 }} required
                disabled={!!initialEvent}
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>時間 *</label>
              <input
                type="time" name="time" value={formData.time} onChange={handleChange}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', outline: 'none', opacity: initialEvent ? 0.6 : 1 }} required
                disabled={!!initialEvent}
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>時長 (分鐘) *</label>
              <input
                type="number" name="durationMins" value={formData.durationMins} onChange={handleChange} min="10" max="600"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', outline: 'none', opacity: initialEvent ? 0.6 : 1 }} required
                disabled={!!initialEvent}
                placeholder="例如: 120"
              />
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
                type="number" name="capacity" value={formData.capacity} onChange={handleChange} min="2" max="100" placeholder="2~100" required
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', outline: 'none' }}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>主辦人代稱 *</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px', opacity: 0.6 }}>
              <User size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text" name="organizer_nickname" value={formData.organizer_nickname} onChange={handleChange}
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '12px', outline: 'none' }} required
                disabled
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>活動簡介 * (至少 15 字)</label>
            <textarea
              name="description" value={formData.description} onChange={handleChange} required minLength="15"
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', resize: 'vertical' }} placeholder="引導填寫「活動流程、選片理由、費用說明（如：低消一杯飲料）」" rows="4"
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Glassmorphism Toggle Switch */}
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '44px',
                height: '24px',
                cursor: 'pointer',
                flexShrink: 0
              }}>
                <input 
                  type="checkbox" 
                  name="requires_check_out" 
                  checked={formData.requires_check_out} 
                  onChange={handleChange} 
                  style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: formData.requires_check_out ? 'var(--accent-primary, #3b82f6)' : 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(4px)',
                  transition: '.4s',
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: formData.requires_check_out ? '22px' : '3px',
                    bottom: '2px',
                    backgroundColor: 'white',
                    transition: '.4s',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.95rem' }}>需要強制簽退 (適用於時數計算)</span>
              </div>
            </div>
            
            <div style={{ flex: '1 1 200px' }}>
              <input
                type="text"
                name="hours_tag"
                value={formData.hours_tag}
                onChange={handleChange}
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '8px', 
                  color: 'white', 
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  fontSize: '0.95rem'
                }}
                placeholder="時數標籤 (例如：服務學習、通識)"
                onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.12)'}
                onBlur={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '8px', marginTop: '10px' }} disabled={isSubmitting}>
            {isSubmitting ? (initialEvent ? '儲存中...' : '發布中...') : (initialEvent ? '儲存變更' : '確認發起')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EventForm;
