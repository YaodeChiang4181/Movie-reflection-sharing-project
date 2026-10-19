import html
import bleach


def sanitize_plain_text(value: str) -> str:
    """
    清理並過濾使用者輸入的純文字欄位：
    1. 移除惡意 HTML/JavaScript 標籤（如 <script>、<iframe>、<a> 等）。
    2. 還原 bleach.clean 自動產生的 HTML 實體轉義（如 &amp; -> &, &quot; -> ", &#39; -> ' 等）。
    確保儲存至資料庫的為安全的原始純文字，不會破壞正常的自然語言符號。
    """
    if not value or not isinstance(value, str):
        return '' if value is None else value

    # 1. 徹底去除所有 HTML 標籤
    cleaned = bleach.clean(value, tags=[], attributes={}, strip=True).strip()

    # 2. 將 HTML 實體編碼還原為真正的人類可讀字元
    return html.unescape(cleaned)
