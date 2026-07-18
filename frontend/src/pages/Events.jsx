import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, AlignLeft, User } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import EventForm from '../components/EventForm';
import styles from './Events.module.css';

function Events() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('events/');
        // Handle paginated or direct array response
        setEvents(response.data.results || response.data);
      } catch (error) {
        console.error("Failed to fetch events", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleCreateEvent = () => {
    if (!isLoggedIn) {
      alert('請先登入後再發起揪團活動！');
      navigate('/auth');
      return;
    }
    setIsComposing(true);
  };

  const handleEventAdded = (newEvent) => {
    // Add new event to the list
    setEvents([newEvent, ...events]);
  };

  const handleJoinEvent = () => {
    if (!isLoggedIn) {
      alert('請先登入後再報名參加活動！');
      navigate('/auth');
      return;
    }
    alert('報名功能即將推出，敬請期待！');
  };

  return (
    <div className={`container ${styles.pageWrapper}`}>
      <header className={`flex-between ${styles.header}`}>
        <div>
          <h1 className={styles.title}>電影迷活動板</h1>
          <p className={styles.subtitle}>尋找志同道合的影迷，一起揪團看電影、討論劇情！</p>
        </div>
        <button className="btn-primary" onClick={handleCreateEvent}>發起活動</button>
      </header>

      {isComposing && (
        <EventForm 
          onClose={() => setIsComposing(false)} 
          onEventAdded={handleEventAdded} 
        />
      )}

      <div className={styles.eventList}>
        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
        ) : events.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>目前沒有任何活動，來發起第一場揪團吧！</p>
        ) : (
          events.map(event => (
            <div key={event.id} className={`glass ${styles.eventCard}`}>
              <h2 className={styles.eventTitle}>{event.title}</h2>
            
            <div className={styles.eventDetails}>
              <div className={styles.detailItem}>
                <Clock size={16} className={styles.icon} />
                <span>時間：{new Date(event.event_time).toLocaleString('zh-TW')}</span>
              </div>
              <div className={styles.detailItem}>
                <MapPin size={16} className={styles.icon} />
                <span>地點：{event.location}</span>
              </div>
              {event.description && (
                <div className={styles.detailItem} style={{ alignItems: 'flex-start' }}>
                  <AlignLeft size={16} className={styles.icon} style={{ marginTop: '4px' }} />
                  <span style={{ whiteSpace: 'pre-wrap' }}>{event.description}</span>
                </div>
              )}
            </div>
            
            <div className={styles.cardFooter}>
              <span className={styles.author} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} /> 發起人: {event.organizer_nickname}
              </span>
              <button className={styles.joinBtn} onClick={handleJoinEvent}>報名參加</button>
            </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Events;
