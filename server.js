const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(__dirname));

// Game rooms storage
const rooms = new Map();

// Helper function to generate room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Create a new room
    socket.on('create-room', (callback) => {
        const roomCode = generateRoomCode();
        const room = {
            code: roomCode,
            host: socket.id,
            players: [],
            gameState: 'lobby', // lobby, battle, finished
            battleState: null
        };
        rooms.set(roomCode, room);
        socket.join(roomCode);
        socket.currentRoom = roomCode;

        console.log(`Room created: ${roomCode} by ${socket.id}`);
        callback({ success: true, roomCode });
    });

    // Join an existing room
    socket.on('join-room', (roomCode, callback) => {
        const room = rooms.get(roomCode);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        if (room.gameState === 'battle') {
            callback({ success: false, error: 'Game already in progress' });
            return;
        }

        socket.join(roomCode);
        socket.currentRoom = roomCode;

        console.log(`${socket.id} joined room: ${roomCode}`);
        callback({ success: true, roomCode, players: room.players });

        // Notify others in the room
        socket.to(roomCode).emit('player-joined', socket.id);
    });

    // Add player to room
    socket.on('add-player', (playerData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        const player = {
            ...playerData,
            socketId: socket.id,
            id: playerData.id || `${socket.id}-${Date.now()}`
        };

        // Check if player already exists (update instead of add)
        const existingIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (existingIndex >= 0) {
            room.players[existingIndex] = player;
        } else {
            room.players.push(player);
        }

        console.log(`Player added to room ${roomCode}:`, player.name);

        // Broadcast updated player list to all clients in room
        io.to(roomCode).emit('players-updated', room.players);
    });

    // Remove player from room
    socket.on('remove-player', (playerId) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== playerId);

        console.log(`Player removed from room ${roomCode}`);

        // Broadcast updated player list
        io.to(roomCode).emit('players-updated', room.players);
    });

    // Start battle
    socket.on('start-battle', () => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        // Only host can start battle
        if (socket.id !== room.host) {
            socket.emit('error', 'Only the host can start the battle');
            return;
        }

        room.gameState = 'battle';

        console.log(`Battle started in room ${roomCode}`);

        // Notify all clients to start battle
        io.to(roomCode).emit('battle-started', room.players);
    });

    // Start battle with synchronized positions
    socket.on('start-battle-with-positions', (data) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        // Only host can start battle
        if (socket.id !== room.host) {
            socket.emit('error', 'Only the host can start the battle');
            return;
        }

        room.gameState = 'battle';

        console.log(`Battle started in room ${roomCode} with synchronized positions`);

        // Notify all clients to start battle with positions
        io.to(roomCode).emit('battle-started', room.players, data.positions);
    });

    // Battle state synchronization
    socket.on('battle-update', (battleData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        // Broadcast battle update to all other clients
        socket.to(roomCode).emit('battle-sync', battleData);
    });

    // Knight movement (for the controlling player)
    socket.on('knight-move', (moveData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        // Broadcast movement to all other clients
        socket.to(roomCode).emit('knight-moved', {
            socketId: socket.id,
            ...moveData
        });
    });

    // Knight attack
    socket.on('knight-attack', (attackData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        // Broadcast attack to all clients (including sender for confirmation)
        io.to(roomCode).emit('knight-attacked', {
            socketId: socket.id,
            ...attackData
        });
    });

    // Knight damage
    socket.on('knight-damage', (damageData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        // Broadcast damage to all clients
        io.to(roomCode).emit('knight-damaged', damageData);
    });

    // Battle ended
    socket.on('battle-ended', (winnerData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        room.gameState = 'finished';

        console.log(`Battle ended in room ${roomCode}`);

        // Notify all clients
        io.to(roomCode).emit('battle-ended', winnerData);
    });

    // Reset for next battle
    socket.on('next-battle', () => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        room.gameState = 'lobby';

        console.log(`Room ${roomCode} reset for next battle`);

        // Notify all clients
        io.to(roomCode).emit('return-to-lobby');
    });

    // Horse Race events
    socket.on('start-race', (raceData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        // Only host can start race
        if (socket.id !== room.host) {
            socket.emit('error', 'Only the host can start the race');
            return;
        }

        room.gameState = 'race';

        console.log(`Race started in room ${roomCode}`);

        // Notify all clients to start race with hurdles
        io.to(roomCode).emit('race-started', {
            players: room.players,
            leftHurdles: raceData.leftHurdles,
            rightHurdles: raceData.rightHurdles
        });
    });

    // Race click (space bar tap)
    socket.on('race-click', (clickData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        // Broadcast click to all clients
        io.to(roomCode).emit('race-click', {
            socketId: socket.id,
            team: clickData.team
        });
    });

    // Race jump (C button tap for hurdles)
    socket.on('race-jump', (jumpData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        // Broadcast jump to all clients
        io.to(roomCode).emit('race-jump', {
            socketId: socket.id,
            team: jumpData.team
        });
    });

    // Race ended
    socket.on('race-ended', (winnerData) => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        room.gameState = 'finished';

        console.log(`Race ended in room ${roomCode}`);

        // Notify all clients
        io.to(roomCode).emit('race-ended', winnerData);
    });

    // Leave room
    socket.on('leave-room', () => {
        const roomCode = socket.currentRoom;
        if (!roomCode) return;

        handlePlayerLeave(socket, roomCode);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        const roomCode = socket.currentRoom;
        if (roomCode) {
            handlePlayerLeave(socket, roomCode);
        }
    });

    // Helper function to handle player leaving
    function handlePlayerLeave(socket, roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;

        // Remove player's knights/data
        room.players = room.players.filter(p => p.socketId !== socket.id);

        console.log(`${socket.id} left room ${roomCode}`);

        // If host left, assign new host
        if (room.host === socket.id) {
            if (room.players.length > 0) {
                room.host = room.players[0].socketId;
                io.to(room.host).emit('you-are-host');
            } else {
                // No players left, delete room
                rooms.delete(roomCode);
                console.log(`Room ${roomCode} deleted (empty)`);
                return;
            }
        }

        // Notify remaining players
        io.to(roomCode).emit('players-updated', room.players);
        io.to(roomCode).emit('player-left', socket.id);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        rooms: rooms.size,
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
    console.log(`🎮 Story Point Arena server running on port ${PORT}`);
    console.log(`📡 Socket.io ready for connections`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`📱 Network: http://${getLocalIP()}:${PORT}`);
    console.log(`\n👥 Share the Network URL with other players on your local network!`);
});

// Helper function to get local IP address
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip internal (localhost) and non-IPv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}
