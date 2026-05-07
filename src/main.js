import { loadQuestionBank, calculateResult, loadIframeMap } from './logic.js';

let isTransitioning = false;

async function transitionView(contentFunc) {
    if (isTransitioning) return;
    isTransitioning = true;
    const appEl = document.getElementById('app');
    const container = appEl.querySelector('.view-container');
    if (container) {
        container.classList.add('view-hidden');
        await new Promise(resolve => setTimeout(resolve, 400));
    }
    contentFunc();
    const newContainer = appEl.querySelector('.view-container');
    if (newContainer) {
        newContainer.classList.add('view-hidden');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                newContainer.classList.remove('view-hidden');
                isTransitioning = false;
            });
        });
    } else {
        isTransitioning = false;
    }
}

const ASSETS_MAP = {
    "孙燕姿同名专辑": "同名专辑.jpg",
    "我要的幸福": "我要的幸福.jpg",
    "风筝": "风筝.jpg",
    "自选集": "自选集.jpg",
    "Leave": "leave.jpg",
    "未完成": "未完成.jpg",
    "The Moment": "the moment.jpg",
    "Stefanie": "stefanie.jpg",
    "完美的一天": "完美的一天.jpg",
    "My Story, Your Song": "mystory.jpg",
    "逆光": "逆光.jpg",
    "是时候": "是时候.jpg",
    "克卜勒": "克卜勒.jpg",
    "No.13": "No13.jpg"
};

const DIMENSION_NAMES = {
    sincerity: '赤诚',
    lucidity: '通透',
    autonomy: '孤傲',
    persistence: '执守',
    fortitude: '坚韧',
    detachment: '洒脱'
};

function findAsset(name) {
    if (!name) return null;
    const norm = name.toLowerCase().trim().replace(/\s/g, '');
    for (const [key, val] of Object.entries(ASSETS_MAP)) {
        if (key.toLowerCase().replace(/\s/g, '') === norm) return `assets/${val}`;
    }
    for (const [key, val] of Object.entries(ASSETS_MAP)) {
        if (key.toLowerCase().includes(norm) || norm.includes(key.toLowerCase())) return `assets/${val}`;
    }
    return null;
}

let state = {
    view: 'welcome',
    qIdx: 0,
    answers: {},
    history: [],
    bank: null,
    iframeMap: null,
    sessionQuestions: [],
    lastMaxDim: null
};

const appEl = document.getElementById('app');

async function init() {
    const updateParallax = (x, y) => {
        const starField = document.querySelector('.star-field');
        const kepler = document.querySelector('.kepler-system');
        if (starField) starField.style.transform = `translate(${x * 50}px, ${y * 50}px)`;
        if (kepler) kepler.style.transform = `translate(calc(-50% + ${x * -80}px), calc(-50% + ${y * -80}px)) rotateX(68deg) rotateY(${-5 + x * 10}deg)`;
    };

    document.addEventListener('mousemove', (e) => {
        updateParallax((e.clientX / window.innerWidth) - 0.5, (e.clientY / window.innerHeight) - 0.5);
    });

    // Mobile Gyroscope Support
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            if (e.beta === null || e.gamma === null) return;
            // AG Logic: Gamma (-90 to 90), Beta (-180 to 180)
            // We map comfortable tilt ranges to -0.5 -> 0.5
            const x = Math.max(-1, Math.min(1, e.gamma / 30)); 
            const y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
            updateParallax(x, y);
        }, true);
    }

    state.bank = await loadQuestionBank();
    state.iframeMap = await loadIframeMap();
    updateDynamicBackground(true);
    render();
}

function updateDynamicBackground(isInitial = false) {
    let maxDim = 'neutral';
    
    if (!isInitial) {
        const res = calculateResult(state.answers, state.bank);
        if (res && res.dimensions) {
            const sorted = Object.entries(res.dimensions).sort((a, b) => b[1] - a[1]);
            maxDim = sorted[0][0];
        }
    }
    
    if (maxDim === state.lastMaxDim) return;
    state.lastMaxDim = maxDim;

    const colorMatrix = {
        neutral: { filter: 'hue-rotate(0deg) saturate(1) grayscale(0.2) brightness(1.1)', c1: 'rgba(138, 43, 226, 0.15)' },
        sincerity: { filter: 'hue-rotate(0deg) saturate(2) grayscale(0) brightness(1.1)', c1: 'rgba(255, 69, 0, 0.25)' },
        lucidity: { filter: 'hue-rotate(190deg) saturate(1.8) grayscale(0) brightness(1.1)', c1: 'rgba(0, 191, 255, 0.22)' },
        autonomy: { filter: 'hue-rotate(270deg) saturate(2.2) grayscale(0) brightness(1.1)', c1: 'rgba(138, 43, 226, 0.28)' },
        persistence: { filter: 'hue-rotate(330deg) saturate(2.5) grayscale(0) brightness(1.1)', c1: 'rgba(220, 20, 60, 0.25)' },
        fortitude: { filter: 'hue-rotate(120deg) saturate(1.8) grayscale(0) brightness(1.1)', c1: 'rgba(34, 139, 34, 0.22)' },
        detachment: { filter: 'hue-rotate(0deg) saturate(0.5) grayscale(0.4) brightness(1.3)', c1: 'rgba(200, 200, 255, 0.22)' }
    };
    
    const config = colorMatrix[maxDim] || colorMatrix.neutral;
    const root = document.documentElement;
    root.style.setProperty('--nebula-filter', config.filter);
    root.style.setProperty('--nebula-color-1', config.c1);
}

function render() {
    if (!state.bank) {
        appEl.innerHTML = `<div class="view-container loader-wrapper"><div class="celestial-loader"></div><p style="letter-spacing: 0.5em; color: var(--text-dim);">正在找寻克卜勒...</p></div>`;
        return;
    }
    let quizData = null;
    let quizTotal = state.bank.project_info.total_steps || 12;
    if (state.view === 'quiz') {
        if (state.qIdx >= state.sessionQuestions.length) state.view = 'result';
        else { quizData = state.sessionQuestions[state.qIdx]; updateDynamicBackground(); }
    }
    const currentView = state.view;
    transitionView(() => {
        if (currentView === 'welcome') renderWelcome();
        else if (currentView === 'quiz' && quizData) renderQuiz(quizData, quizTotal);
        else if (currentView === 'result') renderResult();
    });
}

function renderWelcome() {
    const albums = Object.keys(ASSETS_MAP);
    appEl.innerHTML = `
        <div class="view-container">
            <h1>寻找克卜勒</h1>
            <p class="tagline">在繁星之下，测测你的性格和孙燕姿哪首歌最契合</p>
            <button id="start-btn" class="btn-primary" style="font-weight: 800; padding: 1.2rem 2.5rem; margin: 2rem 0;">✨ 开启燕姿歌曲寻找之旅 ✨</button>
            <div class="album-gallery">${albums.map(name => `<div class="album-item"><img src="${findAsset(name)}" alt="${name}"></div>`).join('')}</div>
        </div>
    `;
    document.getElementById('start-btn').addEventListener('click', async () => {
        // AG Logic: Request Gyroscope Permission for iOS 13+
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try { await DeviceOrientationEvent.requestPermission(); } catch (e) {}
        }

        const allQuestions = state.bank.questions || [];
        const totalToPick = state.bank.project_info.total_steps || 12;
        const pools = {};
        allQuestions.forEach(q => {
            const cat = q.category || 'other';
            if (!pools[cat]) pools[cat] = [];
            pools[cat].push(q);
        });
        Object.values(pools).forEach(p => p.sort(() => 0.5 - Math.random()));
        const selected = [];
        const categories = Object.keys(pools);
        let catIdx = 0;
        while (selected.length < totalToPick && categories.length > 0) {
            const cat = categories[catIdx % categories.length];
            if (pools[cat].length > 0) selected.push(pools[cat].pop());
            else { categories.splice(catIdx % categories.length, 1); continue; }
            catIdx++;
        }
        state.sessionQuestions = selected.sort(() => 0.5 - Math.random());
        state.view = 'quiz'; state.qIdx = 0; state.answers = {}; state.history = [];
        render();
    });
}

function renderQuiz(qData, totalSteps) {
    const progress = Math.min(100, (state.qIdx / totalSteps) * 100);
    const labels = state.bank.project_info.likert_labels || ["很不同意", "不同意", "一般", "同意", "很同意"];
    
    appEl.innerHTML = `
        <div class="view-container">
            <div class="progress-container"><div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div></div>
            <div class="question-card">
                <p class="question-statement">${qData.statement}</p>
                <div class="likert-container">
                    <div class="likert-anchors">
                        <span>${labels[0]}</span>
                        <span>${labels[4]}</span>
                    </div>
                    <div class="likert-scale">
                        ${[1, 2, 3, 4, 5].map(v => `
                            <button class="likert-dot" data-score="${v}">
                                <span class="dot-inner"></span>
                                <span class="dot-label">${labels[v-1]}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
            ${state.qIdx > 0 ? `<button id="back-btn" class="back-btn">返回上一颗星</button>` : ''}
        </div>
    `;
    appEl.querySelectorAll('.likert-dot').forEach(btn => {
        btn.addEventListener('click', () => {
            state.history.push(JSON.parse(JSON.stringify({ qIdx: state.qIdx, answers: state.answers })));
            state.answers[qData.id] = parseInt(btn.getAttribute('data-score'));
            state.qIdx++; render();
        });
    });
    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
        const prev = state.history.pop();
        state.qIdx = prev.qIdx; state.answers = prev.answers;
        render();
    });
}

function renderResult() {
    const result = calculateResult(state.answers, state.bank, state.sessionQuestions);
    if (!result) return;
    const song = result.song;
    const dims = result.dimensions;
    const songDb = state.bank.song_database?.[song] || {};
    const imgSrc = findAsset(song) || findAsset(songDb.album);
    const rawIframe = state.iframeMap?.[song];
    const iframeHtml = rawIframe ? rawIframe.replace(/src="\/\//i, 'src="https://') : '';

    const sortedDims = Object.entries(dims).sort((a, b) => b[1] - a[1]);
    const starDim = DIMENSION_NAMES[sortedDims[0][0]];
    const planetDim = DIMENSION_NAMES[sortedDims[1][0]];
    const soulReading = `在你的性格星群中，<strong>【${starDim}】</strong>是永恒闪烁的恒星，而<strong>【${planetDim}】</strong>是围绕它旋转的卫星。`;

    appEl.innerHTML = `
        <div class="view-container result-block">
            <div class="result-card-glow"></div>
            <p class="result-group-name">克卜勒探测报告</p>
            <div class="result-core-logic" style="margin-bottom:2rem; font-weight:600">${soulReading}</div>
            ${imgSrc ? `<div class="result-image-wrapper"><img src="${imgSrc}" class="result-main-img"></div>` : ''}
            <h1 class="result-song-title">${song}</h1>
            <p class="result-album-name">专辑《${songDb.album || '未知'}》</p>
            <div class="result-description">
                <div class="quote-mark">“</div>
                <div>${(songDb.description || "").replace(/\n/g, '<br>')}</div>
            </div>
            <div class="dimension-analyzer">
                <p class="analyzer-title">性格轨道星图</p>
                <div class="radar-wrapper">
                    <svg viewBox="0 0 300 300" class="radar-chart">
                        <defs>
                            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="var(--accent-color)" stop-opacity="0.6" />
                                <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0.1" />
                            </radialGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                        </defs>
                        <!-- Grid Lines -->
                        ${[25, 50, 75, 95].map(r => `<circle cx="150" cy="150" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />`).join('')}
                        ${[0, 60, 120, 180, 240, 300].map(a => {
                            const rad = (a * Math.PI) / 180;
                            return `<line x1="150" y1="150" x2="${150 + 95 * Math.sin(rad)}" y2="${150 - 95 * Math.cos(rad)}" stroke="rgba(255,255,255,0.05)" />`;
                        }).join('')}
                        
                        <!-- Data Polygon -->
                        ${(() => {
                            const getR = (v) => (v / 100) * 95; // Max 95px now
                            const keys = ['sincerity', 'lucidity', 'autonomy', 'persistence', 'fortitude', 'detachment'];
                            const pts = keys.map((k, i) => {
                                const angle = (i * 60) * (Math.PI / 180);
                                const r = getR(dims[k] || 0);
                                return { x: 150 + r * Math.sin(angle), y: 150 - r * Math.cos(angle) };
                            });
                            const d = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
                            return `
                                <path d="${d}" fill="url(#radarGradient)" stroke="var(--accent-color)" stroke-width="2.5" />
                                ${pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#fff" filter="url(#glow)" />`).join('')}
                            `;
                        })()}
                    </svg>
                    <div class="radar-labels">
                        <span class="label-top">赤诚</span><span class="label-tr">通透</span><span class="label-br">孤傲</span>
                        <span class="label-bottom">执守</span><span class="label-bl">坚韧</span><span class="label-tl">洒脱</span>
                    </div>
                </div>
            </div>
            <div class="media-shell">${iframeHtml}</div>
            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                <button id="save-card-btn" class="btn-primary" style="background: var(--accent-color); border:none">生成分享卡片</button>
                <button id="restart-btn" class="btn-primary" style="background: rgba(255,255,255,0.1)">重新出发</button>
            </div>
        </div>
    `;

    document.getElementById('save-card-btn').onclick = async () => {
        const btn = document.getElementById('save-card-btn');
        btn.innerText = "正在星际冲印..."; btn.disabled = true;
        const shareContainer = document.getElementById('share-card-container');
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`;
        shareContainer.innerHTML = `
            <div id="capture-area" style="background:#0a0a0c; color:#fff; padding:60px; text-align:center; font-family:'Outfit',sans-serif; width:600px; display:flex; flex-direction:column; align-items:center">
                <p style="color:#b088ff; letter-spacing:8px; margin-bottom:15px; font-weight:800; font-size:18px; text-transform:uppercase">Finding Kepler · Report</p>
                <p style="font-size:18px; margin-bottom:40px; color:#fff; line-height:1.6; width:100%; text-align:center">
                    在你的性格星群中，<br>
                    <span style="color:#b088ff; font-weight:800">【${starDim}】</span>是永恒闪烁的恒星，<br>
                    而<span style="color:#b088ff; font-weight:800">【${planetDim}】</span>是围绕它旋转的卫星。
                </p>
                ${imgSrc ? `<img src="${imgSrc}" style="width:280px; height:280px; border-radius:15px; margin-bottom:30px; box-shadow:0 20px 40px rgba(0,0,0,0.5); object-fit:cover">` : ''}
                <h1 style="font-size:48px; margin-bottom:10px; font-weight:800; letter-spacing:2px">${song}</h1>
                <p style="opacity:0.6; margin-bottom:40px; font-size:20px">专辑《${songDb.album || '未知'}》</p>
                <div style="font-size:18px; line-height:2; margin-bottom:50px; text-align:left; border-left:4px solid #b088ff; padding-left:30px; color:#d1d1da; width:100%">
                    ${(songDb.description || "").replace(/\n/g, '<br>')}
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:40px; border-radius:24px; border:1px solid rgba(255,255,255,0.1); width:100%">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:25px; text-align:left">
                        ${Object.entries(dims).map(([k,v]) => `
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:8px">
                                    <span>${DIMENSION_NAMES[k]}</span><span>${v}%</span>
                                </div>
                                <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px"><div style="width:${v}%; height:100%; background:linear-gradient(90deg, #b088ff, #fff); border-radius:3px"></div></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div style="margin-top:60px; display:flex; flex-direction:column; align-items:center">
                    <img id="qr-image" src="${qrUrl}" crossorigin="anonymous" style="width:110px; border:4px solid #fff; border-radius:10px; background:#fff">
                    <p style="font-size:12px; color:#888; margin-top:15px; letter-spacing:4px">扫码识别 寻找你的克卜勒</p>
                </div>
            </div>
        `;
        try {
            await new Promise(r => { const img = document.getElementById('qr-image'); img.complete ? r() : img.onload = r; });
            const canvas = await html2canvas(document.getElementById('capture-area'), { backgroundColor: '#0a0a0c', scale: 2, useCORS: true });
            const link = document.createElement('a'); link.download = `Kepler-${song}.png`;
            link.href = canvas.toDataURL('image/png'); link.click();
        } catch (e) { alert("生成失败，请尝试手动截图。"); }
        finally { btn.innerText = "生成分享卡片"; btn.disabled = false; }
    };

    document.getElementById('restart-btn').onclick = () => {
        state.view = 'welcome'; state.qIdx = 0; state.answers = {}; state.history = []; render();
    };
}
init();
