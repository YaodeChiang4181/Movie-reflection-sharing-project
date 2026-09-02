import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './EventScan.module.css';

function EventScan() {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const actionType = searchParams.get('action') || 'checkin'; // 'checkin' or 'checkout'
  const navigate = useNavigate();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [checkInData, setCheckInData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Wait for auth context to initialize
    if (authLoading) return;

    // If not logged in, redirect to login with a return URL
    if (!isLoggedIn) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
      return;
    }

    const performAction = async () => {
      try {
        const endpoint = actionType === 'checkout' ? `/events/${id}/checkout/` : `/events/${id}/checkin/`;
        const response = await api.post(endpoint);
        setCheckInData(response.data);
        setStatus('success');
      } catch (err) {
        if (err.response?.status === 409) {
          setErrorMsg(err.response?.data?.detail || '現場名額已滿');
        } else {
          setErrorMsg(err.response?.data?.detail || (actionType === 'checkout' ? '簽退失敗' : '簽到失敗') + '，請稍後再試');
        }
        setStatus('error');
      }
    };

    performAction();
  }, [id, actionType, isLoggedIn, authLoading, navigate, location.pathname]);

  if (status === 'loading' || authLoading) {
    return (
      <div className={`container ${styles.wrapper}`}>
        <div className={`glass ${styles.ticketCard}`}>
          <Loader2 className={styles.spinner} size={48} />
          <h2 style={{ marginTop: '20px' }}>驗證身分中...</h2>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`container ${styles.wrapper}`}>
        <div className={`glass ${styles.ticketCard} ${styles.errorCard}`}>
          <AlertTriangle color="var(--danger)" size={64} />
          <h2 className={styles.errorTitle}>{actionType === 'checkout' ? '簽退失敗' : '簽到失敗'}</h2>
          <p className={styles.errorDesc}>{errorMsg}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>回首頁</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={`glass ${styles.ticketCard}`}>
        <div className={styles.ticketHeader}>
          <CheckCircle2 color="var(--success)" size={64} />
          <h2>{actionType === 'checkout' ? '簽退成功' : '簽到成功'}</h2>
          <p className={styles.timestamp}>
            {new Date(actionType === 'checkout' ? checkInData.checked_out_at : checkInData.checked_in_at).toLocaleString('zh-TW')}
          </p>
        </div>
        
        <div className={styles.ticketBody}>
          <div className={styles.infoRow}>
            <span className={styles.label}>活動名稱</span>
            <span className={styles.value}>{checkInData.event?.title}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>主辦人</span>
            <span className={styles.value}>{checkInData.event?.host_name}</span>
          </div>
          {actionType === 'checkin' && (
            <div className={styles.infoRow}>
              <span className={styles.label}>報到身分</span>
              <span className={styles.value}>
                {checkInData.type === 'WALK_IN_CHECKIN' ? '現場空降' : '線上預約'}
              </span>
            </div>
          )}
        </div>

        {checkInData.exp_awarded > 0 && actionType === 'checkin' && (
          <div className={styles.expBadge}>
            <span className={styles.expValue}>+{checkInData.exp_awarded} EXP</span>
            <span className={styles.expText}>經驗值已發放！</span>
          </div>
        )}
        
        <button className={`btn-primary ${styles.homeBtn}`} onClick={() => navigate('/')}>
          回首頁
        </button>
      </div>
    </div>
  );
}

export default EventScan;
