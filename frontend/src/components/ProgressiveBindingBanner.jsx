import React from 'react';
import { Mail, ChevronRight } from 'lucide-react';

export default function ProgressiveBindingBanner({ onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        margin: '0 16px 16px 16px',
        padding: '12px 16px',
        background: 'linear-gradient(90deg, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.15) 100%)',
        border: '1px solid rgba(168,85,247,0.3)',
        borderRadius: '16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(168,85,247,0.2)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'rgba(168,85,247,0.2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Mail size={16} color="#e879f9" />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>
            💡 綁定常用信箱，解鎖每晚影迷日報！
          </h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#cbd5e1' }}>
            完成綁定即領 <strong style={{ color: '#e879f9' }}>+20 EXP</strong>
          </p>
        </div>
      </div>
      <ChevronRight size={18} color="#94a3b8" />
    </div>
  );
}
