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
    const norm = name.toLowerCase().replace(/\s/g, '');
    for (const [key, val] of Object.entries(ASSETS_MAP)) {
        if (key.toLowerCase().replace(/\s/g, '').includes(norm) || norm.includes(key.toLowerCase().replace(/\s/g, ''))) {
            return `assets/${val}`;
        }
    }
    for (const val of Object.values(ASSETS_MAP)) {
        if (val.toLowerCase().replace(/\s/g, '').includes(norm)) return `assets/${val}`;
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
    state.bank = await loadQuestionBank();
    state.iframeMap = await loadIframeMap();
    render();
}

function render() {
    if (!state.bank) {
        appEl.innerHTML = `<div class="view-container"><h1>加载中...</h1></div>`;
        return;
    }

    // Determine target view state before starting transition
    let targetView = state.view;
    let quizData = null;
    let quizTotal = 0;

    if (targetView === 'quiz') {
        const gq = state.bank.global_questions || [];
        const cq = (state.bank.configurations?.[state.group]?.questions) || [];
        const allQ = [...gq, ...cq];
        quizTotal = allQ.length;
        
        if (state.qIdx < allQ.length) {
            quizData = allQ[state.qIdx];
        } else {
            state.view = 'result';
            targetView = 'result';
        }
    }

    transitionView(() => {
        if (targetView === 'welcome') {
            renderWelcome();
        } else if (targetView === 'quiz' && quizData) {
            renderQuiz(quizData, quizTotal);
        } else if (targetView === 'result') {
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
            return `src="${src}${sep}autoplay=1" allow="autoplay; fullscreen"`;
        });
        iframeHtml = tag;
    }

    appEl.innerHTML = `
        <div class="view-container result-block">
            <p class="result-group-name">${configData.name || '性格底色'}</p>
            <div class="result-core-logic">${(configData.core_logic || "").replace(/\n/g, '<br>')}</div>
            ${imgSrc ? `<div style="margin: 1rem auto; max-width: 400px;"><img src="${imgSrc}" loading="lazy" style="width:100%; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);"></div>` : ''}
            <h1 class="result-song-title">${finalSong}</h1>
            <p class="result-album-name">专辑《${albumName}》</p>
            <div class="result-description">
                <p style="font-weight:600; margin-bottom:1rem; color:var(--text-muted);">歌词与解读</p>
                <div>${description.replace(/\n/g, '<br>')}</div>
            </div>
            <div class="media-shell">${iframeHtml || `<p style="padding:2rem; color:#666;">（未在 iframe 清单中找到音频）</p>`}</div>
            <button id="restart-btn" class="btn-primary" style="margin-top: 2rem;">重启寻找之旅</button>
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
