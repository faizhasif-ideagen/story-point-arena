console.log('🎮 game.js is loading...');

// Game State
const GameState = {
    LOGIN: 'login',
    NETWORK_LOGIN: 'network_login',
    ESTIMATION: 'estimation',
    SETUP: 'setup',
    BATTLE: 'battle',
    WINNER: 'winner',
    RANKINGS: 'rankings'
};

console.log('✅ GameState defined');

class Game {
    constructor() {
        console.log('🎮 Game constructor called');
        this.state = GameState.LOGIN;
        this.players = [];
        this.networkPlayers = [];
        this.battleKnights = [];
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.battleStartTime = 0;
        this.keys = {};
        this.mouse = { x: 0, y: 0, canvasX: 0, canvasY: 0 }; // Track mouse position
        this.teams = { left: [], right: [] };
        this.currentBattleStats = {};
        this.battleEnded = false;
        this.isNetworkMode = false; // Track if we're in multiplayer mode

        console.log('📂 Loading players from storage...');
        this.loadPlayersFromStorage();
        console.log('🎛️  Initializing event listeners...');
        this.initEventListeners();
        console.log('🌐 Initializing network listeners...');
        this.initNetworkListeners();
        console.log('✅ Game initialized successfully');
    }

    initEventListeners() {
        console.log('  → Setting up login screen listeners...');
        // Login screen
        document.getElementById('networkLoginBtn').addEventListener('click', () => this.showNetworkLogin());
        document.getElementById('localPlayBtn').addEventListener('click', () => this.showLocalPlay());

        console.log('  → Setting up network login screen listeners...');
        // Network login screen - skip buttons that don't exist
        const backToLoginBtn = document.getElementById('backToLoginBtn');
        if (backToLoginBtn) {
            backToLoginBtn.addEventListener('click', () => this.showScreen(GameState.LOGIN));
        }

        console.log('  → Setting up estimation screen listeners...');
        // Estimation screen
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeTask());
        document.getElementById('proceedToSetupBtn').addEventListener('click', () => this.proceedToSetup());
        document.getElementById('taskDescription').addEventListener('input', () => {
            // Clear results when user starts typing again
            const resultsDiv = document.getElementById('analysisResults');
            if (!resultsDiv.querySelector('.waiting-message')) {
                // Results exist, show a hint that they can re-analyze
            }
        });

        console.log('  → Setting up setup screen listeners...');
        // Setup screen
        document.getElementById('addPlayerBtn').addEventListener('click', () => this.addPlayer());
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPlayer();
        });
        document.getElementById('startTournamentBtn').addEventListener('click', () => this.startBattle());
        document.getElementById('finishRoundBtn').addEventListener('click', () => this.showRankings());

        // Winner screen
        document.getElementById('returnToLobbyBtn').addEventListener('click', () => this.returnToLobby());
        document.getElementById('editPointsBtn').addEventListener('click', () => this.editStoryPoints());
        document.getElementById('nextBattleBtn').addEventListener('click', () => this.nextBattle());
        document.getElementById('viewRankingsBtn').addEventListener('click', () => this.showRankings());
        document.getElementById('newTournamentBtn').addEventListener('click', () => this.reset());

        // Rankings screen
        document.getElementById('backToSetupBtn').addEventListener('click', () => {
            this.showScreen(GameState.SETUP);
            // Scroll to player input section
            setTimeout(() => {
                const setupContainer = document.querySelector('.setup-container');
                if (setupContainer) {
                    setupContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        });
        document.getElementById('resetStatsBtn').addEventListener('click', () => this.resetAllStats());
        document.getElementById('clearAllDataBtn').addEventListener('click', () => this.clearAllData());

        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ' && this.state === GameState.BATTLE) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Mouse controls for shield direction
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            // Convert to canvas coordinates if canvas exists
            if (this.canvas && this.state === GameState.BATTLE) {
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.canvasX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
                this.mouse.canvasY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            }
        });

        console.log('  → Setting up network lobby listeners...');
        // Network lobby event listeners
        const createRoomBtn = document.getElementById('createRoomBtn');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const leaveRoomBtn = document.getElementById('leaveRoomBtn');
        const addNetworkPlayerBtn = document.getElementById('addNetworkPlayerBtn');
        const networkStartBattleBtn = document.getElementById('networkStartBattleBtn');
        const networkPlayerName = document.getElementById('networkPlayerName');
        const roomCodeInput = document.getElementById('roomCodeInput');

        console.log('=== Network Button Setup ===');
        console.log('createRoomBtn element:', createRoomBtn);
        console.log('networkManager exists:', typeof networkManager !== 'undefined');
        if (typeof networkManager !== 'undefined') {
            console.log('networkManager.connected:', networkManager.connected);
        }

        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                console.log('🔥 CREATE ROOM BUTTON CLICKED! 🔥');
                this.createRoom();
            });
            console.log('✅ Create room button listener attached successfully');
        } else {
            console.error('❌ ERROR: createRoomBtn not found in DOM');
        }

        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => this.joinRoom());
        }

        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        }

        if (addNetworkPlayerBtn) {
            addNetworkPlayerBtn.addEventListener('click', () => this.addNetworkPlayer());
        }

        if (networkStartBattleBtn) {
            networkStartBattleBtn.addEventListener('click', () => this.startNetworkBattle());
        }

        if (networkPlayerName) {
            networkPlayerName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addNetworkPlayer();
            });
        }

        if (roomCodeInput) {
            roomCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }

        console.log('  ✅ All event listeners set up successfully!');
    }

    initNetworkListeners() {
        console.log('  → Checking network manager...');
        if (typeof networkManager === 'undefined') {
            console.warn('NetworkManager not available - multiplayer features disabled');
            return;
        }

        console.log('Initializing network listeners...');

        // Listen to network events
        networkManager.on('players-updated', (players) => {
            this.onNetworkPlayersUpdated(players);
        });

        networkManager.on('battle-started', (players) => {
            this.onNetworkBattleStarted(players);
        });

        networkManager.on('knight-moved', (moveData) => {
            this.onNetworkKnightMoved(moveData);
        });

        networkManager.on('knight-attacked', (attackData) => {
            this.onNetworkKnightAttacked(attackData);
        });

        networkManager.on('knight-damaged', (damageData) => {
            this.onNetworkKnightDamaged(damageData);
        });

        networkManager.on('battle-ended', (winnerData) => {
            this.onNetworkBattleEnded(winnerData);
        });

        networkManager.on('became-host', () => {
            this.updateHostIndicator(true);
        });

        networkManager.on('player-left', (socketId) => {
            console.log('Player disconnected:', socketId);
            // Handle player disconnection during battle if needed
        });
    }

    analyzeTask() {
        const textarea = document.getElementById('taskDescription');
        const text = textarea.value.trim();

        if (!text) {
            alert('Please enter a task description first!');
            return;
        }

        // Show loading state
        const resultsDiv = document.getElementById('analysisResults');
        resultsDiv.innerHTML = '<div class="analyzing"><span class="spinner">⚙️</span><p>Analyzing task complexity...</p></div>';

        // Simulate AI processing delay
        setTimeout(() => {
            const analysis = this.performAIAnalysis(text);
            this.displayAnalysis(analysis);
        }, 1500);
    }

    performAIAnalysis(text) {
        const words = text.split(/\s+/).length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
        const chars = text.length;

        // Complexity indicators
        const technicalWords = ['API', 'database', 'authentication', 'integration', 'deployment', 'security', 'encryption', 'optimization', 'architecture', 'infrastructure', 'migration', 'refactor', 'algorithm', 'backend', 'frontend', 'microservice', 'cloud', 'server', 'testing', 'validation'];
        const uncertainWords = ['maybe', 'possibly', 'unclear', 'TBD', 'not sure', 'depends', 'complex', 'complicated'];
        const integrationWords = ['integrate', 'connect', 'sync', 'third-party', 'external', 'API', 'webhook', 'service'];
        const multipleWords = ['multiple', 'several', 'many', 'various', 'different', 'all', 'every'];

        const textLower = text.toLowerCase();

        const technicalCount = technicalWords.filter(w => textLower.includes(w.toLowerCase())).length;
        const uncertainCount = uncertainWords.filter(w => textLower.includes(w.toLowerCase())).length;
        const integrationCount = integrationWords.filter(w => textLower.includes(w.toLowerCase())).length;
        const multipleCount = multipleWords.filter(w => textLower.includes(w.toLowerCase())).length;

        // Calculate complexity score (0-100)
        let complexityScore = 0;

        // Base complexity from length
        complexityScore += Math.min(words / 10, 15); // Up to 15 points for length
        complexityScore += Math.min(sentences * 3, 15); // Up to 15 points for detail

        // Technical complexity
        complexityScore += technicalCount * 8; // Each technical term adds
        complexityScore += integrationCount * 6; // Integration points
        complexityScore += multipleCount * 4; // Scope indicators
        complexityScore += uncertainCount * 5; // Uncertainty adds complexity

        // Cap at 100
        complexityScore = Math.min(complexityScore, 100);

        // Map to Fibonacci story points
        let recommendedPoints;
        let confidence;
        let reasoning = [];

        if (complexityScore < 10) {
            recommendedPoints = [1, 2];
            confidence = 'High';
            reasoning.push('Very simple task with minimal complexity');
        } else if (complexityScore < 25) {
            recommendedPoints = [2, 3];
            confidence = 'High';
            reasoning.push('Simple task with straightforward implementation');
        } else if (complexityScore < 40) {
            recommendedPoints = [3, 5];
            confidence = 'Medium';
            reasoning.push('Moderate complexity requiring some planning');
        } else if (complexityScore < 60) {
            recommendedPoints = [5, 8];
            confidence = 'Medium';
            reasoning.push('Complex task with multiple components');
        } else if (complexityScore < 80) {
            recommendedPoints = [8, 13];
            confidence = 'Low';
            reasoning.push('Highly complex task requiring significant effort');
        } else {
            recommendedPoints = [13, 21];
            confidence = 'Low';
            reasoning.push('Very complex task, consider breaking down');
        }

        // Add specific reasoning
        if (technicalCount > 2) reasoning.push(`${technicalCount} technical terms detected`);
        if (integrationCount > 0) reasoning.push('Involves integration with external systems');
        if (uncertainCount > 0) reasoning.push('Contains uncertainty - may need clarification');
        if (multipleCount > 2) reasoning.push('Broad scope - affects multiple areas');
        if (words > 100) reasoning.push('Detailed description suggests complex requirements');

        return {
            text,
            words,
            sentences,
            complexityScore: Math.round(complexityScore),
            recommendedPoints,
            confidence,
            reasoning,
            technicalCount,
            integrationCount,
            uncertainCount
        };
    }

    displayAnalysis(analysis) {
        const resultsDiv = document.getElementById('analysisResults');

        const primaryPoint = analysis.recommendedPoints[0];
        const secondaryPoint = analysis.recommendedPoints[1];

        resultsDiv.innerHTML = `
            <div class="analysis-complete">
                <div class="complexity-meter">
                    <div class="complexity-label">Complexity Score</div>
                    <div class="complexity-bar">
                        <div class="complexity-fill" style="width: ${analysis.complexityScore}%"></div>
                    </div>
                    <div class="complexity-value">${analysis.complexityScore}/100</div>
                </div>

                <div class="recommended-points">
                    <h3>Recommended Story Points</h3>
                    <div class="points-options">
                        <div class="point-option primary">
                            <div class="point-number">${primaryPoint}</div>
                            <div class="point-label">Primary Recommendation</div>
                        </div>
                        <div class="point-option secondary">
                            <div class="point-number">${secondaryPoint}</div>
                            <div class="point-label">Alternative</div>
                        </div>
                    </div>
                    <div class="confidence-badge confidence-${analysis.confidence.toLowerCase()}">
                        Confidence: ${analysis.confidence}
                    </div>
                </div>

                <div class="analysis-details">
                    <h4>Analysis Details</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-icon">📝</span>
                            <span>${analysis.words} words, ${analysis.sentences} sentences</span>
                        </div>
                        ${analysis.technicalCount > 0 ? `
                        <div class="detail-item">
                            <span class="detail-icon">⚙️</span>
                            <span>${analysis.technicalCount} technical terms found</span>
                        </div>` : ''}
                        ${analysis.integrationCount > 0 ? `
                        <div class="detail-item">
                            <span class="detail-icon">🔗</span>
                            <span>${analysis.integrationCount} integration points</span>
                        </div>` : ''}
                        ${analysis.uncertainCount > 0 ? `
                        <div class="detail-item">
                            <span class="detail-icon">❓</span>
                            <span>${analysis.uncertainCount} uncertainty indicators</span>
                        </div>` : ''}
                    </div>

                    <div class="reasoning-section">
                        <h4>AI Reasoning</h4>
                        <ul class="reasoning-list">
                            ${analysis.reasoning.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                </div>

                <div class="action-hint">
                    💡 Use these story points when setting up your team battle!
                </div>
            </div>
        `;
    }

    proceedToSetup() {
        this.showScreen(GameState.SETUP);

        // Scroll to player input section
        setTimeout(() => {
            const playerInputSection = document.querySelector('.player-input-section');
            if (playerInputSection) {
                playerInputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }

    // LocalStorage methods
    loadPlayersFromStorage() {
        const saved = localStorage.getItem('storyPointKnights_players');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.players = data.map(p => {
                    const player = new Player(p.name, p.storyPoints);
                    // Load stats
                    player.kills = p.kills || 0;
                    player.damageDealt = p.damageDealt || 0;
                    player.wins = p.wins || 0;
                    player.gamesPlayed = p.gamesPlayed || 0;
                    return player;
                });
            } catch (e) {
                console.error('Failed to load players from storage', e);
            }
        }
    }

    savePlayersToStorage() {
        const data = this.players.map(p => ({
            name: p.name,
            storyPoints: p.storyPoints,
            kills: p.kills || 0,
            damageDealt: p.damageDealt || 0,
            wins: p.wins || 0,
            gamesPlayed: p.gamesPlayed || 0
        }));
        localStorage.setItem('storyPointKnights_players', JSON.stringify(data));
    }

    // Login screen methods
    showNetworkLogin() {
        this.showScreen(GameState.NETWORK_LOGIN);
        this.isNetworkMode = true;
        this.networkPlayers = [];

        // Show room selection, hide lobby
        document.getElementById('roomSelection').style.display = 'block';
        document.getElementById('lobbyContainer').style.display = 'none';
        document.getElementById('roomInfo').style.display = 'none';
        document.getElementById('shareInstruction').style.display = 'none';

        this.updateNetworkPlayersList();
    }

    showLocalPlay() {
        this.isNetworkMode = false;
        this.showScreen(GameState.ESTIMATION);
    }

    // Network room management
    createRoom() {
        console.log('🚀 createRoom() method called');
        console.log('typeof networkManager:', typeof networkManager);

        if (typeof networkManager === 'undefined') {
            console.error('❌ networkManager is undefined');
            alert('Network manager not initialized. Please make sure the server is running and refresh the page.');
            return;
        }

        console.log('networkManager.connected:', networkManager.connected);
        console.log('networkManager.isConnected():', networkManager.isConnected());

        if (!networkManager.isConnected()) {
            console.error('❌ Not connected to server');
            alert('Not connected to server. Please make sure the server is running at http://localhost:3000');
            return;
        }

        console.log('✅ All checks passed, calling networkManager.createRoom()...');
        networkManager.createRoom((response) => {
            console.log('📥 Create room response:', response);
            if (response.success) {
                console.log('✅ Room created successfully:', response.roomCode);
                this.showLobby(response.roomCode, true);
            } else {
                console.error('❌ Failed to create room:', response.error);
                alert('Failed to create room: ' + response.error);
            }
        });
    }

    joinRoom() {
        const roomCodeInput = document.getElementById('roomCodeInput');
        const roomCode = roomCodeInput.value.trim().toUpperCase();

        if (!roomCode) {
            alert('Please enter a room code');
            return;
        }

        networkManager.joinRoom(roomCode, (response) => {
            if (response.success) {
                this.showLobby(roomCode, false);
            } else {
                alert('Failed to join room: ' + response.error);
            }
        });
    }

    showLobby(roomCode, isHost) {
        // Hide room selection, show lobby
        document.getElementById('roomSelection').style.display = 'none';
        document.getElementById('lobbyContainer').style.display = 'block';
        document.getElementById('roomInfo').style.display = 'block';
        document.getElementById('shareInstruction').style.display = 'block';

        // Display room code
        document.getElementById('roomCodeDisplay').textContent = roomCode;

        // Show host indicator if applicable
        this.updateHostIndicator(isHost);

        // Clear input fields
        document.getElementById('networkPlayerName').value = '';
        document.getElementById('networkFibonacciNumber').value = '';
    }

    updateHostIndicator(isHost) {
        const hostIndicator = document.getElementById('hostIndicator');
        const startButton = document.getElementById('networkStartBattleBtn');

        if (isHost) {
            hostIndicator.style.display = 'block';
            startButton.style.display = 'block';
        } else {
            hostIndicator.style.display = 'none';
            startButton.style.display = 'none';
        }
    }

    leaveRoom() {
        networkManager.leaveRoom();

        // Reset UI
        this.networkPlayers = [];
        this.showNetworkLogin();
    }

    addNetworkPlayer() {
        const nameInput = document.getElementById('networkPlayerName');
        const fibSelect = document.getElementById('networkFibonacciNumber');
        const name = nameInput.value.trim();
        const storyPoints = fibSelect.value;

        if (!name) {
            alert('Please enter a player name');
            return;
        }

        if (!storyPoints) {
            alert('Please select story points');
            return;
        }

        // Create player with unique ID
        const playerData = {
            id: `${networkManager.getMySocketId()}-${Date.now()}`,
            name: name,
            storyPoints: parseInt(storyPoints),
            socketId: networkManager.getMySocketId()
        };

        // Send to server
        networkManager.addPlayer(playerData);

        // Clear inputs
        nameInput.value = '';
        fibSelect.value = '';
    }

    onNetworkPlayersUpdated(players) {
        // Update local network players list
        this.networkPlayers = players.map(p => {
            // Create Player instances with stats
            return new Player(p.name, p.storyPoints, p.id, p.socketId);
        });

        this.updateNetworkPlayersList();

        // Update start button state (only for host)
        if (networkManager.isHost) {
            const startButton = document.getElementById('networkStartBattleBtn');
            startButton.disabled = this.networkPlayers.length < 2;
        }
    }

    updateNetworkPlayersList() {
        const list = document.getElementById('networkPlayersList');

        if (this.networkPlayers.length === 0) {
            list.innerHTML = '<p class="waiting-message">Waiting for players to join...</p>';
            return;
        }

        list.innerHTML = '';
        this.networkPlayers.forEach((player) => {
            const item = document.createElement('div');
            item.className = 'network-player-item';
            const isMe = player.socketId === networkManager.getMySocketId();

            item.innerHTML = `
                <div style="flex: 1;">
                    <div><strong>${player.name}</strong> ${isMe ? '(You)' : ''} - Story Points: ${player.storyPoints}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.6);">HP: ${player.maxHp}, Dmg: ${player.damage}, Range: ${player.attackRange}</div>
                </div>
                ${isMe ? `<button onclick="game.removeNetworkPlayer('${player.id}')" style="background: #dc3545; color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer;">Remove</button>` : ''}
            `;
            list.appendChild(item);
        });
    }

    removeNetworkPlayer(playerId) {
        if (networkManager) {
            networkManager.removePlayer(playerId);
        }
    }

    startNetworkBattle() {
        if (this.networkPlayers.length < 2) {
            alert('Need at least 2 players to start battle');
            return;
        }

        // Host generates initial knight positions
        if (networkManager.isHost) {
            const initialPositions = this.generateKnightPositions(this.networkPlayers.length);
            // Send positions along with battle start
            networkManager.socket.emit('start-battle-with-positions', { positions: initialPositions });
        }
    }

    generateKnightPositions(count) {
        const positions = [];
        const margin = 80;
        const minDistance = 60;
        const canvasWidth = 1400;
        const canvasHeight = 800;

        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let pos;
            do {
                pos = {
                    x: margin + Math.random() * (canvasWidth - margin * 2),
                    y: margin + Math.random() * (canvasHeight - margin * 2),
                    rotation: Math.random() * Math.PI * 2
                };
                attempts++;
            } while (attempts < 100 && positions.some(p => {
                const dx = p.x - pos.x;
                const dy = p.y - pos.y;
                return Math.sqrt(dx * dx + dy * dy) < minDistance;
            }));
            positions.push(pos);
        }
        return positions;
    }

    onNetworkBattleStarted(players, positions) {
        // All clients receive this and start battle with synchronized positions
        this.players = this.networkPlayers;
        this.initialKnightPositions = positions; // Store for setupAllKnights
        this.startBattle();
    }

    onNetworkKnightMoved(moveData) {
        // Find the knight that moved by player ID
        const knight = this.battleKnights.find(k => k.player.id === moveData.playerId);
        if (knight && knight.player.socketId !== networkManager.getMySocketId()) {
            // Only update if it's not our own knight
            knight.x = moveData.x;
            knight.y = moveData.y;
            knight.rotation = moveData.rotation;
            knight.isBlocking = moveData.isBlocking || false;
            if (moveData.shieldDirection !== undefined) {
                knight.shieldDirection = moveData.shieldDirection;
            }
        }
    }

    onNetworkKnightAttacked(attackData) {
        // Find the knight that attacked by socket ID
        const attacker = this.battleKnights.find(k => k.player.socketId === attackData.socketId);
        if (!attacker) return;

        // Trigger attack animation
        attacker.isAttacking = true;
        attacker.swordSwingActive = true;
        attacker.swordSwingProgress = 0;
        attacker.damageAppliedThisSwing = false;
    }

    onNetworkKnightDamaged(damageData) {
        // Find target knight
        const target = this.battleKnights.find(k => k.player.id === damageData.targetId);
        if (!target) return;

        // Apply damage
        target.hp = damageData.newHp;

        // Log
        this.log(`${damageData.attackerName} hit ${damageData.targetName} for ${damageData.damage} damage!`);

        // Check if killed
        if (!target.isAlive()) {
            this.log(`💀 ${target.player.name} was defeated!`);
        }
    }

    onNetworkBattleEnded(winnerData) {
        // Sync battle end
        if (!this.battleEnded) {
            this.battleEnded = true;
            this.endBattle(winnerData.winningTeam);
        }
    }

    addPlayer() {
        const nameInput = document.getElementById('playerName');
        const fibSelect = document.getElementById('fibonacciNumber');
        const name = nameInput.value.trim();
        const storyPoints = fibSelect.value;

        if (!name) {
            alert('Please enter a player name');
            return;
        }

        if (!storyPoints) {
            alert('Please select story points');
            return;
        }

        if (this.players.length >= 20) {
            alert('Maximum 20 players allowed');
            return;
        }

        const player = new Player(name, parseInt(storyPoints));
        this.players.push(player);

        nameInput.value = '';
        fibSelect.value = '';

        this.savePlayersToStorage();
        this.updatePlayersList();
        this.updateStartButton();
    }

    removePlayer(index) {
        this.players.splice(index, 1);
        this.savePlayersToStorage();
        this.updatePlayersList();
        this.updateStartButton();
    }

    updatePlayersList() {
        const listContainer = document.getElementById('playersList');
        listContainer.innerHTML = '';

        // Group by story points
        const grouped = {};
        this.players.forEach(player => {
            if (!grouped[player.storyPoints]) {
                grouped[player.storyPoints] = [];
            }
            grouped[player.storyPoints].push(player);
        });

        this.players.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'player-item';
            item.innerHTML = `
                <div>
                    <strong>${player.name}</strong>
                    (Story Points: ${player.storyPoints}) -
                    HP: ${player.maxHp}, Dmg: ${player.damage}, Range: ${player.attackRange}
                </div>
                <button onclick="game.removePlayer(${index})">Remove</button>
            `;
            listContainer.appendChild(item);
        });
    }

    updateStartButton() {
        const startBtn = document.getElementById('startTournamentBtn');
        const errorDiv = document.getElementById('startError');

        // Check if we have enough players
        if (this.players.length < 2) {
            startBtn.disabled = true;
            errorDiv.textContent = '';
            return;
        }

        // Check if all players have the same story points
        const uniqueStoryPoints = [...new Set(this.players.map(p => p.storyPoints))];

        if (uniqueStoryPoints.length === 1) {
            startBtn.disabled = true;
            errorDiv.textContent = '⚠️ All players have the same story points! Add players with different values to create teams.';
            return;
        }

        // All checks passed
        startBtn.disabled = false;
        errorDiv.textContent = '';
    }

    createTeams() {
        // Group players by story points
        const storyPointGroups = {};
        this.players.forEach(player => {
            if (!storyPointGroups[player.storyPoints]) {
                storyPointGroups[player.storyPoints] = [];
            }
            storyPointGroups[player.storyPoints].push(player);
        });

        // Get unique story point values
        const storyPointValues = Object.keys(storyPointGroups).map(Number).sort((a, b) => a - b);

        // Assign teams - alternate between left and right, or group by lower vs higher values
        // Split into two groups: lower half goes left, upper half goes right
        const midPoint = Math.ceil(storyPointValues.length / 2);
        const leftValues = storyPointValues.slice(0, midPoint);
        const rightValues = storyPointValues.slice(midPoint);

        this.teams.left = [];
        this.teams.right = [];

        leftValues.forEach(value => {
            storyPointGroups[value].forEach(player => {
                this.teams.left.push(player);
            });
        });

        rightValues.forEach(value => {
            storyPointGroups[value].forEach(player => {
                this.teams.right.push(player);
            });
        });

        // If one team is empty, redistribute
        if (this.teams.left.length === 0 || this.teams.right.length === 0) {
            this.teams.left = [];
            this.teams.right = [];
            this.players.forEach((player, index) => {
                if (index % 2 === 0) {
                    this.teams.left.push(player);
                } else {
                    this.teams.right.push(player);
                }
            });
        }
    }

    startBattle() {
        if (this.players.length < 2) return;

        // Reset battle stats
        this.currentBattleStats = {};
        this.battleEnded = false; // Flag to prevent duplicate stat updates

        // Create teams
        this.createTeams();

        // Setup battle
        this.showScreen(GameState.BATTLE);
        this.initCanvas();
        this.setupAllKnights();
        this.battleStartTime = Date.now();
        this.startBattleLoop();
    }

    initCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 1400;
        this.canvas.height = 800;
    }

    setupAllKnights() {
        this.battleKnights = [];

        const leftColor = '#FF6B6B';
        const rightColor = '#4ECDC4';

        // Margin from edges
        const margin = 80;
        const minDistance = 60; // Minimum distance between knights

        // Helper function to generate random position
        const getRandomPosition = () => {
            return {
                x: margin + Math.random() * (this.canvas.width - margin * 2),
                y: margin + Math.random() * (this.canvas.height - margin * 2)
            };
        };

        // Helper function to check if position is too close to existing knights
        const isTooClose = (pos, existingKnights) => {
            return existingKnights.some(knight => {
                const dx = knight.x - pos.x;
                const dy = knight.y - pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < minDistance;
            });
        };

        // Helper function to find valid spawn position
        const findValidPosition = (maxAttempts = 100) => {
            for (let i = 0; i < maxAttempts; i++) {
                const pos = getRandomPosition();
                if (!isTooClose(pos, this.battleKnights)) {
                    return pos;
                }
            }
            // If no valid position found, return random anyway
            return getRandomPosition();
        };

        let positionIndex = 0;

        // Spawn left team
        this.teams.left.forEach((player) => {
            let pos, rotation;
            if (this.initialKnightPositions && positionIndex < this.initialKnightPositions.length) {
                // Use synchronized positions (network mode)
                const syncPos = this.initialKnightPositions[positionIndex];
                pos = { x: syncPos.x, y: syncPos.y };
                rotation = syncPos.rotation;
                positionIndex++;
            } else {
                // Generate random position (local mode)
                pos = findValidPosition();
                rotation = Math.random() * Math.PI * 2;
            }
            const knight = new Knight(player, pos.x, pos.y, leftColor, 'left');
            knight.rotation = rotation;
            this.battleKnights.push(knight);
        });

        // Spawn right team
        this.teams.right.forEach((player) => {
            let pos, rotation;
            if (this.initialKnightPositions && positionIndex < this.initialKnightPositions.length) {
                // Use synchronized positions (network mode)
                const syncPos = this.initialKnightPositions[positionIndex];
                pos = { x: syncPos.x, y: syncPos.y };
                rotation = syncPos.rotation;
                positionIndex++;
            } else {
                // Generate random position (local mode)
                pos = findValidPosition();
                rotation = Math.random() * Math.PI * 2;
            }
            const knight = new Knight(player, pos.x, pos.y, rightColor, 'right');
            knight.rotation = rotation;
            this.battleKnights.push(knight);
        });

        // Clear synchronized positions after use
        this.initialKnightPositions = null;

        // Update HUD
        document.getElementById('currentMatch').textContent =
            `Left Team (${this.teams.left.length}) VS Right Team (${this.teams.right.length})`;
    }

    startBattleLoop() {
        const loop = () => {
            if (this.state !== GameState.BATTLE) return;

            this.updateBattle();
            this.renderBattle();

            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    updateBattle() {
        // Update timer
        const elapsed = Math.floor((Date.now() - this.battleStartTime) / 1000);
        document.getElementById('battleTimer').textContent = `Time: ${elapsed}s`;

        // Update all knights
        this.battleKnights.forEach((knight, index) => {
            if (knight.isAlive()) {
                // In network mode: control your own knights (by socketId)
                // In local mode: control first knight only
                const isMyKnight = this.isNetworkMode
                    ? (knight.player.socketId === networkManager.getMySocketId())
                    : (index === 0);

                if (isMyKnight) {
                    // Player-controlled: respond to keyboard input
                    const oldX = knight.x;
                    const oldY = knight.y;
                    const oldRotation = knight.rotation;
                    const oldBlocking = knight.isBlocking;
                    const oldShieldDirection = knight.shieldDirection;

                    knight.update(this.keys, this.canvas.width, this.canvas.height, this.mouse.canvasX, this.mouse.canvasY);

                    // In network mode, broadcast position/state if changed
                    if (this.isNetworkMode && (oldX !== knight.x || oldY !== knight.y || oldRotation !== knight.rotation || oldBlocking !== knight.isBlocking || oldShieldDirection !== knight.shieldDirection)) {
                        networkManager.sendKnightMove({
                            playerId: knight.player.id,
                            x: knight.x,
                            y: knight.y,
                            rotation: knight.rotation,
                            isBlocking: knight.isBlocking,
                            shieldDirection: knight.shieldDirection
                        });
                    }
                } else if (!this.isNetworkMode) {
                    // Local mode: AI controls other knights
                    knight.updateAI(this.battleKnights, this.canvas.width, this.canvas.height);
                }
                // In network mode, other players' knights don't move locally
                // They wait for position updates from the network

                // Update cooldowns and shield recovery (this should always run)
                knight.updateCooldowns();

                // Shield recovery for all knights
                if (!knight.isBlocking && knight.shieldHp < knight.maxShieldHp) {
                    knight.shieldHp = Math.min(knight.maxShieldHp, knight.shieldHp + knight.shieldRecoveryRate);
                }

                // Handle attacks
                if (knight.isAttacking) {
                    this.checkAttackHits(knight);
                }
            }
        });

        // Check for battle end (only once)
        if (!this.battleEnded) {
            const leftAlive = this.battleKnights.filter(k => k.team === 'left' && k.isAlive()).length;
            const rightAlive = this.battleKnights.filter(k => k.team === 'right' && k.isAlive()).length;

            if (leftAlive === 0 && rightAlive > 0) {
                this.endBattle('right');
            } else if (rightAlive === 0 && leftAlive > 0) {
                this.endBattle('left');
            } else if (leftAlive === 0 && rightAlive === 0) {
                this.endBattle('draw');
            }
        }
    }

    checkAttackHits(attacker) {
        if (!attacker.justAttacked) return;
        attacker.justAttacked = false;

        this.battleKnights.forEach(target => {
            // Can't attack same team
            if (target.team === attacker.team) return;
            if (!target.isAlive()) return;
            if (target === attacker) return;

            const dx = target.x - attacker.x;
            const dy = target.y - attacker.y;
            const distance = Math.hypot(dx, dy);

            // Check if target is within range
            if (distance > attacker.attackRange) return;

            // Calculate angle to target (in radians)
            const angleToTarget = Math.atan2(dy, dx);

            // Get attacker's facing angle (in radians)
            const facingAngle = attacker.rotation;

            // Calculate angle difference
            let angleDiff = angleToTarget - facingAngle;

            // Normalize to -PI to PI
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Convert attack cone angle to radians
            const coneAngleRad = (attacker.attackAngle * Math.PI / 180) / 2;

            // Check if target is within attack cone
            if (Math.abs(angleDiff) <= coneAngleRad) {
                const damage = attacker.player.damage;

                // Find all teammates (including target) who can block this attack with their shield
                const blockingTeammates = [];

                this.battleKnights.forEach(knight => {
                    // Only check same team members who are alive and blocking with shield HP
                    if (knight.team === target.team && knight.isAlive() && knight.isBlocking && knight.shieldHp > 0) {
                        // Calculate angle from this knight to attacker
                        const dx2 = attacker.x - knight.x;
                        const dy2 = attacker.y - knight.y;
                        const distToAttacker = Math.hypot(dx2, dy2);

                        // Check if attacker is close enough to this knight
                        if (distToAttacker <= 150) { // Shield protection range
                            const angleFromKnight = Math.atan2(dy2, dx2);

                            // Calculate angle difference between shield direction and attack direction
                            let blockAngleDiff = angleFromKnight - knight.shieldDirection;

                            // Normalize to -PI to PI
                            while (blockAngleDiff > Math.PI) blockAngleDiff -= Math.PI * 2;
                            while (blockAngleDiff < -Math.PI) blockAngleDiff += Math.PI * 2;

                            // Convert block angle to radians
                            const blockAngleRad = (knight.blockAngle * Math.PI / 180) / 2;

                            // Check if attack is within block cone
                            if (Math.abs(blockAngleDiff) <= blockAngleRad) {
                                blockingTeammates.push(knight);
                            }
                        }
                    }
                });

                // If any teammates are blocking (including target)
                if (blockingTeammates.length > 0) {
                    // Distribute damage across all blocking shields
                    const damagePerShield = damage / blockingTeammates.length;

                    blockingTeammates.forEach(blocker => {
                        const damageToShield = Math.min(damagePerShield, blocker.shieldHp);
                        blocker.shieldHp -= damageToShield;

                        if (blocker === target) {
                            this.log(`${target.player.name} BLOCKED ${Math.round(damageToShield)} damage! (${Math.round(blocker.shieldHp)}/${Math.round(blocker.maxShieldHp)})`);
                        } else {
                            this.log(`${blocker.player.name} protected ${target.player.name}! Blocked ${Math.round(damageToShield)} damage! (${Math.round(blocker.shieldHp)}/${Math.round(blocker.maxShieldHp)})`);
                        }
                    });

                    // If all shields broke, apply overflow damage to target
                    const totalShieldDamage = blockingTeammates.reduce((sum, b) => sum + Math.min(damagePerShield, b.shieldHp), 0);
                    const overflowDamage = damage - totalShieldDamage;

                    if (overflowDamage > 0) {
                        target.takeDamage(overflowDamage);
                        this.log(`Shields broke! ${target.player.name} took ${Math.round(overflowDamage)} HP damage!`);

                        if (!target.isAlive()) {
                            // Track kill
                            if (!this.currentBattleStats[attacker.player.name]) {
                                this.currentBattleStats[attacker.player.name] = { kills: 0, damageDealt: 0 };
                            }
                            this.currentBattleStats[attacker.player.name].kills++;
                            this.log(`${target.player.name} was defeated!`);
                        }
                    }
                } else {
                    // No shields blocking - apply damage directly to target
                    target.takeDamage(damage);

                    // Network sync: Send damage event
                    if (this.isNetworkMode && typeof networkManager !== 'undefined') {
                        networkManager.sendKnightDamage({
                            attackerId: attacker.player.id,
                            attackerName: attacker.player.name,
                            targetId: target.player.id,
                            targetName: target.player.name,
                            damage: damage,
                            newHp: target.hp
                        });
                    }

                    // Track damage dealt
                    if (!this.currentBattleStats[attacker.player.name]) {
                        this.currentBattleStats[attacker.player.name] = { kills: 0, damageDealt: 0 };
                    }
                    this.currentBattleStats[attacker.player.name].damageDealt += damage;

                    this.log(`${attacker.player.name} hit ${target.player.name} for ${damage} damage!`);

                    if (!target.isAlive()) {
                        // Track kill
                        this.currentBattleStats[attacker.player.name].kills++;
                        console.log(`Kill tracked: ${attacker.player.name} killed ${target.player.name}. Total kills this battle: ${this.currentBattleStats[attacker.player.name].kills}`);
                        this.log(`${target.player.name} has been defeated!`);
                    }
                }
            }
        });
    }

    renderBattle() {
        // Clear canvas with black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw center line with faint gold
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([15, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw arena grid with faint gold lines
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Draw team indicators (top corners)
        this.ctx.textAlign = 'left';
        this.ctx.font = 'bold 20px Arial';

        // Left team indicator
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.fillText('● RED TEAM', 20, 35);

        // Right team indicator
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#4ECDC4';
        this.ctx.fillText('CYAN TEAM ●', this.canvas.width - 20, 35);

        // Draw swords (behind knights)
        this.battleKnights.forEach(knight => {
            if (knight.isAlive()) {
                knight.renderSword(this.ctx);
            }
        });

        // Draw knights
        this.battleKnights.forEach(knight => {
            knight.render(this.ctx);
        });

        // Draw blocks (in front of knights)
        this.battleKnights.forEach(knight => {
            if (knight.isAlive()) {
                knight.renderBlock(this.ctx);
            }
        });

        // Draw score below team indicators
        const leftAlive = this.battleKnights.filter(k => k.team === 'left' && k.isAlive()).length;
        const rightAlive = this.battleKnights.filter(k => k.team === 'right' && k.isAlive()).length;

        this.ctx.font = 'bold 18px Arial';

        // Left team score
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`${leftAlive} alive`, 20, 55);

        // Right team score
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${rightAlive} alive`, this.canvas.width - 20, 55);

        // Draw controls legend box on right side
        const legendX = this.canvas.width - 250;
        const legendY = 100;
        const legendWidth = 230;
        const legendHeight = 200;

        // Draw box background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

        // Draw border
        this.ctx.strokeStyle = '#00CED1';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

        // Draw title
        this.ctx.fillStyle = '#00CED1';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('CONTROLS', legendX + legendWidth / 2, legendY + 25);

        // Draw controls with color coding
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        let yPos = legendY + 50;
        const lineHeight = 22;

        // Movement
        this.ctx.fillStyle = '#FFD700'; // Gold
        this.ctx.fillText('WASD / Arrows', legendX + 15, yPos);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Move', legendX + 150, yPos);
        yPos += lineHeight;

        // Mouse Aim
        this.ctx.fillStyle = '#87CEEB'; // Sky blue
        this.ctx.fillText('MOUSE', legendX + 15, yPos);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Aim (All)', legendX + 150, yPos);
        yPos += lineHeight;

        // Attack
        this.ctx.fillStyle = '#FF6B6B'; // Red
        this.ctx.fillText('SPACE', legendX + 15, yPos);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Attack', legendX + 150, yPos);
        yPos += lineHeight;

        // Block (Hold-based - emphasized)
        this.ctx.fillStyle = '#4ECDC4'; // Cyan
        this.ctx.fillText('C (HOLD)', legendX + 15, yPos);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Block', legendX + 150, yPos);
        yPos += lineHeight + 10;

        // Additional info
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.font = '11px Arial';
        this.ctx.fillText('Mouse aims attack & shield', legendX + 15, yPos);
    }

    endBattle(winner) {
        // Set flag to prevent this from being called multiple times
        this.battleEnded = true;

        cancelAnimationFrame(this.animationId);

        // Update player statistics (only once!)
        this.updatePlayerStats(winner);

        if (winner === 'draw') {
            this.log('Battle ended in a draw!');
            setTimeout(() => this.showWinner(null), 2000);
        } else {
            const winningTeam = winner === 'left' ? 'Left Team' : 'Right Team';
            this.log(`${winningTeam} wins!`);
            setTimeout(() => this.showWinner(winner), 2000);
        }
    }

    updatePlayerStats(winner) {
        console.log('=== Battle Stats Update ===');
        console.log('Battle stats:', this.currentBattleStats);
        console.log('Winner:', winner);

        // Update games played for all players
        this.players.forEach(player => {
            const oldGames = player.gamesPlayed || 0;
            player.gamesPlayed = oldGames + 1;

            // Update stats from battle
            if (this.currentBattleStats[player.name]) {
                const oldKills = player.kills || 0;
                const oldDamage = player.damageDealt || 0;
                const battleKills = this.currentBattleStats[player.name].kills;
                const battleDamage = this.currentBattleStats[player.name].damageDealt;

                player.kills = oldKills + battleKills;
                player.damageDealt = oldDamage + battleDamage;

                console.log(`${player.name}: +${battleKills} kills (${oldKills} → ${player.kills}), +${battleDamage} damage (${oldDamage} → ${player.damageDealt})`);
            }
        });

        // Update wins for winning team
        if (winner !== 'draw') {
            const winningTeam = winner === 'left' ? this.teams.left : this.teams.right;
            console.log('Winning team players:', winningTeam.map(p => p.name));
            winningTeam.forEach(player => {
                const oldWins = player.wins || 0;
                player.wins = oldWins + 1;
                console.log(`${player.name}: +1 win (${oldWins} → ${player.wins})`);
            });
        }

        this.savePlayersToStorage();
        console.log('=== Stats Update Complete ===');
    }

    showWinner(winner) {
        this.showScreen(GameState.WINNER);

        const display = document.getElementById('winnerDisplay');

        // Show/hide buttons based on mode
        const returnToLobbyBtn = document.getElementById('returnToLobbyBtn');
        const editPointsBtn = document.getElementById('editPointsBtn');
        const nextBattleBtn = document.getElementById('nextBattleBtn');
        const viewRankingsBtn = document.getElementById('viewRankingsBtn');
        const newTournamentBtn = document.getElementById('newTournamentBtn');

        if (this.isNetworkMode) {
            // Network mode: show return to lobby, hide local-only buttons
            returnToLobbyBtn.style.display = 'block';
            editPointsBtn.style.display = 'none';
            nextBattleBtn.style.display = 'none';
            viewRankingsBtn.style.display = 'none';
            newTournamentBtn.style.display = 'block'; // Keep back to start
        } else {
            // Local mode: hide return to lobby, show all local buttons
            returnToLobbyBtn.style.display = 'none';
            editPointsBtn.style.display = 'block';
            nextBattleBtn.style.display = 'block';
            viewRankingsBtn.style.display = 'block';
            newTournamentBtn.style.display = 'block';
        }

        // Scroll to winner display after a brief delay
        setTimeout(() => {
            const winnerScreen = document.getElementById('winnerScreen');
            if (winnerScreen) {
                winnerScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);

        if (winner === null) {
            display.innerHTML = `
                <h2>⚔️ Draw! ⚔️</h2>
                <p>Both teams were defeated!</p>
            `;
            return;
        }

        const winningTeamPlayers = winner === 'left' ? this.teams.left : this.teams.right;
        const survivors = this.battleKnights.filter(k => k.team === winner && k.isAlive());

        // Get unique story point values from winning team
        const storyPointValues = [...new Set(winningTeamPlayers.map(p => p.storyPoints))].sort((a, b) => a - b);
        const teamColor = winner === 'left' ? '#FF6B6B' : '#4ECDC4';

        display.innerHTML = `
            <div class="victory-crown">👑</div>
            <div class="victory-numbers" style="color: ${teamColor}">
                ${storyPointValues.map(sp => `<span class="victory-number">${sp}</span>`).join('')}
            </div>
            <h2 class="victory-text">STORY POINTS VICTORIOUS!</h2>
            <div class="winner-stats">
                <p class="survivor-count">Survivors: ${survivors.length} / ${winningTeamPlayers.length}</p>
                <h3>Victory Team Roster:</h3>
                <ul>
                    ${winningTeamPlayers.map(p => `<li>${p.name} <span class="points-badge" style="background: ${teamColor}">${p.storyPoints}</span> - HP: ${p.maxHp}, Dmg: ${p.damage}, Range: ${p.attackRange}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    log(message) {
        const logDiv = document.getElementById('battleLog');
        const p = document.createElement('p');
        p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logDiv.insertBefore(p, logDiv.firstChild);

        // Limit log size
        while (logDiv.children.length > 50) {
            logDiv.removeChild(logDiv.lastChild);
        }
    }

    // Winner screen methods
    editStoryPoints() {
        const display = document.getElementById('winnerDisplay');
        const header = display.previousElementSibling;
        header.textContent = '✏️ Edit Story Points';

        let html = '<div class="edit-points-section">';
        html += '<p style="margin-bottom: 20px;">Update story points for each player:</p>';

        this.players.forEach((player, index) => {
            html += `
                <div class="edit-points-item">
                    <span><strong>${player.name}</strong></span>
                    <select id="editPoints_${index}" class="edit-points-select">
                        <option value="1" ${player.storyPoints === 1 ? 'selected' : ''}>1</option>
                        <option value="2" ${player.storyPoints === 2 ? 'selected' : ''}>2</option>
                        <option value="3" ${player.storyPoints === 3 ? 'selected' : ''}>3</option>
                        <option value="5" ${player.storyPoints === 5 ? 'selected' : ''}>5</option>
                        <option value="8" ${player.storyPoints === 8 ? 'selected' : ''}>8</option>
                        <option value="13" ${player.storyPoints === 13 ? 'selected' : ''}>13</option>
                        <option value="21" ${player.storyPoints === 21 ? 'selected' : ''}>21</option>
                        <option value="34" ${player.storyPoints === 34 ? 'selected' : ''}>34</option>
                        <option value="55" ${player.storyPoints === 55 ? 'selected' : ''}>55</option>
                        <option value="89" ${player.storyPoints === 89 ? 'selected' : ''}>89</option>
                    </select>
                </div>
            `;
        });

        html += '<button id="savePointsBtn" class="start-btn" style="margin-top: 20px;">Save Changes</button>';
        html += '</div>';

        display.innerHTML = html;

        document.getElementById('savePointsBtn').addEventListener('click', () => {
            this.players.forEach((player, index) => {
                const select = document.getElementById(`editPoints_${index}`);
                player.storyPoints = parseInt(select.value);
            });
            this.savePlayersToStorage();
            this.showScreen(GameState.SETUP);
            this.updatePlayersList();
            this.updateStartButton();

            // Scroll to player list after saving
            setTimeout(() => {
                const playersList = document.getElementById('playersList');
                if (playersList) {
                    playersList.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        });
    }

    returnToLobby() {
        // For network mode: return to lobby, keep all players
        this.currentBattleStats = {};
        this.battleEnded = false;

        // Show the network lobby screen
        this.showScreen(GameState.NETWORK_LOGIN);

        // Show lobby container (not room selection)
        document.getElementById('roomSelection').style.display = 'none';
        document.getElementById('lobbyContainer').style.display = 'block';
        document.getElementById('roomInfo').style.display = 'block';
        document.getElementById('shareInstruction').style.display = 'block';

        // Players are still in networkPlayers array
        this.updateNetworkPlayersList();

        console.log('Returned to lobby with', this.networkPlayers.length, 'players');
    }

    nextBattle() {
        // Reset battle stats
        this.currentBattleStats = {};
        this.battleEnded = false;
        this.showScreen(GameState.SETUP);

        // Scroll to the player input section after a brief delay
        setTimeout(() => {
            const setupContainer = document.querySelector('.setup-container');
            if (setupContainer) {
                setupContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
    }

    // Rankings screen methods
    showRankings() {
        this.showScreen(GameState.RANKINGS);
        this.updateRankingsDisplay();

        // Scroll to top scorer after display is updated
        setTimeout(() => {
            const topScorer = document.querySelector('.top-scorer-section');
            if (topScorer) {
                topScorer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }

    updateRankingsDisplay() {
        // Calculate scores (kills * 10 + wins * 50 + damageDealt / 10)
        const playerRankings = this.players.map(player => {
            const score = (player.kills || 0) * 10 +
                         (player.wins || 0) * 50 +
                         Math.floor((player.damageDealt || 0) / 10);
            return {
                player,
                score
            };
        }).sort((a, b) => b.score - a.score);

        // Top scorer
        const topScorer = playerRankings[0];
        const topScorerDiv = document.getElementById('topScorer');
        if (topScorer && topScorer.score > 0) {
            topScorerDiv.innerHTML = `
                <div class="top-scorer-name">${topScorer.player.name}</div>
                <div class="top-scorer-stats">
                    <div class="stat-item">
                        <div class="stat-label">Score</div>
                        <div class="stat-value">${topScorer.score}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Kills</div>
                        <div class="stat-value">${topScorer.player.kills || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Wins</div>
                        <div class="stat-value">${topScorer.player.wins || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Damage Dealt</div>
                        <div class="stat-value">${topScorer.player.damageDealt || 0}</div>
                    </div>
                </div>
            `;
        } else {
            topScorerDiv.innerHTML = '<p>No battles played yet!</p>';
        }

        // Rankings table
        const tbody = document.getElementById('rankingsTableBody');
        tbody.innerHTML = '';

        playerRankings.forEach((entry, index) => {
            const row = document.createElement('tr');
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            row.innerHTML = `
                <td><span class="rank-badge ${rankClass}">${rank}</span></td>
                <td><strong>${entry.player.name}</strong></td>
                <td>${entry.player.storyPoints}</td>
                <td>${entry.player.gamesPlayed || 0}</td>
                <td>${entry.player.wins || 0}</td>
                <td>${entry.player.kills || 0}</td>
                <td>${entry.player.damageDealt || 0}</td>
                <td><strong>${entry.score}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }

    resetAllStats() {
        if (!confirm('Are you sure you want to reset ALL player statistics? This cannot be undone!')) {
            return;
        }

        this.players.forEach(player => {
            player.kills = 0;
            player.damageDealt = 0;
            player.wins = 0;
            player.gamesPlayed = 0;
        });

        this.savePlayersToStorage();
        this.updateRankingsDisplay();

        console.log('Stats reset for all players:', this.players.map(p => ({
            name: p.name,
            kills: p.kills,
            wins: p.wins,
            games: p.gamesPlayed
        })));
    }

    clearAllData() {
        if (!confirm('⚠️ WARNING: This will delete ALL players and statistics permanently!\n\nAre you sure you want to continue?')) {
            return;
        }

        // Clear everything
        this.players = [];
        this.battleKnights = [];
        this.teams = { left: [], right: [] };
        this.currentBattleStats = {};
        this.battleEnded = false;

        // Clear localStorage
        localStorage.removeItem('storyPointKnights_players');

        console.log('All data cleared!');

        // Go back to setup screen
        this.showScreen(GameState.SETUP);
        this.updatePlayersList();
        this.updateStartButton();

        alert('✅ All data has been cleared. You can start fresh!');
    }

    showScreen(state) {
        this.state = state;
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        const screens = {
            [GameState.LOGIN]: 'loginScreen',
            [GameState.NETWORK_LOGIN]: 'networkLoginScreen',
            [GameState.ESTIMATION]: 'estimationScreen',
            [GameState.SETUP]: 'setupScreen',
            [GameState.BATTLE]: 'battleScreen',
            [GameState.WINNER]: 'winnerScreen',
            [GameState.RANKINGS]: 'rankingsScreen'
        };

        const screenElement = document.getElementById(screens[state]);
        screenElement.classList.add('active');

        // Auto-scroll to the active screen with smooth behavior
        setTimeout(() => {
            screenElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    reset() {
        // Only reset battle state, keep players
        this.battleKnights = [];
        this.teams = { left: [], right: [] };
        this.currentBattleStats = {};
        this.battleEnded = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.showScreen(GameState.LOGIN);
        document.getElementById('battleLog').innerHTML = '';
    }
}

class Player {
    constructor(name, storyPoints, id = null, socketId = null) {
        this.name = name;
        this.storyPoints = storyPoints;
        this.id = id || `${name}-${Date.now()}`;
        this.socketId = socketId; // For multiplayer
        this.stats = this.generateStats();

        // Base stats (HP increased 10x for better gameplay)
        this.maxHp = 200;
        this.damage = 5;
        this.attackRange = 40; // Base attack range

        // Statistics
        this.kills = 0;
        this.damageDealt = 0;
        this.wins = 0;
        this.gamesPlayed = 0;

        // Apply stat bonuses
        this.applyStats();
    }

    generateStats() {
        const statCount = 5;
        const stats = [];

        for (let i = 0; i < statCount; i++) {
            const statLevel = Math.floor(Math.random() * 5) + 1; // 1-5
            stats.push(statLevel);
        }

        return stats;
    }

    applyStats() {
        this.stats.forEach((level, index) => {
            switch (index) {
                case 0: // HP bonus (scaled 10x)
                    this.maxHp += (level * 30);
                    break;
                case 1: // Damage bonus
                    this.damage += (level * 2);
                    break;
                case 2: // Combined HP and damage (HP scaled 10x)
                    this.maxHp += (level * 10);
                    this.damage += level;
                    break;
                case 3: // Attack Range
                    this.attackRange += (level * 7.5); // 7.5-37.5 extra range (reduced by 50%)
                    break;
                case 4: // Extra damage and speed
                    this.damage += (level * 1.5);
                    break;
            }
        });

        this.damage = Math.round(this.damage);
        this.attackRange = Math.round(this.attackRange);

        // Cap damage at 200 max
        this.damage = Math.min(this.damage, 200);
    }
}

class Knight {
    constructor(player, x, y, color, team) {
        this.player = player;
        this.x = x;
        this.y = y;
        this.color = color;
        this.team = team;
        this.hp = player.maxHp;
        this.size = 35;
        this.speed = 1.5; // Movement speed (reduced by 40%)
        this.attackRange = player.attackRange; // Use player's randomized range
        this.attackAngle = 60; // Cone angle in degrees (30° each side)
        this.rotation = team === 'left' ? 0 : Math.PI; // Facing angle in radians (0 = right, PI = left)
        this.rotationSpeed = 0.08; // Rotation speed in radians per frame
        this.isAttacking = false;
        this.justAttacked = false;
        this.attackCooldown = 0;
        this.aiThinkTimer = 0;
        this.aiTarget = null;

        // Sword swing animation
        this.swordSwingProgress = 0; // 0 to 1 (animation progress)
        this.swordSwingDuration = 20; // frames for full swing
        this.swordSwingActive = false;
        this.damageAppliedThisSwing = false;

        // Shield system with health
        this.isBlocking = false;
        this.blockAngle = 90; // 90° arc coverage (1/4 of circle)
        this.shieldDirection = this.rotation; // Direction shield is facing
        this.maxShieldHp = player.maxHp * 0.5; // 50% of max HP
        this.shieldHp = this.maxShieldHp;
        this.shieldRecoveryRate = this.maxShieldHp * 0.05 / 60; // 5% per second at 60fps
    }

    update(keys, canvasWidth, canvasHeight, mouseX, mouseY) {
        // Calculate both shield and attack direction based on mouse position
        if (mouseX !== undefined && mouseY !== undefined) {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            this.shieldDirection = Math.atan2(dy, dx);
            this.rotation = Math.atan2(dy, dx); // Attack also follows mouse
        }

        // Hold-based blocking with C key
        this.isBlocking = (keys['c'] || keys['C']);

        // Shield health recovery when not blocking (5% per second)
        if (!this.isBlocking && this.shieldHp < this.maxShieldHp) {
            this.shieldHp = Math.min(this.maxShieldHp, this.shieldHp + this.shieldRecoveryRate);
        }

        // Movement controls (WASD / Arrow keys)
        let moveX = 0, moveY = 0;

        if (keys['ArrowUp'] || keys['w']) {
            moveY -= this.speed;
        }
        if (keys['ArrowDown'] || keys['s']) {
            moveY += this.speed;
        }
        if (keys['ArrowLeft'] || keys['a']) {
            moveX -= this.speed;
        }
        if (keys['ArrowRight'] || keys['d']) {
            moveX += this.speed;
        }

        // Update position
        this.x += moveX;
        this.y += moveY;

        // Attack with space (can't attack while blocking)
        if (keys[' '] && this.attackCooldown === 0 && !this.isBlocking) {
            this.attack();
        }

        // Boundary checking
        this.x = Math.max(this.size, Math.min(canvasWidth - this.size, this.x));
        this.y = Math.max(this.size + 50, Math.min(canvasHeight - this.size, this.y));

        this.updateCooldowns();
    }

    updateAI(allKnights, canvasWidth, canvasHeight) {
        this.aiThinkTimer++;

        // Find closest enemy every 15 frames
        if (this.aiThinkTimer % 15 === 0 || !this.aiTarget || !this.aiTarget.isAlive()) {
            this.aiTarget = this.findClosestEnemy(allKnights);
        }

        if (this.aiTarget && this.aiTarget.isAlive()) {
            const dx = this.aiTarget.x - this.x;
            const dy = this.aiTarget.y - this.y;
            const distance = Math.hypot(dx, dy);
            const targetAngle = Math.atan2(dy, dx);

            // Check if target is attacking and close - AI blocks automatically
            const shouldBlock = this.aiTarget.isAttacking &&
                               distance < this.attackRange * 1.5 &&
                               Math.random() < 0.3; // 30% chance to block when under attack

            if (shouldBlock) {
                // Calculate if attack is coming from front
                let angleDiff = targetAngle - this.rotation;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Block if enemy is roughly in front
                this.isBlocking = Math.abs(angleDiff) < Math.PI / 2;
            } else {
                this.isBlocking = false;
            }

            if (!this.isBlocking) {
                // Smoothly rotate towards target
                let angleDiff = targetAngle - this.rotation;

                // Normalize angle difference to -PI to PI
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Rotate towards target
                if (Math.abs(angleDiff) > 0.1) {
                    if (angleDiff > 0) {
                        this.rotation += Math.min(this.rotationSpeed, angleDiff);
                    } else {
                        this.rotation -= Math.min(this.rotationSpeed, Math.abs(angleDiff));
                    }
                }

                // Normalize rotation to 0-2PI
                while (this.rotation < 0) this.rotation += Math.PI * 2;
                while (this.rotation >= Math.PI * 2) this.rotation -= Math.PI * 2;

                // Move towards enemy
                if (distance > this.attackRange * 0.8) {
                    this.x += Math.cos(targetAngle) * this.speed;
                    this.y += Math.sin(targetAngle) * this.speed;
                }

                // Attack if in range AND facing the target
                if (distance <= this.attackRange && this.attackCooldown === 0) {
                    this.attack();
                }
            }
        }

        // Boundary checking
        this.x = Math.max(this.size, Math.min(canvasWidth - this.size, this.x));
        this.y = Math.max(this.size + 50, Math.min(canvasHeight - this.size, this.y));

        this.updateCooldowns();
    }

    findClosestEnemy(allKnights) {
        let closest = null;
        let closestDist = Infinity;

        allKnights.forEach(knight => {
            if (knight.team !== this.team && knight.isAlive()) {
                const dist = Math.hypot(knight.x - this.x, knight.y - this.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = knight;
                }
            }
        });

        return closest;
    }

    updateCooldowns() {
        // Update sword swing animation
        if (this.swordSwingActive) {
            this.swordSwingProgress += 1 / this.swordSwingDuration;

            // Apply damage at the middle of the swing (50% progress)
            if (this.swordSwingProgress >= 0.5 && !this.damageAppliedThisSwing) {
                this.justAttacked = true;
                this.damageAppliedThisSwing = true;
            }

            // End swing animation
            if (this.swordSwingProgress >= 1) {
                this.swordSwingActive = false;
                this.swordSwingProgress = 0;
            }
        }

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
            if (this.attackCooldown === 0) {
                this.isAttacking = false;
            }
        }
    }

    attack() {
        if (this.attackCooldown === 0) {
            this.isAttacking = true;
            this.attackCooldown = 120; // Very slow attack cooldown (~2 seconds at 60fps)

            // Start sword swing animation
            this.swordSwingActive = true;
            this.swordSwingProgress = 0;
            this.damageAppliedThisSwing = false;

            // Network sync: Send attack event
            if (game.isNetworkMode && typeof networkManager !== 'undefined') {
                networkManager.sendKnightAttack({
                    playerId: this.player.id,
                    x: this.x,
                    y: this.y,
                    rotation: this.rotation
                });
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }

    isAlive() {
        return this.hp > 0;
    }

    renderBlock(ctx) {
        if (!this.isBlocking || this.shieldHp <= 0) return;

        // Draw concave shield arc as a curved line closer to the player (90 degrees)
        const shieldRadius = this.size * 1.2; // Closer to the knight
        const blockAngleRad = (this.blockAngle * Math.PI / 180) / 2; // 45° each side

        ctx.save();

        // Shield health percentage for visual effects
        const shieldHealthPercent = this.shieldHp / this.maxShieldHp;

        // Shield glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = shieldHealthPercent > 0.3 ? '#00BFFF' : '#FF6B6B';

        // Draw thick concave arc line (no fill, just the curved line)
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = shieldHealthPercent > 0.5 ? '#87CEEB' : shieldHealthPercent > 0.25 ? '#FFA500' : '#FF6B6B';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(
            this.x,
            this.y,
            shieldRadius,
            this.shieldDirection - blockAngleRad,
            this.shieldDirection + blockAngleRad
        );
        ctx.stroke();

        // Inner glow line for depth
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
            this.x,
            this.y,
            shieldRadius,
            this.shieldDirection - blockAngleRad,
            this.shieldDirection + blockAngleRad
        );
        ctx.stroke();

        // Shield health bar next to knight
        const barWidth = 40;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y + this.size / 2 + 35;

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Shield HP
        ctx.fillStyle = shieldHealthPercent > 0.5 ? '#00BFFF' : shieldHealthPercent > 0.25 ? '#FFA500' : '#FF0000';
        ctx.fillRect(barX, barY, barWidth * shieldHealthPercent, barHeight);

        ctx.restore();
    }

    renderSword(ctx) {
        if (!this.swordSwingActive) return;

        // Calculate sword angle based on swing progress
        // Sword sweeps from -30° to +30° relative to facing direction
        const coneAngleRad = (this.attackAngle * Math.PI / 180) / 2;
        const startAngle = this.rotation - coneAngleRad;
        const endAngle = this.rotation + coneAngleRad;
        const currentSwordAngle = startAngle + (endAngle - startAngle) * this.swordSwingProgress;

        // Sword properties
        const swordLength = this.attackRange * 0.8; // 80% of attack range
        const swordWidth = 8;
        const swordStartOffset = this.size * 0.3; // Start from knight body

        // Calculate sword tip position
        const swordTipX = this.x + Math.cos(currentSwordAngle) * (swordStartOffset + swordLength);
        const swordTipY = this.y + Math.sin(currentSwordAngle) * (swordStartOffset + swordLength);
        const swordBaseX = this.x + Math.cos(currentSwordAngle) * swordStartOffset;
        const swordBaseY = this.y + Math.sin(currentSwordAngle) * swordStartOffset;

        // Draw sword with glow effect
        ctx.save();

        // Glow/trail effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.swordSwingProgress * Math.PI); // Pulse during swing

        // Sword blade
        ctx.strokeStyle = '#E0E0E0'; // Silver blade
        ctx.lineWidth = swordWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(swordBaseX, swordBaseY);
        ctx.lineTo(swordTipX, swordTipY);
        ctx.stroke();

        // Sword edge highlight
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(swordBaseX, swordBaseY);
        ctx.lineTo(swordTipX, swordTipY);
        ctx.stroke();

        // Motion blur trail (only visible during fast part of swing)
        if (this.swordSwingProgress > 0.3 && this.swordSwingProgress < 0.7) {
            ctx.globalAlpha = 0.3;
            const trailSteps = 5;
            for (let i = 1; i <= trailSteps; i++) {
                const trailProgress = this.swordSwingProgress - (i * 0.05);
                if (trailProgress < 0) continue;

                const trailAngle = startAngle + (endAngle - startAngle) * trailProgress;
                const trailTipX = this.x + Math.cos(trailAngle) * (swordStartOffset + swordLength);
                const trailTipY = this.y + Math.sin(trailAngle) * (swordStartOffset + swordLength);

                ctx.strokeStyle = this.color;
                ctx.lineWidth = swordWidth * (1 - i / trailSteps);
                ctx.beginPath();
                ctx.moveTo(swordBaseX, swordBaseY);
                ctx.lineTo(trailTipX, trailTipY);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    render(ctx) {
        if (!this.isAlive()) {
            // Draw death marker
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('💀', this.x, this.y + 7);
            return;
        }

        // Save context for rotation
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw knight as a shield/helmet combo (now rotated)
        const size = this.size / 2;

        // Draw shield body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, -size * 0.3);
        ctx.lineTo(size * 0.7, size * 0.4);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.7, size * 0.4);
        ctx.lineTo(-size * 0.7, -size * 0.3);
        ctx.closePath();
        ctx.fill();

        // Shield outline
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw helmet top
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(0, -size * 0.3, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw visor slit
        ctx.fillStyle = '#000';
        ctx.fillRect(-size * 0.4, -size * 0.35, size * 0.8, size * 0.15);

        // Draw cross emblem on shield
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.2);
        ctx.lineTo(0, size * 0.5);
        ctx.stroke();
        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, size * 0.1);
        ctx.lineTo(size * 0.3, size * 0.1);
        ctx.stroke();

        // Draw direction indicator (small arrow pointing forward)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(size * 1.2, 0); // Arrow tip
        ctx.lineTo(size * 0.8, -size * 0.2); // Top wing
        ctx.lineTo(size * 0.8, size * 0.2); // Bottom wing
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Restore context
        ctx.restore();

        // Draw HP bar (not rotated)
        const barWidth = 50;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size / 2 - 12;

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // HP
        const hpPercent = this.hp / this.player.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // HP text (smaller)
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.hp}`, this.x, barY - 3);

        // Draw name (smaller)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        const nameText = this.player.name.length > 10 ? this.player.name.substring(0, 8) + '...' : this.player.name;
        ctx.fillText(nameText, this.x, this.y + this.size / 2 + 15);

        // Draw story points badge
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 12, this.y + this.size / 2 + 18, 24, 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(this.player.storyPoints, this.x, this.y + this.size / 2 + 28);

        // Draw block cooldown indicator (only for player-controlled knight at index 0)
        if (this.blockCooldown > 0) {
            const cooldownBarWidth = 40;
            const cooldownBarHeight = 4;
            const cooldownBarX = this.x - cooldownBarWidth / 2;
            const cooldownBarY = this.y + this.size / 2 + 35;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(cooldownBarX, cooldownBarY, cooldownBarWidth, cooldownBarHeight);

            // Cooldown progress
            const cooldownPercent = 1 - (this.blockCooldown / this.blockCooldownMax);
            ctx.fillStyle = cooldownPercent === 1 ? '#00FF00' : '#FFA500';
            ctx.fillRect(cooldownBarX, cooldownBarY, cooldownBarWidth * cooldownPercent, cooldownBarHeight);
        }
    }
}

// Initialize game when DOM is ready
let game;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        game = new Game();
    });
} else {
    game = new Game();
}
