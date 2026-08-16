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

def get_review_carousel_flex(reviews, frontend_url):
    bubbles = []
    for r in reviews:
        content_str = str(r.content)[:50] + "..." if r.content and len(r.content) > 50 else r.content
        bubbles.append({
            "type": "bubble",
            "size": "micro",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": f"⭐ {r.rating} / 5",
                        "weight": "bold",
                        "color": "#FBBF24",
                        "size": "sm"
                    }
                ],
                "backgroundColor": "#111111"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": r.movie.title,
                        "weight": "bold",
                        "size": "md",
                        "wrap": True
                    },
                    {
                        "type": "text",
                        "text": content_str or "無內容",
                        "size": "xs",
                        "color": "#888888",
                        "wrap": True,
                        "margin": "md",
                        "maxLines": 3
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#8B5CF6",
                        "height": "sm",
                        "action": {
                            "type": "uri",
                            "label": "閱讀完整版",
                            "uri": f"{frontend_url}/movies/{r.movie.id}" if getattr(r, 'movie', None) else frontend_url
                        }
                    }
                ]
            }
        })
    
    if not bubbles:
        return None
        
    return {
        "type": "carousel",
        "contents": bubbles
    }

def get_events_list_flex(events):
    bubbles = []
    for e in events:
        time_str = e.event_time.strftime('%Y-%m-%d %H:%M')
        attendee_count = e.attendees.count() if hasattr(e, 'attendees') else 0
        bubbles.append({
            "type": "bubble",
            "size": "kilo",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "🎟️ 電影揪團",
                        "color": "#ffffff",
                        "weight": "bold",
                        "size": "sm"
                    }
                ],
                "backgroundColor": "#EC4899"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": e.title,
                        "weight": "bold",
                        "size": "lg",
                        "wrap": True
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "時間", "color": "#aaaaaa", "size": "sm", "flex": 2},
                                    {"type": "text", "text": time_str, "color": "#111111", "size": "sm", "flex": 5}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "地點", "color": "#aaaaaa", "size": "sm", "flex": 2},
                                    {"type": "text", "text": e.location, "color": "#111111", "size": "sm", "flex": 5}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "發起人", "color": "#aaaaaa", "size": "sm", "flex": 2},
                                    {"type": "text", "text": e.organizer_nickname, "color": "#111111", "size": "sm", "flex": 5}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "已參加", "color": "#aaaaaa", "size": "sm", "flex": 2},
                                    {"type": "text", "text": f"{attendee_count} 人", "color": "#111111", "size": "sm", "flex": 5}
                                ]
                            }
                        ]
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#111111",
                        "action": {
                            "type": "message",
                            "label": "我要加入！",
                            "text": f"加入揪團 {e.join_code}"
                        }
                    }
                ]
            }
        })
    if not bubbles:
        return None
    return {
        "type": "carousel",
        "contents": bubbles
    }

def get_event_success_flex(event):
    time_str = event.event_time.strftime('%Y-%m-%d %H:%M')
    return {
        "type": "bubble",
        "size": "mega",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "✅ 揪團建立成功",
                    "color": "#ffffff",
                    "weight": "bold",
                    "size": "lg"
                }
            ],
            "backgroundColor": "#1DB446"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": event.title,
                    "weight": "bold",
                    "size": "xl",
                    "wrap": True
                },
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "lg",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "box",
                            "layout": "baseline",
                            "spacing": "sm",
                            "contents": [
                                {"type": "text", "text": "時間", "color": "#aaaaaa", "size": "sm", "flex": 1},
                                {"type": "text", "text": time_str, "color": "#111111", "size": "sm", "flex": 4}
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "baseline",
                            "spacing": "sm",
                            "contents": [
                                {"type": "text", "text": "地點", "color": "#aaaaaa", "size": "sm", "flex": 1},
                                {"type": "text", "text": event.location, "color": "#111111", "size": "sm", "flex": 4}
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "baseline",
                            "spacing": "sm",
                            "contents": [
                                {"type": "text", "text": "代碼", "color": "#aaaaaa", "size": "sm", "flex": 1},
                                {"type": "text", "text": event.join_code, "weight": "bold", "color": "#EC4899", "size": "sm", "flex": 4}
                            ]
                        }
                    ]
                },
                {
                    "type": "text",
                    "text": "大家可以使用「近期活動」來查看你的揪團喔！",
                    "wrap": True,
                    "color": "#888888",
                    "size": "xs",
                    "margin": "xl"
                }
            ]
        }
    }

def get_auto_login_flex(url):
    return {
        "type": "bubble",
        "size": "kilo",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "🔗 網頁版自動登入",
                    "weight": "bold",
                    "size": "md",
                    "color": "#111111"
                },
                {
                    "type": "text",
                    "text": "點擊下方按鈕，即可直接前往網頁並自動登入您的帳號喔！",
                    "wrap": True,
                    "color": "#888888",
                    "size": "sm",
                    "margin": "md"
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#8B5CF6",
                    "action": {
                        "type": "uri",
                        "label": "點此前往網頁版",
                        "uri": url
                    }
                }
            ]
        }
    }

def get_speed_rate_genres_flex(genres_subset):
    bubbles = []
    for genre_id, genre_name in genres_subset:
        bubble = {
            "type": "bubble",
            "size": "micro",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": f"🎬 {genre_name}",
                        "weight": "bold",
                        "size": "sm",
                        "color": "#111111",
                        "align": "center"
                    }
                ],
                "paddingAll": "xl"
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#C084FC",
                        "height": "sm",
                        "action": {
                            "type": "postback",
                            "label": "開始評分",
                            "data": f"action=speed_rate_genre&genre_id={genre_id}"
                        }
                    }
                ],
                "paddingAll": "md"
            }
        }
        bubbles.append(bubble)
        
    return {
        "type": "carousel",
        "contents": bubbles
    }

def get_speed_rate_movie_flex(movie_data, genre_id):
    title = movie_data.get('title', '未知電影')
    poster = movie_data.get('poster_url') or "https://via.placeholder.com/500x750?text=No+Poster"
    
    return {
        "type": "bubble",
        "size": "mega",
        "hero": {
            "type": "image",
            "url": poster,
            "size": "full",
            "aspectRatio": "2:3",
            "aspectMode": "cover"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": title,
                    "weight": "bold",
                    "size": "xl",
                    "wrap": True
                },
                {
                    "type": "text",
                    "text": "請問你看過這部電影嗎？",
                    "size": "sm",
                    "color": "#888888",
                    "margin": "md"
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#1DB446",
                    "action": {
                        "type": "postback",
                        "label": "看過 (是)",
                        "data": f"action=speed_rate_yes&movie_title={title}"
                    },
                    "flex": 1
                },
                {
                    "type": "button",
                    "style": "secondary",
                    "action": {
                        "type": "postback",
                        "label": "沒看過 (否)",
                        "data": f"action=speed_rate_no&genre_id={genre_id}"
                    },
                    "flex": 1
                }
            ]
        }
    }
