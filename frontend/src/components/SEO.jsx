import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, keywords, name, type }) {
  const defaultTitle = '映後時光｜電影心得交流與揪團社群平台 - 尋找你的觀影同好';
  const defaultDescription = '映後時光是專為電影迷打造的社群平台。提供無雷影評與急速評星、主題策展片單、台灣串流平台（Netflix、Disney+、Apple TV+）哪裡看快速導覽，並透過「漂流瓶」獲取隨機電影推薦與發起觀影揪團活動，更整合 LINE Bot 機器人連動與遊戲化成就徽章，帶你輕鬆尋找志同道合的觀影同好！';
  const defaultKeywords = '映後時光,電影心得,影評,無雷心得,無雷影評,防雷標記,急速評星,電影評分,熱門電影推薦,主題策展片單,主題片單,電影策展,片單推薦,私房片單,電影清單,策展工作室,串流平台查詢,電影哪裡看,台灣串流,Netflix電影,Disney+,Apple TV+,漂流瓶推薦,電影漂流瓶,隨機電影,電影揪團,觀影揪團,看電影找伴,觀影成就徽章,影評經驗值,電影社群,觀影同好,LINE電影機器人,LINE Bot影評,After Credits Time';

  const seoTitle = title || defaultTitle;
  const seoDescription = description || defaultDescription;
  const seoKeywords = keywords || defaultKeywords;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{seoTitle}</title>
      <meta name='description' content={seoDescription} />
      <meta name='keywords' content={seoKeywords} />

      {/* Open Graph tags */}
      <meta property='og:title' content={seoTitle} />
      <meta property='og:description' content={seoDescription} />
      <meta property='og:type' content={type || 'website'} />
      <meta property='og:site_name' content='映後時光' />
      <meta property='og:locale' content='zh_TW' />

      {/* Twitter tags */}
      <meta name='twitter:creator' content={name || '映後時光'} />
      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:title' content={seoTitle} />
      <meta name='twitter:description' content={seoDescription} />
    </Helmet>
  );
}
