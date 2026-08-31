import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Plus } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import EventForm from '../components/EventForm';
import EventCard from '../components/EventCard';
import EventDetailModal from '../components/EventDetailModal';
import styles from './Events.module.css';

function Events() {
  const [eventCategories, setEventCategories] = useState({
    '開放報名': [],
    '即將額滿': [],
    '已額滿': [],
    '活動回顧': [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const [upcomingRes, completedRes] = await Promise.all([
        api.get(`events/?status=UPCOMING`),
        api.get(`events/?status=COMPLETED`)
      ]);
      const upcomingEvents = upcomingRes.data.results || upcomingRes.data || [];
      const completedEvents = completedRes.data.results || completedRes.data || [];

      const categorized = {
        '開放報名': [],
        '即將額滿': [],
        '已額滿': [],
        '活動回顧': completedEvents,
      };

      upcomingEvents.forEach(event => {
        const isFull = event.capacity > 0 && event.registered_count >= event.capacity;
        const isAlmostFull = !isFull && event.capacity > 0 && (event.capacity - event.registered_count <= 2);
        
        if (isFull) {
          categorized['已額滿'].push(event);
        } else if (isAlmostFull) {
          categorized['即將額滿'].push(event);
        } else {
          categorized['開放報名'].push(event);
        }
      });

      setEventCategories(categorized);
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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

  const handleEventAdded = () => {
    fetchEvents();
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const hasAnyEvents = Object.values(eventCategories).some(category => category.length > 0);

  return (
    <div className={`container ${styles.pageWrapper}`}>
      <header className={`flex-between ${styles.header}`}>
        <div>
          <h1 className={styles.title}>活動牆</h1>
          <p className={styles.subtitle}>尋找志同道合的影迷，一起揪團看電影、討論劇情！</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateEvent} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> 發起活動
        </button>
      </header>

      {isComposing && (
        <EventForm 
          onClose={() => setIsComposing(false)} 
          onEventAdded={handleEventAdded} 
        />
      )}

      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)}
          onUpdate={fetchEvents}
        />
      )}

      <div className={styles.tracksContainer}>
        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
        ) : !hasAnyEvents ? (
          <div className="glass" style={{ padding: '60px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
            <Ticket size={64} style={{ color: 'var(--accent-primary)', marginBottom: '20px', opacity: 0.8 }} />
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>目前還沒有任何活動</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>來發起第一場揪團，尋找一起看電影的好夥伴吧！</p>
            <button className="btn btn-primary" onClick={handleCreateEvent} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
              <Plus size={18} /> 發起第一場觀影活動
            </button>
          </div>
        ) : (
          Object.entries(eventCategories).map(([categoryName, events]) => {
            if (events.length === 0) return null;
            return (
              <div key={categoryName} className={styles.trackSection}>
                <h2 className={styles.trackTitle}>{categoryName}</h2>
                <div className={styles.carouselTrack}>
                  {events.map(event => (
                    <div key={event.id} className={styles.cardWrapper}>
                      <EventCard 
                        event={event} 
                        onClick={() => handleEventClick(event)} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Events;
