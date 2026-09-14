import React, { useState } from 'react';
import { Anchor, Search, Send, Map } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './DriftBottleModal.module.css';

function DriftBottleModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('pick'); // 'pick' | 'drop'
  const [isPicking, setIsPicking] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  
  // Pick State
  const [pickedBottle, setPickedBottle] = useState(null);
  const [pickError, setPickError] = useState('');
  
  // Drop State
  const [movieTitle, setMovieTitle] = useState('');
  const [message, setMessage] = useState('');
  const [dropSuccess, setDropSuccess] = useState(false);
  
  const { user } = useAuth();

  const handlePick = async () => {
    setIsPicking(true);
    setPickError('');
    setPickedBottle(null);
    try {
      const response = await api.get('/api/drift-bottles/pick/');
      setPickedBottle(response.data);
    } catch (err) {
      setPickError(err.response?.data?.error || '撈取失敗，請稍後再試。');
    } finally {
      setIsPicking(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (!movieTitle.trim()) {
      alert('請輸入推薦電影名稱！');
      return;
    }
    
    setIsDropping(true);
    try {
      await api.post('/api/drift-bottles/', {
        movie_title: movieTitle,
        message: message
      });
      setDropSuccess(true);
      setMovieTitle('');
      setMessage('');
      setTimeout(() => {
        setDropSuccess(false);
        setActiveTab('pick');
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.error || '發送失敗，請稍後再試。');
    } finally {
      setIsDropping(false);
    }
  };

  const resetState = () => {
    setPickedBottle(null);
    setPickError('');
    setMovieTitle('');
    setMessage('');
    setDropSuccess(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        
        <h2 className={styles.modalTitle}>
          <Anchor className={styles.titleIcon} size={24} />
          片單漂流瓶
        </h2>
        
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'pick' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('pick'); resetState(); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Search size={18} style={{ marginRight: '6px' }} /> 撈瓶子
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'drop' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('drop'); resetState(); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={18} style={{ marginRight: '6px' }} /> 丟瓶子
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'pick' && (
            <div className={styles.pickSection}>
              {!pickedBottle && !pickError && (
                <div className={styles.emptyState}>
                  <Map size={48} className={styles.emptyIcon} />
                  <p>未知的海域，充滿了未知的電影推薦。<br/>準備好撈起一份驚喜了嗎？</p>
                  <button 
                    className={styles.actionBtn} 
                    onClick={handlePick}
                    disabled={isPicking}
                  >
                    {isPicking ? '正在打撈中...' : '撈取漂流瓶'}
                  </button>
                </div>
              )}
              
              {pickError && (
                <div className={styles.errorState}>
                  <p className={styles.errorText}>{pickError}</p>
                  <button className={styles.actionBtn} onClick={handlePick}>再試一次</button>
                </div>
              )}
              
              {pickedBottle && (
                <div className={styles.bottleResult}>
                  <div className={styles.bottleHeader}>
                    <span className={styles.bottleSender}>來自 <strong>{pickedBottle.nickname}</strong> 的推薦</span>
                    <span className={styles.bottleDate}>{new Date(pickedBottle.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className={styles.bottleMovie}>
                    <h3>{pickedBottle.movie_title}</h3>
                  </div>
                  
                  {pickedBottle.message && (
                    <div className={styles.bottleMessage}>
                      <p>"{pickedBottle.message}"</p>
                    </div>
                  )}
                  
                  <div className={styles.bottleActions}>
                    <button className={styles.secondaryBtn} onClick={handlePick}>
                      再撈一個
                    </button>
                    {/* Optionally, you could provide a TMDB search link here based on movie_title */}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'drop' && (
            <div className={styles.dropSection}>
              {dropSuccess ? (
                <div className={styles.successState}>
                  <div className={styles.successIcon}>✨</div>
                  <h3>漂流瓶已順利丟入海中！</h3>
                  <p>感謝你的推薦，希望有緣人能撈起這份感動。</p>
                </div>
              ) : (
                <form onSubmit={handleDrop} className={styles.dropForm}>
                  <p className={styles.dropIntro}>把你的愛片裝進瓶中，讓緣分將它帶給另一位影迷。</p>
                  
                  <div className={styles.formGroup}>
                    <label>推薦電影名稱 <span className={styles.required}>*</span></label>
                    <div className={styles.inputWrapper}>
                      <Search className={styles.inputIcon} size={18} />
                      <input 
                        type="text" 
                        value={movieTitle}
                        onChange={e => setMovieTitle(e.target.value)}
                        placeholder="請輸入電影名稱..."
                        required
                        className={styles.textInput}
                      />
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>一句話推薦留言 (選填)</label>
                    <textarea 
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="想對撈到瓶子的人說些什麼呢？"
                      rows="4"
                      className={styles.textArea}
                    />
                  </div>
                  
                  <button type="submit" className={styles.submitBtn} disabled={isDropping}>
                    {isDropping ? '正在丟入海中...' : (
                      <><Send size={18} /> 丟出漂流瓶</>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DriftBottleModal;
