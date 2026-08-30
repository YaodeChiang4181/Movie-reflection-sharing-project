import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Plus } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import EventForm from '../components/EventForm';
import EventFilterTabs from '../components/EventFilterTabs';
import EventCard from '../components/EventCard';
import EventDetailModal from '../components/EventDetailModal';
import styles from './Events.module.css';

function Events() {
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [isLoading, setIsLoading] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`events/?status=${activeTab}`);
      setEvents(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeTab]);

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

  return (
    <div className={`container ${styles.pageWrapper}`}>
      <header className={`flex-between ${styles.header}`}>
        <div>
          <h1 className={styles.title}>電影迷活動板</h1>
          <p className={styles.subtitle}>尋找志同道合的影迷，一起揪團看電影、討論劇情！</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateEvent} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> 發起活動
        </button>
      </header>

      <EventFilterTabs activeTab={activeTab} onTabChange={setActiveTab} />

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

      <div className={styles.eventGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
        ) : events.length === 0 ? (
          <div className="glass" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
            <Ticket size={64} style={{ color: 'var(--accent-primary)', marginBottom: '20px', opacity: 0.8 }} />
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>目前還沒有任何活動</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>來發起第一場揪團，尋找一起看電影的好夥伴吧！</p>
            <button className="btn btn-primary" onClick={handleCreateEvent} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
              <Plus size={18} /> 發起第一場觀影活動
            </button>
          </div>
        ) : (
          events.map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              onClick={() => handleEventClick(event)} 
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Events;
