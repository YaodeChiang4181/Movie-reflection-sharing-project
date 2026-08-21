import { useState, useEffect } from 'react';
import { Film } from 'lucide-react';

function TmdbPoster({ title, style }) {
  const [posterUrl, setPosterUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPoster = async () => {
      if (!title) {
        setIsLoading(false);
        return;
      }
      try {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY;
        if (!apiKey) {
          console.warn("VITE_TMDB_API_KEY is not set.");
          setIsLoading(false);
          return;
        }

        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=zh-TW`);
        const data = await res.json();
        
        if (data.results && data.results.length > 0 && data.results[0].poster_path) {
          setPosterUrl(`https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`);
        }
      } catch (error) {
        console.error("Failed to fetch TMDB poster:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoster();
  }, [title]);

  if (posterUrl) {
    return (
      <img 
        src={posterUrl} 
        alt={title} 
        style={{ ...style, objectFit: 'cover' }}
      />
    );
  }

  // Fallback placeholder
  return (
    <div style={{ ...style, backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Film size={24} style={{ color: 'var(--text-muted)' }} />
    </div>
  );
}

export default TmdbPoster;
