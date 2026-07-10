import { useState } from 'react';
import { Star } from 'lucide-react';
import styles from './StarRating.module.css';

function StarRating({ maxStars = 5, initialRating = 0, onChange }) {
  const [rating, setRating] = useState(initialRating);
  const [hoverValue, setHoverValue] = useState(0);

  const handleClick = (value) => {
    setRating(value);
    if (onChange) onChange(value);
  };

  return (
    <div className={styles.starContainer} role="radiogroup" aria-label="評分">
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverValue || rating);
        
        return (
          <button
            key={starValue}
            type="button"
            className={`${styles.starBtn} ${isFilled ? styles.filled : ''}`}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => setHoverValue(starValue)}
            onMouseLeave={() => setHoverValue(0)}
            aria-label={`${starValue} 顆星`}
            aria-checked={rating === starValue}
            role="radio"
          >
            <Star 
              size={28} 
              fill={isFilled ? "currentColor" : "none"} 
              strokeWidth={isFilled ? 0 : 2}
            />
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
