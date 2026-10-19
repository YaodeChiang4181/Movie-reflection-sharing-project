/**
 * 解碼 HTML 實體字符（如 &amp; 轉為 &, &quot; 轉為 ", &#39; 轉為 ' 等）
 * 確保任何經後端消毒或歷史轉義的字串在 UI 渲染時呈現為原始正確符號。
 *
 * @param {string} str - 待解碼字串
 * @returns {string} - 解碼後的純文字
 */
export function decodeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  let res = str;
  // 最多還原 2 次，防範被雙重轉義（Double-escaped，如 &amp;amp;）
  for (let i = 0; i < 2; i++) {
    if (!res.includes('&')) break;
    res = res
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }
  return res;
}
