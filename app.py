import copy
import html
import json
import os
import re

import streamlit as st
import streamlit.components.v1 as components

import logic

st.set_page_config(
    page_title="寻找克卜勒",
    page_icon="✨",
    layout="centered",
)

TOTAL_PROGRESS_STEPS = 7
SEGMENT_QUESTION_CAP = 5

# --- 维护说明（给后续开发 / 模型用的 Prompt）---
IFRAME_MAINTENANCE_PROMPT = """
【B 站音频嵌入维护规范】
1. 在仓库根目录维护 `歌曲iframe.md`，每行格式：歌名：<iframe src="..." ...></iframe>（歌名须与计分结果 `final_song` 或补充题库 `song_database` 键名一致，可区分大小写匹配）。
2. iframe 的 src 可使用 // 或 https://，应用启动时会统一改为 https，并追加 autoplay=1 以在结果页尝试自动播放。
3. 结果页使用标准比例 B 站 iframe（响应式 16:9，与站内嵌入观感一致），避免屏外隐藏导致浏览器不解码音频。自动播放依赖 autoplay=1，若仍无声请点击播放并检查系统音量。
4. 勿在代码中手写 iframe 列表；新增曲目只需编辑 `歌曲iframe.md` 后刷新应用。
"""

IFRAME_MD_PATH = "歌曲iframe.md"


def iframe_md_mtime():
    try:
        return os.path.getmtime(IFRAME_MD_PATH)
    except OSError:
        return -1.0


@st.cache_data
def load_bilibili_iframe_map(_mtime: float):
    """解析 歌曲iframe.md：歌名 -> 完整 iframe 标签。"""
    out = {}
    if not os.path.exists(IFRAME_MD_PATH):
        return out
    line_re = re.compile(r"^(.+?)[:：]\s*(<iframe\b.*?</iframe>)\s*$", re.IGNORECASE | re.DOTALL)
    with open(IFRAME_MD_PATH, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("注释") or line.startswith("#"):
                continue
            m = line_re.match(line)
            if not m:
                continue
            name = m.group(1).strip()
            tag = m.group(2).strip()
            out[name] = tag
    return out


def _normalize_iframe_src_and_autoplay(iframe_tag: str) -> str:
    tag = iframe_tag.replace('src="//', 'src="https://')

    def repl_src(m):
        url = m.group(1)
        if "autoplay=1" in url:
            return f'src="{url}"'
        sep = "&" if "?" in url else "?"
        return f'src="{url}{sep}autoplay=1"'

    tag = re.sub(
        r'src="(https?://[^"]*player\.bilibili\.com/player\.html[^"]*)"',
        repl_src,
        tag,
        count=1,
        flags=re.IGNORECASE,
    )
    return tag


def build_bilibili_player_html(iframe_tag: str) -> str:
    """
    与 B 站常见嵌入一致：响应式 16:9 可视区域，iframe 铺满（绝对定位），便于完整显示控件与画面。
    """
    tag = _normalize_iframe_src_and_autoplay(iframe_tag)
    tag = re.sub(r"\sstyle\s*=\s*[\"'][^\"']*[\"']", "", tag, flags=re.IGNORECASE)

    def repl_iframe_open(m):
        inner = (m.group(1) or "").strip()
        bits = ["<iframe"]
        if inner:
            bits.append(inner)
        if not re.search(r"\ballow\s*=", inner, re.IGNORECASE):
            bits.append('allow="autoplay; fullscreen; encrypted-media"')
        bits.append(
            'style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;display:block;"'
        )
        return " ".join(bits) + ">"

    tag = re.sub(r"<iframe\s*([^>]*)>", repl_iframe_open, tag, count=1, flags=re.IGNORECASE)
    return (
        '<div style="width:100%;max-width:720px;margin:0 auto;">'
        '<div style="position:relative;width:100%;padding-bottom:56.25%;height:0;overflow:hidden;'
        'border-radius:12px;background:#000;">'
        f"{tag}"
        "</div>"
        '<p style="margin:10px 12px 0;font-size:12px;color:#aaa;text-align:center;">'
        "若未自动出声，请点击播放并调高系统音量（部分浏览器会拦截自动播放）。"
        "</p></div>"
    )


def lookup_iframe_for_song(iframe_map, song):
    if not song or not iframe_map:
        return None
    if song in iframe_map:
        return iframe_map[song]
    k = song.strip().casefold()
    for name, tag in iframe_map.items():
        if name.strip().casefold() == k:
            return tag
    return None


def get_song_database_description(bank, final_song):
    """结果页「歌词/解读」仅以合并后题库中的 song_database.description 为准（来自补充.json 等）。"""
    if not final_song:
        return ""
    db = bank.get("song_database")
    if not isinstance(db, dict):
        return ""
    entry = db.get(final_song)
    if isinstance(entry, dict) and entry.get("description"):
        return str(entry["description"])
    k = final_song.strip().casefold()
    for name, entry in db.items():
        if isinstance(name, str) and name.strip().casefold() == k:
            if isinstance(entry, dict) and entry.get("description"):
                return str(entry["description"])
    return ""

st.markdown(
    """
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;800&display=swap" rel="stylesheet">
<style>
    .stApp {
        background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%) !important;
        overflow: hidden;
        color: #FFFFFF !important;
        font-family: 'Outfit', sans-serif;
    }
    .stApp::before {
        content: "";
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background-color: transparent !important;
        z-index: -1;
        box-shadow:
            20vw 10vh 2px #fff, 40vw 30vh 1px #fff, 60vw 20vh 2px #fff, 80vw 40vh 1px #fff,
            15vw 80vh 2px #fff, 35vw 70vh 1px #fff, 55vw 90vh 2px #fff, 75vw 60vh 1px #fff,
            90vw 10vh 2px #fff, 10vw 45vh 1px #fff, 50vw 50vh 3px #fff;
        animation: twinkling 4s infinite ease-in-out;
        opacity: 0.5;
    }
    @keyframes twinkling {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.1); }
    }
    .stProgress > div > div > div {
        background-color: rgba(255, 255, 255, 0.1) !important;
    }
    .stProgress > div > div > div > div {
        background-color: #6200ee !important;
    }
    .view-container {
        padding: 2rem;
        text-align: center;
        margin-top: 0.5rem;
    }
    .question-title {
        font-size: 2.2rem !important;
        font-weight: 800;
        margin-bottom: 2.5rem;
        background: linear-gradient(90deg, #FFFFFF, #B9BDCF);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    /* 全局 Streamlit 按钮：任意状态高对比 + 毛玻璃卡片（覆盖原生主题） */
    div[data-testid="stButton"] > button {
        background-color: rgba(255, 255, 255, 0.1) !important;
        color: #FFFFFF !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 20px !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2) !important;
        transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.25s ease !important;
    }
    div[data-testid="stButton"] > button:hover {
        background-color: rgba(138, 43, 226, 0.2) !important;
        color: #FFFFFF !important;
        border-color: rgba(200, 160, 255, 0.95) !important;
        box-shadow: 0 0 28px rgba(138, 43, 226, 0.45) !important;
    }
    div[data-testid="stButton"] > button:focus,
    div[data-testid="stButton"] > button:focus-visible {
        background-color: rgba(138, 43, 226, 0.22) !important;
        color: #FFFFFF !important;
        border-color: rgba(220, 180, 255, 1) !important;
    }
    div[data-testid="stButton"] > button:active {
        background-color: rgba(138, 43, 226, 0.28) !important;
        color: #FFFFFF !important;
    }
    /* 选项区：足够大的统一高度卡片，文字左对齐 */
    .quiz-option-block div[data-testid="stButton"] > button {
        padding: 36px 44px !important;
        width: 100% !important;
        min-height: 11rem !important;
        height: 11rem !important;
        max-height: 11rem !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        text-align: left !important;
        line-height: 1.65 !important;
        font-size: 1.12rem !important;
        margin-bottom: 18px !important;
        overflow-y: auto !important;
        white-space: normal !important;
    }
    .quiz-option-block div[data-testid="stButton"] > button:hover {
        transform: translateY(-2px) !important;
    }
    /* 返回上一题：比选项区更宽裕的内边距与字号，避免显得逼仄（仅测验页 .view-container 内） */
    .view-container .back-row div[data-testid="stButton"] > button {
        padding: 52px 56px !important;
        width: 100% !important;
        min-height: 13.5rem !important;
        height: auto !important;
        max-height: none !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        text-align: left !important;
        line-height: 1.75 !important;
        font-size: 1.28rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em !important;
        margin-top: 1.25rem !important;
        margin-bottom: 0 !important;
        border-radius: 24px !important;
        border-width: 2px !important;
        overflow-y: auto !important;
        white-space: normal !important;
    }
    .view-container .back-row div[data-testid="stButton"] > button:hover {
        transform: none !important;
    }
    .quiz-progress-wrap {
        position: sticky;
        top: 0;
        z-index: 998;
        padding: 0.35rem 0 0.75rem 0;
        background: transparent;
    }
    .result-block { text-align: center; }
    .result-group {
        color: #b9bdcf !important;
        letter-spacing: 0.15em;
        font-size: 0.95rem;
    }
    .result-logic {
        text-align: left;
        max-width: 42rem;
        margin: 0.75rem auto 1.5rem auto;
        line-height: 1.75;
        color: #c8c8d0 !important;
        font-size: 0.95rem;
    }
    .result-album-img { margin: 1rem auto; max-width: 400px; }
    .result-song {
        font-size: clamp(2rem, 7vw, 3.8rem);
        font-weight: 800;
        color: #FFFFFF !important;
        margin: 0.25rem 0;
    }
    .result-album-name {
        color: #bbbbbb !important;
        font-style: italic;
        margin-bottom: 1.25rem;
    }
    .result-parse {
        text-align: left;
        max-width: 40rem;
        margin: 0 auto 1.5rem auto;
        line-height: 1.9;
        color: #c5c5ce !important;
    }
    .media-shell {
        max-width: 720px;
        margin: 0 auto;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        background-color: rgba(0, 0, 0, 0.25) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
    }
    [data-testid="stSidebar"] { display: none; }
    #MainMenu { visibility: hidden; }
    footer { visibility: hidden; }
    header { visibility: hidden; }
</style>
""",
    unsafe_allow_html=True,
)


def find_asset(name, folder="assets", ext_filter=(".jpg", ".png", ".webp")):
    if not name or not os.path.exists(folder):
        return None

    def normalize(s):
        return "".join(filter(str.isalnum, str(s).lower()))

    target = normalize(name)
    if not target:
        return None

    files = os.listdir(folder)
    for f in files:
        if f.lower().endswith(ext_filter):
            f_name = normalize(os.path.splitext(f)[0])
            if target in f_name or f_name in target:
                return os.path.join(folder, f)
    return None


def merge_configuration_group(base_cfg, supp_cfg):
    if not isinstance(supp_cfg, dict):
        return supp_cfg
    if not isinstance(base_cfg, dict):
        return dict(supp_cfg)
    merged = {**base_cfg, **supp_cfg}
    brp = base_cfg.get("result_profiles") or {}
    if "result_profiles" in supp_cfg:
        srp = supp_cfg.get("result_profiles") or {}
        merged["result_profiles"] = {**brp, **srp} if srp else dict(brp)
    supp_logic = (supp_cfg.get("core_logic") or "").strip()
    base_logic = (base_cfg.get("core_logic") or "").strip()
    if not supp_logic and base_logic:
        merged["core_logic"] = base_cfg["core_logic"]
    return merged


def merge_supplement_configurations(base_cfgs, supp_cfgs):
    if not isinstance(supp_cfgs, dict):
        return
    for name, supp_cfg in supp_cfgs.items():
        base_cfg = base_cfgs.get(name)
        if isinstance(base_cfg, dict) and isinstance(supp_cfg, dict):
            base_cfgs[name] = merge_configuration_group(base_cfg, supp_cfg)
        else:
            base_cfgs[name] = supp_cfg


def song_profile_for_result(bank, final_song, config_data):
    profiles = config_data.get("result_profiles") or {}
    raw = profiles.get(final_song) if final_song else None
    profile = dict(raw) if isinstance(raw, dict) else {}
    db = bank.get("song_database")
    song_db = {}
    if final_song and isinstance(db, dict):
        entry = db.get(final_song)
        if isinstance(entry, dict):
            song_db = entry
    if not profile.get("description") and song_db.get("description"):
        profile["description"] = song_db["description"]
    if not profile.get("tagline") and song_db.get("description"):
        first = song_db["description"].split("\n\n")[0].strip()
        if first:
            profile["tagline"] = first
    if not profile.get("album") and song_db.get("album"):
        profile["album"] = song_db["album"]
    return profile


def question_bank_cache_key():
    t = []
    for p in ("questionbank.json", "补充.json"):
        try:
            t.append(os.path.getmtime(p))
        except OSError:
            t.append(-1.0)
    return tuple(t)


@st.cache_data
def get_merged_bank(_key):
    base_bank = logic.load_question_bank()
    supp_path = "补充.json"
    if os.path.exists(supp_path):
        try:
            with open(supp_path, "r", encoding="utf-8") as f:
                supp_data = json.load(f)
            if "global_questions" in supp_data:
                base_bank["global_questions"] = supp_data["global_questions"]
            if "configurations" in supp_data:
                merge_supplement_configurations(
                    base_bank.setdefault("configurations", {}),
                    supp_data["configurations"],
                )
            if "song_database" in supp_data:
                base_bank.setdefault("song_database", {}).update(supp_data["song_database"])
        except Exception as e:
            print(f"加载补充题库失败: {e}")
    return base_bank


bank = get_merged_bank(question_bank_cache_key())

if "q_idx" not in st.session_state:
    st.session_state.q_idx = -1
if "answers" not in st.session_state:
    st.session_state.answers = {}
if "group" not in st.session_state:
    st.session_state.group = None
if "history" not in st.session_state:
    st.session_state.history = []

ALBUMS = [
    "孙燕姿同名专辑",
    "我要的幸福",
    "风筝",
    "Leave",
    "未完成",
    "The Moment",
    "Stefanie",
    "完美的一天",
    "My Story, Your Song",
    "逆光",
    "是时候",
    "克卜勒",
    "No.13",
]


def option_effect_for_record(q_data, opt_id):
    for o in q_data.get("options", []):
        if o.get("id") == opt_id:
            return {
                "scores": copy.deepcopy(o.get("scores") or {}),
                "trigger": o.get("trigger"),
            }
    return {"scores": {}, "trigger": None}


def quiz_progress_ratio():
    n = len(st.session_state.get("answers") or {})
    return min(1.0, n / float(TOTAL_PROGRESS_STEPS))


def push_history_before_answer(q_data, opt_id):
    st.session_state.history.append(
        {
            "q_idx": st.session_state.q_idx,
            "answers": copy.deepcopy(st.session_state.answers),
            "group": st.session_state.group,
            "recorded_choice": {"question_id": q_data.get("id"), "option_id": opt_id},
            "option_effect": option_effect_for_record(q_data, opt_id),
        }
    )


def apply_back():
    if not st.session_state.history:
        return
    snap = st.session_state.history.pop()
    st.session_state.q_idx = snap["q_idx"]
    st.session_state.answers = copy.deepcopy(snap["answers"])
    st.session_state.group = snap["group"]
    st.rerun()


def reset_all():
    st.session_state.q_idx = -1
    st.session_state.answers = {}
    st.session_state.group = None
    st.session_state.history = []


def render_progress():
    st.markdown('<div class="quiz-progress-wrap">', unsafe_allow_html=True)
    st.progress(quiz_progress_ratio())
    st.markdown("</div>", unsafe_allow_html=True)


def render_welcome():
    st.markdown("<div style='text-align: center; padding-top: 2rem;'>", unsafe_allow_html=True)
    st.markdown(
        "<h1 style='font-size: 3rem; font-weight: 800; letter-spacing: 4px;'>寻找克卜勒</h1>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<p style='font-size: 1.2rem; color: #aaa; margin-bottom: 3rem;'>在繁星之下，找寻那首刻在你性格里的燕姿。</p>",
        unsafe_allow_html=True,
    )
    cols = st.columns(4)
    for i, alb in enumerate(ALBUMS):
        with cols[i % 4]:
            img_path = find_asset(alb)
            if img_path:
                st.image(img_path, width="stretch")
            else:
                st.markdown(
                    f"""
                <div style="width: 100%; aspect-ratio: 1/1; background: rgba(255,255,255,0.05);
                border-radius: 10px; display: flex; align-items: center; justify-content: center;
                padding: 10px; text-align: center; font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.1);">
                {alb}
                </div>
                """,
                    unsafe_allow_html=True,
                )
    st.write("")
    if st.button("✨ 开启燕姿歌曲寻找之旅 ✨", key="enter_btn"):
        reset_all()
        st.session_state.q_idx = 0
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)


def show_back_button(idx):
    """仅第一题不显示返回。仅两道题时第二题同时是最后一题，此处仍显示返回。"""
    if idx <= 0:
        return
    st.markdown('<div class="back-row">', unsafe_allow_html=True)
    if st.button("返回上一题", key=f"back_{idx}"):
        apply_back()
    st.markdown("</div>", unsafe_allow_html=True)


def render_question_ui(idx, gq, config_questions):
    if idx < 2:
        q_data = gq[idx]
    else:
        q_data = config_questions[idx - 2]

    st.markdown('<div class="view-container">', unsafe_allow_html=True)
    st.markdown(
        f'<p class="question-title">{q_data.get("text") or q_data.get("question")}</p>',
        unsafe_allow_html=True,
    )
    st.markdown('<div class="quiz-option-block">', unsafe_allow_html=True)
    for opt in q_data.get("options", []):
        if st.button(opt["text"], key=f"btn_{idx}_{opt['id']}"):
            push_history_before_answer(q_data, opt["id"])
            st.session_state.answers[q_data["id"]] = opt["id"]
            if idx == 1:
                q1_id = gq[0]["id"]
                a1 = st.session_state.answers.get(q1_id)
                st.session_state.group = logic.calculate_configuration(a1, opt["id"], bank)
            st.session_state.q_idx += 1
            st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)
    show_back_button(idx)
    st.markdown("</div>", unsafe_allow_html=True)


def render_result():
    group_key = st.session_state.group
    if not group_key:
        st.error("计算性格底色发生异常，请重试。")
        if st.button("返回首页", key="err_home"):
            reset_all()
            st.rerun()
        return

    final_song = logic.calculate_result(group_key, st.session_state.answers, bank)
    config_data = bank.get("configurations", {}).get(group_key, {})
    profile = song_profile_for_result(bank, final_song, config_data)

    album_name = profile.get("album") or "未知专辑"
    display_song = final_song if final_song else "未知旋律"
    img_path = find_asset(final_song) or find_asset(album_name)

    gname = html.escape(str(config_data.get("name", "性格底色")))
    logic_html = html.escape(str(config_data.get("core_logic", ""))).replace("\n", "<br/>")
    song_h = html.escape(str(display_song))
    album_h = html.escape(str(album_name))
    lyrics_body = get_song_database_description(bank, final_song)
    lyrics_h = html.escape(lyrics_body).replace("\n", "<br/>")

    st.markdown('<div class="view-container result-block">', unsafe_allow_html=True)

    # 1 组态层
    st.markdown(f'<p class="result-group">{gname}</p>', unsafe_allow_html=True)
    st.markdown(f'<div class="result-logic">{logic_html}</div>', unsafe_allow_html=True)

    # 2 图片层
    if img_path:
        st.markdown('<div class="result-album-img">', unsafe_allow_html=True)
        st.image(img_path, width=400)
        st.markdown("</div>", unsafe_allow_html=True)

    # 3 曲目层
    st.markdown(f'<h1 class="result-song">{song_h}</h1>', unsafe_allow_html=True)
    st.markdown(f'<p class="result-album-name">专辑《{album_h}》</p>', unsafe_allow_html=True)

    # 4 解析层（歌词/文案仅以 song_database.description 为准）
    st.markdown(
        '<p class="result-parse" style="font-weight:600;margin-bottom:0.5rem;color:#b9bdcf !important;">歌词与解读</p>',
        unsafe_allow_html=True,
    )
    st.markdown(
        f'<div class="result-parse"><div>{lyrics_h or "（补充.json 的 song_database 中暂无该曲目的 description）"}</div></div>',
        unsafe_allow_html=True,
    )

    # 5 媒体层：歌曲iframe.md（16:9 标准嵌入，利于出声与操作）
    iframe_map = load_bilibili_iframe_map(iframe_md_mtime())
    raw_iframe = lookup_iframe_for_song(iframe_map, final_song)
    st.markdown('<div class="media-shell">', unsafe_allow_html=True)
    if raw_iframe:
        player_html = build_bilibili_player_html(raw_iframe)
        components.html(player_html, height=480, scrolling=False)
    else:
        st.caption("未在「歌曲iframe.md」中找到该曲目的 iframe；请按维护说明追加一行。")
        with st.expander("嵌入维护说明（Prompt）", expanded=False):
            st.markdown(IFRAME_MAINTENANCE_PROMPT)
    st.markdown("</div>", unsafe_allow_html=True)

    st.write("")
    if st.button("重启寻找之旅", key="reboot"):
        reset_all()
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)


def main_quiz():
    idx = st.session_state.q_idx
    gq = bank.get("global_questions") or []

    if idx < 2 and idx >= len(gq):
        st.error("题库缺少门户题（global_questions 不足 2 道），请检查 questionbank.json / 补充.json。")
        if st.button("返回首页", key="back_incomplete_gq"):
            reset_all()
            st.rerun()
        return

    raw_cfg = []
    if idx >= 2 and st.session_state.group:
        cfg = bank.get("configurations", {}).get(st.session_state.group, {})
        raw_cfg = cfg.get("questions") or []
    config_questions = list(raw_cfg)[:SEGMENT_QUESTION_CAP]
    total_questions = 2 + len(config_questions)

    if idx >= total_questions:
        render_result()
        return

    render_progress()
    render_question_ui(idx, gq, config_questions)


if st.session_state.q_idx == -1:
    render_welcome()
else:
    main_quiz()
