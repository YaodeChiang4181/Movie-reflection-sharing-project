import { Link } from 'react-router-dom';
import { Film, User, Home, Search, CalendarDays } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Navbar.module.css';

function Navbar() {
  const { isLoggedIn, userProfile, logout } = useAuth();

  return (
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
          <Link to="/movies/1" className={styles.navLink}>
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
      </div>
    </nav>
  );
}

export default Navbar;
