def get_exp_feedback_flex(user, exp_gained, new_level, total_exp, movie_url=None):
    progress_ratio = total_exp % 100 / 100.0
    filled_blocks = int(progress_ratio * 10)
    empty_blocks = 10 - filled_blocks
    progress_bar = "■" * filled_blocks + "□" * empty_blocks
    
    contents = [
        {
            "type": "text",
            "text": "ARCHIVED / 心得已收錄",
            "weight": "bold",
            "color": "#C5A059",
            "size": "xs"
        },
        {
            "type": "text",
            "text": f"經驗值 +{exp_gained} EXP",
            "weight": "bold",
            "size": "xl",
            "color": "#F0F0F0",
            "margin": "md"
        },
        {
            "type": "separator",
            "margin": "lg",
            "color": "#262626"
        },
        {
            "type": "box",
            "layout": "vertical",
            "margin": "lg",
            "spacing": "sm",
            "contents": [
                {
                    "type": "text",
                    "text": f"目前等級：Lv.{new_level}",
                    "color": "#888888",
                    "size": "sm"
                },
                {
                    "type": "text",
                    "text": f"[{progress_bar}] {total_exp} EXP",
                    "color": "#E0E0E0",
                    "size": "sm",
                    "weight": "bold"
                }
            ]
        }
    ]
    
    if movie_url:
        contents.append({
            "type": "button",
            "style": "secondary",
            "margin": "xl",
            "color": "#222222",
            "action": {
                "type": "uri",
                "label": "查看網頁版心得",
                "uri": movie_url
            }
        })
        
    return {
        "type": "bubble",
        "size": "mega",
        "styles": {
            "body": {
                "backgroundColor": "#141414"
            }
        },
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
        "styles": {
            "body": {
                "backgroundColor": "#141414"
            }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "ACHIEVEMENT / 成就解鎖",
                    "weight": "bold",
                    "color": "#C5A059",
                    "size": "xs"
                },
                {
                    "type": "text",
                    "text": f"【{badge_name}】",
                    "weight": "bold",
                    "size": "xl",
                    "color": "#F0F0F0",
                    "margin": "md",
                    "wrap": True
                },
                {
                    "type": "text",
                    "text": description,
                    "color": "#888888",
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
        movie_title = r.movie.title if getattr(r, 'movie', None) else "電影心得"
        target_link = f"{frontend_url}/movies/{r.movie.id}" if getattr(r, 'movie', None) and '/movies/' not in str(frontend_url) else str(frontend_url)
        bubbles.append({
            "type": "bubble",
            "size": "micro",
            "styles": {
                "body": { "backgroundColor": "#181818" },
                "footer": { "backgroundColor": "#181818" }
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": movie_title,
                                "weight": "bold",
                                "size": "md",
                                "color": "#F0F0F0",
                                "wrap": True,
                                "flex": 1
                            },
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": f"{r.rating}.0",
                                        "weight": "bold",
                                        "color": "#141414",
                                        "size": "xs",
                                        "align": "center"
                                    }
                                ],
                                "backgroundColor": "#C5A059",
                                "cornerRadius": "4px",
                                "paddingAll": "2px",
                                "paddingStart": "sm",
                                "paddingEnd": "sm",
                                "flex": 0
                            }
                        ],
                        "alignItems": "center"
                    },
                    {
                        "type": "text",
                        "text": content_str or "(該影友僅記錄評分，無附帶文字短評)",
                        "size": "xs",
                        "color": "#888888" if content_str else "#555555",
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
                        "style": "link",
                        "color": "#C5A059",
                        "height": "sm",
                        "action": {
                            "type": "uri",
                            "label": "閱讀全文",
                            "uri": target_link
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

def get_events_list_flex(events, frontend_url=None):
    bubbles = []
    for e in events:
        time_str = e.event_time.strftime('%Y-%m-%d %H:%M')
        attendee_count = e.attendees.count() if hasattr(e, 'attendees') else 0
        bubbles.append({
            "type": "bubble",
            "size": "kilo",
            "styles": {
                "body": { "backgroundColor": "#181818" },
                "header": { "backgroundColor": "#141414" },
                "footer": { "backgroundColor": "#181818" }
            },
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "CINEMA MEETUP / 電影揪團",
                        "color": "#C5A059",
                        "weight": "bold",
                        "size": "xs"
                    }
                ],
                "paddingAll": "md"
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
                        "color": "#F0F0F0",
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
                                    {"type": "text", "text": "時間", "color": "#777777", "size": "sm", "flex": 2},
                                    {"type": "text", "text": time_str, "color": "#CCCCCC", "size": "sm", "flex": 5}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "地點", "color": "#777777", "size": "sm", "flex": 2},
                                    {"type": "text", "text": e.location, "color": "#CCCCCC", "size": "sm", "flex": 5}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "發起人", "color": "#777777", "size": "sm", "flex": 2},
                                    {"type": "text", "text": e.organizer_nickname, "color": "#CCCCCC", "size": "sm", "flex": 5}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "已參加", "color": "#777777", "size": "sm", "flex": 2},
                                    {"type": "text", "text": f"{attendee_count} 人", "color": "#C5A059", "size": "sm", "weight": "bold", "flex": 5}
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
                        "color": "#C5A059",
                        "action": {
                            "type": "message",
                            "label": "報名參加",
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
        "styles": {
            "header": { "backgroundColor": "#141414" },
            "body": { "backgroundColor": "#181818" }
        },
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "EVENT CREATED / 揪團建立完成",
                    "color": "#C5A059",
                    "weight": "bold",
                    "size": "xs"
                }
            ],
            "paddingAll": "md"
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
                    "color": "#F0F0F0",
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
                                {"type": "text", "text": "時間", "color": "#777777", "size": "sm", "flex": 1},
                                {"type": "text", "text": time_str, "color": "#CCCCCC", "size": "sm", "flex": 4}
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "baseline",
                            "spacing": "sm",
                            "contents": [
                                {"type": "text", "text": "地點", "color": "#777777", "size": "sm", "flex": 1},
                                {"type": "text", "text": event.location, "color": "#CCCCCC", "size": "sm", "flex": 4}
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "baseline",
                            "spacing": "sm",
                            "contents": [
                                {"type": "text", "text": "代碼", "color": "#777777", "size": "sm", "flex": 1},
                                {"type": "text", "text": event.join_code, "weight": "bold", "color": "#C5A059", "size": "sm", "flex": 4}
                            ]
                        }
                    ]
                },
                {
                    "type": "text",
                    "text": "輸入「近期活動」可隨時檢視此揪團詳情。",
                    "wrap": True,
                    "color": "#777777",
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
        "styles": {
            "body": { "backgroundColor": "#141414" },
            "footer": { "backgroundColor": "#141414" }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "網頁版快速登入",
                    "weight": "bold",
                    "size": "md",
                    "color": "#F0F0F0"
                },
                {
                    "type": "text",
                    "text": "點擊下方按鈕，直接前往網頁並登入您的帳號。",
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
                    "color": "#C5A059",
                    "action": {
                        "type": "uri",
                        "label": "前往映後時光",
                        "uri": url
                    }
                }
            ]
        }
    }

def get_speed_rate_genres_flex(genres_subset, frontend_url):
    bubbles = []
    for genre_id, genre_name in genres_subset:
        bubble = {
            "type": "bubble",
            "size": "micro",
            "styles": {
                "body": { "backgroundColor": "#181818" }
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": genre_name,
                        "weight": "bold",
                        "size": "md",
                        "color": "#F0F0F0",
                        "align": "center",
                        "wrap": True
                    }
                ],
                "paddingAll": "lg",
                "action": {
                    "type": "postback",
                    "data": f"action=speed_rate_genre&genre_id={genre_id}"
                }
            }
        }
        bubbles.append(bubble)
        
    hot_bubble = {
        "type": "bubble",
        "size": "micro",
        "styles": {
            "body": { "backgroundColor": "#222222" }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "熱門隨機抽",
                    "weight": "bold",
                    "size": "md",
                    "color": "#C5A059",
                    "align": "center",
                    "wrap": True
                }
            ],
            "paddingAll": "lg",
            "action": {
                "type": "postback",
                "data": "action=speed_rate_genre&genre_id=popular"
            }
        }
    }
    bubbles.append(hot_bubble)
    
    return {
        "type": "carousel",
        "contents": bubbles
    }

def get_speed_rate_movies_carousel_flex(movies_data, genre_id):
    bubbles = []
    
    for movie_data in movies_data:
        title = movie_data.get('title', '未知電影')
        poster = movie_data.get('poster_url') or "https://raw.githubusercontent.com/YaodeChiang4181/Movie-reflection-sharing-project/main/no_poster.png"
        
        bubble = {
            "type": "bubble",
            "size": "kilo",
            "styles": {
                "body": { "backgroundColor": "#181818" },
                "footer": { "backgroundColor": "#181818" }
            },
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
                        "size": "lg",
                        "color": "#F0F0F0",
                        "wrap": True,
                        "maxLines": 2
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
                        "color": "#C5A059",
                        "action": {
                            "type": "postback",
                            "label": "給予評分",
                            "data": f"action=speed_rate_yes&movie_title={title}&genre_id={genre_id}"
                        }
                    }
                ]
            }
        }
        bubbles.append(bubble)
        
    more_bubble = {
        "type": "bubble",
        "size": "kilo",
        "styles": {
            "body": { "backgroundColor": "#181818" },
            "footer": { "backgroundColor": "#181818" }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "換一組片單",
                    "weight": "bold",
                    "size": "xl",
                    "color": "#F0F0F0",
                    "align": "center",
                    "margin": "xxl"
                },
                {
                    "type": "text",
                    "text": "探索更多不同類型的電影",
                    "color": "#888888",
                    "size": "sm",
                    "align": "center",
                    "margin": "md"
                }
            ],
            "justifyContent": "center",
            "alignItems": "center"
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
                {
                    "type": "button",
                    "style": "secondary",
                    "color": "#262626",
                    "action": {
                        "type": "postback",
                        "label": "更換三部",
                        "data": f"action=speed_rate_genre&genre_id={genre_id}"
                    }
                },
                {
                    "type": "button",
                    "style": "secondary",
                    "color": "#262626",
                    "action": {
                        "type": "message",
                        "label": "結束評星",
                        "text": "取消"
                    }
                }
            ]
        }
    }
    bubbles.append(more_bubble)

    return {
        "type": "carousel",
        "contents": bubbles
    }

def get_rules_flex(frontend_url):
    return {
        "type": "bubble",
        "size": "giga",
        "styles": {
            "header": {
                "backgroundColor": "#1A1A1A"
            },
            "body": {
                "backgroundColor": "#141414"
            },
            "footer": {
                "backgroundColor": "#141414"
            }
        },
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "映後時光 操作指南",
                    "weight": "bold",
                    "color": "#F0F0F0",
                    "size": "xl"
                },
                {
                    "type": "text",
                    "text": "探索策展片單、記錄影評與社群交流。",
                    "color": "#C5A059",
                    "size": "sm",
                    "margin": "md"
                }
            ],
            "paddingAll": "20px"
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                # 發表心得
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "發布心得與評分",
                            "weight": "bold",
                            "color": "#C5A059",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "方式一：自然評分\n例如直接輸入「沙丘 5」即可完成評分並展開心得補齊。\n\n方式二：完整心得\n#心得\n電影：奧德賽\n評分：5\n標籤：#科幻 (選填)\n心得：散場後久久不能自已",
                            "color": "#AAAAAA",
                            "size": "sm",
                            "wrap": True,
                            "margin": "sm"
                        }
                    ]
                },
                {"type": "separator", "margin": "lg", "color": "#262626"},
                
                # 設定專屬暱稱
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "設定專屬暱稱",
                            "weight": "bold",
                            "color": "#C5A059",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "#暱稱 欲設定的名稱\n範例：#暱稱 影迷小明",
                            "color": "#AAAAAA",
                            "size": "sm",
                            "wrap": True,
                            "margin": "sm"
                        }
                    ],
                    "margin": "lg"
                },
                {"type": "separator", "margin": "lg", "color": "#262626"},

                # 綁定網頁帳號
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "綁定網頁帳號",
                            "weight": "bold",
                            "color": "#C5A059",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "#綁定 帳號 密碼",
                            "color": "#AAAAAA",
                            "size": "sm",
                            "wrap": True,
                            "margin": "sm"
                        }
                    ],
                    "margin": "lg"
                },
                {"type": "separator", "margin": "lg", "color": "#262626"},
                
                # 急速評星
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "急速評星",
                            "weight": "bold",
                            "color": "#C5A059",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "輸入「急速評星」即可從各類型或熱門片單中抽片記錄星級評分。",
                            "color": "#AAAAAA",
                            "size": "sm",
                            "wrap": True,
                            "margin": "sm"
                        }
                    ],
                    "margin": "lg"
                },
                {"type": "separator", "margin": "lg", "color": "#262626"},
                
                # 其它好用指令
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "其他常用指令",
                            "weight": "bold",
                            "color": "#C5A059",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "搜尋電影心得：查 奧德賽\n近期活動：近期活動\n發起揪團：\n#揪團\n活動：看電影\n時間：2024-12-31 19:00\n地點：信義威秀\n描述：大家一起來看電影",
                            "color": "#AAAAAA",
                            "size": "sm",
                            "wrap": True,
                            "margin": "sm"
                        }
                    ],
                    "margin": "lg"
                }
            ],
            "paddingAll": "20px"
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "md",
            "spacing": "md",
            "contents": [
                {
                    "type": "text",
                    "text": "隨時輸入「/規則」可再次查閱本卡片。",
                    "size": "xs",
                    "color": "#777777",
                    "align": "center",
                    "wrap": True
                },
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#C5A059",
                    "action": {
                        "type": "uri",
                        "label": "前往映後時光 瀏覽完整網站",
                        "uri": frontend_url
                    }
                }
            ]
        }
    }

def get_speed_rate_score_flex(movie_title, genre_id):
    return {
        "type": "bubble",
        "size": "kilo",
        "styles": {
            "body": { "backgroundColor": "#141414" }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": f"請為《{movie_title}》評分",
                    "weight": "bold",
                    "size": "md",
                    "color": "#F0F0F0",
                    "wrap": True
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "lg",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#C5A059",
                            "action": {
                                "type": "postback",
                                "label": "1",
                                "data": f"action=speed_rate_score&score=1&title={movie_title}&genre_id={genre_id}"
                            }
                        },
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#C5A059",
                            "action": {
                                "type": "postback",
                                "label": "2",
                                "data": f"action=speed_rate_score&score=2&title={movie_title}&genre_id={genre_id}"
                            }
                        },
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#C5A059",
                            "action": {
                                "type": "postback",
                                "label": "3",
                                "data": f"action=speed_rate_score&score=3&title={movie_title}&genre_id={genre_id}"
                            }
                        },
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#C5A059",
                            "action": {
                                "type": "postback",
                                "label": "4",
                                "data": f"action=speed_rate_score&score=4&title={movie_title}&genre_id={genre_id}"
                            }
                        },
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#C5A059",
                            "action": {
                                "type": "postback",
                                "label": "5",
                                "data": f"action=speed_rate_score&score=5&title={movie_title}&genre_id={genre_id}"
                            }
                        }
                    ]
                }
            ]
        }
    }

def get_drift_bottle_menu_flex(frontend_url):
    return {
        "type": "bubble",
        "size": "mega",
        "hero": {
            "type": "image",
            "url": "https://raw.githubusercontent.com/YaodeChiang4181/Movie-reflection-sharing-project/main/drift_bottle_purple.png",
            "size": "full",
            "aspectRatio": "20:13",
            "aspectMode": "cover"
        },
        "styles": {
            "body": {
                "backgroundColor": "#141414"
            },
            "footer": {
                "backgroundColor": "#141414"
            }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "lg",
            "contents": [
                {
                    "type": "text",
                    "text": "片單漂流瓶",
                    "weight": "bold",
                    "color": "#F0F0F0",
                    "size": "lg"
                },
                {
                    "type": "text",
                    "text": "將你喜愛的電影裝進瓶中，投遞給未曾相識的影友；或打撈遠方傳來的一則片單推薦。",
                    "margin": "md",
                    "size": "xs",
                    "color": "#888888",
                    "wrap": True
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "paddingAll": "lg",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#C5A059",
                    "action": {
                        "type": "message",
                        "label": "推薦電影",
                        "text": "推薦電影"
                    }
                },
                {
                    "type": "button",
                    "style": "secondary",
                    "color": "#262626",
                    "action": {
                        "type": "message",
                        "label": "來部推薦",
                        "text": "來部推薦"
                    }
                },
                {
                    "type": "separator",
                    "margin": "lg",
                    "color": "#262626"
                },
                {
                    "type": "text",
                    "text": "開啟網頁版探索全部成果 →",
                    "color": "#C5A059",
                    "size": "xs",
                    "align": "center",
                    "margin": "md",
                    "action": {
                        "type": "uri",
                        "label": "開啟網站",
                        "uri": frontend_url
                    }
                }
            ]
        }
    }

def get_drift_bottle_recommend_flex(bottle, nickname, frontend_url):
    return {
        "type": "bubble",
        "size": "mega",
        "styles": {
            "body": {
                "backgroundColor": "#141414"
            },
            "footer": {
                "backgroundColor": "#141414"
            }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "lg",
            "contents": [
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {
                            "type": "text",
                            "text": "DRIFT BOTTLE / 撈取到片單漂流瓶",
                            "weight": "bold",
                            "color": "#C5A059",
                            "size": "xs",
                            "flex": 1
                        }
                    ],
                    "alignItems": "center"
                },
                {
                    "type": "text",
                    "text": bottle.movie_title,
                    "weight": "bold",
                    "color": "#F0F0F0",
                    "size": "xxl",
                    "margin": "md",
                    "wrap": True
                },
                {
                    "type": "text",
                    "text": f"推薦人：{nickname}",
                    "size": "xs",
                    "color": "#777777",
                    "margin": "sm"
                },
                {
                    "type": "separator",
                    "margin": "xxl",
                    "color": "#262626"
                },
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "xxl",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "text",
                            "text": "推薦附言：",
                            "color": "#777777",
                            "size": "xs"
                        },
                        {
                            "type": "text",
                            "text": bottle.message if bottle.message else "(推薦人未附言)",
                            "wrap": True,
                            "size": "md",
                            "color": "#E0E0E0"
                        }
                    ]
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "paddingAll": "lg",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#C5A059",
                    "action": {
                        "type": "message",
                        "label": "回覆感謝",
                        "text": f"回覆漂流瓶 #{bottle.id}"
                    }
                },
                {
                    "type": "separator",
                    "margin": "lg",
                    "color": "#262626"
                },
                {
                    "type": "text",
                    "text": "開啟網頁版探索全部成果 →",
                    "color": "#C5A059",
                    "size": "xs",
                    "align": "center",
                    "margin": "md",
                    "action": {
                        "type": "uri",
                        "label": "開啟網站",
                        "uri": frontend_url
                    }
                }
            ]
        }
    }

def get_bottle_reply_flex(bottle, sender_nickname, reply_message):
    return {
        "type": "bubble",
        "size": "mega",
        "styles": {
            "body": { "backgroundColor": "#141414" }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "xl",
            "contents": [
                {
                    "type": "text",
                    "text": "REPLY / 收到回覆",
                    "weight": "bold",
                    "color": "#C5A059",
                    "size": "xs"
                },
                {
                    "type": "text",
                    "text": f"你在《{bottle.movie_title}》留下的漂流瓶收到了來自 {sender_nickname} 的回覆：",
                    "margin": "md",
                    "size": "sm",
                    "color": "#AAAAAA",
                    "wrap": True
                },
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "lg",
                    "paddingAll": "md",
                    "backgroundColor": "#1E1E1E",
                    "cornerRadius": "md",
                    "contents": [
                        {
                            "type": "text",
                            "text": f"“{reply_message}”",
                            "wrap": True,
                            "size": "md",
                            "color": "#F0F0F0",
                            "style": "italic"
                        }
                    ]
                }
            ]
        }
    }

def get_website_button_flex(url, label="前往映後時光"):
    return {
        "type": "bubble",
        "size": "kilo",
        "styles": {
            "body": {
                "backgroundColor": "#141414"
            },
            "footer": {
                "backgroundColor": "#141414"
            }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "lg",
            "contents": [
                {
                    "type": "text",
                    "text": "映後時光",
                    "color": "#F0F0F0",
                    "weight": "bold",
                    "size": "18px"
                },
                {
                    "type": "text",
                    "text": "探索主題策展片單、影評分享與社群討論。",
                    "color": "#888888",
                    "size": "13px",
                    "margin": "md",
                    "wrap": True
                },
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#C5A059",
                    "margin": "lg",
                    "action": {
                        "type": "uri",
                        "label": label,
                        "uri": url
                    }
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "md",
            "contents": [
                {
                    "type": "text",
                    "text": "開啟網頁版完整體驗 →",
                    "color": "#C5A059",
                    "size": "xs",
                    "align": "center",
                    "action": {
                        "type": "uri",
                        "label": "開啟網站",
                        "uri": url
                    }
                }
            ]
        }
    }

def get_stage_one_rating_flex(movie, rating, liff_url):
    """
    第一階段：極速評星收錄卡片
    純文字印刷質感，零 Emoji，深黑暖金色系
    """
    contents = [
        {
            "type": "text",
            "text": "RECORDED / 評分已收錄",
            "size": "xs",
            "color": "#888888",
            "weight": "bold"
        },
        {
            "type": "text",
            "text": f"《{movie.title}》",
            "size": "xl",
            "weight": "bold",
            "color": "#F0F0F0",
            "margin": "md",
            "wrap": True
        },
        {
            "type": "text",
            "text": f"RATING  {rating}.0 / 5.0",
            "size": "sm",
            "weight": "bold",
            "color": "#C5A059",
            "margin": "sm"
        },
        {
            "type": "separator",
            "margin": "lg",
            "color": "#262626"
        },
        {
            "type": "text",
            "text": "散場步出影廳，這部電影留在你心底的是哪一句話？直接在此回覆即可。",
            "size": "sm",
            "color": "#AAAAAA",
            "margin": "lg",
            "wrap": True
        },
        {
            "type": "button",
            "style": "secondary",
            "color": "#222222",
            "margin": "xl",
            "action": {
                "type": "uri",
                "label": "展開長文與標籤編輯",
                "uri": liff_url
            }
        }
    ]

    bubble = {
        "type": "bubble",
        "size": "mega",
        "styles": {
            "body": {
                "backgroundColor": "#141414"
            }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "20px",
            "contents": contents
        }
    }

    poster = getattr(movie, 'poster_url', None)
    if poster:
        bubble["hero"] = {
            "type": "image",
            "url": poster,
            "size": "full",
            "aspectRatio": "20:9",
            "aspectMode": "cover"
        }

    return bubble

def get_stage_two_completed_flex(review, movie_title, user_exp, movie_url):
    """
    第二階段：心得歸檔確認卡片
    純文字雜誌風格，零 Emoji，深黑暖金色系
    """
    body_contents = [
        {
            "type": "text",
            "text": "ARCHIVED / 心得已歸檔",
            "size": "xs",
            "color": "#888888",
            "weight": "bold"
        },
        {
            "type": "text",
            "text": f"《{movie_title}》",
            "size": "xl",
            "weight": "bold",
            "color": "#F0F0F0",
            "margin": "md",
            "wrap": True
        },
        {
            "type": "text",
            "text": f"RATING  {review.rating}.0 / 5.0",
            "size": "sm",
            "weight": "bold",
            "color": "#C5A059",
            "margin": "sm"
        }
    ]

    if getattr(review, 'is_spoiler', False):
        body_contents.append({
            "type": "text",
            "text": "防雷標記：內文包含劇情透露",
            "size": "xs",
            "color": "#E07A5F",
            "margin": "sm"
        })

    body_contents.append({
        "type": "separator",
        "margin": "lg",
        "color": "#262626"
    })

    if review.content:
        body_contents.append({
            "type": "text",
            "text": f"「{review.content}」",
            "size": "sm",
            "color": "#CCCCCC",
            "margin": "lg",
            "wrap": True
        })

    # Tags
    try:
        tag_names = [t.name for t in review.tags.all() if t.name != movie_title]
        if tag_names:
            body_contents.append({
                "type": "text",
                "text": " ".join([f"#{t}" for t in tag_names]),
                "size": "xs",
                "color": "#777777",
                "margin": "md",
                "wrap": True
            })
    except:
        pass

    if user_exp:
        body_contents.append({
            "type": "text",
            "text": f"目前等級：Lv.{user_exp.level} ({user_exp.exp} EXP)",
            "size": "xs",
            "color": "#666666",
            "margin": "lg"
        })

    body_contents.append({
        "type": "button",
        "style": "secondary",
        "color": "#222222",
        "margin": "xl",
        "action": {
            "type": "uri",
            "label": "在網站中閱讀全文",
            "uri": movie_url
        }
    })

    bubble = {
        "type": "bubble",
        "size": "mega",
        "styles": {
            "body": {
                "backgroundColor": "#141414"
            }
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "20px",
            "contents": body_contents
        }
    }

    poster = getattr(review.movie, 'poster_url', None)
    if poster:
        bubble["hero"] = {
            "type": "image",
            "url": poster,
            "size": "full",
            "aspectRatio": "20:9",
            "aspectMode": "cover"
        }

    return bubble
