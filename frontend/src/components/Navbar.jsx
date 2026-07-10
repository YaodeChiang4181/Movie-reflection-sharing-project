import { Link } from 'react-router-dom';
import { Film, User, Home, Search, CalendarDays } from 'lucide-react';
import styles from './Navbar.module.css';

function Navbar() {
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
        </div>

        <div className={styles.userActions}>
          <Link to="/profile" className={styles.profileBtn}>
            <User size={18} />
            <span>個人主頁</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
