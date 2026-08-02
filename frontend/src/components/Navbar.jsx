import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, User, Home, Search, CalendarDays, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Navbar.module.css';

function Navbar() {
  const { isLoggedIn, userProfile, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Top Navbar */}
      <nav className={`${styles.navbar} glass`}>
        <div className={`container flex-between ${styles.navContainer}`}>
          <Link to="/" className={styles.brand}>
            <Film className={styles.brandIcon} />
            <span>影像製作所</span>
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
              <span>電影迷活動板</span>
            </Link>
            {userProfile?.is_staff && (
              <Link to="/admin" className={styles.navLink} style={{ color: '#ff4d4f' }}>
                管理後台
              </Link>
            )}
          </div>

          {/* Desktop user actions */}
          <div className={styles.userActions}>
            {isLoggedIn ? (
              <>
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
                    style={{ color: '#ff4d4f' }}
                  >
                    管理後台
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
          <span>建立活動</span>
        </Link>
      </nav>
    </>
  );
}

export default Navbar;
