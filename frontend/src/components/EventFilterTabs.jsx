import React from 'react';
import styles from './EventFilterTabs.module.css';

function EventFilterTabs({ activeTab, onTabChange }) {
  return (
    <div className={styles.tabsContainer}>
      <button 
        className={`${styles.tab} ${activeTab === 'UPCOMING' ? styles.active : ''}`}
        onClick={() => onTabChange('UPCOMING')}
      >
        即將舉辦
      </button>
      <button 
        className={`${styles.tab} ${activeTab === 'COMPLETED' ? styles.active : ''}`}
        onClick={() => onTabChange('COMPLETED')}
      >
        活動回顧
      </button>
    </div>
  );
}

export default EventFilterTabs;
