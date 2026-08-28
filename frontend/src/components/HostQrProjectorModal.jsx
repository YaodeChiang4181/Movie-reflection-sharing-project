import { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';
import styles from './HostQrProjectorModal.module.css';

function HostQrProjectorModal({ eventId, eventTitle, onClose }) {
  const [attendance, setAttendance] = useState({ total_attended: 0 });
  const checkInUrl = `${window.location.origin}/events/${eventId}/checkin`;

  useEffect(() => {
    // Initial fetch
    fetchAttendance();
    
    // Poll every 5 seconds
    const interval = setInterval(fetchAttendance, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const fetchAttendance = async () => {
    try {
      const response = await api.get(`/events/${eventId}/attendance_summary/`);
      setAttendance(response.data);
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    }
  };

  return (
    <div className={styles.projectorOverlay}>
      <button className={styles.closeBtn} onClick={onClose}>
        <X size={32} />
      </button>
      
      <div className={styles.projectorContent}>
        <h1 className={styles.title}>{eventTitle}</h1>
        <h2 className={styles.subtitle}>請掃描 QR Code 進行報到或現場空降！</h2>
        
        <div className={styles.qrWrapper}>
          <QRCodeSVG 
            value={checkInUrl} 
            size={400} 
            level="H"
            includeMargin={true}
            className={styles.qrCode}
          />
        </div>
        
        <div className={styles.statsContainer}>
          <Users size={32} />
          <div className={styles.statsText}>
            目前已簽到人數：<span className={styles.highlight}>{attendance.total_attended}</span> 人
          </div>
        </div>
      </div>
    </div>
  );
}

export default HostQrProjectorModal;
