import { loadQuestionBank, getDiversionGroup, calculateResult, loadIframeMap } from './logic.js';

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
    "Leave": "leave.jpg",
    "未完成": "未完成.jpg",
    "The Moment": "the moment.jpg",
    "Stefanie": "stefanie.jpg",
    "完美的一天": "完美的一天.jpg",
    "My Story, Your Song": "mystory.jpg",
    "逆光": "逆光.jpg",
    "是时候": "是时候.jpg",
    "克卜勒": "克卜勒.jpg",
    "No.13": "No13.jpg",
    "自选集": "自选集.jpg"
};

function findAsset(name) {
    if (!name) return null;
    const norm = name.toLowerCase().trim().replace(/\s/g, '');
    
    // 1. Exact or near-exact mapping check
    for (const [key, val] of Object.entries(ASSETS_MAP)) {
        const normKey = key.toLowerCase().replace(/\s/g, '');
        if (normKey === norm) return `assets/${val}`;
    }

    // 2. Inclusion check (more strict)
    for (const [key, val] of Object.entries(ASSETS_MAP)) {
        const normKey = key.toLowerCase().replace(/\s/g, '');
        if (normKey.includes(norm) || norm.includes(normKey)) return `assets/${val}`;
    }

    // 3. Filename direct check as fallback
    for (const val of Object.values(ASSETS_MAP)) {
        const normVal = val.toLowerCase().replace(/\.(jpg|png|jpeg)$/, '').replace(/\s/g, '');
        if (normVal.includes(norm)) return `assets/${val}`;
    }
    return null;
}

let state = {
    view: 'welcome',
    qIdx: 0,
    answers: {},
    group: null,
    history: [],
    bank: null,
    iframeMap: null
};

const appEl = document.getElementById('app');

async function init() {
    // Parallax logic with increased intensity
    const updateParallax = (x, y) => {
        const starField = document.querySelector('.star-field');
        const kepler = document.querySelector('.kepler-system');
        // Multiplier increased from 30/50 to 50/80 for better visibility
        if (starField) starField.style.transform = `translate(${x * 50}px, ${y * 50}px)`;
        if (kepler) kepler.style.transform = `translate(calc(-50% + ${x * -80}px), calc(-50% + ${y * -80}px)) rotateX(68deg) rotateY(-5deg)`;
    };

    document.addEventListener('mousemove', (e) => {
        updateParallax((e.clientX / window.innerWidth) - 0.5, (e.clientY / window.innerHeight) - 0.5);
    });

    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            const x = Math.min(Math.max(e.gamma / 20, -0.5), 0.5);
            const y = Math.min(Math.max((e.beta - 45) / 20, -0.5), 0.5);
            updateParallax(x, y);
        }, true);
    }

    state.bank = await loadQuestionBank();
    state.iframeMap = await loadIframeMap();
    render();
}

function render() {
    if (!state.bank) {
        appEl.innerHTML = `
            <div class="view-container loader-wrapper">
                <div class="celestial-loader"></div>
                <p style="letter-spacing: 0.5em; color: var(--text-dim); animation: pulse 2s infinite;">正在找寻克卜勒...</p>
            </div>
        `;
        return;
    }

    let quizData = null;
    let quizTotal = 0;

    if (state.view === 'quiz') {
        const gq = state.bank.global_questions || [];
        // Fixed logic: Always assume 7 total questions (2 global + 5 per config) to prevent progress bar jump
        quizTotal = gq.length + 5; 
        
        const cq = (state.bank.configurations?.[state.group]?.questions) || [];
        const allQ = [...gq, ...cq];
        
        if (state.qIdx >= allQ.length) {
            state.view = 'result';
        } else {
            quizData = allQ[state.qIdx];
        }
    }

    // Capture the target view *after* potential internal state shift
    const currentView = state.view;

    transitionView(() => {
        if (currentView === 'welcome') {
            renderWelcome();
        } else if (currentView === 'quiz' && quizData) {
            renderQuiz(quizData, quizTotal);
        } else if (currentView === 'result') {
            renderResult();
        }
    });
}

function renderWelcome() {
    const albums = [
        "孙燕姿同名专辑", "我要的幸福", "风筝", "自选集", "Leave", "未完成", 
        "The Moment", "Stefanie", "完美的一天", "My Story, Your Song", 
        "逆光", "是时候", "克卜勒", "No.13"
    ];

    appEl.innerHTML = `
        <div class="view-container" style="padding-top: 1rem;">
            <h1>寻找克卜勒</h1>
            <p class="tagline">在繁星之下，测测你的性格和孙燕姿哪首歌最契合</p>
            <button id="start-btn" class="btn-primary" style="font-weight: 800; padding: 1.2rem 2.5rem; margin-bottom: 0.5rem;">
                ✨ 开启燕姿歌曲寻找之旅 ✨
            </button>
            <div class="album-gallery">
                ${albums.map(name => {
                    const src = findAsset(name);
                    return `
                        <div class="album-item">
                            ${src ? `<img src="${src}" alt="${name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
                            <div style="display: ${src ? 'none' : 'block'}; padding:20px; color:#888; font-size:0.8rem;">${name}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    document.getElementById('start-btn').addEventListener('click', () => {
        state.view = 'quiz';
        state.qIdx = 0;
        state.answers = {};
        state.group = null;
        state.history = [];
        render();
    });
}

function renderQuiz(qData, totalSteps) {
    const progress = Math.min(100, (state.qIdx / totalSteps) * 100);

    appEl.innerHTML = `
        <div class="view-container">
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="question-card">
                <p class="question-title">${qData.text || qData.question}</p>
                <div class="options-grid">
                    ${qData.options.map(opt => `
                        <button class="option-btn" data-id="${opt.id}">${opt.text}</button>
                    `).join('')}
                </div>
            </div>
            ${state.qIdx > 0 ? `<button id="back-btn" class="back-btn">返回上一题</button>` : ''}
        </div>
    `;

    appEl.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const optId = btn.getAttribute('data-id');
            const snap = JSON.parse(JSON.stringify({ qIdx: state.qIdx, answers: state.answers, group: state.group }));
            state.history.push(snap);
            
            state.answers[qData.id] = optId;
            
            // Branching logic after Global Questions
            const gq = state.bank.global_questions || [];
            if (state.qIdx === gq.length - 1) {
                state.group = getDiversionGroup(state.answers[gq[0].id], optId, state.bank);
            }
            
            state.qIdx++;
            render();
        });
    });

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (state.history.length > 0) {
                const prev = state.history.pop();
                state.qIdx = prev.qIdx;
                state.answers = prev.answers;
                state.group = prev.group;
                render();
            }
        });
    }
}

function renderResult() {
    const finalSong = calculateResult(state.group, state.answers, state.bank);
    
    // Defensive check for missing results
    if (!finalSong) {
        appEl.innerHTML = `
            <div class="view-container">
                <h1>星辰迷航</h1>
                <p>在这个星系中暂时没能定位到你的坐标。</p>
                <button id="restart-btn" class="btn-primary" style="margin-top: 2rem;">回到原点重新出发</button>
            </div>
        `;
        document.getElementById('restart-btn').onclick = () => {
            state.view = 'welcome';
            state.qIdx = 0;
            state.answers = {};
            state.group = null;
            state.history = [];
            render();
        };
        return;
    }

    const configData = state.bank.configurations?.[state.group] || {};
    const songDb = state.bank.song_database?.[finalSong] || {};
    const albumName = songDb.album || configData.result_profiles?.[finalSong]?.album || "未知专辑";
    const description = songDb.description || configData.result_profiles?.[finalSong]?.description || "";
    const imgSrc = findAsset(finalSong) || findAsset(albumName);

    let iframeHtml = '';
    const rawIframe = state.iframeMap?.[finalSong];
    if (rawIframe) {
        let tag = rawIframe.replace(/src="\/\//i, 'src="https://');
        tag = tag.replace(/src="([^"]+)"/i, (m, src) => {
            const sep = src.includes('?') ? '&' : '?';
            // Added danmaku=0 and high_quality=1 for a cleaner premium experience
            return `src="${src}${sep}autoplay=1&danmaku=0&high_quality=1" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"`;
        });
        iframeHtml = tag;
    }

    appEl.innerHTML = `
        <div class="view-container result-block">
            <div class="result-card-glow"></div>
            <p class="result-group-name">${configData.name || '性格底色'}</p>
            <div class="result-core-logic">${(configData.core_logic || "").replace(/\n/g, '<br>')}</div>
            
            ${imgSrc ? `
            <div class="result-image-wrapper">
                <img src="${imgSrc}" loading="lazy" class="result-main-img">
                <div class="img-shimmer"></div>
            </div>` : ''}

            <h1 class="result-song-title">${finalSong}</h1>
            <p class="result-album-name">专辑《${albumName}》</p>
            
            <div class="result-description">
                <div class="quote-mark">“</div>
                <div>${description.replace(/\n/g, '<br>')}</div>
            </div>

            <div class="media-shell">${iframeHtml || `<p style="padding:2rem; color:#666;">（未在 iframe 清单中找到音频）</p>`}</div>
            
            <div class="share-hint">—— 截图保留你的克卜勒星丛 ——</div>
            
            <button id="restart-btn" class="btn-primary" style="margin-top: 2rem; width: auto; min-width: 200px;">
                重新寻找之旅
            </button>
        </div>
    `;

    document.getElementById('restart-btn').addEventListener('click', () => {
        state.view = 'welcome';
        state.qIdx = 0;
        state.answers = {};
        state.group = null;
        state.history = [];
        render();
    });
}

init();
