import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clapperboard, User, Home, Search, CalendarDays, Menu, X, Bell, Shield, Plus, ChevronDown, Edit3, Film } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CinemaMailboxDrawer from './CinemaMailboxDrawer';
import styles from './Navbar.module.css';

function Navbar() {
  const { isLoggedIn, userProfile, logout, unreadCount } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [mailboxPartner, setMailboxPartner] = useState(null);
  const [publishMenuOpen, setPublishMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    const handleOpenMailbox = (e) => {
      setIsMailboxOpen(true);
      if (e.detail) {
        setMailboxPartner(e.detail);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('open-mailbox', handleOpenMailbox);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('open-mailbox', handleOpenMailbox);
    };
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Top Navbar */}
      <nav className={`${styles.navbar} ${isScrolled ? styles.navbarScrolled : 'glass'}`} style={{ transition: 'all 0.3s ease' }}>
        <div className={`container flex-between ${styles.navContainer}`}>
          <Link to="/" className={styles.brand}>
            <Clapperboard className={styles.brandIcon} />
            <span>映後時光</span>
          </Link>

          <div className={styles.navLinks}>
            <Link to="/" className={styles.navLink}>
              <Home size={18} />
              <span>首頁</span>
            </Link>
            <Link to="/search" className={styles.navLink}>
              <Search size={18} />
              <span>電影心得搜尋</span>
            </Link>
            <Link to="/events" className={styles.navLink}>
              <CalendarDays size={18} />
              <span>活動牆</span>
            </Link>
            {userProfile?.is_staff && (
              <Link to="/admin" className={styles.navLink} style={{ color: '#F59E0B' }}>
                <Shield size={18} />
                <span>管理後台</span>
              </Link>
            )}
          </div>

          {/* Desktop user actions */}
          <div className={styles.userActions}>
            {isLoggedIn ? (
              <>
                <div className={styles.publishDropdownContainer} onMouseEnter={() => setPublishMenuOpen(true)} onMouseLeave={() => setPublishMenuOpen(false)}>
                  <button className={styles.publishBtn}>
                    <Plus size={16} />
                    <span>發布</span>
                    <ChevronDown size={14} />
                  </button>
                  {publishMenuOpen && (
                    <div className={`${styles.publishDropdown} glass`}>
                      <button onClick={() => window.dispatchEvent(new CustomEvent('open-review-form'))}>
                        <Edit3 size={16} /> 寫電影心得
                      </button>
                      <button onClick={() => window.dispatchEvent(new CustomEvent('open-event-form'))}>
                        <Film size={16} /> 發起放映活動
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setIsMailboxOpen(true)} 
                  className={styles.navLink} 
                  style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--danger-color, #ff4d4f)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <span className={styles.welcomeText}>Hi, {userProfile?.nickname}</span>
                <Link to="/profile" className={styles.profileBtn}>
                  <User size={18} />
                  <span>個人主頁</span>
                </Link>
                <button onClick={() => { logout(); }} className={styles.logoutBtn}>登出</button>
              </>
            ) : (
              <Link to="/auth" className={`btn-primary ${styles.loginBtn}`}>
                <User size={18} />
                <span>登入 / 註冊</span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger for user actions */}
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="選單"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile dropdown menu for user actions */}
        {mobileMenuOpen && (
          <div className={`${styles.mobileDropdown} glass`}>
            {isLoggedIn ? (
              <>
                <button
                  className={styles.mobileDropdownItem}
                  onClick={() => { setMobileMenuOpen(false); setIsMailboxOpen(true); }}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none' }}
                >
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span style={{ position: 'absolute', top: -4, right: -8, background: 'var(--danger-color, #ff4d4f)', color: 'white', borderRadius: '50%', padding: '1px 5px', fontSize: '0.6rem', fontWeight: 'bold' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span>信箱與通知</span>
                </button>
                <span className={styles.mobileWelcome}>Hi, {userProfile?.nickname}</span>
                <Link
                  to="/profile"
                  className={styles.mobileDropdownItem}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={18} />
                  <span>個人主頁</span>
                </Link>
                {userProfile?.is_staff && (
                  <Link
                    to="/admin"
                    className={styles.mobileDropdownItem}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#F59E0B' }}
                  >
                    <Shield size={18} />
                    <span>管理後台</span>
                  </Link>
                )}
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className={styles.mobileDropdownItem}
                  style={{ color: 'var(--danger)' }}
                >
                  登出
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className={styles.mobileDropdownItem}
                onClick={() => setMobileMenuOpen(false)}
              >
                <User size={18} />
                <span>登入 / 註冊</span>
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className={styles.mobileBottomBar}>
        <Link
          to="/"
          className={`${styles.bottomTab} ${isActive('/') ? styles.bottomTabActive : ''}`}
        >
          <Home size={22} />
          <span>心得</span>
        </Link>
        <Link
          to="/search"
          className={`${styles.bottomTab} ${isActive('/search') ? styles.bottomTabActive : ''}`}
        >
          <Search size={22} />
          <span>搜尋畫面</span>
        </Link>
        <Link
          to="/events"
          className={`${styles.bottomTab} ${isActive('/events') ? styles.bottomTabActive : ''}`}
        >
          <CalendarDays size={22} />
          <span>活動牆</span>
        </Link>
      </nav>

      {/* 影迷信箱側邊滑出抽屜 */}
      <CinemaMailboxDrawer 
        isOpen={isMailboxOpen} 
        onClose={() => setIsMailboxOpen(false)} 
        unreadCount={unreadCount} 
        initialPartner={mailboxPartner}
      />
    </>
  );
}

export default Navbar;
