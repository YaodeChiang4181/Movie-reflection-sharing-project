import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, name, type }) {
  const defaultTitle = '映後時光｜電影心得交流與揪團社群平台 - 尋找你的觀影同好';
  const defaultDescription = '映後時光是一個專為電影迷打造的社群平台。在這裡你可以分享無雷電影心得、快速評分、透過獨特的「漂流瓶」獲得隨機電影推薦，還能發起電影揪團，尋找一起看電影的同好！支援 LINE Bot 快速連動。';

  const seoTitle = title || defaultTitle;
  const seoDescription = description || defaultDescription;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{seoTitle}</title>
      <meta name='description' content={seoDescription} />
      
      {/* Open Graph tags */}
      <meta property='og:title' content={seoTitle} />
      <meta property='og:description' content={seoDescription} />
      <meta property='og:type' content={type || 'website'} />
      
      {/* Twitter tags */}
      <meta name='twitter:creator' content={name || '映後時光'} />
      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:title' content={seoTitle} />
      <meta name='twitter:description' content={seoDescription} />
    </Helmet>
  );
}
