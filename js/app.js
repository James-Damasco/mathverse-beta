const BADGES_DATABASE = [
    { id: 'first_step', title: 'Novice Cadet', desc: 'Solved 1 question', icon: '🚀', color: 'bg-blue-100' },
    { id: 'addition_pro', title: 'Summoner Pro', desc: 'Mastered Addition', icon: '➕', color: 'bg-green-100' },
    { id: 'speed_demon', title: 'Speed Demon', desc: 'Combo level reached x5', icon: '⚡', color: 'bg-yellow-100' },
    { id: 'math_god', title: 'Grandmaster', desc: 'Earned 1000+ Total XP', icon: '👑', color: 'bg-purple-100' }
];

// WORLDS CONFIGURATION METRIC
const CAMPAIGN_WORLDS = [
    { id: 'space_world', name: 'Space Cosmos', category: 'Addition', icon: '🪐', color: 'from-cyan-400 to-blue-500', minXp: 0 },
    { id: 'jungle_world', name: 'Jungle Safari', category: 'Subtraction', icon: '🌴', color: 'from-green-400 to-emerald-600', minXp: 40 },
    { id: 'candy_world', name: 'Candy Metropolis', category: 'Multiplication', icon: '🍬', color: 'from-pink-400 to-rose-500', minXp: 120 },
    { id: 'ocean_world', name: 'Deep Sea Trench', category: 'Division', icon: '🐙', color: 'from-blue-400 to-indigo-600', minXp: 250 },
    { id: 'dino_island', name: 'Dinosaur Island', category: 'Geometry', icon: '🦖', color: 'from-amber-500 to-orange-600', minXp: 450 }
];

const COMPANION_AVATARS = ['🐱', '🦊', '🐸', '🤖', '🦁', '🦄', '🐼', '🐨', '🦖', '🐝'];

const App = {
    storage: {
        key: 'mathverse_production_profile_v2',

        getInitialSchema() {
            return {
                username: 'Explorer',
                avatar: '🐱',
                xp: 0,
                level: 1,
                coins: 40, // Started with 40 coins so player can try buying features early
                stars: 0,
                streak: 1,
                lastActiveTimestamp: Date.now(),
                unlockedBadges: ['first_step'],
                gameMode: 'normal',
                currentDifficulty: 'easy', // 'easy' (2 digits), 'medium' (3 digits), 'hard' (4 digits)
                purchasedWorlds: [], // Stores world IDs unlocked early via coin purchases
                currentWorld: 'space_world',
                history: [
                    { date: '2026-05-20', category: 'Addition', points: 10, accuracy: 80, timeSpent: 120 },
                    { date: '2026-05-22', category: 'Addition', points: 25, accuracy: 90, timeSpent: 180 }
                ]
            };
        },

        load() {
            let data = localStorage.getItem(this.key);
            if (!data) {
                data = this.getInitialSchema();
                this.save(data);
                return data;
            }
            let parsed = JSON.parse(data);
            // Handle retro-compatibility for new parameters safely
            if (!parsed.currentDifficulty) parsed.currentDifficulty = 'easy';
            if (!parsed.purchasedWorlds) parsed.purchasedWorlds = [];
            return parsed;
        },

        save(data) {
            localStorage.setItem(this.key, JSON.stringify(data));
        },

        mutate(callback) {
            const current = this.load();
            callback(current);
            this.save(current);
            App.ui.syncHUD(current);
        }
    },

    router: {
        currentScreen: null,

        navigate(screenId) {
            const state = App.storage.load();
            if (!state.username && screenId !== 'auth') {
                screenId = 'auth';
            }

            document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
            const targetPanel = document.getElementById(`screen-${screenId}`);

            if (targetPanel) {
                targetPanel.classList.remove('hidden');
                this.currentScreen = screenId;

                if (screenId === 'global-hud' || screenId !== 'auth') {
                    document.getElementById('global-hud').classList.remove('hidden');
                } else {
                    document.getElementById('global-hud').classList.add('hidden');
                }

                if (screenId === 'dashboard') App.ui.renderDashboardView();
                if (screenId === 'parent') App.analytics.renderParentDashboard();
                if (screenId === 'profile') App.ui.renderProfileView();

                gsap.fromTo(targetPanel, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
            }
        }
    },

    ui: {
        activeParentCodeAnswer: null,

        init() {
            const state = App.storage.load();
            this.syncHUD(state);

            if (!localStorage.getItem(App.storage.key)) {
                this.buildAvatarSelector('avatar-selector-grid');
                App.router.navigate('auth');
            } else {
                App.router.navigate('dashboard');
            }

            document.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('.dynamic-bounce')) {
                    App.audio.playFeedback('click');
                }
            });
        },

        syncHUD(state) {
            document.getElementById('hud-streak').innerText = `${state.streak} Day${state.streak > 1 ? 's' : ''}`;
            document.getElementById('hud-stars').innerText = state.stars;
            document.getElementById('hud-coins').innerText = state.coins;
            document.getElementById('hud-xp').innerText = `${state.xp} XP`;
            document.getElementById('hud-level-tag').innerText = `Lv. ${state.level}`;
            document.getElementById('hud-avatar-frame').innerText = state.avatar;
        },

        buildAvatarSelector(containerId, activeAvatar = '🐱') {
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            COMPANION_AVATARS.forEach(av => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `w-12 h-12 text-2xl border-4 rounded-xl flex items-center justify-center transition-all ${av === activeAvatar ? 'border-gamePurple bg-purple-100 scale-110' : 'border-gameDark hover:bg-gray-100'}`;
                btn.innerText = av;
                btn.onclick = () => {
                    Array.from(container.children).forEach(c => c.classList.remove('border-gamePurple', 'bg-purple-100', 'scale-110'));
                    Array.from(container.children).forEach(c => c.classList.add('border-gameDark'));
                    btn.classList.add('border-gamePurple', 'bg-purple-100', 'scale-110');
                    btn.dataset.selected = av;
                };
                container.appendChild(btn);
            });
            container.children[0].dataset.selected = activeAvatar;
        },

        renderDashboardView() {
            const state = App.storage.load();
            document.getElementById('dash-welcome-name').innerText = state.username;
            document.getElementById('dash-avatar-icon').innerText = state.avatar;

            const levelFloorXp = (state.level - 1) * 100;
            const nextLevelCeilXp = state.level * 100;
            const computedProgressPct = Math.min(100, Math.max(5, ((state.xp - levelFloorXp) / 100) * 100));

            document.getElementById('dash-xp-progress').style.width = `${computedProgressPct}%`;
            document.getElementById('dash-xp-text').innerText = `${state.xp} / ${nextLevelCeilXp} XP`;

            // Synchronize Difficulty level button selectors active classes states UI
            ['easy', 'medium', 'hard'].forEach(d => {
                const targetBtn = document.getElementById(`diff-btn-${d}`);
                if (state.currentDifficulty === d) {
                    targetBtn.className = "bg-gamePurple text-white border-4 border-gameDark rounded-xl py-3 font-bold text-lg heading-font transition-all scale-105 shadow-inner-cartoon";
                } else {
                    targetBtn.className = "bg-white hover:bg-gray-50 text-gameDark border-4 border-gameDark rounded-xl py-3 font-bold text-lg heading-font transition-all shadow-cartoon-sm";
                }
            });

            // Render Campaign Maps Grid
            const worldContainer = document.getElementById('world-maps-container');
            worldContainer.innerHTML = '';
            CAMPAIGN_WORLDS.forEach(world => {
                const isUnlockedByXp = state.xp >= world.minXp;
                const isUnlockedByPurchase = state.purchasedWorlds && state.purchasedWorlds.includes(world.id);
                const isAvailable = isUnlockedByXp || isUnlockedByPurchase;

                const card = document.createElement('div');
                card.className = `border-4 border-gameDark rounded-2xl p-4 text-white bg-gradient-to-br ${world.color} relative overflow-hidden shadow-cartoon transition-all ${isAvailable ? 'cursor-pointer hover:-translate-y-1' : 'opacity-90'}`;

                let actionButtonMarkup = '';
                if (isAvailable) {
                    actionButtonMarkup = `<span class="bg-white/30 text-xs px-2 py-0.5 rounded-full uppercase">Ready</span>`;
                } else {
                    actionButtonMarkup = `
                                <button onclick="event.stopPropagation(); App.game.buyWorldEarly('${world.id}', 60)" class="mt-1 bg-gameYellow hover:bg-amber-400 text-gameDark border-2 border-gameDark px-2 py-1 text-xs rounded-xl shadow-cartoon-sm font-bold block relative z-20">
                                    Unlock with 60 <i class='fa-solid fa-coins'
                                </button>
                            `;
                }

                card.innerHTML = `
                            <div class="absolute -right-4 -bottom-4 text-6xl opacity-20">${world.icon}</div>
                            <div class="flex justify-between items-start">
                                <span class="text-3xl">${world.icon}</span>
                                ${isAvailable ? `<span class="bg-white/30 text-xs px-2 py-0.5 rounded-full uppercase">Active</span>` : `<span class="bg-gameDark text-white text-xs px-2 py-0.5 rounded-full"><i class="fa-solid fa-lock"></i> Locked</span>`}
                            </div>
                            <h4 class="heading-font text-lg mt-2">${world.name}</h4>
                            <p class="text-xs text-white/90">Curriculum: ${world.category}</p>
                            <div class="mt-2 flex justify-between items-center">
                                ${!isAvailable ? `<p class="text-[10px] text-yellow-200 font-bold">Needs ${world.minXp} XP</p>` : '<p class="text-[10px] text-white/70">Unlocked Matrix</p>'}
                                ${actionButtonMarkup}
                            </div>
                        `;

                if (isAvailable) {
                    card.onclick = () => {
                        App.storage.mutate(s => s.currentWorld = world.id);
                        App.game.launchGameArenaSession();
                    };
                }
                worldContainer.appendChild(card);
            });

            // Render Achievement Showcase Rack
            const badgesContainer = document.getElementById('dashboard-achievements-rack');
            badgesContainer.innerHTML = '';
            BADGES_DATABASE.forEach(badge => {
                const earned = state.unlockedBadges.includes(badge.id);
                const box = document.createElement('div');
                box.className = `border-2 border-gameDark rounded-xl p-3 text-center transition-all ${earned ? `${badge.color} opacity-100` : 'bg-gray-100 opacity-40 grayscale'}`;
                box.innerHTML = `
                            <div class="text-2xl">${badge.icon}</div>
                            <div class="text-xs font-bold truncate mt-1">${badge.title}</div>
                            <div class="text-[10px] text-gray-500 leading-tight">${badge.desc}</div>
                        `;
                badgesContainer.appendChild(box);
            });

            // Render Game Match Mode Choices Options Controls
            const modes = [
                { id: 'normal', name: 'Adventure Quest', icon: 'fa-map' },
                { id: 'timed', name: 'Time Blitz Attack', icon: 'fa-stopwatch' },
                { id: 'endless', name: 'Endless Cosmos Run', icon: 'fa-infinity' }
            ];
            const modeRack = document.getElementById('game-mode-selector-rack');
            modeRack.innerHTML = '';
            modes.forEach(m => {
                const active = state.gameMode === m.id;
                const btn = document.createElement('button');
                btn.className = `w-full text-left p-3 rounded-xl border-2 border-gameDark flex items-center justify-between transition-all shadow-cartoon-sm ${active ? 'bg-gamePurple text-white' : 'bg-slate-50 text-gameDark hover:bg-gray-100'}`;
                btn.innerHTML = `
                            <span class="text-sm"><i class="fa-solid ${m.icon} mr-2"></i> ${m.name}</span>
                            ${active ? '<i class="fa-solid fa-circle-check"></i>' : ''}
                        `;
                btn.onclick = () => {
                    App.storage.mutate(s => s.gameMode = m.id);
                    App.ui.renderDashboardView();
                };
                modeRack.appendChild(btn);
            });
        },

        renderProfileView() {
            const state = App.storage.load();
            document.getElementById('profile-name-input').value = state.username;
            this.buildAvatarSelector('profile-avatar-grid', state.avatar);
        },

        toggleParentVerification() {
            const valA = Math.floor(Math.random() * 8) + 3;
            const valB = Math.floor(Math.random() * 7) + 3;
            this.activeParentCodeAnswer = valA * valB;

            document.getElementById('parent-gate-question').innerText = `${valA} x ${valB} = ?`;
            document.getElementById('parent-gate-answer').value = '';
            document.getElementById('parent-gate-modal').classList.remove('hidden');
        },

        closeParentVerification() {
            document.getElementById('parent-gate-modal').classList.add('hidden');
        },

        verifyParentGateSubmit() {
            const givenAns = parseInt(document.getElementById('parent-gate-answer').value);
            if (givenAns === this.activeParentCodeAnswer) {
                this.closeParentVerification();
                App.router.navigate('parent');
            } else {
                App.audio.playFeedback('wrong');
                alert("Incorrect secure response answer!");
                this.closeParentVerification();
            }
        },

        triggerRewardCelebrationModal(title, desc, items = { stars: 5, coins: 10, xp: 15 }) {
            document.getElementById('reward-modal-title').innerText = title;
            document.getElementById('reward-modal-desc').innerText = desc;
            document.getElementById('reward-gain-stars').innerText = `+${items.stars}`;
            document.getElementById('reward-gain-coins').innerText = `+${items.coins}`;
            document.getElementById('reward-gain-xp').innerText = `+${items.xp} XP`;

            const modal = document.getElementById('reward-modal');
            const card = document.getElementById('reward-modal-card');

            modal.classList.remove('hidden');
            App.audio.playFeedback('reward');

            gsap.to(card, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" });
        },

        closeRewardModal() {
            const card = document.getElementById('reward-modal-card');
            gsap.to(card, {
                scale: 0.8, opacity: 0, duration: 0.2, onComplete: () => {
                    document.getElementById('reward-modal').classList.add('hidden');
                    App.router.navigate('dashboard');
                }
            });
        },

        toggleLargeFont() {
            const currentSize = document.body.style.fontSize;
            document.body.style.fontSize = currentSize === '1.15rem' ? '1rem' : '1.15rem';
        }
    },

    auth: {
        handleRegistration(e) {
            e.preventDefault();
            const chosenName = document.getElementById('auth-username').value.trim();
            const selectGrid = document.getElementById('avatar-selector-grid');
            const selectedActiveNode = selectGrid.querySelector('[data-selected]');
            const chosenAvatar = selectedActiveNode ? selectedActiveNode.dataset.selected : '🐱';

            App.storage.mutate(state => {
                state.username = chosenName || 'Explorer';
                state.avatar = chosenAvatar;
            });

            App.router.navigate('dashboard');
        },

        triggerGuestMode() {
            App.storage.mutate(state => {
                state.username = "StarExplorer";
                state.avatar = "🤖";
            });
            App.router.navigate('dashboard');
        },

        saveProfileEdits() {
            const newName = document.getElementById('profile-name-input').value.trim();
            const activeNode = document.getElementById('profile-avatar-grid').querySelector('[data-selected]');
            const newAv = activeNode ? activeNode.dataset.selected : '🐱';

            App.storage.mutate(state => {
                if (newName) state.username = newName;
                state.avatar = newAv;
            });
            App.router.navigate('dashboard');
        },

        resetAllGameData() {
            if (confirm("Are you sure you want to completely erase all progress logs?")) {
                localStorage.removeItem(App.storage.key);
                window.location.reload();
            }
        }
    },

    audio: {
        muted: false,

        toggleMuteState() {
            this.muted = !this.muted;
            const btn = document.getElementById('audio-mute-btn');
            if (this.muted) {
                btn.innerText = "MUTED";
                btn.classList.remove('bg-gameGreen');
                btn.classList.add('bg-gray-300');
            } else {
                btn.innerText = "ACTIVE";
                btn.classList.remove('bg-gray-300');
                btn.classList.add('bg-gameGreen');
            }
        },

        playFeedback(type) {
            if (this.muted) return;
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                if (type === 'click') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, ctx.currentTime);
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.05);
                } else if (type === 'correct') {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.2);
                } else if (type === 'wrong') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(220, ctx.currentTime);
                    osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.25);
                } else if (type === 'reward') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
                    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.2);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.4);
                }
            } catch (e) {
                console.warn(e);
            }
        }
    },

    game: {
        activeSession: null,
        timerIntervalPointer: null,

        setDifficulty(levelMode) {
            App.storage.mutate(s => s.currentDifficulty = levelMode);
            App.ui.renderDashboardView();
        },

        buyWorldEarly(worldId, coinCost) {
            const state = App.storage.load();
            if (state.coins >= coinCost) {
                App.storage.mutate(s => {
                    s.coins -= coinCost;
                    if (!s.purchasedWorlds.includes(worldId)) {
                        s.purchasedWorlds.push(worldId);
                    }
                });
                App.audio.playFeedback('reward');
                alert("World unlocked early via coin booster! Ready for math action.");
                App.ui.renderDashboardView();
            } else {
                alert("Not enough coins! Solve more arena questions to collect rewards.");
            }
        },

        initiateContinueGame() {
            this.launchGameArenaSession();
        },

        launchGameArenaSession() {
            const state = App.storage.load();
            const activeWorld = CAMPAIGN_WORLDS.find(w => w.id === state.currentWorld) || CAMPAIGN_WORLDS[0];

            // Setup internal state configuration parameters mapping layout structures
            this.activeSession = {
                world: activeWorld,
                mode: state.gameMode,
                difficulty: state.currentDifficulty, // 'easy','medium','hard' -> 2,3,4 digits
                score: 0,
                combo: 1, // Will increase dynamically
                currentQuestionIdx: 0,
                timeAllowed: state.gameMode === 'timed' ? 25 : 60,
                timeLeft: 60,
                correctStreak: 0,
                historyLogData: [],
                hintsLeft: 3
            };

            this.activeSession.timeLeft = this.activeSession.timeAllowed;

            document.getElementById('arena-score').innerText = '0';
            document.getElementById('arena-combo').innerText = 'x1';
            document.getElementById('arena-info-difficulty').innerText = `Focus: ${activeWorld.category} (${state.currentDifficulty.toUpperCase()})`;
            document.getElementById('arena-world-identifier-tag').innerText = `Map: ${activeWorld.name}`;
            document.getElementById('arena-mascot-avatar').innerText = state.avatar;
            document.getElementById('hint-count-text').innerText = this.activeSession.hintsLeft;
            document.getElementById('buy-hint-btn').classList.add('hidden');

            // Reset unlimited tracker workspace dots indicator 
            document.getElementById('arena-question-dots').innerHTML = '';

            App.router.navigate('arena');
            this.generateNextProceduralQuestion();
            this.launchArenaTimerSystem();
        },

        launchArenaTimerSystem() {
            clearInterval(this.timerIntervalPointer);
            if (this.activeSession.mode === 'endless') {
                document.getElementById('arena-timer-container').classList.add('hidden');
                return;
            }
            document.getElementById('arena-timer-container').classList.remove('hidden');

            const pBar = document.getElementById('arena-timer-progress');
            const tText = document.getElementById('arena-timer-text');

            this.timerIntervalPointer = setInterval(() => {
                this.activeSession.timeLeft--;
                tText.innerText = `${this.activeSession.timeLeft}s`;

                const pct = (this.activeSession.timeLeft / this.activeSession.timeAllowed) * 100;
                pBar.style.width = `${pct}%`;

                if (this.activeSession.timeLeft <= 5) {
                    pBar.classList.remove('bg-gamePink');
                    pBar.classList.add('bg-red-500');
                }

                if (this.activeSession.timeLeft <= 0) {
                    clearInterval(this.timerIntervalPointer);
                    this.finishCurrentGameArenaSession();
                }
            }, 1000);
        },

        // UTILITY GENERATOR METHOD MATRICES FOR DIGIT ACCURACY RULES
        getRandomNDigitNumber(digitsCount) {
            const min = Math.pow(10, digitsCount - 1);
            const max = Math.pow(10, digitsCount) - 1;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        generateNextProceduralQuestion() {
            // Update unlimited indicator metrics nodes cleanly 
            const dotsRack = document.getElementById('arena-question-dots');
            const trackingNode = document.createElement('div');
            trackingNode.className = `w-4 h-4 rounded-full border border-gameDark bg-gameYellow flex-shrink-0 scale-110 transition-all`;
            trackingNode.id = `q-dot-${this.activeSession.currentQuestionIdx}`;
            dotsRack.appendChild(trackingNode);

            // Scroll alignment for continuous endless presentation node layout track
            dotsRack.scrollLeft = dotsRack.scrollWidth;

            const category = this.activeSession.world.category;
            let questionString = "";
            let targetCorrectValue = 0;
            let choicesArray = [];

            // Setup precise digit configurations mapping formulas rules models
            let targetDigits = 2; // Default Easy Mode
            if (this.activeSession.difficulty === 'medium') targetDigits = 3;
            if (this.activeSession.difficulty === 'hard') targetDigits = 4;

            if (category === 'Addition') {
                let a = this.getRandomNDigitNumber(targetDigits);
                let b = this.getRandomNDigitNumber(targetDigits);
                questionString = `${a} + ${b} = ?`;
                targetCorrectValue = a + b;
            } else if (category === 'Subtraction') {
                let a = this.getRandomNDigitNumber(targetDigits);
                // Prevent negative balances while preserving digit continuity lengths limits parameters
                let b = Math.floor(Math.random() * (a - Math.pow(10, targetDigits - 1))) + Math.pow(10, targetDigits - 1);
                if (b > a) b = Math.floor(a / 2);
                questionString = `${a} - ${b} = ?`;
                targetCorrectValue = a - b;
            } else if (category === 'Multiplication') {
                // Keep multiplication playable for kids even on higher digits via custom matrix balances multipliers
                let a = this.getRandomNDigitNumber(targetDigits);
                let b = Math.floor(Math.random() * 9) + 2; // single digit multiplier to maintain balance constraints logic
                questionString = `${a} × ${b} = ?`;
                targetCorrectValue = a * b;
            } else if (category === 'Division') {
                let quotient = Math.floor(Math.random() * 9) + 2;
                let divisor = this.getRandomNDigitNumber(targetDigits - 1 || 1);
                let dividend = divisor * quotient;

                questionString = `${dividend} ÷ ${divisor} = ?`;
                targetCorrectValue = quotient;
            } else {
                // Geometry dynamic generation mode matching digits metric configs placeholder
                let baseVal = this.getRandomNDigitNumber(targetDigits - 1 || 1);
                questionString = `Perimeter of square with side lengths of ${baseVal}?`;
                targetCorrectValue = baseVal * 4;
            }

            this.activeSession.currentTargetCorrectValue = targetCorrectValue;

            choicesArray.push(targetCorrectValue);
            while (choicesArray.length < 4) {
                let variance = (Math.floor(Math.random() * 9) + 1) * (Math.random() > 0.5 ? 1 : -1);
                let potentialChoice = targetCorrectValue + variance;
                if (potentialChoice >= 0 && !choicesArray.includes(potentialChoice)) {
                    choicesArray.push(potentialChoice);
                }
            }
            choicesArray.sort(() => Math.random() - 0.5);

            document.getElementById('arena-question-text').innerText = questionString;

            const answersGrid = document.getElementById('arena-answers-grid');
            answersGrid.innerHTML = '';

            choicesArray.forEach((choice) => {
                const btn = document.createElement('button');
                btn.className = `choice-card-element bg-white hover:bg-slate-50 text-gameDark border-4 border-gameDark rounded-2xl py-4 text-2xl font-bold shadow-cartoon transition-all transform active:translate-y-1 active:shadow-cartoon-sm dynamic-bounce`;
                btn.innerText = choice;
                btn.onclick = () => this.evaluateUserSelectionSubmission(choice, btn);
                answersGrid.appendChild(btn);
            });

            gsap.fromTo("#question-box-wrapper", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3 });
        },

        triggerDynamicHint() {
            if (this.activeSession.hintsLeft <= 0) {
                // Display buy option button cleanly inline
                document.getElementById('buy-hint-btn').classList.remove('hidden');
                alert("No free configuration hints remaining! Use your coins to purchase a hint.");
                return;
            }
            this.activeSession.hintsLeft--;
            document.getElementById('hint-count-text').innerText = this.activeSession.hintsLeft;

            const validAns = this.activeSession.currentTargetCorrectValue;
            const items = document.getElementsByClassName('choice-card-element');
            let removed = false;

            Array.from(items).forEach(btn => {
                if (parseInt(btn.innerText) !== validAns && !removed && !btn.disabled) {
                    btn.classList.add('opacity-30', 'line-through');
                    btn.disabled = true;
                    removed = true;
                }
            });
        },

        purchaseHintWithCoins() {
            const state = App.storage.load();
            if (state.coins >= 10) {
                App.storage.mutate(s => s.coins -= 10);
                this.activeSession.hintsLeft++;
                document.getElementById('hint-count-text').innerText = this.activeSession.hintsLeft;
                document.getElementById('buy-hint-btn').classList.add('hidden');
                App.audio.playFeedback('reward');
                this.triggerDynamicHint();
            } else {
                alert("Not enough coins to purchase a hint!");
            }
        },

        evaluateUserSelectionSubmission(chosenValue, nativeButtonNode) {
            const corr = this.activeSession.currentTargetCorrectValue;
            const isCorrect = chosenValue === corr;

            this.activeSession.historyLogData.push({
                index: this.activeSession.currentQuestionIdx,
                correct: isCorrect
            });

            const activeDot = document.getElementById(`q-dot-${this.activeSession.currentQuestionIdx}`);

            if (isCorrect) {
                App.audio.playFeedback('correct');
                nativeButtonNode.classList.remove('bg-white');
                nativeButtonNode.classList.add('bg-gameGreen');

                // Modified combo logic: Add +2 to combo for every correct answer
                this.activeSession.combo += 2;
                this.activeSession.score += 10 * this.activeSession.combo;
                this.activeSession.correctStreak++;

                // Flash combo burst screen elements feedback
                const pulseNode = document.getElementById('combo-pulse-bg');
                pulseNode.classList.remove('opacity-0');
                pulseNode.classList.add('opacity-20');
                setTimeout(() => pulseNode.classList.remove('opacity-20'), 300);

                if (activeDot) {
                    activeDot.classList.remove('bg-gameYellow');
                    activeDot.classList.add('bg-gameGreen');
                }

                document.getElementById('arena-mascot-dialogue').innerText = "Incredible calculation! Combo boosted by +2!";

            } else {
                App.audio.playFeedback('wrong');
                nativeButtonNode.classList.remove('bg-white');
                nativeButtonNode.classList.add('bg-gamePink');

                this.activeSession.combo = 1; // Reset parameters on mistake
                this.activeSession.correctStreak = 0;

                if (activeDot) {
                    activeDot.classList.remove('bg-gameYellow');
                    activeDot.classList.add('bg-gamePink');
                }

                document.getElementById('arena-mascot-dialogue').innerText = `Oops! The correct answer was ${corr}. Let's get the next one!`;
            }

            document.getElementById('arena-score').innerText = this.activeSession.score;
            document.getElementById('arena-combo').innerText = `x${this.activeSession.combo}`;

            document.getElementById('arena-answers-grid').style.pointerEvents = 'none';

            setTimeout(() => {
                document.getElementById('arena-answers-grid').style.pointerEvents = 'auto';
                this.activeSession.currentQuestionIdx++;

                // Game continues infinitely until player hits "Finish" or timer runs out
                this.generateNextProceduralQuestion();
            }, 1200);
        },

        finishCurrentGameArenaSession() {
            clearInterval(this.timerIntervalPointer);

            const loggedHits = this.activeSession.historyLogData;
            const correctCount = loggedHits.filter(h => h.correct).length;
            const accuracyPct = loggedHits.length > 0 ? Math.round((correctCount / loggedHits.length) * 100) : 0;

            const baseStarsGained = correctCount * 2;
            const baseCoinsGained = correctCount * 5;
            const baseXpGained = (correctCount * 15) + (this.activeSession.score > 100 ? 30 : 0);

            App.storage.mutate(state => {
                state.stars += baseStarsGained;
                state.coins += baseCoinsGained;
                state.xp += baseXpGained;

                const nextLevelTarget = state.level * 100;
                if (state.xp >= nextLevelTarget) {
                    state.level++;
                }

                const formattedIsoDate = new Date().toISOString().split('T')[0];
                state.history.push({
                    date: formattedIsoDate,
                    category: this.activeSession.world.category,
                    points: this.activeSession.score,
                    accuracy: accuracyPct,
                    timeSpent: this.activeSession.timeAllowed - this.activeSession.timeLeft
                });
            });

            let finishTitle = "Quest Rewards Calculated!";
            let finishDesc = `You resolved ${correctCount} mathematical challenges total in this run under the endless system configuration matrix.`;

            App.ui.triggerRewardCelebrationModal(finishTitle, finishDesc, {
                stars: baseStarsGained,
                coins: baseCoinsGained,
                xp: baseXpGained
            });
        }
    },

    analytics: {
        chartPointerA: null,
        chartPointerB: null,

        renderParentDashboard() {
            const state = App.storage.load();
            const logs = state.history || [];
            const totalSessionsCount = logs.length;
            const aggregateSolvedCount = logs.reduce((acc, cItem) => acc + Math.round(cItem.points / 10), 0);
            const totalEstimatedTimeSpent = Math.round(logs.reduce((acc, cItem) => acc + (cItem.timeSpent || 0), 0) / 60);

            const computationalAccuracyMean = totalSessionsCount > 0
                ? Math.round(logs.reduce((acc, cItem) => acc + cItem.accuracy, 0) / totalSessionsCount)
                : 0;

            document.getElementById('p-metric-sessions').innerText = totalSessionsCount;
            document.getElementById('p-metric-accuracy').innerText = `${computationalAccuracyMean}%`;
            document.getElementById('p-metric-solved').innerText = aggregateSolvedCount;
            document.getElementById('p-metric-time').innerText = `${totalEstimatedTimeSpent} min${totalEstimatedTimeSpent !== 1 ? 's' : ''}`;

            this.renderCategorizedStrengthsRadarChart(logs);
            this.renderProgressTimelineLineChart(logs);
            this.generateDiagnosticRecommendationsEngine(logs);
        },

        renderCategorizedStrengthsRadarChart(logs) {
            const ctx = document.getElementById('parentChartCategories').getContext('2d');
            if (this.chartPointerA) this.chartPointerA.destroy();

            const categoryTrackerMap = { 'Addition': [], 'Subtraction': [], 'Multiplication': [], 'Division': [], 'Geometry': [] };
            logs.forEach(item => {
                if (categoryTrackerMap[item.category] !== undefined) {
                    categoryTrackerMap[item.category].push(item.accuracy);
                }
            });

            const radarLabels = Object.keys(categoryTrackerMap);
            const radarDatasetValues = radarLabels.map(lbl => {
                const scoreSet = categoryTrackerMap[lbl];
                return scoreSet.length > 0 ? Math.round(scoreSet.reduce((a, b) => a + b, 0) / scoreSet.length) : 0;
            });

            this.chartPointerA = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: radarLabels,
                    datasets: [{
                        label: 'Accuracy % Score',
                        data: radarDatasetValues,
                        backgroundColor: ['#6C5CE7', '#55E6C1', '#FF7675', '#74B9FF', '#FFD200'],
                        borderWidth: 3,
                        borderColor: '#2D3436',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { min: 0, max: 100 } }
                }
            });
        },

        renderProgressTimelineLineChart(logs) {
            const ctx = document.getElementById('parentChartTimeline').getContext('2d');
            if (this.chartPointerB) this.chartPointerB.destroy();

            const tailLogs = logs.slice(-7);
            const sequenceLabels = tailLogs.map((item, idx) => `Run #${idx + 1}`);
            const accuracyTimelinePoints = tailLogs.map(item => item.accuracy);
            const pointsMetricTimelinePoints = tailLogs.map(item => item.points);

            this.chartPointerB = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sequenceLabels,
                    datasets: [
                        {
                            label: 'Accuracy Pct (%)',
                            data: accuracyTimelinePoints,
                            borderColor: '#6C5CE7',
                            backgroundColor: 'rgba(108, 92, 231, 0.1)',
                            tension: 0.3,
                            fill: true,
                            borderWidth: 4
                        },
                        {
                            label: 'Points Earned',
                            data: pointsMetricTimelinePoints,
                            borderColor: '#FF7675',
                            backgroundColor: 'transparent',
                            tension: 0.1,
                            borderWidth: 3,
                            borderDash: [6, 6]
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { min: 0, max: 100 } }
                }
            });
        },

        generateDiagnosticRecommendationsEngine(logs) {
            const listElementContainer = document.getElementById('parent-recommendations-list');
            listElementContainer.innerHTML = '';

            const categoryTrackerMap = { 'Addition': [], 'Subtraction': [], 'Multiplication': [], 'Division': [], 'Geometry': [] };
            logs.forEach(item => {
                if (categoryTrackerMap[item.category] !== undefined) categoryTrackerMap[item.category].push(item.accuracy);
            });

            let generatedRecommendationsCount = 0;

            Object.keys(categoryTrackerMap).forEach(cat => {
                const historySet = categoryTrackerMap[cat];
                const meanAccuracy = historySet.length > 0 ? historySet.reduce((a, b) => a + b, 0) / historySet.length : null;

                if (meanAccuracy !== null && meanAccuracy < 75) {
                    generatedRecommendationsCount++;
                    const row = document.createElement('div');
                    row.className = "py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2";
                    row.innerHTML = `
                                <div>
                                    <span class="inline-block bg-rose-100 text-rose-700 font-bold border border-rose-300 rounded-lg px-2.5 py-0.5 text-xs uppercase mb-1">Target Remediation Required</span>
                                    <h5 class="font-bold text-gameDark text-sm sm:text-base">Focus Area Optimization: ${cat} Track</h5>
                                    <p class="text-xs text-gray-500 max-w-xl">Current mathematical operational accuracy score tracks lower at <span class="text-gamePink font-bold">${Math.round(meanAccuracy)}%</span>.</p>
                                </div>
                                <button onclick="App.storage.mutate(s=>{s.currentWorld='${CAMPAIGN_WORLDS.find(w => w.category === cat)?.id || 'space_world'}'}); App.game.launchGameArenaSession();" class="bg-gameYellow border-2 border-gameDark text-xs px-3 py-1.5 rounded-xl shadow-cartoon-sm hover:bg-amber-400 self-start sm:self-center transition-all whitespace-nowrap">
                                    Launch Practice Arena <i class="fa-solid fa-arrow-right ml-1"></i>
                                </button>
                            `;
                    listElementContainer.appendChild(row);
                }
            });

            if (generatedRecommendationsCount === 0) {
                listElementContainer.innerHTML = `
                            <div class="py-4 text-center text-gray-500 text-sm">
                                <i class="fa-solid fa-circle-check text-gameGreen text-3xl mb-2 block"></i>
                                Universal educational tracking logs verify steady performance markers profiles across active categories! All accuracy targets verify greater than 75% margins limits clean.
                            </div>
                        `;
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    App.ui.init();
});