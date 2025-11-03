const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store room data
const rooms = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
        // Leave any previous rooms
        const previousRoom = Array.from(socket.rooms).find(room => room !== socket.id);
        if (previousRoom) {
            socket.leave(previousRoom);
        }

        // Join new room
        socket.join(roomId);
        
        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                users: new Set(),
                created: Date.now()
            });
        }
        
        // Add user to room
        rooms.get(roomId).users.add(socket.id);
        
        console.log(`User ${socket.id} joined room ${roomId}`);
        
        // Notify others in the room
        socket.to(roomId).emit('user-connected', socket.id);
        
        // Send room info to the user
        socket.emit('room-joined', {
            roomId,
            userCount: rooms.get(roomId).users.size
        });
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
        socket.to(data.room).emit('offer', {
            offer: data.offer,
            from: socket.id
        });
    });

    socket.on('answer', (data) => {
        socket.to(data.room).emit('answer', {
            answer: data.answer,
            from: socket.id
        });
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.room).emit('ice-candidate', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove user from all rooms
        rooms.forEach((room, roomId) => {
            if (room.users.has(socket.id)) {
                room.users.delete(socket.id);
                socket.to(roomId).emit('user-disconnected', socket.id);
                
                // Clean up empty rooms
                if (room.users.size === 0) {
                    rooms.delete(roomId);
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Karaoke Connect Server running on port ${PORT}`);
    console.log(`PC Controller: http://localhost:${PORT}`);
    console.log(`Phone Microphone: http://localhost:${PORT}/phone.html`);
});