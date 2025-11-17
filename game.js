// Game State
const GameState = {
    ESTIMATION: 'estimation',
    SETUP: 'setup',
    BATTLE: 'battle',
    WINNER: 'winner'
};

class Game {
    constructor() {
        this.state = GameState.ESTIMATION;
        this.players = [];
        this.battleKnights = [];
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.battleStartTime = 0;
        this.keys = {};
        this.teams = { left: [], right: [] };

        this.initEventListeners();
    }

    initEventListeners() {
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

        // Setup screen
        document.getElementById('addPlayerBtn').addEventListener('click', () => this.addPlayer());
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPlayer();
        });
        document.getElementById('startTournamentBtn').addEventListener('click', () => this.startBattle());

        // Winner screen
        document.getElementById('newTournamentBtn').addEventListener('click', () => this.reset());

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

        this.updatePlayersList();
        this.updateStartButton();
    }

    removePlayer(index) {
        this.players.splice(index, 1);
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
                    HP: ${player.maxHp}, Damage: ${player.damage}
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

        // Spawn left team
        const leftSpacing = Math.min(100, this.canvas.height / (this.teams.left.length + 1));
        this.teams.left.forEach((player, index) => {
            const x = 100;
            const y = (index + 1) * leftSpacing;
            const knight = new Knight(player, x, y, leftColor, 'left');
            this.battleKnights.push(knight);
        });

        // Spawn right team
        const rightSpacing = Math.min(100, this.canvas.height / (this.teams.right.length + 1));
        this.teams.right.forEach((player, index) => {
            const x = this.canvas.width - 100;
            const y = (index + 1) * rightSpacing;
            const knight = new Knight(player, x, y, rightColor, 'right');
            this.battleKnights.push(knight);
        });

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
                // First knight is player-controlled
                if (index === 0) {
                    knight.update(this.keys, this.canvas.width, this.canvas.height);
                } else {
                    knight.updateAI(this.battleKnights, this.canvas.width, this.canvas.height);
                }

                // Handle attacks
                if (knight.isAttacking) {
                    this.checkAttackHits(knight);
                }
            }
        });

        // Check for battle end
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

    checkAttackHits(attacker) {
        if (!attacker.justAttacked) return;
        attacker.justAttacked = false;

        this.battleKnights.forEach(target => {
            // Can't attack same team
            if (target.team === attacker.team) return;
            if (!target.isAlive()) return;
            if (target === attacker) return;

            const distance = Math.hypot(attacker.x - target.x, attacker.y - target.y);

            if (distance <= attacker.attackRange) {
                target.takeDamage(attacker.player.damage);
                this.log(`${attacker.player.name} hit ${target.player.name} for ${attacker.player.damage} damage!`);

                if (!target.isAlive()) {
                    this.log(`${target.player.name} has been defeated!`);
                }
            }
        });
    }

    renderBattle() {
        // Clear canvas
        this.ctx.fillStyle = '#1a4d4d';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw center line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw arena grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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

        // Draw team labels
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LEFT TEAM', this.canvas.width / 4, 30);

        this.ctx.fillStyle = '#4ECDC4';
        this.ctx.fillText('RIGHT TEAM', (this.canvas.width * 3) / 4, 30);

        // Draw knights
        this.battleKnights.forEach(knight => {
            knight.render(this.ctx);
        });

        // Draw attack ranges when attacking
        this.battleKnights.forEach(knight => {
            if (knight.isAttacking && knight.isAlive()) {
                this.ctx.strokeStyle = knight.color;
                this.ctx.lineWidth = 3;
                this.ctx.globalAlpha = 0.5;
                this.ctx.beginPath();
                this.ctx.arc(knight.x, knight.y, knight.attackRange, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }
        });

        // Draw score
        const leftAlive = this.battleKnights.filter(k => k.team === 'left' && k.isAlive()).length;
        const rightAlive = this.battleKnights.filter(k => k.team === 'right' && k.isAlive()).length;

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${leftAlive} alive`, this.canvas.width / 4, 60);
        this.ctx.fillText(`${rightAlive} alive`, (this.canvas.width * 3) / 4, 60);
    }

    endBattle(winner) {
        cancelAnimationFrame(this.animationId);

        if (winner === 'draw') {
            this.log('Battle ended in a draw!');
            setTimeout(() => this.showWinner(null), 2000);
        } else {
            const winningTeam = winner === 'left' ? 'Left Team' : 'Right Team';
            this.log(`${winningTeam} wins!`);
            setTimeout(() => this.showWinner(winner), 2000);
        }
    }

    showWinner(winner) {
        this.showScreen(GameState.WINNER);

        const display = document.getElementById('winnerDisplay');

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
                    ${winningTeamPlayers.map(p => `<li>${p.name} <span class="points-badge" style="background: ${teamColor}">${p.storyPoints}</span> - HP: ${p.maxHp}, Dmg: ${p.damage}</li>`).join('')}
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

    showScreen(state) {
        this.state = state;
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        const screens = {
            [GameState.ESTIMATION]: 'estimationScreen',
            [GameState.SETUP]: 'setupScreen',
            [GameState.BATTLE]: 'battleScreen',
            [GameState.WINNER]: 'winnerScreen'
        };

        document.getElementById(screens[state]).classList.add('active');
    }

    reset() {
        this.players = [];
        this.battleKnights = [];
        this.teams = { left: [], right: [] };

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.showScreen(GameState.ESTIMATION);
        this.updatePlayersList();
        this.updateStartButton();
        document.getElementById('battleLog').innerHTML = '';
    }
}

class Player {
    constructor(name, storyPoints) {
        this.name = name;
        this.storyPoints = storyPoints;
        this.stats = this.generateStats();

        // Base stats
        this.maxHp = 20;
        this.damage = 5;

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
                case 0: // HP bonus
                    this.maxHp += (level * 3);
                    break;
                case 1: // Damage bonus
                    this.damage += (level * 2);
                    break;
                case 2: // Combined HP and damage
                    this.maxHp += level;
                    this.damage += level;
                    break;
                case 3: // Extra HP
                    this.maxHp += (level * 2);
                    break;
                case 4: // Extra damage
                    this.damage += (level * 1.5);
                    break;
            }
        });

        this.damage = Math.round(this.damage);
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
        this.speed = 8; // Much faster movement!
        this.attackRange = 100;
        this.isAttacking = false;
        this.justAttacked = false;
        this.attackCooldown = 0;
        this.aiThinkTimer = 0;
        this.aiTarget = null;
        this.direction = 'down';
    }

    update(keys, canvasWidth, canvasHeight) {
        // Player-controlled movement
        if (keys['ArrowUp'] || keys['w']) {
            this.y -= this.speed;
            this.direction = 'up';
        }
        if (keys['ArrowDown'] || keys['s']) {
            this.y += this.speed;
            this.direction = 'down';
        }
        if (keys['ArrowLeft'] || keys['a']) {
            this.x -= this.speed;
            this.direction = 'left';
        }
        if (keys['ArrowRight'] || keys['d']) {
            this.x += this.speed;
            this.direction = 'right';
        }

        // Attack with space
        if (keys[' '] && this.attackCooldown === 0) {
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

            // Move towards enemy
            if (distance > this.attackRange * 0.8) {
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            }

            // Attack if in range
            if (distance <= this.attackRange && this.attackCooldown === 0) {
                this.attack();
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
            this.justAttacked = true;
            this.attackCooldown = 20; // Faster attack cooldown
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }

    isAlive() {
        return this.hp > 0;
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

        // Draw knight body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw knight helmet/face
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️', this.x, this.y + 8);

        // Draw HP bar
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
    }
}

// Initialize game
const game = new Game();
