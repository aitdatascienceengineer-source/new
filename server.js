// =====================================================
// NEXTALK V1 - WORKING SERVER (NO DATABASE)
// =====================================================

const express = require("express");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();

const server = https.createServer(
    {
        key: fs.readFileSync("./key.pem"),
        cert: fs.readFileSync("./cert.pem")
    },
    app
);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(express.static(__dirname));

// =====================================================
// MEMORY STORAGE
// =====================================================

const users = {};
const rooms = {};

// =====================================================
// HELPERS
// =====================================================

function getRoomMembers(room) {
    return Object.values(users)
        .filter(user => user.room === room)
        .map(user => user.username);
}

function broadcastRooms() {

    const roomList = Object.keys(rooms).map(room => ({
        room,
        memberCount: Object.values(users)
            .filter(user => user.room === room)
            .length
    }));

    io.emit("rooms-list", roomList);
}

// =====================================================
// SOCKET
// =====================================================

io.on("connection", socket => {

    console.log("Connected:", socket.id);

    // -----------------------------
    // SEND ROOM LIST
    // -----------------------------

    socket.on("get-rooms", () => {
        broadcastRooms();
    });

    // -----------------------------
    // CREATE ROOM
    // -----------------------------

    socket.on("create-room", ({ username, room, password }) => {

        if (!username || !room || !password) {

            socket.emit(
                "room-create-error",
                "Please fill all fields."
            );

            return;
        }

        if (rooms[room]) {

            socket.emit(
                "room-create-error",
                "Room already exists."
            );

            return;
        }

        rooms[room] = { password };

        socket.join(room);

        users[socket.id] = {
            username,
            room
        };

        socket.emit("room-created", {
            username,
            room
        });

        io.to(room).emit(
            "members-update",
            getRoomMembers(room)
        );

        io.to(room).emit(
            "system-message",
            {
                message: `${username} created the room`,
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            }
        );

        broadcastRooms();
    });

    // -----------------------------
    // JOIN EXISTING ROOM
    // -----------------------------

    socket.on(
        "join-existing-room",
        ({ username, room, password }) => {

            if (!rooms[room]) {

                socket.emit(
                    "room-join-error",
                    "Room does not exist."
                );

                return;
            }

            if (rooms[room].password !== password) {

                socket.emit(
                    "room-join-error",
                    "Incorrect password."
                );

                return;
            }

            socket.join(room);

            users[socket.id] = {
                username,
                room
            };

            const existingUsers = Object.entries(users)
                .filter(([id, user]) =>
                    user.room === room &&
                    id !== socket.id
                );

            existingUsers.forEach(([id, user]) => {

                socket.emit(
                    "peer-present",
                    {
                        socketId: id,
                        username: user.username
                    }
                );

            });

            socket.to(room).emit(
                "peer-joined",
                {
                    socketId: socket.id,
                    username
                }
            );

            socket.emit("room-joined", {
                username,
                room
            });

            io.to(room).emit(
                "members-update",
                getRoomMembers(room)
            );

            io.to(room).emit(
                "system-message",
                {
                    message: `${username} joined the room`,
                    time: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    })
                }
            );

            broadcastRooms();

        }
    );

    // -----------------------------
    // CHAT PAGE JOIN
    // -----------------------------

    socket.on("join-room", ({ username, room }) => {

        if (!rooms[room]) return;

        socket.join(room);

        users[socket.id] = {
            username,
            room
        };

        const existingUsers = Object.entries(users)
            .filter(([id, user]) =>
                user.room === room &&
                id !== socket.id
            );

        existingUsers.forEach(([id, user]) => {

            socket.emit(
                "peer-present",
                {
                    socketId: id,
                    username: user.username
                }
            );

        });

        socket.to(room).emit(
            "peer-joined",
            {
                socketId: socket.id,
                username
            }
        );

        io.to(room).emit(
            "members-update",
            getRoomMembers(room)
        );

        broadcastRooms();
    });

    // -----------------------------
    // CHAT
    // -----------------------------

    socket.on("send-message", data => {

        io.to(data.room).emit(
            "receive-message",
            {
                username: data.username,
                room: data.room,
                message: data.message,
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            }
        );

    });

    // -----------------------------
    // TYPING
    // -----------------------------

    socket.on("typing", room => {

        const user = users[socket.id];

        if (!user) return;

        socket.to(room).emit(
            "typing",
            user.username
        );

    });

    // =================================================
    // WEBRTC SIGNALING (MULTI-USER)
    // =================================================

    socket.on(
        "webrtc-offer",
        ({ target, offer }) => {

            io.to(target).emit(
                "webrtc-offer",
                {
                    sender: socket.id,
                    offer
                }
            );

        }
    );

    socket.on(
        "webrtc-answer",
        ({ target, answer }) => {

            io.to(target).emit(
                "webrtc-answer",
                {
                    sender: socket.id,
                    answer
                }
            );

        }
    );

    socket.on(
        "webrtc-ice-candidate",
        ({ target, candidate }) => {

            io.to(target).emit(
                "webrtc-ice-candidate",
                {
                    sender: socket.id,
                    candidate
                }
            );

        }
    );

    // -----------------------------
    // DISCONNECT
    // -----------------------------

    socket.on("disconnect", () => {

        const user = users[socket.id];

        if (!user) return;

        delete users[socket.id];

        socket.to(user.room).emit(
            "peer-left",
            {
                socketId: socket.id,
                username: user.username
            }
        );

        io.to(user.room).emit(
            "members-update",
            getRoomMembers(user.room)
        );

        io.to(user.room).emit(
            "system-message",
            {
                message: `${user.username} left the room`,
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            }
        );

        broadcastRooms();
    });

});

// =====================================================
// START SERVER
// =====================================================

server.listen(3000, "0.0.0.0", () => {

    console.log("=================================");
    console.log("🚀 NexTalk V1 Server Running");
    console.log("🔐 HTTPS enabled");
    console.log("🌐 Local: https://localhost:3000");
    console.log("📡 LAN: https://YOUR-IP:3000");
    console.log("=================================");

});