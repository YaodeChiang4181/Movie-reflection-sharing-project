import os
import sys
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
os.environ['DEBUG'] = 'True'

# 設置 Django
import django
from django.conf import settings

# 本地單元測試一律採用 SQLite 記憶體資料庫，隔離外部 Neon PostgreSQL 連線
settings.DATABASES['default'] = {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': ':memory:',
}

django.setup()

from django.core.management import call_command
# 建立測試資料庫結構
call_command('migrate', verbosity=0)

from unittest.mock import patch
from api.models import User, Review, Movie, Tag, LineBotState, UserProfile
from api.integrations.line.review_pipeline import (
    extract_quick_rating_intent,
    handle_stage_one_rating,
    handle_stage_two_content
)
from api.integrations.line.flex_templates import (
    get_stage_one_rating_flex,
    get_stage_two_completed_flex
)

def has_emoji(text):
    """
    檢查字串是否包含任何 Unicode Emoji (不誤判 CJK 中文字元)
    """
    if not isinstance(text, str):
        return False
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map
        "\U0001F1E6-\U0001F1FF"  # flags
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA70-\U0001FAFF"  # symbols & pictographs extended-a
        "\U00002700-\U000027BF"  # dingbats
        "\U00002600-\U000026FF"  # misc symbols
        "]+",
        flags=re.UNICODE
    )
    return bool(emoji_pattern.search(text))

def check_dict_for_emojis(data, path="root"):
    """
    遞迴檢查字典中所有字串是否包含 Emoji
    """
    violations = []
    if isinstance(data, dict):
        for k, v in data.items():
            violations.extend(check_dict_for_emojis(v, f"{path}.{k}"))
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            violations.extend(check_dict_for_emojis(item, f"{path}[{idx}]"))
    elif isinstance(data, str):
        if has_emoji(data):
            violations.append((path, data))
    return violations

def mock_get_or_create_movie(title):
    movie, _ = Movie.objects.get_or_create(
        title=title,
        defaults={
            'original_title': title,
            'director': '測試導演',
            'release_year': 2026,
            'poster_url': 'https://example.com/poster.jpg'
        }
    )
    return movie, False, ['科幻', '劇情']

def run_all_verifications():
    print("=" * 60)
    print("開始執行：LINE 兩階段評分管線與零 Emoji 規範驗證 (本地記憶體環境)")
    print("=" * 60)

    total_tests = 0
    passed_tests = 0

    # -------------------------------------------------------------
    # 測試項目 1：自然意圖解析器 (extract_quick_rating_intent)
    # -------------------------------------------------------------
    print("\n[測試 1] 自然評分意圖解析器測試")

    cases = [
        ("沙丘 5", ("沙丘", 5)),
        ("沙丘 5星", ("沙丘", 5)),
        ("奧本海默 4顆星", ("奧本海默", 4)),
        ("給 星際效應 5星", ("星際效應", 5)),
        ("阿凡達 打 3 分", ("阿凡達", 3)),
        ("阿凡達 評 4 星", ("阿凡達", 4)),
        ("查 奧本海默", (None, None)),
        ("/規則", (None, None)),
        ("近期活動", (None, None)),
        ("寫心得", (None, None)),
    ]

    for input_text, expected in cases:
        total_tests += 1
        m_title, m_score, _ = extract_quick_rating_intent(input_text)
        expected_title, expected_score = expected
        if m_title == expected_title and m_score == expected_score:
            print(f"  [PASS] 輸入「{input_text}」 -> 解析片名: {m_title}, 評分: {m_score}")
            passed_tests += 1
        else:
            print(f"  [FAIL] 輸入「{input_text}」 -> 預期: {expected}, 實際: ({m_title}, {m_score})")

    # 傳統多行格式測試
    total_tests += 1
    legacy_text = "#心得\n電影：教父\n評分：5\n心得：經典黑幫神作！"
    m_title, m_score, extra = extract_quick_rating_intent(legacy_text)
    if m_title == "教父" and m_score == 5 and extra and extra.get("content") == "經典黑幫神作！":
        print(f"  [PASS] 相容傳統多行 #心得 格式 -> 片名: {m_title}, 評分: {m_score}, 內文提取成功")
        passed_tests += 1
    else:
        print(f"  [FAIL] 傳統格式解析失敗 -> ({m_title}, {m_score}, {extra})")

    # -------------------------------------------------------------
    # 測試項目 2：第一階段急速評星與狀態機寫入
    # -------------------------------------------------------------
    print("\n[測試 2] 第一階段極速評星與狀態鎖定測試")

    test_line_id = "U_test_pipeline_user_999"
    user, _ = User.objects.get_or_create(
        campus_id="TESTUSER9",
        defaults={
            "line_user_id": test_line_id,
            "username": "TestCinephile"
        }
    )
    UserProfile.objects.get_or_create(user=user, defaults={"nickname": "測試影迷"})

    with patch('api.integrations.line.review_pipeline.get_or_create_movie', side_effect=mock_get_or_create_movie):
        total_tests += 1
        stage_one_msg = handle_stage_one_rating(user, test_line_id, "沙丘", 5)
        
        # 檢查資料庫 Review
        review = Review.objects.filter(user=user, movie__title="沙丘").first()
        state_rec = LineBotState.objects.filter(line_user_id=test_line_id).first()

        if review and review.rating == 5 and review.content == "" and state_rec.state == "WAITING_FOR_REVIEW_CONTENT":
            print(f"  [PASS] 成功建立急速評星紀錄：Review ID={review.id}, Rating={review.rating}, Content='{review.content}'")
            print(f"  [PASS] 狀態機已鎖定：State='{state_rec.state}', 暫存 Review ID={state_rec.data.get('review_id')}")
            passed_tests += 1
        else:
            print(f"  [FAIL] 第一階段資料庫驗證失敗")

    # -------------------------------------------------------------
    # 測試項目 3：第二階段自然語言追加心得與防雷標記
    # -------------------------------------------------------------
    print("\n[測試 3] 第二階段自然語言追加心得與防雷標記測試")

    total_tests += 1
    follow_up_text = "最後諾蘭把鏈式反應拍得太震撼了 #燒腦 #防雷"
    stage_two_msg = handle_stage_two_content(user, state_rec, follow_up_text)

    review.refresh_from_db()
    state_rec.refresh_from_db()

    has_shaonao_tag = review.tags.filter(name="燒腦").exists()

    if (
        review.content == "最後諾蘭把鏈式反應拍得太震撼了"
        and review.is_spoiler is True
        and has_shaonao_tag
        and state_rec.state == ""
    ):
        print(f"  [PASS] 內文自動合併成功：Content='{review.content}'")
        print(f"  [PASS] 防雷標記自動開啟：is_spoiler={review.is_spoiler}")
        print(f"  [PASS] 標籤解析收錄：包含 #燒腦 標籤={has_shaonao_tag}")
        print(f"  [PASS] 狀態機安全清空：State='{state_rec.state}'")
        passed_tests += 1
    else:
        print(f"  [FAIL] 第二階段資料更新驗證失敗: content='{review.content}', is_spoiler={review.is_spoiler}, state='{state_rec.state}'")

    # -------------------------------------------------------------
    # 測試項目 4：退出與保留評分測試
    # -------------------------------------------------------------
    print("\n[測試 4] 中途退出與評分安全保留測試")

    total_tests += 1
    with patch('api.integrations.line.review_pipeline.get_or_create_movie', side_effect=mock_get_or_create_movie):
        handle_stage_one_rating(user, test_line_id, "星際效應", 4)
    state_rec.refresh_from_db()
    
    # 使用者回傳「完成」或「取消」
    cancel_resp = handle_stage_two_content(user, state_rec, "完成")
    state_rec.refresh_from_db()
    interstellar_review = Review.objects.filter(user=user, movie__title="星際效應").first()

    if (
        state_rec.state == ""
        and interstellar_review is not None
        and interstellar_review.rating == 4
        and interstellar_review.content == ""
    ):
        print(f"  [PASS] 退出指令正確清空狀態，且評分完整保留：Rating={interstellar_review.rating}, Content='{interstellar_review.content}'")
        passed_tests += 1
    else:
        print(f"  [FAIL] 退出與保留評分測試失敗")

    # -------------------------------------------------------------
    # 測試項目 5：嚴格零 Emoji 規範驗證
    # -------------------------------------------------------------
    print("\n[測試 5] 嚴格零 Emoji (Zero Emoji) 規範驗證")

    total_tests += 1
    movie_obj = Movie.objects.filter(title="沙丘").first()
    flex_one = get_stage_one_rating_flex(movie_obj, 5, "https://example.com/liff")
    flex_two = get_stage_two_completed_flex(review, "沙丘", None, "https://example.com/movie")

    violations_one = check_dict_for_emojis(flex_one, "Stage_One_Flex")
    violations_two = check_dict_for_emojis(flex_two, "Stage_Two_Flex")
    all_violations = violations_one + violations_two

    if not all_violations:
        print(f"  [PASS] 第一階段 Flex 模板：零 Emoji 驗證通過")
        print(f"  [PASS] 第二階段 Flex 模板：零 Emoji 驗證通過")
        passed_tests += 1
    else:
        print(f"  [FAIL] 發現 Emoji 違規項目：")
        for path, val in all_violations:
            print(f"    路徑 {path}: '{val}'")

    # -------------------------------------------------------------
    # 總結報告
    # -------------------------------------------------------------
    print("\n" + "=" * 60)
    print(f"驗證結果：共 {total_tests} 項測試，通過 {passed_tests} 項，失敗 {total_tests - passed_tests} 項。")
    print("=" * 60)

    if passed_tests == total_tests:
        print("ALL VERIFICATIONS PASSED SUCCESSFULLY.")
        return 0
    else:
        print("VERIFICATION FAILURES DETECTED.")
        return 1

if __name__ == "__main__":
    exit_code = run_all_verifications()
    sys.exit(exit_code)
