```javascript
/* =========================================================
   NEX TALK
   FINAL FUTURISTIC MULTI-USER CLIENT
   Compatible with current NexTalk HTML
========================================================= */

"use strict";


/* =========================================================
   GLOBAL SOCKET
========================================================= */

const socket = io();


/* =========================================================
   GLOBAL STATE
========================================================= */

let localStream = null;

let currentUsername = "";
let currentRoom = "";

let isMuted = false;
let isCameraOff = false;

let isScreenSharing = false;
let originalVideoTrack = null;

let selectedRoom = "";
let typingTimeout = null;


/* =========================================================
   WEBRTC STATE
========================================================= */

const peerConnections = {};
const participants = {};
const pendingIceCandidates = {};
const negotiationLocks = {};


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function getInitial(name) {

    const value =
        String(name || "U").trim();

    return (
        value.charAt(0).toUpperCase() ||
        "U"
    );

}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }

}


function showStatus(message, type = "") {

    const status =
        document.getElementById("status");

    const lobbyMessage =
        document.getElementById("lobbyMessage");

    const target =
        status || lobbyMessage;

    if (!target) {
        return;
    }

    target.textContent = message;

    target.className =
        type
            ? `form-status ${type}`
            : "form-status";

}


function setRoomStatus(message) {

    const status =
        document.getElementById("status");

    if (status) {

        status.textContent =
            message;

        return;

    }

    const roomStatus =
        document.getElementById("roomStatus");

    if (roomStatus) {

        roomStatus.textContent =
            message;

    }

}


function setVideoStatus(message) {

    const element =
        document.getElementById(
            "videoConnectionStatus"
        );

    if (element) {

        element.textContent =
            message;

    }

}


/* =========================================================
   PAGE DETECTION
========================================================= */

const isLobby =
    !!document.getElementById("roomList");

const isChat =
    !!document.getElementById("videoGrid");


/* =========================================================
   SOCKET CONNECTION
========================================================= */

socket.on("connect", () => {

    console.log(
        "NexTalk socket connected:",
        socket.id
    );


    if (isLobby) {

        showStatus(
            "Connected to NexTalk.",
            "success"
        );

        loadRooms();

    }


    if (isChat) {

        setRoomStatus(
            "Connected"
        );


        if (
            currentUsername &&
            currentRoom
        ) {

            socket.emit(
                "join-room",
                {
                    username:
                        currentUsername,

                    room:
                        currentRoom
                }
            );

        }

    }

});


socket.on("disconnect", () => {

    console.warn(
        "NexTalk socket disconnected."
    );


    if (isLobby) {

        showStatus(
            "Connection lost. Reconnecting...",
            "error"
        );

    }


    if (isChat) {

        setRoomStatus(
            "Connection interrupted..."
        );

    }

});


socket.on("connect_error", error => {

    console.error(
        "Socket connection error:",
        error
    );

});


/* =========================================================
   LOBBY START
========================================================= */

if (isLobby) {

    initLobby();

}


/* =========================================================
   INITIALIZE LOBBY
========================================================= */

function initLobby() {

    const usernameInput =
        document.getElementById(
            "username"
        );


    const createRoomName =
        document.getElementById(
            "createRoomName"
        );


    const createRoomPassword =
        document.getElementById(
            "createRoomPassword"
        );


    const createRoomBtn =
        document.getElementById(
            "createRoomBtn"
        );


    const refreshRoomsBtn =
        document.getElementById(
            "refreshRoomsBtn"
        );


    const joinModal =
        document.getElementById(
            "joinModal"
        );


    const closeJoinModalBtn =
        document.getElementById(
            "closeJoinModal"
        );


    const joinRoomPassword =
        document.getElementById(
            "joinRoomPassword"
        );


    const joinRoomBtn =
        document.getElementById(
            "joinRoomBtn"
        );


    const savedUsername =
        sessionStorage.getItem(
            "nexTalkUsername"
        );


    if (
        savedUsername &&
        usernameInput
    ) {

        usernameInput.value =
            savedUsername;

        updateProfile(
            savedUsername
        );

    }


    if (usernameInput) {

        usernameInput.addEventListener(
            "input",
            () => {

                updateProfile(
                    usernameInput.value.trim()
                );

            }
        );

    }


    if (createRoomBtn) {

        createRoomBtn.addEventListener(
            "click",
            createRoom
        );

    }


    [
        usernameInput,
        createRoomName,
        createRoomPassword
    ]
        .filter(Boolean)
        .forEach(
            input => {

                input.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key ===
                            "Enter"
                        ) {

                            event.preventDefault();

                            createRoom();

                        }

                    }
                );

            }
        );


    if (refreshRoomsBtn) {

        refreshRoomsBtn.addEventListener(
            "click",
            loadRooms
        );

    }


    if (closeJoinModalBtn) {

        closeJoinModalBtn.addEventListener(
            "click",
            closeJoinModal
        );

    }


    if (joinModal) {

        joinModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    joinModal
                ) {

                    closeJoinModal();

                }

            }
        );

    }


    if (joinRoomBtn) {

        joinRoomBtn.addEventListener(
            "click",
            confirmRoomJoin
        );

    }


    if (joinRoomPassword) {

        joinRoomPassword.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    confirmRoomJoin();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeJoinModal();

            }

        }
    );


    loadRooms();

}


/* =========================================================
   UPDATE LOBBY PROFILE
========================================================= */

function updateProfile(username) {

    setText(
        "profileName",
        username || "Guest"
    );


    const avatar =
        document.getElementById(
            "profileAvatar"
        );


    if (avatar) {

        avatar.textContent =
            getInitial(username);

    }

}


/* =========================================================
   CREATE ROOM
========================================================= */

function createRoom() {

    const usernameInput =
        document.getElementById(
            "username"
        );


    const roomInput =
        document.getElementById(
            "createRoomName"
        );


    const passwordInput =
        document.getElementById(
            "createRoomPassword"
        );


    const createBtn =
        document.getElementById(
            "createRoomBtn"
        );


    const username =
        usernameInput
            ? usernameInput.value.trim()
            : "";


    const room =
        roomInput
            ? roomInput.value.trim()
            : "";


    const password =
        passwordInput
            ? passwordInput.value.trim()
            : "";


    if (!username) {

        showStatus(
            "Please enter your name.",
            "error"
        );

        if (usernameInput) {

            usernameInput.focus();

        }

        return;

    }


    if (!room) {

        showStatus(
            "Please enter a room name.",
            "error"
        );

        if (roomInput) {

            roomInput.focus();

        }

        return;

    }


    if (!password) {

        showStatus(
            "Please create a room password.",
            "error"
        );

        if (passwordInput) {

            passwordInput.focus();

        }

        return;

    }


    if (createBtn) {

        createBtn.disabled =
            true;

        createBtn.classList.add(
            "loading"
        );

    }


    sessionStorage.setItem(
        "nexTalkUsername",
        username
    );


    socket.emit(
        "create-room",
        {
            username,
            room,
            password
        }
    );


    setTimeout(
        () => {

            if (createBtn) {

                createBtn.disabled =
                    false;

                createBtn.classList.remove(
                    "loading"
                );

            }

        },
        10000
    );

}


/* =========================================================
   LOAD ROOMS
========================================================= */

function loadRooms() {

    if (
        socket &&
        socket.connected
    ) {

        socket.emit(
            "get-rooms"
        );

    }

}


/* =========================================================
   ROOMS LIST
========================================================= */

socket.on(
    "rooms-list",
    roomList => {

        if (!isLobby) {

            return;

        }


        renderRooms(
            Array.isArray(roomList)
                ? roomList
                : []
        );

    }
);


/* =========================================================
   RENDER ROOMS
========================================================= */

function renderRooms(rooms) {

    const container =
        document.getElementById(
            "roomList"
        );


    const sidebar =
        document.getElementById(
            "sidebarRoomList"
        );


    const count =
        document.getElementById(
            "roomCount"
        );


    if (!container) {

        return;

    }


    if (count) {

        count.textContent =
            rooms.length;

    }


    if (
        !rooms ||
        rooms.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-rooms">

                <div class="empty-icon">
                    ◫
                </div>

                <h3>
                    No active rooms
                </h3>

                <p>
                    Available conversations will appear here.
                </p>

            </div>

        `;


        if (sidebar) {

            sidebar.innerHTML = `

                <div class="mini-room-empty">
                    No active rooms
                </div>

            `;

        }


        return;

    }


    container.innerHTML =
        rooms
            .map(
                room => {

                    const safeRoom =
                        escapeHTML(
                            room.room
                        );


                    const memberCount =
                        Number(
                            room.memberCount || 0
                        );


                    return `

                        <button
                            class="room-card"
                            type="button"
                            data-room="${safeRoom}"
                        >

                            <div class="room-card-top">

                                <span class="room-live-dot"></span>

                                <span class="room-live-label">
                                    LIVE
                                </span>

                            </div>

                            <div>

                                <div class="room-name">
                                    ${safeRoom}
                                </div>

                                <div class="room-meta">

                                    ${memberCount}

                                    ${
                                        memberCount === 1
                                            ? "participant"
                                            : "participants"
                                    }

                                </div>

                            </div>

                        </button>

                    `;

                }
            )
            .join("");


    container
        .querySelectorAll(
            ".room-card"
        )
        .forEach(
            card => {

                card.addEventListener(
                    "click",
                    () => {

                        const room =
                            card.dataset.room;


                        const usernameInput =
                            document.getElementById(
                                "username"
                            );


                        const username =
                            usernameInput
                                ? usernameInput.value.trim()
                                : "";


                        if (!username) {

                            showStatus(
                                "Please enter your name first.",
                                "error"
                            );

                            if (usernameInput) {

                                usernameInput.focus();

                            }

                            return;

                        }


                        openJoinModal(
                            room,
                            username
                        );

                    }
                );

            }
        );


    if (sidebar) {

        sidebar.innerHTML =
            rooms
                .slice(0, 5)
                .map(
                    room => {

                        return `

                            <div class="mini-room">

                                <span class="mini-room-dot"></span>

                                <span>
                                    ${escapeHTML(
                                        room.room
                                    )}
                                </span>

                            </div>

                        `;

                    }
                )
                .join("");

    }

}


/* =========================================================
   OPEN JOIN MODAL
========================================================= */

function openJoinModal(
    room,
    username = ""
) {

    selectedRoom =
        room;


    const modal =
        document.getElementById(
            "joinModal"
        );


    const roomName =
        document.getElementById(
            "selectedRoomName"
        );


    const password =
        document.getElementById(
            "joinRoomPassword"
        );


    const message =
        document.getElementById(
            "modalMessage"
        );


    if (roomName) {

        roomName.textContent =
            room;

    }


    if (password) {

        password.value =
            "";

    }


    if (message) {

        message.textContent =
            "";

    }


    if (modal) {

        modal.classList.add(
            "active"
        );

    }


    setTimeout(
        () => {

            if (password) {

                password.focus();

            }

        },
        100
    );

}


/* =========================================================
   CLOSE JOIN MODAL
========================================================= */

function closeJoinModal() {

    const modal =
        document.getElementById(
            "joinModal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }


    selectedRoom =
        "";

}


/* =========================================================
   CONFIRM ROOM JOIN
========================================================= */

function confirmRoomJoin() {

    const usernameInput =
        document.getElementById(
            "username"
        );


    const passwordInput =
        document.getElementById(
            "joinRoomPassword"
        );


    const confirmBtn =
        document.getElementById(
            "joinRoomBtn"
        );


    const message =
        document.getElementById(
            "modalMessage"
        );


    const username =
        usernameInput
            ? usernameInput.value.trim()
            : "";


    const password =
        passwordInput
            ? passwordInput.value.trim()
            : "";


    if (!username) {

        if (message) {

            message.textContent =
                "Please enter your name.";

        }
        else {

            showStatus(
                "Please enter your name.",
                "error"
            );

        }

        return;

    }


    if (!selectedRoom) {

        if (message) {

            message.textContent =
                "Please select a room.";

        }

        return;

    }


    if (!password) {

        if (message) {

            message.textContent =
                "Please enter the room password.";

        }

        if (passwordInput) {

            passwordInput.focus();

        }

        return;

    }


    if (confirmBtn) {

        confirmBtn.disabled =
            true;


        const span =
            confirmBtn.querySelector(
                "span"
            );


        if (span) {

            span.textContent =
                "Joining...";

        }
        else {

            confirmBtn.textContent =
                "Joining...";

        }

    }


    sessionStorage.setItem(
        "nexTalkUsername",
        username
    );


    socket.emit(
        "join-existing-room",
        {
            username,
            room: selectedRoom,
            password
        }
    );

}


/* =========================================================
   ROOM JOIN SUCCESS
========================================================= */

socket.on(
    "room-joined",
    data => {

        const username =
            data?.username ||
            sessionStorage.getItem(
                "nexTalkUsername"
            ) ||
            "";


        const room =
            data?.room ||
            selectedRoom ||
            "";


        if (!username || !room) {

            console.error(
                "Invalid room-joined response:",
                data
            );

            return;

        }


        sessionStorage.setItem(
            "nexTalkUsername",
            username
        );


        sessionStorage.setItem(
            "nexTalkRoom",
            room
        );


        sessionStorage.setItem(
            "nexTalkEntered",
            "true"
        );


        window.location.href =
            "chat.html";

    }
);


/* =========================================================
   ROOM JOIN ERROR
========================================================= */

socket.on(
    "room-join-error",
    message => {

        const confirmBtn =
            document.getElementById(
                "joinRoomBtn"
            );


        const modalMessage =
            document.getElementById(
                "modalMessage"
            );


        if (confirmBtn) {

            confirmBtn.disabled =
                false;


            const span =
                confirmBtn.querySelector(
                    "span"
                );


            if (span) {

                span.textContent =
                    "Join Room";

            }
            else {

                confirmBtn.textContent =
                    "Join Room";

            }

        }


        if (modalMessage) {

            modalMessage.textContent =
                message ||
                "Unable to join room.";

        }
        else {

            showStatus(
                message ||
                "Unable to join room.",
                "error"
            );

        }

    }
);


/* =========================================================
   ROOM CREATED
========================================================= */

socket.on(
    "room-created",
    data => {

        const username =
            data?.username ||
            sessionStorage.getItem(
                "nexTalkUsername"
            ) ||
            "";


        const room =
            data?.room ||
            "";


        if (!username || !room) {

            console.error(
                "Invalid room-created response:",
                data
            );

            return;

        }


        sessionStorage.setItem(
            "nexTalkUsername",
            username
        );


        sessionStorage.setItem(
            "nexTalkRoom",
            room
        );


        sessionStorage.setItem(
            "nexTalkEntered",
            "true"
        );


        window.location.href =
            "chat.html";

    }
);


/* =========================================================
   ROOMS UPDATED
========================================================= */

socket.on(
    "rooms-updated",
    () => {

        if (isLobby) {

            loadRooms();

        }

    }
);


/* =========================================================
   CHAT PAGE START
========================================================= */

if (isChat) {

    initChat();

}


/* =========================================================
   INITIALIZE CHAT
========================================================= */

async function initChat() {

    currentUsername =
        sessionStorage.getItem(
            "nexTalkUsername"
        ) || "";


    currentRoom =
        sessionStorage.getItem(
            "nexTalkRoom"
        ) || "";


    if (
        !currentUsername ||
        !currentRoom
    ) {

        window.location.href =
            "index.html";

        return;

    }


    updateChatProfile();

    updateRoomInformation();

    setupChatControls();


    const messageInput =
        document.getElementById(
            "messageInput"
        );


    const sendBtn =
        document.getElementById(
            "sendBtn"
        );


    if (messageInput) {

        messageInput.disabled =
            false;

    }


    if (sendBtn) {

        sendBtn.disabled =
            false;

    }


    /*
        IMPORTANT FIX:

        chat.html now contains:

        <video id="local-player">

        so prepareLocalVideoContainer()
        returns the actual video element.
    */

    const localVideo =
        prepareLocalVideoContainer();


    if (localVideo) {

        console.log(
            "NexTalk: local video element ready."
        );

    }


    await startLocalMedia();


    if (socket.connected) {

        socket.emit(
            "join-room",
            {
                username:
                    currentUsername,

                room:
                    currentRoom
            }
        );

    }


    setRoomStatus(
        "Room connected"
    );


    updateVideoGridLayout();

}


/* =========================================================
   CHAT PROFILE
========================================================= */

function updateChatProfile() {

    setText(
        "profileName",
        currentUsername
    );


    setText(
        "sidebarRoomName",
        currentRoom
    );


    setText(
        "chatRoomTitle",
        `Room : ${currentRoom}`
    );


    setText(
        "roomNameDisplay",
        currentRoom
    );


    setText(
        "roomTitle",
        currentRoom
    );


    setText(
        "localVideoName",
        currentUsername
    );


    const avatar =
        document.getElementById(
            "sidebarAvatar"
        );


    if (avatar) {

        avatar.textContent =
            getInitial(
                currentUsername
            );

    }


    const profileAvatar =
        document.getElementById(
            "profileAvatar"
        );


    if (profileAvatar) {

        profileAvatar.textContent =
            getInitial(
                currentUsername
            );

    }

}


/* =========================================================
   ROOM INFORMATION
========================================================= */

function updateRoomInformation() {

    setText(
        "sidebarRoomName",
        currentRoom
    );


    setText(
        "chatRoomTitle",
        `Room : ${currentRoom}`
    );


    setText(
        "roomNameDisplay",
        currentRoom
    );


    setText(
        "roomTitle",
        currentRoom
    );

}


/* =========================================================
   PREPARE LOCAL VIDEO CONTAINER
   IMPORTANT FIXED VERSION
========================================================= */

function prepareLocalVideoContainer() {

    const element =
        document.getElementById(
            "local-player"
        );


    if (!element) {

        console.error(
            "NexTalk: #local-player was not found."
        );

        return null;

    }


    /*
        NEW CHAT.HTML:

        <video id="local-player">

        In this case we MUST use the
        existing video directly.

        Do NOT create a video inside it.
    */

    if (
        element instanceof HTMLVideoElement
    ) {

        element.autoplay =
            true;

        element.muted =
            true;

        element.playsInline =
            true;

        element.setAttribute(
            "autoplay",
            ""
        );

        element.setAttribute(
            "muted",
            ""
        );

        element.setAttribute(
            "playsinline",
            ""
        );

        return element;

    }


    /*
        BACKWARD COMPATIBILITY

        If an older version of chat.html
        uses a DIV with id="local-player",
        create a video inside it.
    */

    const container =
        element;


    container.classList.add(
        "video-tile"
    );


    let video =
        container.querySelector(
            "video"
        );


    if (!video) {

        video =
            document.createElement(
                "video"
            );


        video.autoplay =
            true;

        video.muted =
            true;

        video.playsInline =
            true;


        video.setAttribute(
            "autoplay",
            ""
        );


        video.setAttribute(
            "muted",
            ""
        );


        video.setAttribute(
            "playsinline",
            ""
        );


        video.className =
            "local-video-element";


        container.appendChild(
            video
        );

    }


    return video;

}


/* =========================================================
   LOCAL CAMERA / MICROPHONE
========================================================= */

async function startLocalMedia() {

    const localVideo =
        prepareLocalVideoContainer();


    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

        console.error(
            "NexTalk: getUserMedia is unavailable."
        );


        setVideoStatus(
            "Camera unavailable"
        );


        showVideoPermissionMessage(
            {
                name:
                    "NotSupportedError"
            }
        );


        return;

    }


    console.log(
        "NexTalk: requesting camera and microphone..."
    );


    try {

        localStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        },

                        frameRate: {
                            ideal: 30,
                            max: 30
                        }

                    },

                    audio: {

                        echoCancellation:
                            true,

                        noiseSuppression:
                            true,

                        autoGainControl:
                            true

                    }

                });


        console.log(
            "NexTalk: getUserMedia SUCCESS",
            localStream
        );


        const videoTracks =
            localStream.getVideoTracks();


        const audioTracks =
            localStream.getAudioTracks();


        console.log(
            "NexTalk: video tracks:",
            videoTracks.length
        );


        console.log(
            "NexTalk: audio tracks:",
            audioTracks.length
        );


        if (localVideo) {

            localVideo.srcObject =
                localStream;


            localVideo.muted =
                true;

            localVideo.autoplay =
                true;

            localVideo.playsInline =
                true;


            try {

                await localVideo.play();

                console.log(
                    "NexTalk: LOCAL VIDEO PLAYING"
                );

            }
            catch (error) {

                console.error(
                    "NexTalk: LOCAL VIDEO PLAY FAILED",
                    error
                );

            }

        }
        else {

            console.error(
                "NexTalk: local video element is missing."
            );

        }


        originalVideoTrack =
            videoTracks[0] ||
            null;


        isMuted =
            false;

        isCameraOff =
            false;


        setVideoStatus(
            "Camera and microphone ready"
        );


        updateLocalControlButtons();


        /*
            Add local tracks to any
            peer connections that already exist.
        */

        Object.values(
            peerConnections
        ).forEach(
            peer => {

                const existingSenders =
                    peer.getSenders();


                localStream
                    .getTracks()
                    .forEach(
                        track => {

                            const alreadyAdded =
                                existingSenders
                                    .some(
                                        sender =>
                                            sender.track &&
                                            sender.track.id ===
                                            track.id
                                    );


                            if (!alreadyAdded) {

                                try {

                                    peer.addTrack(
                                        track,
                                        localStream
                                    );

                                }
                                catch (error) {

                                    console.warn(
                                        "Could not add local track:",
                                        error
                                    );

                                }

                            }

                        }
                    );

            }
        );


        updateVideoGridLayout();

    }
    catch (error) {

        console.error(
            "NexTalk: CAMERA ERROR:",
            error
        );


        setVideoStatus(
            "Camera permission required"
        );


        showVideoPermissionMessage(
            error
        );

    }

}


/* =========================================================
   CAMERA PERMISSION MESSAGE
========================================================= */

function showVideoPermissionMessage(error) {

    const videoGrid =
        document.getElementById(
            "videoGrid"
        );


    if (!videoGrid) {

        return;

    }


    if (
        document.getElementById(
            "cameraPermissionMessage"
        )
    ) {

        return;

    }


    const message =
        document.createElement(
            "div"
        );


    message.id =
        "cameraPermissionMessage";


    message.className =
        "camera-permission-message";


    let text =
        "Camera or microphone access is required for video calls.";


    if (
        error &&
        error.name ===
        "NotAllowedError"
    ) {

        text =
            "Camera access was blocked. Allow camera and microphone access in your browser.";

    }


    if (
        error &&
        error.name ===
        "NotFoundError"
    ) {

        text =
            "No camera or microphone was detected on this device.";

    }


    if (
        error &&
        error.name ===
        "NotReadableError"
    ) {

        text =
            "Your camera or microphone is already being used by another application.";

    }


    if (
        error &&
        error.name ===
        "SecurityError"
    ) {

        text =
            "Camera access requires HTTPS.";

    }


    message.innerHTML = `

        <strong>
            Camera unavailable
        </strong>

        <span>
            ${escapeHTML(text)}
        </span>

    `;


    videoGrid.appendChild(
        message
    );

}


/* =========================================================
   CREATE PEER CONNECTION
========================================================= */

function createPeerConnection(
    peerId,
    username = "Participant"
) {

    if (!peerId) {

        return null;

    }


    if (
        peerConnections[peerId]
    ) {

        if (participants[peerId]) {

            participants[peerId].username =
                username ||
                participants[peerId].username ||
                "Participant";

        }


        return peerConnections[peerId];

    }


    console.log(
        "Creating peer connection:",
        peerId,
        username
    );


    const peer =
        new RTCPeerConnection({

            iceServers: [

                {
                    urls:
                        "stun:stun.l.google.com:19302"
                },

                {
                    urls:
                        "stun:stun1.l.google.com:19302"
                }

            ]

        });


    peerConnections[peerId] =
        peer;


    participants[peerId] = {

        username:
            username ||
            "Participant",

        stream:
            new MediaStream()

    };


    pendingIceCandidates[peerId] =
        [];


    negotiationLocks[peerId] =
        false;


    /*
        ADD LOCAL TRACKS
    */

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track => {

                    try {

                        peer.addTrack(
                            track,
                            localStream
                        );

                    }
                    catch (error) {

                        console.warn(
                            "Could not add track:",
                            error
                        );

                    }

                }
            );

    }


    /*
        RECEIVE REMOTE TRACKS
    */

    peer.ontrack =
        event => {

            console.log(
                "Remote track received:",
                peerId,
                event.track.kind
            );


            const participant =
                participants[peerId];


            if (!participant) {

                return;

            }


            const stream =
                participant.stream;


            const existingTrack =
                stream
                    .getTracks()
                    .find(
                        track =>
                            track.id ===
                            event.track.id
                    );


            if (!existingTrack) {

                stream.addTrack(
                    event.track
                );

            }


            createOrUpdateVideoTile(
                peerId,
                participant.username,
                stream
            );


            event.track.onended =
                () => {

                    updateVideoTileState(
                        peerId
                    );

                };

        };


    /*
        ICE
    */

    peer.onicecandidate =
        event => {

            if (!event.candidate) {

                return;

            }


            socket.emit(
                "webrtc-ice-candidate",
                {
                    target:
                        peerId,

                    candidate:
                        event.candidate
                }
            );

        };


    /*
        CONNECTION STATE
    */

    peer.onconnectionstatechange =
        () => {

            const state =
                peer.connectionState;


            console.log(
                "Peer connection:",
                peerId,
                state
            );


            updateVideoTileState(
                peerId
            );


            if (
                state ===
                "connected"
            ) {

                setVideoStatus(
                    "Video connection active"
                );

            }


            if (
                state ===
                "failed"
            ) {

                console.warn(
                    "Connection failed:",
                    peerId
                );


                if (
                    peer.restartIce
                ) {

                    try {

                        peer.restartIce();

                    }
                    catch (error) {

                        console.warn(
                            "ICE restart failed:",
                            error
                        );

                    }

                }

            }


            if (
                state ===
                "closed"
            ) {

                removePeer(
                    peerId
                );

            }

        };


    /*
        ICE CONNECTION
    */

    peer.oniceconnectionstatechange =
        () => {

            console.log(
                "ICE:",
                peerId,
                peer.iceConnectionState
            );

        };


    /*
        SIGNALING
    */

    peer.onsignalingstatechange =
        () => {

            console.log(
                "Signaling:",
                peerId,
                peer.signalingState
            );

        };


    return peer;

}


/* =========================================================
   EXISTING PEER PRESENT
========================================================= */

socket.on(
    "peer-present",
    async data => {

        if (!isChat) {

            return;

        }


        const peerId =
            data?.socketId;


        const username =
            data?.username ||
            "Participant";


        if (!peerId) {

            return;

        }


        console.log(
            "Existing peer:",
            username,
            peerId
        );


        const peer =
            createPeerConnection(
                peerId,
                username
            );


        if (!peer) {

            return;

        }


        if (
            peer.signalingState !==
            "stable"
        ) {

            return;

        }


        if (
            negotiationLocks[peerId]
        ) {

            return;

        }


        negotiationLocks[peerId] =
            true;


        try {

            const offer =
                await peer.createOffer();


            await peer.setLocalDescription(
                offer
            );


            socket.emit(
                "webrtc-offer",
                {
                    target:
                        peerId,

                    offer:
                        peer.localDescription
                }
            );

        }
        catch (error) {

            console.error(
                "Offer creation failed:",
                error
            );

        }
        finally {

            negotiationLocks[peerId] =
                false;

        }

    }
);


/* =========================================================
   NEW PEER JOINED
========================================================= */

socket.on(
    "peer-joined",
    data => {

        if (!isChat) {

            return;

        }


        const peerId =
            data?.socketId;


        const username =
            data?.username ||
            "Participant";


        if (!peerId) {

            return;

        }


        console.log(
            "New participant:",
            username,
            peerId
        );


        createPeerConnection(
            peerId,
            username
        );

    }
);


/* =========================================================
   RECEIVE OFFER
========================================================= */

socket.on(
    "webrtc-offer",
    async data => {

        if (!isChat) {

            return;

        }


        const peerId =
            data?.sender;


        if (!peerId) {

            return;

        }


        const username =
            participants[peerId]
                ?.username ||
            data?.username ||
            "Participant";


        const peer =
            createPeerConnection(
                peerId,
                username
            );


        if (!peer) {

            return;

        }


        try {

            if (
                peer.signalingState !==
                "stable"
            ) {

                console.warn(
                    "Peer not stable for offer:",
                    peerId,
                    peer.signalingState
                );

            }


            await peer.setRemoteDescription(
                new RTCSessionDescription(
                    data.offer
                )
            );


            await processPendingIceCandidates(
                peerId
            );


            const answer =
                await peer.createAnswer();


            await peer.setLocalDescription(
                answer
            );


            socket.emit(
                "webrtc-answer",
                {
                    target:
                        peerId,

                    answer:
                        peer.localDescription
                }
            );

        }
        catch (error) {

            console.error(
                "Error handling offer:",
                error
            );

        }

    }
);


/* =========================================================
   RECEIVE ANSWER
========================================================= */

socket.on(
    "webrtc-answer",
    async data => {

        if (!isChat) {

            return;

        }


        const peerId =
            data?.sender;


        const peer =
            peerConnections[peerId];


        if (!peer) {

            console.warn(
                "Answer received for unknown peer:",
                peerId
            );

            return;

        }


        try {

            await peer.setRemoteDescription(
                new RTCSessionDescription(
                    data.answer
                )
            );


            await processPendingIceCandidates(
                peerId
            );

        }
        catch (error) {

            console.error(
                "Error setting answer:",
                error
            );

        }

    }
);


/* =========================================================
   RECEIVE ICE
========================================================= */

socket.on(
    "webrtc-ice-candidate",
    async data => {

        if (!isChat) {

            return;

        }


        const peerId =
            data?.sender;


        if (!peerId) {

            return;

        }


        const peer =
            peerConnections[peerId];


        if (
            !peer ||
            !peer.remoteDescription
        ) {

            if (
                !pendingIceCandidates[peerId]
            ) {

                pendingIceCandidates[peerId] =
                    [];

            }


            if (data?.candidate) {

                pendingIceCandidates[peerId]
                    .push(
                        data.candidate
                    );

            }


            return;

        }


        try {

            if (data?.candidate) {

                await peer.addIceCandidate(
                    new RTCIceCandidate(
                        data.candidate
                    )
                );

            }

        }
        catch (error) {

            console.error(
                "ICE candidate error:",
                error
            );

        }

    }
);


/* =========================================================
   PROCESS PENDING ICE
========================================================= */

async function processPendingIceCandidates(
    peerId
) {

    const peer =
        peerConnections[peerId];


    if (
        !peer ||
        !peer.remoteDescription
    ) {

        return;

    }


    const queue =
        pendingIceCandidates[peerId];


    if (
        !queue ||
        queue.length === 0
    ) {

        return;

    }


    pendingIceCandidates[peerId] =
        [];


    for (
        const candidate
        of queue
    ) {

        try {

            await peer.addIceCandidate(
                new RTCIceCandidate(
                    candidate
                )
            );

        }
        catch (error) {

            console.error(
                "Queued ICE error:",
                error
            );

        }

    }

}


/* =========================================================
   CREATE / UPDATE VIDEO TILE
========================================================= */

function createOrUpdateVideoTile(
    peerId,
    username,
    stream
) {

    const grid =
        document.getElementById(
            "videoGrid"
        );


    if (!grid) {

        return;

    }


    let tile =
        document.querySelector(
            `[data-peer-id="${CSS.escape(peerId)}"]`
        );


    if (!tile) {

        tile =
            document.createElement(
                "div"
            );


        tile.className =
            "video-tile remote-video-tile";


        tile.dataset.peerId =
            peerId;


        tile.innerHTML = `

            <video
                autoplay
                playsinline
            ></video>

            <div class="video-tile-overlay">

                <div class="video-user-info">

                    <span
                        class="video-user-status"
                    ></span>

                    <span
                        class="remote-video-name"
                    >
                        ${escapeHTML(
                            username ||
                            "Participant"
                        )}
                    </span>

                </div>

                <span class="video-user-label">
                    LIVE
                </span>

            </div>

        `;


        grid.appendChild(
            tile
        );

    }
    else {

        const name =
            tile.querySelector(
                ".remote-video-name"
            );


        if (name) {

            name.textContent =
                username ||
                "Participant";

        }

    }


    const video =
        tile.querySelector(
            "video"
        );


    if (
        video &&
        video.srcObject !== stream
    ) {

        video.srcObject =
            stream;


        video.play()
            .catch(
                error => {

                    console.warn(
                        "Remote video autoplay:",
                        error
                    );

                }
            );

    }


    updateVideoTileState(
        peerId
    );


    updateVideoGridLayout();

}


/* =========================================================
   UPDATE VIDEO TILE STATE
========================================================= */

function updateVideoTileState(
    peerId
) {

    const tile =
        document.querySelector(
            `[data-peer-id="${CSS.escape(peerId)}"]`
        );


    if (!tile) {

        return;

    }


    const peer =
        peerConnections[peerId];


    const indicator =
        tile.querySelector(
            ".video-user-status"
        );


    if (!indicator) {

        return;

    }


    if (
        peer &&
        (
            peer.connectionState ===
            "connected" ||

            peer.iceConnectionState ===
            "connected" ||

            peer.iceConnectionState ===
            "completed"
        )
    ) {

        indicator.classList.add(
            "connected"
        );

    }
    else {

        indicator.classList.remove(
            "connected"
        );

    }

}


/* =========================================================
   REMOVE PEER
========================================================= */

function removePeer(
    peerId
) {

    if (!peerId) {

        return;

    }


    console.log(
        "Removing peer:",
        peerId
    );


    const peer =
        peerConnections[peerId];


    if (peer) {

        try {

            peer.close();

        }
        catch (error) {

            console.warn(
                "Peer close error:",
                error
            );

        }

    }


    delete peerConnections[
        peerId
    ];


    delete participants[
        peerId
    ];


    delete pendingIceCandidates[
        peerId
    ];


    delete negotiationLocks[
        peerId
    ];


    const tile =
        document.querySelector(
            `[data-peer-id="${CSS.escape(peerId)}"]`
        );


    if (tile) {

        tile.remove();

    }


    updateVideoGridLayout();

}


/* =========================================================
   PEER LEFT
========================================================= */

socket.on(
    "peer-left",
    data => {

        if (!isChat) {

            return;

        }


        removePeer(
            data?.socketId
        );


        addSystemMessage(
            `${
                data?.username ||
                "Participant"
            } left the call.`
        );

    }
);


/* =========================================================
   MEMBERS UPDATE
========================================================= */

socket.on(
    "members-update",
    members => {

        if (!isChat) {

            return;

        }


        const safeMembers =
            Array.isArray(members)
                ? members
                : [];


        renderMemberList(
            safeMembers
        );


        updateParticipantCounts(
            safeMembers
        );

    }
);


/* =========================================================
   UPDATE PARTICIPANT COUNTS
========================================================= */

function updateParticipantCounts(
    members
) {

    const count =
        Array.isArray(members)
            ? members.length
            : 0;


    setText(
        "memberCount",
        count
    );


    setText(
        "topMemberCount",
        count
    );


    const onlineElement =
        document.querySelector(
            ".members-card .online"
        );


    if (onlineElement) {

        onlineElement.textContent =
            `🟢 ${count} Online`;

    }

}


/* =========================================================
   RENDER MEMBER LIST
========================================================= */

function renderMemberList(
    members
) {

    const container =
        document.getElementById(
            "memberList"
        );


    const mobile =
        document.getElementById(
            "mobileMemberList"
        );


    const html =
        members
            .map(
                name => {

                    const safeName =
                        escapeHTML(
                            name
                        );


                    const isYou =
                        name ===
                        currentUsername;


                    return `

                        <div class="member-item">

                            <div class="member-avatar">
                                ${escapeHTML(
                                    getInitial(name)
                                )}
                            </div>

                            <div class="member-details">

                                <strong>
                                    ${safeName}
                                </strong>

                                <span>
                                    ${
                                        isYou
                                            ? "You"
                                            : "Participant"
                                    }
                                </span>

                            </div>

                            <span class="member-online-dot"></span>

                        </div>

                    `;

                }
            )
            .join("");


    if (container) {

        container.innerHTML =
            html;

    }


    if (mobile) {

        mobile.innerHTML =
            html;

    }

}


/* =========================================================
   DYNAMIC VIDEO GRID
========================================================= */

function updateVideoGridLayout() {

    const grid =
        document.getElementById(
            "videoGrid"
        );


    if (!grid) {

        return;

    }


    const tiles =
        grid.querySelectorAll(
            ".video-tile"
        );


    const count =
        tiles.length;


    grid.dataset.count =
        count;


    grid.classList.remove(
        "participants-1",
        "participants-2",
        "participants-3",
        "participants-4",
        "participants-5",
        "participants-many"
    );


    if (count >= 6) {

        grid.classList.add(
            "participants-many"
        );

    }
    else {

        grid.classList.add(
            `participants-${Math.max(
                count,
                1
            )}`
        );

    }


    void grid.offsetHeight;

}


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
    "resize",
    () => {

        if (isChat) {

            updateVideoGridLayout();

        }

    }
);


/* =========================================================
   CHAT CONTROLS
========================================================= */

function setupChatControls() {

    const sendBtn =
        document.getElementById(
            "sendBtn"
        );


    const messageInput =
        document.getElementById(
            "messageInput"
        );


    const muteBtn =
        document.getElementById(
            "muteBtn"
        );


    const cameraBtn =
        document.getElementById(
            "cameraBtn"
        );


    const endCallBtn =
        document.getElementById(
            "endCallBtn"
        );


    const screenShareBtn =
        document.getElementById(
            "screenShareBtn"
        );


    const fullscreenBtn =
        document.getElementById(
            "fullscreenBtn"
        );


    const layoutButton =
        document.getElementById(
            "layoutButton"
        );


    const layoutControlBtn =
        document.getElementById(
            "layoutControlBtn"
        );


    const leaveRoomBtn =
        document.getElementById(
            "leaveRoomBtn"
        );


    const participantsBtn =
        document.getElementById(
            "participantsBtn"
        );


    const closeParticipantsBtn =
        document.getElementById(
            "closeParticipantsBtn"
        );


    const mobileOverlay =
        document.getElementById(
            "mobilePanelOverlay"
        );


    if (sendBtn) {

        sendBtn.addEventListener(
            "click",
            sendMessage
        );

    }


    if (messageInput) {

        messageInput.disabled =
            false;


        messageInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendMessage();

                }

            }
        );


        messageInput.addEventListener(
            "input",
            () => {

                if (
                    currentRoom &&
                    socket.connected
                ) {

                    socket.emit(
                        "typing",
                        currentRoom
                    );

                }

            }
        );

    }


    if (muteBtn) {

        muteBtn.addEventListener(
            "click",
            toggleMute
        );

    }


    if (cameraBtn) {

        cameraBtn.addEventListener(
            "click",
            toggleCamera
        );

    }


    if (screenShareBtn) {

        screenShareBtn.addEventListener(
            "click",
            toggleScreenShare
        );

    }


    if (endCallBtn) {

        endCallBtn.addEventListener(
            "click",
            leaveCall
        );

    }


    if (leaveRoomBtn) {

        leaveRoomBtn.addEventListener(
            "click",
            leaveRoom
        );

    }


    if (fullscreenBtn) {

        fullscreenBtn.addEventListener(
            "click",
            toggleFullscreen
        );

    }


    [
        layoutButton,
        layoutControlBtn
    ]
        .filter(Boolean)
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        updateVideoGridLayout();

                    }
                );

            }
        );


    if (participantsBtn) {

        participantsBtn.addEventListener(
            "click",
            () => {

                if (mobileOverlay) {

                    mobileOverlay.classList.add(
                        "active"
                    );

                }

            }
        );

    }


    if (closeParticipantsBtn) {

        closeParticipantsBtn.addEventListener(
            "click",
            () => {

                if (mobileOverlay) {

                    mobileOverlay.classList.remove(
                        "active"
                    );

                }

            }
        );

    }


    if (mobileOverlay) {

        mobileOverlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    mobileOverlay
                ) {

                    mobileOverlay.classList.remove(
                        "active"
                    );

                }

            }
        );

    }


    updateLocalControlButtons();

    updateVideoGridLayout();

}


/* =========================================================
   SEND MESSAGE
========================================================= */

function sendMessage() {

    const input =
        document.getElementById(
            "messageInput"
        );


    if (!input) {

        return;

    }


    const message =
        input.value.trim();


    if (!message) {

        return;

    }


    if (
        !socket.connected
    ) {

        addSystemMessage(
            "Connection unavailable. Please wait..."
        );

        return;

    }


    socket.emit(
        "send-message",
        {
            username:
                currentUsername,

            room:
                currentRoom,

            message
        }
    );


    input.value =
        "";

}


/* =========================================================
   RECEIVE MESSAGE
========================================================= */

socket.on(
    "receive-message",
    data => {

        if (!isChat) {

            return;

        }


        addChatMessage(
            data?.username ||
            "User",

            data?.message ||
            "",

            data?.time ||
            ""
        );

    }
);


/* =========================================================
   ADD CHAT MESSAGE
========================================================= */

function addChatMessage(
    username,
    message,
    time
) {

    const container =
        document.getElementById(
            "messages"
        );


    if (!container) {

        return;

    }


    const welcome =
        container.querySelector(
            ".welcome-message"
        );


    if (welcome) {

        welcome.remove();

    }


    const own =
        username ===
        currentUsername;


    const element =
        document.createElement(
            "div"
        );


    element.className =
        own
            ? "message right"
            : "message left";


    element.innerHTML = `

        <div class="message-meta">

            <strong>
                ${escapeHTML(username)}
            </strong>

            <span>
                ${escapeHTML(time || "")}
            </span>

        </div>

        <div class="message-content">
            ${escapeHTML(message)}
        </div>

    `;


    container.appendChild(
        element
    );


    container.scrollTop =
        container.scrollHeight;

}


/* =========================================================
   SYSTEM MESSAGE
========================================================= */

socket.on(
    "system-message",
    data => {

        if (!isChat) {

            return;

        }


        addSystemMessage(
            data?.message ||
            ""
        );

    }
);


/* =========================================================
   ADD SYSTEM MESSAGE
========================================================= */

function addSystemMessage(
    message
) {

    const container =
        document.getElementById(
            "messages"
        );


    if (!container) {

        return;

    }


    const element =
        document.createElement(
            "div"
        );


    element.className =
        "system-message";


    element.textContent =
        message;


    container.appendChild(
        element
    );


    container.scrollTop =
        container.scrollHeight;

}


/* =========================================================
   TYPING INDICATOR
========================================================= */

socket.on(
    "typing",
    username => {

        if (!isChat) {

            return;

        }


        const indicator =
            document.getElementById(
                "typingIndicator"
            );


        if (!indicator) {

            return;

        }


        if (
            !username ||
            username ===
            currentUsername
        ) {

            return;

        }


        indicator.textContent =
            `${username} is typing...`;


        clearTimeout(
            typingTimeout
        );


        typingTimeout =
            setTimeout(
                () => {

                    indicator.textContent =
                        "";

                },
                1500
            );

    }
);


/* =========================================================
   MUTE
========================================================= */

function toggleMute() {

    if (!localStream) {

        return;

    }


    const tracks =
        localStream.getAudioTracks();


    if (!tracks.length) {

        return;

    }


    isMuted =
        !isMuted;


    tracks.forEach(
        track => {

            track.enabled =
                !isMuted;

        }
    );


    updateMuteButton();

}


/* =========================================================
   CAMERA
========================================================= */

function toggleCamera() {

    if (!localStream) {

        return;

    }


    const tracks =
        localStream.getVideoTracks();


    if (!tracks.length) {

        return;

    }


    isCameraOff =
        !isCameraOff;


    tracks.forEach(
        track => {

            track.enabled =
                !isCameraOff;

        }
    );


    updateCameraButton();


    const tile =
        document.getElementById(
            "localVideoTile"
        ) ||
        document.getElementById(
            "local-player"
        );


    if (tile) {

        tile.classList.toggle(
            "camera-off",
            isCameraOff
        );

    }

}


/* =========================================================
   UPDATE MUTE BUTTON
========================================================= */

function updateMuteButton() {

    const button =
        document.getElementById(
            "muteBtn"
        );


    if (!button) {

        return;

    }


    button.classList.toggle(
        "active-control",
        isMuted
    );


    const label =
        button.querySelector(
            ".control-label"
        );


    if (label) {

        label.textContent =
            isMuted
                ? "Unmute"
                : "Mute";

        return;

    }


    const icon =
        button.querySelector(
            "span"
        );


    if (icon) {

        button.innerHTML =
            "";

        button.appendChild(
            icon
        );

        button.appendChild(
            document.createTextNode(
                isMuted
                    ? " Unmute"
                    : " Mute"
            )
        );

    }

}


/* =========================================================
   UPDATE CAMERA BUTTON
========================================================= */

function updateCameraButton() {

    const button =
        document.getElementById(
            "cameraBtn"
        );


    if (!button) {

        return;

    }


    button.classList.toggle(
        "active-control",
        isCameraOff
    );


    const label =
        button.querySelector(
            ".control-label"
        );


    if (label) {

        label.textContent =
            isCameraOff
                ? "Camera off"
                : "Camera";

        return;

    }


    const icon =
        button.querySelector(
            "span"
        );


    if (icon) {

        button.innerHTML =
            "";

        button.appendChild(
            icon
        );

        button.appendChild(
            document.createTextNode(
                isCameraOff
                    ? " Camera off"
                    : " Camera"
            )
        );

    }

}


/* =========================================================
   UPDATE ALL LOCAL CONTROLS
========================================================= */

function updateLocalControlButtons() {

    updateMuteButton();

    updateCameraButton();

}


/* =========================================================
   SCREEN SHARE
========================================================= */

async function toggleScreenShare() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getDisplayMedia
    ) {

        setVideoStatus(
            "Screen sharing unavailable"
        );

        return;

    }


    if (isScreenSharing) {

        await stopScreenShare();

        return;

    }


    try {

        const screenStream =
            await navigator.mediaDevices
                .getDisplayMedia({

                    video: true,

                    audio: false

                });


        const screenTrack =
            screenStream
                .getVideoTracks()[0];


        if (!screenTrack) {

            return;

        }


        isScreenSharing =
            true;


        for (
            const peer
            of Object.values(
                peerConnections
            )
        ) {

            const sender =
                peer.getSenders()
                    .find(
                        item =>
                            item.track &&
                            item.track.kind ===
                            "video"
                    );


            if (sender) {

                try {

                    await sender.replaceTrack(
                        screenTrack
                    );

                }
                catch (error) {

                    console.warn(
                        "Could not replace video track:",
                        error
                    );

                }

            }

        }


        const localVideo =
            prepareLocalVideoContainer();


        if (localVideo) {

            const displayStream =
                new MediaStream();


            displayStream.addTrack(
                screenTrack
            );


            if (localStream) {

                localStream
                    .getAudioTracks()
                    .forEach(
                        track => {

                            displayStream.addTrack(
                                track
                            );

                        }
                    );

            }


            localVideo.srcObject =
                displayStream;


            localVideo.play()
                .catch(
                    () => {}
                );

        }


        screenTrack.onended =
            () => {

                stopScreenShare();

            };


        const button =
            document.getElementById(
                "screenShareBtn"
            );


        if (button) {

            button.classList.add(
                "active-control"
            );


            const label =
                button.querySelector(
                    ".control-label"
                );


            if (label) {

                label.textContent =
                    "Stop share";

            }

        }


        setVideoStatus(
            "Screen sharing active"
        );

    }
    catch (error) {

        console.error(
            "Screen sharing failed:",
            error
        );

    }

}


/* =========================================================
   STOP SCREEN SHARE
========================================================= */

async function stopScreenShare() {

    if (!isScreenSharing) {

        return;

    }


    isScreenSharing =
        false;


    if (originalVideoTrack) {

        for (
            const peer
            of Object.values(
                peerConnections
            )
        ) {

            const sender =
                peer.getSenders()
                    .find(
                        item =>
                            item.track &&
                            item.track.kind ===
                            "video"
                    );


            if (sender) {

                try {

                    await sender.replaceTrack(
                        originalVideoTrack
                    );

                }
                catch (error) {

                    console.warn(
                        "Could not restore camera:",
                        error
                    );

                }

            }

        }

    }


    const localVideo =
        prepareLocalVideoContainer();


    if (
        localVideo &&
        localStream
    ) {

        localVideo.srcObject =
            localStream;


        localVideo.play()
            .catch(
                () => {}
            );

    }


    const button =
        document.getElementById(
            "screenShareBtn"
        );


    if (button) {

        button.classList.remove(
            "active-control"
        );


        const label =
            button.querySelector(
                ".control-label"
            );


        if (label) {

            label.textContent =
                "Share";

        }

    }


    setVideoStatus(
        "Camera and microphone ready"
    );

}


/* =========================================================
   END CALL
========================================================= */

function leaveCall() {

    console.log(
        "Leaving NexTalk call..."
    );


    Object.values(
        peerConnections
    ).forEach(
        peer => {

            try {

                peer.close();

            }
            catch (error) {

                console.warn(
                    "Peer close error:",
                    error
                );

            }

        }
    );


    Object.keys(
        peerConnections
    ).forEach(
        key => {

            delete peerConnections[
                key
            ];

        }
    );


    Object.keys(
        participants
    ).forEach(
        key => {

            delete participants[
                key
            ];

        }
    );


    Object.keys(
        pendingIceCandidates
    ).forEach(
        key => {

            delete pendingIceCandidates[
                key
            ];

        }
    );


    Object.keys(
        negotiationLocks
    ).forEach(
        key => {

            delete negotiationLocks[
                key
            ];

        }
    );


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track => {

                    track.stop();

                }
            );

    }


    localStream =
        null;


    originalVideoTrack =
        null;


    isScreenSharing =
        false;


    if (
        socket &&
        socket.connected
    ) {

        socket.disconnect();

    }


    window.location.href =
        "index.html";

}


/* =========================================================
   LEAVE ROOM
========================================================= */

function leaveRoom() {

    leaveCall();

}


/* =========================================================
   BEFORE UNLOAD
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        Object.values(
            peerConnections
        ).forEach(
            peer => {

                try {

                    peer.close();

                }
                catch (error) {}

            }
        );


        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    track => {

                        track.stop();

                    }
                );

        }

    }
);


/* =========================================================
   FULLSCREEN
========================================================= */

async function toggleFullscreen() {

    const target =
        document.querySelector(
            ".video-workspace"
        ) ||
        document.querySelector(
            ".video-panel"
        ) ||
        document.getElementById(
            "videoGrid"
        );


    if (!target) {

        return;

    }


    try {

        if (
            !document.fullscreenElement
        ) {

            await target.requestFullscreen();

        }
        else {

            await document.exitFullscreen();

        }

    }
    catch (error) {

        console.error(
            "Fullscreen error:",
            error
        );

    }

}


/* =========================================================
   FULLSCREEN CHANGE
========================================================= */

document.addEventListener(
    "fullscreenchange",
    () => {

        if (isChat) {

            setTimeout(
                updateVideoGridLayout,
                100
            );

        }

    }
);


/* =========================================================
   INITIAL LAYOUT
========================================================= */

if (isChat) {

    setTimeout(
        updateVideoGridLayout,
        100
    );

}
```
