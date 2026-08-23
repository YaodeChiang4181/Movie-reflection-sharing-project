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
                                "text": r.movie.title,
                                "weight": "bold",
                                "size": "md",
                                "wrap": True,
                                "flex": 1
                            },
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": f"★ {r.rating}",
                                        "weight": "bold",
                                        "color": "#111111",
                                        "size": "xs",
                                        "align": "center"
                                    }
                                ],
                                "backgroundColor": "#FDE68A",
                                "cornerRadius": "20px",
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
                        "text": content_str or "(該影友僅給出評分，尚無文字短評)",
                        "size": "xs",
                        "color": "#888888" if content_str else "#cccccc",
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
                        "color": "#8B5CF6",
                        "height": "sm",
                        "action": {
                            "type": "uri",
                            "label": "閱讀完整版 →",
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
                        "text": f"🎬\n{genre_name}",
                        "weight": "bold",
                        "size": "md",
                        "color": "#111111",
                        "align": "center",
                        "wrap": True
                    }
                ],
                "paddingAll": "lg",
                "backgroundColor": "#FDFBF7",
                "action": {
                    "type": "postback",
                    "data": f"action=speed_rate_genre&genre_id={genre_id}"
                }
            }
        }
        bubbles.append(bubble)
        
    # 新增固定的「熱門」選項
    hot_bubble = {
        "type": "bubble",
        "size": "micro",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "🔥\n熱門隨機抽",
                    "weight": "bold",
                    "size": "md",
                    "color": "#111111",
                    "align": "center",
                    "wrap": True
                }
            ],
            "paddingAll": "lg",
            "backgroundColor": "#FFF5F5",
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
        poster = movie_data.get('poster_url') or "https://via.placeholder.com/500x750?text=No+Poster"
        
        bubble = {
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
                        "color": "#6C5CE7",
                        "action": {
                            "type": "postback",
                            "label": "我要評分！",
                            "data": f"action=speed_rate_yes&movie_title={title}&genre_id={genre_id}"
                        }
                    }
                ]
            }
        }
        bubbles.append(bubble)
        
    # 新增「換一換 / 結束」的卡片
    more_bubble = {
        "type": "bubble",
        "size": "mega",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "都不想看？",
                    "weight": "bold",
                    "size": "xl",
                    "align": "center",
                    "margin": "xxl"
                },
                {
                    "type": "text",
                    "text": "換一組電影看看吧！",
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
                    "style": "primary",
                    "color": "#8B5CF6",
                    "action": {
                        "type": "postback",
                        "label": "再來三部",
                        "data": f"action=speed_rate_genre&genre_id={genre_id}"
                    }
                },
                {
                    "type": "button",
                    "style": "secondary",
                    "action": {
                        "type": "message",
                        "label": "🛑 結束評星",
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



def get_rules_flex():
    return {
        "type": "bubble",
        "size": "giga",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "🎬 影像製作所 Bot 指令規則",
                    "weight": "bold",
                    "color": "#FFFFFF",
                    "size": "xl"
                },
                {
                    "type": "text",
                    "text": "輕鬆探索、評分與分享電影心得！",
                    "color": "#e0e0e0",
                    "size": "sm",
                    "margin": "md"
                }
            ],
            "backgroundColor": "#8B5CF6",
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
                            "text": "📝 發布心得 (快速格式)",
                            "weight": "bold",
                            "color": "#8B5CF6",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "#心得\n電影：奧德賽\n評分：5\n標籤：#動作片 (選填)\n心得：這部電影太好看了！\n(💡 心得為選填，無文字即為簡易評分貼文)",
                            "color": "#555555",
                            "size": "sm",
                            "wrap": True,
                            "margin": "sm"
                        }
                    ]
                },
                {"type": "separator", "margin": "lg"},
                
                # 設定專屬暱稱
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "✏️ 設定專屬暱稱 (限一次)",
                            "weight": "bold",
                            "color": "#8B5CF6",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "#暱稱 你的暱稱\n※ 範例：#暱稱 影迷小明",
                            "color": "#555555",
                            "size": "sm",
                            "wrap": True,
                            "margin": "sm"
                        }
                    ],
                    "margin": "lg"
                },
                {"type": "separator", "margin": "lg"},

                # 綁定網頁帳號
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "🔗 綁定網頁/舊帳號",
                            "weight": "bold",
                            "color": "#8B5CF6",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "#綁定 帳號 密碼",
                            "color": "#555555",
                            "size": "sm",
                            "wrap": True,
                            "margin": "sm"
                        }
                    ],
                    "margin": "lg"
                },
                {"type": "separator", "margin": "lg"},
                
                # 急速評星
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "⭐ 急速評星 (無限流抽片)",
                            "weight": "bold",
                            "color": "#8B5CF6",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "輸入「急速評星」即可從各大類型或「熱門電影」中抽片！\n✅ 一次給你三部隨機電影 (橫向滑動)\n✅ 打完分數自動再給你三部新片\n✅ 隨時點擊「🛑 結束評星」即可退出",
                            "color": "#555555",
                            "size": "sm",
                            "wrap": True,
                            "margin": "sm"
                        }
                    ],
                    "margin": "lg"
                },
                {"type": "separator", "margin": "lg"},
                
                # 其它好用指令
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "💡 其它好用指令",
                            "weight": "bold",
                            "color": "#8B5CF6",
                            "size": "md"
                        },
                        {
                            "type": "text",
                            "text": "🔍 搜尋電影評價：查 奧德賽\n📅 找活動：近期活動\n🤝 揪團看片：\n#揪團\n活動：看電影\n時間：2024-12-31 19:00\n地點：信義威秀\n描述：大家一起來看死侍",
                            "color": "#555555",
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
            "contents": [
                {
                    "type": "text",
                    "text": "💡 任何時候輸入「/規則」都能看到這張卡片喔！",
                    "size": "xs",
                    "color": "#aaaaaa",
                    "align": "center",
                    "wrap": True
                }
            ]
        }
    }

def get_speed_rate_score_flex(movie_title, genre_id):
    return {
        "type": "bubble",
        "size": "kilo",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": f"請為《{movie_title}》打分數",
                    "weight": "bold",
                    "size": "md",
                    "wrap": True
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "md",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#FFD700",
                            "action": {
                                "type": "postback",
                                "label": "1星",
                                "data": f"action=speed_rate_score&score=1&title={movie_title}&genre_id={genre_id}"
                            }
                        },
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#FFD700",
                            "action": {
                                "type": "postback",
                                "label": "2星",
                                "data": f"action=speed_rate_score&score=2&title={movie_title}&genre_id={genre_id}"
                            }
                        },
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#FFD700",
                            "action": {
                                "type": "postback",
                                "label": "3星",
                                "data": f"action=speed_rate_score&score=3&title={movie_title}&genre_id={genre_id}"
                            }
                        }
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "sm",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#FFD700",
                            "action": {
                                "type": "postback",
                                "label": "4星",
                                "data": f"action=speed_rate_score&score=4&title={movie_title}&genre_id={genre_id}"
                            }
                        },
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#FFD700",
                            "action": {
                                "type": "postback",
                                "label": "5星",
                                "data": f"action=speed_rate_score&score=5&title={movie_title}&genre_id={genre_id}"
                            }
                        }
                    ]
                }
            ]
        }
    }

def get_drift_bottle_menu_flex():
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
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "🌊 片單漂流瓶",
                    "weight": "bold",
                    "size": "xl"
                },
                {
                    "type": "text",
                    "text": "將你喜愛的電影裝進瓶中，或是撈起別人留下的推薦！",
                    "margin": "md",
                    "size": "sm",
                    "color": "#666666",
                    "wrap": True
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#6C5CE7",
                    "action": {
                        "type": "message",
                        "label": "推薦電影",
                        "text": "推薦電影"
                    }
                },
                {
                    "type": "button",
                    "style": "secondary",
                    "color": "#F3F4F6",
                    "action": {
                        "type": "message",
                        "label": "來部推薦",
                        "text": "來部推薦"
                    }
                }
            ]
        }
    }

def get_drift_bottle_recommend_flex(bottle, nickname):
    return {
        "type": "bubble",
        "size": "mega",
        "styles": {
            "body": {
                "backgroundColor": "#FDFBF7"
            }
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
                            "text": "🌊 你撈到了一個漂流瓶！",
                            "weight": "bold",
                            "color": "#6C5CE7",
                            "size": "sm",
                            "flex": 1
                        },
                        {
                            "type": "text",
                            "text": "📮",
                            "size": "md",
                            "align": "end",
                            "flex": 0
                        }
                    ],
                    "alignItems": "center"
                },
                {
                    "type": "text",
                    "text": bottle.movie_title,
                    "weight": "bold",
                    "size": "xxl",
                    "margin": "md",
                    "wrap": True
                },
                {
                    "type": "text",
                    "text": f"推薦人：{nickname}",
                    "size": "xs",
                    "color": "#888888",
                    "margin": "sm"
                },
                {
                    "type": "separator",
                    "margin": "xxl",
                    "color": "#E5E7EB",
                    "style": "dashed"
                },
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "xxl",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "text",
                            "text": "推薦留言：",
                            "color": "#555555",
                            "size": "sm"
                        },
                        {
                            "type": "text",
                            "text": bottle.message if bottle.message else "(推薦人沒有留下留言)",
                            "wrap": True,
                            "size": "md",
                            "color": "#111111"
                        }
                    ]
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "backgroundColor": "#FDFBF7",
            "contents": [
                {
                    "type": "button",
                    "style": "primary",
                    "color": "#F2A900",
                    "action": {
                        "type": "message",
                        "label": "發送你的感謝！",
                        "text": f"回覆漂流瓶 #{bottle.id}"
                    }
                }
            ]
        }
    }

def get_bottle_reply_flex(bottle, sender_nickname, reply_message):
    return {
        "type": "bubble",
        "size": "mega",
        "body": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "xl",
            "contents": [
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {
                            "type": "text",
                            "text": "💌 收到回覆！",
                            "weight": "bold",
                            "color": "#EC4899",
                            "size": "sm"
                        }
                    ]
                },
                {
                    "type": "text",
                    "text": f"你的漂流瓶《{bottle.movie_title}》被 {sender_nickname} 撈到了！",
                    "margin": "md",
                    "size": "sm",
                    "color": "#555555",
                    "wrap": True
                },
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "lg",
                    "paddingAll": "md",
                    "backgroundColor": "#F3F4F6",
                    "cornerRadius": "md",
                    "contents": [
                        {
                            "type": "text",
                            "text": f"“{reply_message}”",
                            "wrap": True,
                            "size": "md",
                            "color": "#111111",
                            "style": "italic"
                        }
                    ]
                }
            ]
        }
    }
