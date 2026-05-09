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

let audioCtx;
let ambientOscillator;
let ambientGain;

function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    
    ambientOscillator = audioCtx.createOscillator();
    ambientOscillator.type = 'sine';
    ambientOscillator.frequency.value = 55;
    
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(ambientOscillator.frequency);
    lfo.start();

    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 300; 

    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0; 

    ambientOscillator.connect(ambientGain);
    noiseNode.connect(noiseFilter);
    noiseFilter.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    
    ambientOscillator.start();
    noiseNode.start();
}

function startAmbientNoise() {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (ambientGain) {
        ambientGain.gain.cancelScheduledValues(audioCtx.currentTime);
        ambientGain.gain.setTargetAtTime(0.4, audioCtx.currentTime, 2); 
    }
}

function stopAmbientNoise() {
    if (ambientGain && audioCtx) {
        ambientGain.gain.cancelScheduledValues(audioCtx.currentTime);
        ambientGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    }
}

const appEl = document.getElementById('app');

window.addEventListener('beforeunload', (e) => {
    if (state.view === 'quiz') {
        e.preventDefault();
        e.returnValue = '';
    }
});

async function init() {
    let ticking = false;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let starField = null;
    let kepler = null;

    const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

    const applyParallax = () => {
        if (!starField) starField = document.querySelector('.star-field');
        if (!kepler) kepler = document.querySelector('.kepler-system');
        
        // Use smoothing (LERP) for fluid motion on mobile
        currentX = lerp(currentX, targetX, 0.1);
        currentY = lerp(currentY, targetY, 0.1);

        // Only update if difference is perceptible to save CPU
        if (Math.abs(currentX - targetX) > 0.005 || Math.abs(currentY - targetY) > 0.005) {
            if (starField) starField.style.transform = `translate3d(${currentX * 40}px, ${currentY * 40}px, 0)`;
            if (kepler) kepler.style.transform = `translate3d(-50%, -50%, 0) translate3d(${currentX * -60}px, ${currentY * -60}px, 0.1px) rotateX(68deg) rotateY(${-5 + currentX * 10}deg)`;
            requestAnimationFrame(applyParallax);
        } else {
            ticking = false;
        }
    };

    const updateParallax = (x, y) => {
        targetX = x; targetY = y;
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(applyParallax);
        }
    };

    document.addEventListener('mousemove', (e) => {
        updateParallax((e.clientX / window.innerWidth) - 0.5, (e.clientY / window.innerHeight) - 0.5);
    });

    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            if (e.beta === null || e.gamma === null) return;
            // Normalize and limit range for smoother mobile experience
            const x = Math.max(-1, Math.min(1, e.gamma / 35)); 
            const y = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
            updateParallax(x, y);
        });
    }

    state.bank = await loadQuestionBank();
    state.iframeMap = await loadIframeMap();
    render();
}

function render() {
    const quizData = state.sessionQuestions[state.qIdx];
    const quizTotal = state.sessionQuestions.length;
    
    // Auto-transition to result if we exceed question count
    if (state.view === 'quiz' && state.qIdx >= quizTotal) {
        state.view = 'result';
        updateBackground(); // Final state
    }
    
    const currentView = state.view;
    transitionView(() => {
        if (currentView === 'welcome') renderWelcome();
        else if (currentView === 'quiz' && quizData) renderQuiz(quizData, quizTotal);
        else if (currentView === 'calculating') renderCalculating();
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
        startAmbientNoise();
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try { await DeviceOrientationEvent.requestPermission(); } catch (e) {}
        }
        initQuiz();
    });
}

function initQuiz() {
    const allQuestions = state.bank.questions || [];
    const pools = {};
    allQuestions.forEach(q => {
        if (q.id === 'Q13_SORT') return;
        const cat = q.category || 'other';
        if (!pools[cat]) pools[cat] = [];
        pools[cat].push(q);
    });

    const selected = [];
    const categories = Object.keys(pools);
    Object.values(pools).forEach(p => p.sort(() => 0.5 - Math.random()));

    let cIdx = 0;
    while (selected.length < 12 && categories.length > 0) {
        const cat = categories[cIdx % categories.length];
        if (pools[cat].length > 0) {
            selected.push(pools[cat].pop());
        } else {
            categories.splice(cIdx % categories.length, 1);
            continue;
        }
        cIdx++;
    }

    state.sessionQuestions = selected.sort(() => 0.5 - Math.random());
    const q13 = allQuestions.find(q => q.id === 'Q13_SORT');
    if (q13) state.sessionQuestions.push(q13);

    state.view = 'quiz'; state.qIdx = 0; state.answers = {}; state.history = [];
    updateBackground();
    render();

    // Background Asset Preloading (静默预加载专辑封面，干掉白屏)
    setTimeout(() => {
        Object.values(ASSETS_MAP).forEach(fileName => {
            const img = new Image();
            img.src = `assets/${fileName}`;
        });
    }, 500);
}

const DIMENSION_COLORS = {
    sincerity: { c1: 'rgba(255, 140, 0, 0.18)', c2: 'rgba(255, 69, 0, 0.12)' },    // Warm Orange/Gold (赤诚)
    lucidity: { c1: 'rgba(0, 255, 255, 0.15)', c2: 'rgba(0, 191, 255, 0.12)' },    // Clear Cyan/Blue (通透)
    autonomy: { c1: 'rgba(138, 43, 226, 0.22)', c2: 'rgba(75, 0, 130, 0.18)' },   // Deep Midnight Purple (孤傲)
    persistence: { c1: 'rgba(50, 205, 50, 0.12)', c2: 'rgba(34, 139, 34, 0.1)' }, // Nature Green (执守)
    fortitude: { c1: 'rgba(47, 79, 79, 0.25)', c2: 'rgba(0, 0, 0, 0.8)' },        // Dark Gunmetal/Slate (坚韧 - 沉重、冷硬、金属感)
    detachment: { c1: 'rgba(240, 248, 255, 0.25)', c2: 'rgba(176, 224, 230, 0.15)' }, // Ethereal White/Ice Blue (洒脱 - 轻盈、云淡风轻)
    other: { c1: 'rgba(75, 0, 130, 0.15)', c2: 'rgba(25, 25, 112, 0.12)' }
};

const BASE_NEUTRAL_COLOR_1 = [75, 0, 130, 0.15]; 
const BASE_NEUTRAL_COLOR_2 = [25, 25, 112, 0.12]; 

function extractRgba(rgbaString) {
    const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return [0,0,0,0];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseFloat(match[4] || 1)];
}

function updateBackground() {
    const total = state.sessionQuestions.length || 13;
    const progress = state.qIdx / total;
    const root = document.documentElement;

    if (state.view === 'welcome') {
        root.style.setProperty('--nebula-color-1', `rgba(${BASE_NEUTRAL_COLOR_1.join(',')})`);
        root.style.setProperty('--nebula-color-2', `rgba(${BASE_NEUTRAL_COLOR_2.join(',')})`);
        return;
    }

    if (state.view === 'result') {
        const result = calculateResult(state.answers, state.bank, state.sessionQuestions);
        const sortedDims = Object.entries(result.dimensions).sort((a, b) => b[1] - a[1]);
        const primaryDim = sortedDims[0][0];
        const colors = DIMENSION_COLORS[primaryDim] || DIMENSION_COLORS.other;
        root.style.setProperty('--nebula-color-1', colors.c1);
        root.style.setProperty('--nebula-color-2', colors.c2);
        return;
    }

    const partialResult = calculateResult(state.answers, state.bank, state.sessionQuestions.slice(0, state.qIdx));
    let primaryDim = 'other';
    if (partialResult && partialResult.dimensions) {
        const sortedDims = Object.entries(partialResult.dimensions).sort((a, b) => b[1] - a[1]);
        if (sortedDims.length > 0 && sortedDims[0][1] > 0) {
            primaryDim = sortedDims[0][0];
        }
    }

    const targetColors = DIMENSION_COLORS[primaryDim] || DIMENSION_COLORS.other;
    const tC1 = extractRgba(targetColors.c1);
    const tC2 = extractRgba(targetColors.c2);

    const blendFactor = Math.pow(progress, 1.5); 

    const r1 = Math.round(BASE_NEUTRAL_COLOR_1[0] + (tC1[0] - BASE_NEUTRAL_COLOR_1[0]) * blendFactor);
    const g1 = Math.round(BASE_NEUTRAL_COLOR_1[1] + (tC1[1] - BASE_NEUTRAL_COLOR_1[1]) * blendFactor);
    const b1 = Math.round(BASE_NEUTRAL_COLOR_1[2] + (tC1[2] - BASE_NEUTRAL_COLOR_1[2]) * blendFactor);
    const a1 = (BASE_NEUTRAL_COLOR_1[3] + (tC1[3] - BASE_NEUTRAL_COLOR_1[3]) * blendFactor).toFixed(3);

    const r2 = Math.round(BASE_NEUTRAL_COLOR_2[0] + (tC2[0] - BASE_NEUTRAL_COLOR_2[0]) * blendFactor);
    const g2 = Math.round(BASE_NEUTRAL_COLOR_2[1] + (tC2[1] - BASE_NEUTRAL_COLOR_2[1]) * blendFactor);
    const b2 = Math.round(BASE_NEUTRAL_COLOR_2[2] + (tC2[2] - BASE_NEUTRAL_COLOR_2[2]) * blendFactor);
    const a2 = (BASE_NEUTRAL_COLOR_2[3] + (tC2[3] - BASE_NEUTRAL_COLOR_2[3]) * blendFactor).toFixed(3);

    root.style.setProperty('--nebula-color-1', `rgba(${r1}, ${g1}, ${b1}, ${a1})`);
    root.style.setProperty('--nebula-color-2', `rgba(${r2}, ${g2}, ${b2}, ${a2})`);
}

function renderQuiz(qData, totalSteps) {
    const progress = Math.min(100, (state.qIdx / totalSteps) * 100);
    const labels = state.bank.project_info.likert_labels || ["很不同意", "不同意", "一般", "同意", "很同意"];
    
    appEl.innerHTML = `
        <div class="view-container">
            <div class="progress-container"><div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div></div>
            <div class="question-card">
                <p class="question-statement">${qData.statement}</p>
                <div id="interaction-zone"></div>
            </div>
        </div>
    `;

    const zone = document.getElementById('interaction-zone');
    const container = appEl.querySelector('.view-container');
    
    const next = () => { 
        state.qIdx++; 
        updateBackground(); 
        if (state.qIdx >= totalSteps) {
            state.view = 'calculating';
            render();
        } else {
            render(); 
        }
    };
    const back = () => {
        const prev = state.history.pop();
        if (prev) { state.qIdx = prev.qIdx; state.answers = prev.answers; delete state.tempSort; updateBackground(); render(); }
    };

    if (qData.type === 'sort') {
        renderSort(qData, zone);
    } else {
        const likert = document.createElement('div');
        likert.className = 'likert-container';
        likert.innerHTML = `
            <div class="likert-anchors"><span>${labels[0]}</span><span>${labels[4]}</span></div>
            <div class="likert-scale">
                ${[1, 2, 3, 4, 5].map(v => `
                    <button class="likert-dot ${state.answers[qData.id] === v ? 'selected' : ''}" data-score="${v}">
                        <span class="dot-inner"></span><span class="dot-label">${labels[v-1]}</span>
                    </button>
                `).join('')}
            </div>
        `;
        zone.appendChild(likert);
        likert.querySelectorAll('.likert-dot').forEach(btn => {
            btn.onclick = () => {
                if (isTransitioning || state.answers[qData.id] !== undefined) return;
                state.history.push(JSON.parse(JSON.stringify({ qIdx: state.qIdx, answers: state.answers })));
                state.answers[qData.id] = parseInt(btn.getAttribute('data-score'));
                
                likert.querySelectorAll('.likert-dot').forEach(d => d.classList.remove('selected'));
                btn.classList.add('selected');
                
                if (navigator.vibrate) navigator.vibrate(50);
                setTimeout(next, 300);
            };
        });
    }

    if (state.qIdx > 0) {
        const backBtn = document.createElement('button');
        backBtn.className = 'back-btn';
        backBtn.innerText = '← 返回星迹';
        backBtn.onclick = back;
        container.appendChild(backBtn);
    }
}

function renderSort(q, zone) {
    const instr = document.createElement('p');
    instr.className = 'sort-instruction';
    instr.innerText = q.instruction || '请按契合度将选项排序：';
    zone.appendChild(instr);

    const sortContainer = document.createElement('div');
    sortContainer.className = 'sort-container';
    
    const sortRanks = document.createElement('div');
    sortRanks.className = 'sort-ranks';
    
    const sortList = document.createElement('div');
    sortList.className = 'sort-list';
    
    if (!state.tempSort) {
        state.tempSort = q.options.map(o => o.id);
    }

    function updateSortUI() {
        sortList.innerHTML = '';
        sortRanks.innerHTML = '';
        state.tempSort.forEach((id, index) => {
            // Add fixed orbital rank
            const rankEl = document.createElement('div');
            rankEl.className = 'rank-num';
            rankEl.style.animationDelay = `${index * 0.1}s`;
            rankEl.innerText = index + 1;
            sortRanks.appendChild(rankEl);

            // Add draggable orbital item
            const opt = q.options.find(o => o.id === id);
            const item = document.createElement('div');
            item.className = 'sort-item';
            item.draggable = true;
            item.style.animation = `slideIn 0.5s ease backwards ${index * 0.05}s`;
            item.innerHTML = `<div class="sort-text">${opt.text}</div><div class="sort-handle">≡</div>`;
            
            item.ondragstart = (e) => { e.dataTransfer.setData('text/plain', index); item.classList.add('dragging'); };
            item.ondragend = () => item.classList.remove('dragging');
            item.ondragover = (e) => e.preventDefault();
            item.ondrop = (e) => {
                e.preventDefault();
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                const movedItem = state.tempSort.splice(fromIdx, 1)[0];
                state.tempSort.splice(index, 0, movedItem);
                updateSortUI();
            };

            // Mobile Touch Events for Drag & Drop
            let touchStartY = 0;
            let touchDiffY = 0;
            item.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
                touchDiffY = 0;
                item.classList.add('dragging');
                item.style.transition = 'none';
                item.style.zIndex = 100;
            }, { passive: true });
            
            item.addEventListener('touchmove', (e) => {
                touchDiffY = e.touches[0].clientY - touchStartY;
                item.style.transform = `translateY(${touchDiffY}px)`;
                e.preventDefault();
            }, { passive: false });
            
            item.addEventListener('touchend', (e) => {
                item.classList.remove('dragging');
                item.style.transition = '';
                item.style.transform = '';
                item.style.zIndex = '';
                
                if (Math.abs(touchDiffY) > 30) {
                    const step = Math.round(touchDiffY / 70); 
                    let newIndex = index + step;
                    newIndex = Math.max(0, Math.min(state.tempSort.length - 1, newIndex));
                    if (newIndex !== index) {
                        const movedItem = state.tempSort.splice(index, 1)[0];
                        state.tempSort.splice(newIndex, 0, movedItem);
                        updateSortUI();
                        return;
                    }
                }
                touchDiffY = 0;
            });

            // Mobile fallback: Tap to move up (Orbit jump)
            item.onclick = () => {
                if (Math.abs(touchDiffY) < 5 && index > 0) {
                    const movedItem = state.tempSort.splice(index, 1)[0];
                    state.tempSort.splice(index - 1, 0, movedItem);
                    updateSortUI();
                }
            };
            sortList.appendChild(item);
        });
    }

    updateSortUI();
    sortContainer.appendChild(sortRanks);
    sortContainer.appendChild(sortList);
    zone.appendChild(sortContainer);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-primary';
    submitBtn.style.marginTop = '2.5rem';
    submitBtn.style.width = '100%';
    submitBtn.innerText = '确认航道排序';
    submitBtn.onclick = () => {
        state.history.push(JSON.parse(JSON.stringify({ qIdx: state.qIdx, answers: state.answers })));
        state.answers[q.id] = [...state.tempSort];
        delete state.tempSort;
        state.qIdx++;
        updateBackground();
        if (state.qIdx >= state.sessionQuestions.length) {
            state.view = 'calculating';
        }
        render();
    };
    zone.appendChild(submitBtn);
}

function renderCalculating() {
    appEl.innerHTML = `
        <div class="view-container" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; text-align:center;">
            <div style="width:50px; height:50px; border:3px solid rgba(255,255,255,0.1); border-top-color:var(--accent-color); border-radius:50%; animation:spin 1s linear infinite;"></div>
            <div id="calc-text" style="margin-top:2rem; font-size:1.1rem; color:var(--text-dim); letter-spacing:0.2em; animation:pulseText 2s infinite alternate;">正在读取潜意识坐标...</div>
        </div>
    `;
    const phases = ["正在读取潜意识坐标...", "正在剥离社会化伪装...", "正在匹配克卜勒同类..."];
    let phaseIdx = 0;
    const interval = setInterval(() => {
        phaseIdx++;
        const textEl = document.getElementById('calc-text');
        if (textEl && phases[phaseIdx]) textEl.innerText = phases[phaseIdx];
    }, 1200);

    setTimeout(() => {
        clearInterval(interval);
        stopAmbientNoise();
        setTimeout(() => {
            state.view = 'result';
            updateBackground();
            render();
        }, 1200); // 1.2s vacuum
    }, 3600);
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
                    <div id="radar-tooltip" class="radar-tooltip"></div>
                    <svg viewBox="0 0 300 300" class="radar-chart" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="var(--accent-color)" stop-opacity="0.6" />
                                <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0.1" />
                            </radialGradient>
                            <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>
                        <!-- Radar Grids -->
                        ${[0.2, 0.4, 0.6, 0.8, 1.0].map(r => `
                            <polygon points="${[0, 60, 120, 180, 240, 300].map(a => {
                                const rad = (a - 90) * Math.PI / 180;
                                return `${150 + 100 * r * Math.cos(rad)},${150 + 100 * r * Math.sin(rad)}`;
                            }).join(' ')}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
                        `).join('')}
                        <!-- Dimension Lines -->
                        ${Object.keys(DIMENSION_NAMES).map((_, i) => {
                            const rad = (i * 60 - 90) * Math.PI / 180;
                            return `<line x1="150" y1="150" x2="${150 + 100 * Math.cos(rad)}" y2="${150 + 100 * Math.sin(rad)}" stroke="rgba(255,255,255,0.1)" />`;
                        }).join('')}
                        <!-- Data Polygon -->
                        <polygon points="${Object.keys(DIMENSION_NAMES).map((dim, i) => {
                            const rad = (i * 60 - 90) * Math.PI / 180;
                            const r = dims[dim] / 100;
                            return `${150 + 100 * r * Math.cos(rad)},${150 + 100 * r * Math.sin(rad)}`;
                        }).join(' ')}" fill="url(#radarGradient)" stroke="var(--accent-color)" stroke-width="3" filter="url(#glow)" />
                        <!-- Data Points -->
                        ${Object.keys(DIMENSION_NAMES).map((dim, i) => {
                            const rad = (i * 60 - 90) * Math.PI / 180;
                            const r = dims[dim] / 100;
                            const x = 150 + 100 * r * Math.cos(rad);
                            const y = 150 + 100 * r * Math.sin(rad);
                            return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" onmouseover="showRadarTooltip(event, '${DIMENSION_NAMES[dim]}', ${dims[dim]})" onmouseout="hideRadarTooltip()" />`;
                        }).join('')}
                    </svg>
                </div>
            </div>
            <div class="result-iframe-wrapper">
                ${iframeHtml}
                <div class="audio-fallback" style="margin-top:15px; text-align:center;">
                    <a href="https://music.163.com/#/search/m/?s=孙燕姿%20${encodeURIComponent(song)}&type=1" target="_blank" style="color:rgba(255,255,255,0.4); font-size:0.85rem; text-decoration:underline; letter-spacing:1px; display:inline-block; padding:10px;">
                        🎵 若视频加载受限，点此前往网易云聆听原曲
                    </a>
                </div>
            </div>
            <div class="action-buttons">
                <button id="save-card-btn" class="btn-primary">生成分享卡片</button>
                <button id="restart-btn" class="btn-outline">重新探索</button>
            </div>
            <div id="qr-code-zone" style="display:none"></div>
            <div id="capture-area" style="position:fixed; top:-9999px; left:-9999px; width:540px; height:auto; overflow:visible;"></div>
        </div>
    `;

    const captureArea = document.getElementById('capture-area');
    
    document.getElementById('save-card-btn').onclick = async function() {
        const btn = this; btn.innerText = "生成中..."; btn.disabled = true;
        
        // Generate QR Code dynamically
        const qrContainer = document.getElementById('qr-code-zone');
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: window.location.href,
            width: 120,
            height: 120,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        const hash = song.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const rarity = (1.2 + (hash % 500) / 100).toFixed(1);
        const rarityText = hash % 3 === 0 ? `潜意识稀有度：极度罕见` : `全网同类占比：${rarity}%`;

        // Wait for QR code to be ready
        await new Promise(r => setTimeout(r, 200));

        captureArea.innerHTML = `
            <div style="width:540px; min-height:960px; height:auto; background:#0a0a0c; color:#fff; font-family:sans-serif; position:relative; overflow:hidden; box-sizing:border-box; display:flex; flex-direction:column; padding:60px 40px;">
                <div style="position:absolute; top:-20%; left:-20%; width:140%; height:140%; background:radial-gradient(circle at center, rgba(138, 43, 226, 0.15) 0%, transparent 70%); z-index:0"></div>
                
                <div style="position:relative; z-index:1; display:flex; flex-direction:column; height:100%;">
                    <p style="text-transform:uppercase; letter-spacing:6px; font-size:14px; color:rgba(255,255,255,0.4); margin-bottom:30px; text-align:center">Kepler Personality Map</p>
                    
                    <div style="text-align:center; margin-bottom:40px;">
                         ${imgSrc ? `<img src="${imgSrc}" crossorigin="anonymous" style="width:160px; height:160px; border-radius:50%; object-fit:cover; margin-bottom:20px; border:3px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.5)">` : ''}
                         <h2 style="font-size:36px; margin:0; font-weight:800; letter-spacing:2px;">${song}</h2>
                         <p style="font-size:16px; color:#b088ff; margin:10px 0; font-weight:600;">${rarityText}</p>
                    </div>

                    <div style="background:rgba(255,255,255,0.05); padding:25px; border-radius:24px; margin-bottom:40px; line-height:1.8; font-size:16px; color:#e0e0e6">
                        <div style="color:#b088ff; font-weight:800; margin-bottom:12px; font-size:14px; letter-spacing:1px">探测报告 // REPORT</div>
                        <div style="font-weight:600; margin-bottom:15px; letter-spacing:0;">${soulReading.replace(/【/g, '').replace(/】/g, '').replace(/<strong>/g, '<span style="color:#fff; font-weight:900">').replace(/<\/strong>/g, '</span>')}</div>
                        <div style="opacity:0.8; font-size:15px; border-top:1px solid rgba(255,255,255,0.1); padding-top:15px; letter-spacing:0;">
                            ${(songDb.description || "").replace(/\n/g, '<br>')}
                        </div>
                    </div>

                    <div style="flex:1; display:flex; justify-content:center; align-items:center; margin-bottom:40px;">
                        <!-- Radar SVG with simplified styles for html2canvas -->
                        <svg viewBox="-20 -20 340 340" style="width:300px; height:300px" xmlns="http://www.w3.org/2000/svg">
                            ${[0.2, 0.4, 0.6, 0.8, 1.0].map(r => `
                                <polygon points="${[0, 60, 120, 180, 240, 300].map(a => {
                                    const rad = (a - 90) * Math.PI / 180;
                                    return `${150 + 100 * r * Math.cos(rad)},${150 + 100 * r * Math.sin(rad)}`;
                                }).join(' ')}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                            `).join('')}
                            <polygon points="${Object.keys(DIMENSION_NAMES).map((dim, i) => {
                                const rad = (i * 60 - 90) * Math.PI / 180;
                                const r = dims[dim] / 100;
                                return `${150 + 100 * r * Math.cos(rad)},${150 + 100 * r * Math.sin(rad)}`;
                            }).join(' ')}" fill="rgba(138, 43, 226, 0.4)" stroke="#b088ff" stroke-width="4" />
                            ${Object.keys(DIMENSION_NAMES).map((dim, i) => {
                                const rad = (i * 60 - 90) * Math.PI / 180;
                                const x = 150 + 125 * Math.cos(rad);
                                const y = 150 + 125 * Math.sin(rad);
                                let anchor = "middle";
                                if (x < 140) anchor = "end";
                                if (x > 160) anchor = "start";
                                let dy = 5;
                                if (y < 140) dy = 0;
                                if (y > 160) dy = 12;
                                return `<text x="${x}" y="${y}" fill="rgba(255,255,255,0.8)" font-size="14" font-weight="800" text-anchor="${anchor}" dy="${dy}">${DIMENSION_NAMES[dim]}</text>`;
                            }).join('')}
                        </svg>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:40px">
                        ${Object.entries(dims).map(([dim, val]) => `
                            <div style="text-align:center; background:rgba(255,255,255,0.03); padding:12px; border-radius:16px; border:1px solid rgba(255,255,255,0.08)">
                                <p style="font-size:12px; opacity:0.5; margin-bottom:4px">${DIMENSION_NAMES[dim]}</p>
                                <p style="font-size:18px; font-weight:800; color:#b088ff">${val}%</p>
                            </div>
                        `).join('')}
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.15); padding-top:30px; margin-top:auto;">
                         <div style="display:flex; align-items:center; gap:20px">
                             <div id="final-qr-placeholder" style="width:90px; height:90px; background:#fff; padding:8px; border-radius:12px; display:flex; align-items:center; justify-content:center;"></div>
                             <div>
                                 <p style="font-size:18px; font-weight:800; margin:0 0 6px 0; letter-spacing:1px">寻找克卜勒</p>
                                 <p style="font-size:12px; opacity:0.5; margin:0">长按或扫描，寻找你的同类</p>
                             </div>
                         </div>
                         <div style="text-align:right; opacity:0.3; font-size:10px; letter-spacing:1px">
                            DESIGNED BY<br>ANTIGRAVITY
                         </div>
                    </div>
                </div>
            </div>
        `;

        // Generate QR code directly into the placeholder canvas instead of cloning
        const placeholder = document.getElementById('final-qr-placeholder');
        if (placeholder) {
            new QRCode(placeholder, {
                text: window.location.href,
                width: 74,
                height: 74,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        try {
            await new Promise(r => setTimeout(r, 300)); // Wait for render and images
            
            // Critical: Ensure all images in captureArea are loaded
            const imgs = captureArea.querySelectorAll('img');
            await Promise.all(Array.from(imgs).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
            }));

            const contentDiv = captureArea.querySelector('div');
            const captureHeight = contentDiv.offsetHeight || 960;

            const canvas = await html2canvas(contentDiv, { 
                backgroundColor: '#0a0a0c', 
                scale: 2, 
                useCORS: true,
                allowTaint: true,
                logging: false,
                width: 540,
                height: captureHeight,
                windowWidth: 540,
                windowHeight: captureHeight
            });
            const link = document.createElement('a'); 
            link.download = `Kepler-${song}.png`;
            link.href = canvas.toDataURL('image/png'); 
            link.click();
        } catch (e) { 
            console.error(e);
            alert("生成失败。"); 
        } finally { 
            btn.innerText = "生成分享卡片"; 
            btn.disabled = false; 
        }
    };

    document.getElementById('restart-btn').onclick = () => {
        state.view = 'welcome'; state.qIdx = 0; state.answers = {}; state.history = []; render();
    };
}

window.showRadarTooltip = function(e, label, val) {
    const tt = document.getElementById('radar-tooltip');
    if (!tt) return;
    tt.innerHTML = `${label}: <span style="color:var(--accent-color); font-weight:800">${val}%</span>`;
    tt.style.opacity = '1';
    const rect = e.target.closest('.radar-wrapper').getBoundingClientRect();
    tt.style.left = `${e.clientX - rect.left}px`;
    tt.style.top = `${e.clientY - rect.top - 40}px`;
};

window.hideRadarTooltip = function() {
    const tt = document.getElementById('radar-tooltip');
    if (tt) tt.style.opacity = '0';
};

init();
