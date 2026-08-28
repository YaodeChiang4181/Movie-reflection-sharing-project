import { useState, useEffect } from 'react';
import { X, Download, Users, UserCheck, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import styles from './AttendanceDashboard.module.css';
import HostQrProjectorModal from './HostQrProjectorModal';

function AttendanceDashboard({ event, onClose, inline = false }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [event.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/events/${event.id}/attendance_summary/`);
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch attendance summary', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.get(`/events/${event.id}/export_attendance/`, {
        responseType: 'blob', // Important for file download
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-report-${event.id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('匯出 CSV 失敗');
    }
  };

  if (isLoading || !data) {
    const loader = (
      <div className={inline ? '' : `glass ${styles.modal}`} onClick={e => e.stopPropagation()}>
        <p>載入數據中...</p>
      </div>
    );
    return inline ? loader : <div className={styles.overlay} onClick={onClose}>{loader}</div>;
  }

  const { total_capacity, total_registered, total_attended, attendance_rate, breakdown, attendee_list } = data;
  const ratePercentage = Math.round(attendance_rate * 100);

  const content = (
    <div className={inline ? '' : `glass ${styles.modal}`} onClick={e => e.stopPropagation()} style={inline ? { height: '100%', overflow: 'visible', padding: '0' } : {}}>
      <div className={styles.header}>
        <h2>📊 {event.title} - 數據看板</h2>
        {!inline && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        )}
      </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statTitle}>出席率</div>
              <div className={styles.statValue}>{ratePercentage}%</div>
              <div className={styles.statDesc}>實到 {total_attended} / {total_capacity > 0 ? `名額 ${total_capacity}` : '無上限'}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statTitle}>事前預約報到</div>
              <div className={styles.statValue}>{breakdown.pre_registered_attended} 人</div>
              <div className={styles.statDesc}>已預約但未到：{breakdown.no_show} 人</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statTitle}>現場空降 (Walk-in)</div>
              <div className={styles.statValue} style={{ color: 'var(--accent-secondary)' }}>{breakdown.walk_in_attended} 人</div>
              <div className={styles.statDesc}>佔總實到 {total_attended > 0 ? Math.round((breakdown.walk_in_attended / total_attended) * 100) : 0}%</div>
            </div>
          </div>

          <div className={styles.listSection}>
            <div className={styles.listHeader}>
              <h3>出席名單</h3>
              <div className={styles.listActions}>
                <button className={`btn btn-outline ${styles.iconBtn}`} onClick={fetchData} title="重新整理">
                  <RefreshCw size={16} />
                </button>
                <button className={`btn btn-primary ${styles.iconBtn}`} onClick={handleExportCsv} title="匯出 CSV">
                  <Download size={16} /> 匯出 CSV
                </button>
              </div>
            </div>
            
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>院系/職業</th>
                    <th>管道</th>
                    <th>狀態</th>
                    <th>簽到時間</th>
                  </tr>
                </thead>
                <tbody>
                  {attendee_list.length === 0 ? (
                    <tr>
                      <td colSpan="5" className={styles.emptyTable}>尚未有任何人報到</td>
                    </tr>
                  ) : (
                    attendee_list.map((attendee, index) => (
                      <tr key={index}>
                        <td>{attendee.name}</td>
                        <td>{attendee.department}</td>
                        <td>
                          <span className={`${styles.badge} ${attendee.type === 'WALK_IN' ? styles.badgeWalkin : styles.badgeOnline}`}>
                            {attendee.type === 'WALK_IN' ? '現場空降' : '線上預約'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${attendee.status === 'CHECKED_IN' ? styles.badgeSuccess : styles.badgePending}`}>
                            {attendee.status === 'CHECKED_IN' ? '已簽到' : '未到'}
                          </span>
                        </td>
                        <td>{attendee.checked_in_at ? new Date(attendee.checked_in_at).toLocaleTimeString('zh-TW') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return inline ? content : (
    <div className={styles.overlay} onClick={onClose}>
      {content}
    </div>
  );
}

export default AttendanceDashboard;
