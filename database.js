// =====================================================
// NEX TALK DATABASE
// =====================================================

const Database = require("better-sqlite3");


// =====================================================
// CREATE / OPEN DATABASE
// =====================================================

const db = new Database("nextalk.db");


// =====================================================
// ENABLE FOREIGN KEYS
// =====================================================

db.pragma("foreign_keys = ON");


// =====================================================
// CREATE TABLES
// =====================================================

db.exec(`

    -- =================================================
    -- USERS
    -- =================================================

    CREATE TABLE IF NOT EXISTS users (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        username TEXT NOT NULL UNIQUE,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    );


    -- =================================================
    -- ROOMS
    -- =================================================

    CREATE TABLE IF NOT EXISTS rooms (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        room_name TEXT NOT NULL UNIQUE,

        password_hash TEXT NOT NULL,

        created_by INTEGER,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (created_by)
            REFERENCES users(id)

    );


    -- =================================================
    -- CHAT MESSAGES
    -- =================================================

    CREATE TABLE IF NOT EXISTS messages (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        room_id INTEGER NOT NULL,

        user_id INTEGER NOT NULL,

        message TEXT NOT NULL,

        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (room_id)
            REFERENCES rooms(id),

        FOREIGN KEY (user_id)
            REFERENCES users(id)

    );


    -- =================================================
    -- CALL SESSIONS
    -- =================================================

    CREATE TABLE IF NOT EXISTS call_sessions (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        room_id INTEGER NOT NULL,

        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        ended_at DATETIME,

        FOREIGN KEY (room_id)
            REFERENCES rooms(id)

    );


    -- =================================================
    -- CALL PARTICIPANTS
    -- =================================================

    CREATE TABLE IF NOT EXISTS call_participants (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        call_id INTEGER NOT NULL,

        user_id INTEGER NOT NULL,

        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        left_at DATETIME,

        FOREIGN KEY (call_id)
            REFERENCES call_sessions(id),

        FOREIGN KEY (user_id)
            REFERENCES users(id)

    );

`);


// =====================================================
// DATABASE READY
// =====================================================

console.log("=================================");
console.log("🗄️ NexTalk Database Ready");
console.log("📁 nextalk.db");
console.log("=================================");


// =====================================================
// EXPORT DATABASE
// =====================================================

module.exports = db;