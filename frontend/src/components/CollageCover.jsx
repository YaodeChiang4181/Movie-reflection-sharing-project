import React from 'react';
import { Film } from 'lucide-react';

const CollageCover = ({ posters, size = 'normal', className = '' }) => {
  // size can be 'small' (in search/profile), 'normal' (default), 'large' (detail page header)
  const getContainerSize = () => {
    switch(size) {
      case 'small': return 'w-24 h-36';
      case 'large': return 'w-48 h-72';
      case 'normal':
      default: return 'w-28 h-40';
    }
  };

  const displayPosters = (posters || []).filter(Boolean).slice(0, 4);

  return (
    <div className={`${getContainerSize()} rounded-xl overflow-hidden bg-white/10 border border-white/10 shadow-lg flex-shrink-0 ${className} relative`} style={{ display: 'flex', flexDirection: 'column' }}>
      {displayPosters.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center bg-[#1e1915]">
          <Film size={size === 'large' ? 48 : 24} className="text-white/20" />
        </div>
      ) : displayPosters.length === 1 ? (
        <img src={displayPosters[0]} alt="cover" className="w-full h-full object-cover" />
      ) : displayPosters.length === 2 ? (
        <div className="grid grid-cols-2 w-full h-full gap-[1px]">
          <img src={displayPosters[0]} alt="cover 1" className="w-full h-full object-cover" />
          <img src={displayPosters[1]} alt="cover 2" className="w-full h-full object-cover" />
        </div>
      ) : displayPosters.length === 3 ? (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-[1px]">
          <img src={displayPosters[0]} alt="cover 1" className="w-full h-full object-cover row-span-2" />
          <img src={displayPosters[1]} alt="cover 2" className="w-full h-full object-cover" />
          <img src={displayPosters[2]} alt="cover 3" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-[1px]">
          {displayPosters.map((src, idx) => (
            <img key={idx} src={src} alt={`cover ${idx}`} className="w-full h-full object-cover" />
          ))}
        </div>
      )}
      
      {/* 漸層疊加層，增加質感 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/5 pointer-events-none"></div>
    </div>
  );
};

export default CollageCover;
