import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="global-footer">
      <div className="container flex-center">
        <span>聯絡我們：</span>
        <a 
          href="mailto:pro.m1singliterature@gmail.com" 
          aria-label="聯絡我們 Email" 
          className="gmail-link hover-scale"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
