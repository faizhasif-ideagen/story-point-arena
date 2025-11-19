// Network Manager for multiplayer functionality
class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.roomCode = null;
        this.isHost = false;
        this.mySocketId = null;
        this.networkPlayers = [];
        this.eventCallbacks = {};

        this.initializeConnection();
    }

    initializeConnection() {
        // Connect to Socket.io server
        // In production, replace with your deployed server URL
        const serverUrl = window.location.origin;
        this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
            this.mySocketId = this.socket.id;
            this.updateConnectionStatus(true);
            this.trigger('connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
            this.updateConnectionStatus(false);
            this.trigger('disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false, 'Connection failed. Make sure server is running.');
        });

        // Room events
        this.socket.on('players-updated', (players) => {
            console.log('Players updated:', players);
            this.networkPlayers = players;
            this.trigger('players-updated', players);
        });

        this.socket.on('player-joined', (socketId) => {
            console.log('Player joined:', socketId);
            this.trigger('player-joined', socketId);
        });

        this.socket.on('player-left', (socketId) => {
            console.log('Player left:', socketId);
            this.trigger('player-left', socketId);
        });

        this.socket.on('you-are-host', () => {
            console.log('You are now the host');
            this.isHost = true;
            this.trigger('became-host');
        });

        // Battle events
        this.socket.on('battle-started', (players) => {
            console.log('Battle started with players:', players);
            this.trigger('battle-started', players);
        });

        this.socket.on('battle-sync', (battleData) => {
            this.trigger('battle-sync', battleData);
        });

        this.socket.on('knight-moved', (moveData) => {
            this.trigger('knight-moved', moveData);
        });

        this.socket.on('knight-attacked', (attackData) => {
            this.trigger('knight-attacked', attackData);
        });

        this.socket.on('knight-damaged', (damageData) => {
            this.trigger('knight-damaged', damageData);
        });

        this.socket.on('battle-ended', (winnerData) => {
            this.trigger('battle-ended', winnerData);
        });

        this.socket.on('return-to-lobby', () => {
            this.trigger('return-to-lobby');
        });

        // Horse race events
        this.socket.on('race-started', (players) => {
            console.log('Race started with players:', players);
            this.trigger('race-started', players);
        });

        this.socket.on('race-click', (clickData) => {
            this.trigger('race-click', clickData);
        });

        this.socket.on('race-jump', (jumpData) => {
            this.trigger('race-jump', jumpData);
        });

        this.socket.on('race-ended', (winnerData) => {
            this.trigger('race-ended', winnerData);
        });

        // Error events
        this.socket.on('error', (message) => {
            console.error('Server error:', message);
            alert(message);
        });
    }

    updateConnectionStatus(connected, customMessage = null) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;

        if (customMessage) {
            statusElement.textContent = `🔴 ${customMessage}`;
            statusElement.style.color = '#ff6b6b';
        } else if (connected) {
            statusElement.textContent = '🟢 Connected to server';
            statusElement.style.color = '#51cf66';
        } else {
            statusElement.textContent = '🔴 Disconnected from server';
            statusElement.style.color = '#ff6b6b';
        }
    }

    // Room management
    createRoom(callback) {
        if (!this.connected) {
            callback({ success: false, error: 'Not connected to server' });
            return;
        }

        this.socket.emit('create-room', (response) => {
            if (response.success) {
                this.roomCode = response.roomCode;
                this.isHost = true;
                console.log('Room created:', this.roomCode);
            }
            callback(response);
        });
    }

    joinRoom(roomCode, callback) {
        if (!this.connected) {
            callback({ success: false, error: 'Not connected to server' });
            return;
        }

        this.socket.emit('join-room', roomCode, (response) => {
            if (response.success) {
                this.roomCode = roomCode;
                this.isHost = false;
                this.networkPlayers = response.players || [];
                console.log('Joined room:', this.roomCode);
            }
            callback(response);
        });
    }

    leaveRoom() {
        if (this.roomCode) {
            this.socket.emit('leave-room');
            this.roomCode = null;
            this.isHost = false;
            this.networkPlayers = [];
        }
    }

    // Player management
    addPlayer(playerData) {
        if (!this.roomCode) {
            console.error('Not in a room');
            return;
        }

        this.socket.emit('add-player', playerData);
    }

    removePlayer(playerId) {
        if (!this.roomCode) {
            console.error('Not in a room');
            return;
        }

        this.socket.emit('remove-player', playerId);
    }

    // Battle management
    startBattle() {
        if (!this.roomCode) {
            console.error('Not in a room');
            return;
        }

        if (!this.isHost) {
            alert('Only the host can start the battle');
            return;
        }

        this.socket.emit('start-battle');
    }

    sendBattleUpdate(battleData) {
        if (!this.roomCode) return;
        this.socket.emit('battle-update', battleData);
    }

    sendKnightMove(moveData) {
        if (!this.roomCode) return;
        this.socket.emit('knight-move', moveData);
    }

    sendKnightAttack(attackData) {
        if (!this.roomCode) return;
        this.socket.emit('knight-attack', attackData);
    }

    sendKnightDamage(damageData) {
        if (!this.roomCode) return;
        this.socket.emit('knight-damage', damageData);
    }

    sendBattleEnded(winnerData) {
        if (!this.roomCode) return;
        this.socket.emit('battle-ended', winnerData);
    }

    nextBattle() {
        if (!this.roomCode) return;
        this.socket.emit('next-battle');
    }

    // Horse race management
    startRace(leftHurdles, rightHurdles) {
        if (!this.roomCode) {
            console.error('Not in a room');
            return;
        }

        if (!this.isHost) {
            alert('Only the host can start the race');
            return;
        }

        this.socket.emit('start-race', { leftHurdles, rightHurdles });
    }

    sendRaceClick(team) {
        if (!this.roomCode) return;
        this.socket.emit('race-click', { team });
    }

    sendRaceJump(team) {
        if (!this.roomCode) return;
        this.socket.emit('race-jump', { team });
    }

    sendRaceEnded(winnerData) {
        if (!this.roomCode) return;
        this.socket.emit('race-ended', winnerData);
    }

    // Event system for game.js to listen to network events
    on(event, callback) {
        if (!this.eventCallbacks[event]) {
            this.eventCallbacks[event] = [];
        }
        this.eventCallbacks[event].push(callback);
    }

    off(event, callback) {
        if (!this.eventCallbacks[event]) return;
        this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
    }

    trigger(event, data) {
        if (!this.eventCallbacks[event]) return;
        this.eventCallbacks[event].forEach(callback => callback(data));
    }

    // Utility
    isConnected() {
        return this.connected;
    }

    inRoom() {
        return this.roomCode !== null;
    }

    getRoomCode() {
        return this.roomCode;
    }

    getMySocketId() {
        return this.mySocketId;
    }
}

// Create global network manager instance
const networkManager = new NetworkManager();
