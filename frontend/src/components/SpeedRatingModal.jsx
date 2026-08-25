import React, { useState, useEffect } from 'react';
import { X, Star, ChevronRight, FastForward } from 'lucide-react';
import TmdbPoster from './TmdbPoster';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const SpeedRatingModal = ({ onClose }) => {
  const { fetchUserProfile } = useAuth();
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await api.get('movies/?page=1'); 
        const list = res.data.results || res.data;
        const shuffled = list.sort(() => 0.5 - Math.random());
        setMovies(shuffled);
      } catch (err) {
        console.error("Failed to load movies for speed rating", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMovies();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSubmitting || !movies[currentIndex]) return;
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        handleRate(parseInt(e.key));
      } else if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isSubmitting, movies]);

  const handleSkip = () => {
    if (currentIndex < movies.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setHoveredStar(0);
    } else {
      onClose();
    }
  };

  const handleRate = async (rating) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const movie = movies[currentIndex];
    
    try {
      await api.post('reviews/', {
        movie_title: movie.title,
        rating: rating,
        content: "來自急速評星的無內文評價", // 填補 Django 必填欄位
        source: "web", // 必須符合 Django choices ('web' 或 'line')
        tag_names: ["急速評星"]
      });
      
      fetchUserProfile(); // 及時更新 EXP
      
      setTimeout(() => {
        setIsSubmitting(false);
        if (currentIndex < movies.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setHoveredStar(0);
        } else {
          alert('太厲害了！您已經評完所有推薦電影！');
          onClose();
        }
      }, 500);
    } catch (err) {
      console.error(err);
      alert('評分失敗，請稍後再試。');
      setIsSubmitting(false);
    }
  };

  const currentMovie = movies[currentIndex];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(10px)', padding: '20px' }}>
      <div className="glass" style={{ position: 'relative', width: '100%', maxWidth: '400px', height: '85vh', maxHeight: '540px', overflow: 'hidden', padding: '24px 20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-secondary)' }}>
          <X size={24} />
        </button>
        
        <div style={{ marginBottom: '16px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FastForward size={24} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>急速評星</h2>
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)', margin: '40px 0' }}>尋找熱門電影中...</p>
        ) : currentMovie ? (
          <>
            <h3 style={{ marginBottom: '16px', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentMovie.title}
            </h3>
            
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <div style={{ transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.3s ease', transform: isSubmitting ? 'scale(0.8) translateY(-20px)' : 'scale(1)', opacity: isSubmitting ? 0 : 1 }}>
                <TmdbPoster title={currentMovie.title} style={{ width: '146px', height: '220px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }} />
              </div>
              
              {isSubmitting && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Star size={80} color="var(--accent-primary)" fill="currentColor" style={{ animation: 'pulse 0.5s ease infinite' }} />
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => handleRate(star)}
                  disabled={isSubmitting}
                  style={{ transition: 'transform 0.2s', transform: hoveredStar >= star ? 'scale(1.2)' : 'scale(1)' }}
                >
                  <Star 
                    size={36} 
                    color={hoveredStar >= star ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.35)'}
                    fill={hoveredStar >= star ? 'var(--accent-primary)' : 'none'}
                    style={{ filter: hoveredStar >= star ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' : 'none', transition: 'all 0.2s' }}
                  />
                </button>
              ))}
            </div>
            <p style={{ marginTop: '12px', marginBottom: '8px', color: '#64748B', fontSize: '12px' }}>
              點擊星星即可快速送出（支援快捷鍵 1~5）
            </p>
            
            <button 
              onClick={handleSkip}
              style={{ background: 'transparent', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', cursor: 'pointer', padding: '6px 12px', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = '#94A3B8'}
              onMouseLeave={(e) => e.target.style.color = '#64748B'}
            >
              沒看過，跳過 <ChevronRight size={16} style={{ pointerEvents: 'none' }} />
            </button>
          </>
        ) : (
          <p>沒有更多電影了</p>
        )}
      </div>
      <style>
        {`
          @keyframes scaleIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default SpeedRatingModal;
