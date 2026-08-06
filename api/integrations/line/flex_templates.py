def get_exp_feedback_flex(user, exp_gained, new_level, total_exp, movie_url=None):
    # A generic progress bar string (10 blocks)
    progress_ratio = total_exp % 100 / 100.0  # Assuming 100 EXP per level for now
    filled_blocks = int(progress_ratio * 10)
    empty_blocks = 10 - filled_blocks
    progress_bar = "█" * filled_blocks + "░" * empty_blocks
    
    contents = [
        {
            "type": "text",
            "text": "🎉 發布成功！",
            "weight": "bold",
            "color": "#1DB446",
            "size": "sm"
        },
        {
            "type": "text",
            "text": f"經驗值 +{exp_gained} EXP",
            "weight": "bold",
            "size": "xl",
            "margin": "md"
        },
        {
            "type": "separator",
            "margin": "xxl"
        },
        {
            "type": "box",
            "layout": "vertical",
            "margin": "xxl",
            "spacing": "sm",
            "contents": [
                {
                    "type": "text",
                    "text": f"目前等級：Lv.{new_level}",
                    "color": "#555555",
                    "size": "sm"
                },
                {
                    "type": "text",
                    "text": f"[{progress_bar}] {total_exp} EXP",
                    "color": "#111111",
                    "size": "sm",
                    "weight": "bold"
                }
            ]
        }
    ]
    
    if movie_url:
        contents.append({
            "type": "button",
            "style": "primary",
            "margin": "xl",
            "color": "#000000",
            "action": {
                "type": "uri",
                "label": "查看網頁版心得",
                "uri": movie_url
            }
        })
        
    return {
        "type": "bubble",
        "size": "mega",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": contents
        }
    }

def get_badge_unlocked_flex(badge_name, description, image_url=None):
    bubble = {
        "type": "bubble",
        "size": "mega",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "🏆 成就解鎖！",
                    "weight": "bold",
                    "color": "#F2A900",
                    "size": "sm"
                },
                {
                    "type": "text",
                    "text": f"【{badge_name}】",
                    "weight": "bold",
                    "size": "xl",
                    "margin": "md",
                    "wrap": True
                },
                {
                    "type": "text",
                    "text": description,
                    "color": "#555555",
                    "size": "sm",
                    "margin": "md",
                    "wrap": True
                }
            ]
        }
    }
    
    if image_url:
        bubble["hero"] = {
            "type": "image",
            "url": image_url,
            "size": "full",
            "aspectRatio": "20:13",
            "aspectMode": "cover"
        }
        
    return bubble
