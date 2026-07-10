function Home() {
  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <header className="flex-between" style={{ marginBottom: '40px' }}>
        <h1>探索熱門電影心得</h1>
        <button className="btn-primary">發布心得</button>
      </header>
      
      <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          目前位於前端實作階段一：專案初始化與基礎設施。<br />
          全域 CSS 與深色玻璃擬態 (Glassmorphism) 設計已載入。
        </p>
      </div>
    </div>
  );
}

export default Home;
