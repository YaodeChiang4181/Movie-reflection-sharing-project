import React, { useState, useEffect } from 'react';
import { X, Star, ChevronRight, FastForward } from 'lucide-react';
import TmdbPoster from './TmdbPoster';
import api from '../api/axios';

const SpeedRatingModal = ({ onClose }) => {
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

  const handleRate = async (rating) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const movie = movies[currentIndex];
    
    try {
      await api.post('reviews/', {
        movie_title: movie.title,
        rating: rating,
        content: "",
        source: "WEB_SPEED"
      });
      
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
      <div className="glass" style={{ position: 'relative', width: '90%', maxWidth: '400px', padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
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
            <h3 style={{ marginBottom: '24px', fontSize: '1.5rem', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentMovie.title}
            </h3>
            
            <div style={{ marginBottom: '32px', position: 'relative' }}>
              <div style={{ transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.3s ease', transform: isSubmitting ? 'scale(0.8) translateY(-20px)' : 'scale(1)', opacity: isSubmitting ? 0 : 1 }}>
                <TmdbPoster title={currentMovie.title} style={{ width: '200px', height: '300px', borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }} />
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
                    color={hoveredStar >= star ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'}
                    fill={hoveredStar >= star ? 'var(--accent-primary)' : 'none'}
                  />
                </button>
              ))}
            </div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              點擊星星即可快速送出
            </p>
            
            <button 
              onClick={() => {
                if (currentIndex < movies.length - 1) {
                  setCurrentIndex(prev => prev + 1);
                  setHoveredStar(0);
                } else {
                  onClose();
                }
              }}
              style={{ marginTop: '24px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.95rem' }}
              className="btn-outline"
            >
              沒看過，跳過 <ChevronRight size={16} />
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
