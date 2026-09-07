import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="global-footer">
      <div className="container flex-center">
        <span style={{ marginRight: '10px' }}>LINE 機器人 / 聯絡我們：</span>
        <div style={{ display: 'flex', gap: '15px' }}>
          <a
            href="https://line.me/R/ti/p/@540xazyz?ts=08191530&oat_content=url"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LINE 官方帳號"
            className="social-link line-link hover-scale"
            title="綁定 LINE 機器人"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M22 10.5C22 5.8 17.5 2 12 2S2 5.8 2 10.5c0 4.2 3.8 7.7 8.7 8.3.4.1.9.2 1 .4.1.1.1.4.1.7l-.1 1.1c0 .2-.1.9.8.5.9-.4 4.8-2.8 6.6-4.8C20.9 14.8 22 12.8 22 10.5zm-14.8 2.2c0 .2-.2.4-.4.4H5.3c-.2 0-.4-.2-.4-.4V8.9c0-.2.2-.4.4-.4h.4c.2 0 .4.2.4.4v3h1.1c.2 0 .4.2.4.4v.4zm2.7 0c0 .2-.2.4-.4.4h-.4c-.2 0-.4-.2-.4-.4V8.9c0-.2.2-.4.4-.4h.4c.2 0 .4.2.4.4v3.8zm5.2 0c0 .1-.1.2-.2.3-.1.1-.2.1-.3.1h-.4c-.1 0-.3-.1-.3-.2l-2.1-2.9v2.6c0 .2-.2.4-.4.4h-.4c-.2 0-.4-.2-.4-.4V8.9c0-.2.2-.4.4-.4h.4c.1 0 .3.1.3.2l2.1 2.9V9c0-.2.2-.4.4-.4h.4c.2 0 .4.2.4.4v3.7z"/>
            </svg>
          </a>
          <a 
            href="mailto:pro.m1singliterature@gmail.com" 
            aria-label="聯絡我們 Email" 
            className="social-link gmail-link hover-scale"
            title="Gmail 聯絡我們"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
