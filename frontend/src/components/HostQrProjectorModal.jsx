import { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, QrCode, Smartphone, Info, MapPin, Search, Ticket, Monitor, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';
import styles from './HostQrProjectorModal.module.css';

function HostQrProjectorModal({ eventId, eventTitle, onClose }) {
  const [attendance, setAttendance] = useState({ total_attended: 0, total_capacity: 0 });
  const [prevAttended, setPrevAttended] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const checkInUrl = `${window.location.origin}/events/${eventId}/checkin`;

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const fetchAttendance = async () => {
    try {
      const response = await api.get(`/events/${eventId}/attendance_summary/`);
      setAttendance(prev => {
        if (response.data.total_attended > prev.total_attended) {
          setIsPulsing(true);
          setTimeout(() => setIsPulsing(false), 2000);
        }
        return response.data;
      });
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-gen');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${eventTitle}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } else {
       // if SVG is used, we can convert to canvas or download SVG
       const svg = document.getElementById('qr-svg');
       if (svg) {
         const svgData = new XMLSerializer().serializeToString(svg);
         const canvas = document.createElement('canvas');
         const ctx = canvas.getContext('2d');
         const img = new Image();
         img.onload = () => {
           canvas.width = img.width;
           canvas.height = img.height;
           ctx.drawImage(img, 0, 0);
           const pngFile = canvas.toDataURL('image/png');
           const downloadLink = document.createElement('a');
           downloadLink.download = `QR_${eventTitle}.png`;
           downloadLink.href = `${pngFile}`;
           downloadLink.click();
         };
         img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
       }
    }
  };

  return (
    <div className={styles.projectorOverlay}>
      <div className={styles.projectorCard}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>

        <div className={styles.cardHeader}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Ticket size={24} /> 現場放映專場簽到</h2>
          <p>請掃描 QR Code 進行報到或現場空降！</p>
        </div>
        
        <div className={styles.qrContainer}>
          <div className={styles.qrInner}>
            <QRCodeSVG 
              id="qr-svg"
              value={checkInUrl} 
              size={240} 
              level="H"
              includeMargin={false}
              className={styles.qrCode}
            />
          </div>
        </div>
        
        <div className={styles.statsContainer}>
          <div className={`${styles.statsLive} ${isPulsing ? styles.pulse : ''}`}>
            <div className={styles.statsLiveInner}>
              <span className={styles.liveDot}></span> 目前實到： {attendance.total_attended} / {attendance.total_capacity > 0 ? attendance.total_capacity : '無上限'} 席
              <span className={styles.updateText}>(即時更新中)</span>
            </div>
            <div className={styles.progressBarWrapper}>
              <div 
                className={styles.progressBarFill} 
                style={{ 
                  width: `${attendance.total_capacity > 0 ? Math.min((attendance.total_attended / attendance.total_capacity) * 100, 100) : 0}%`, 
                  minWidth: attendance.total_attended > 0 ? '5%' : '0%'
                }}
              />
            </div>
          </div>
        </div>
        
        <div className={styles.actionButtons}>
          <button className={styles.btnGhost} onClick={toggleFullscreen} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <Monitor size={18} /> {isFullscreen ? '退出全螢幕投影' : '切換全螢幕投影'}
          </button>
          <button className={styles.btnPrimary} onClick={downloadQR} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <Download size={18} /> 下載 QR 圖片
          </button>
        </div>
      </div>
    </div>
  );
}

export default HostQrProjectorModal;
