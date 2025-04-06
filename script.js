navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    const myVideo = document.getElementById('myVideo');
    myVideo.srcObject = stream;
    myVideo.play();
  })
  .catch(error => {
    console.error('Camera access denied or not available:', error);
  });const socket = io(); // Connect to your backend (ensure the URL is set if needed)

let localStream;
let peerConnection;
let remoteSocketId = null;
let connectionStartTime = 0;
let connectionTimer;

// Elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const localOverlay = document.getElementById('localOverlay');
const remoteOverlay = document.getElementById('remoteOverlay');
const userCountEl = document.getElementById('userCount');
const messagesDiv = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const chatInput = document.getElementById('chatInput');
const chatForm = document.getElementById('chatForm');
const nextBtn = document.getElementById('nextBtn');
const muteBtn = document.getElementById('muteBtn');
const likeBtn = document.getElementById('likeBtn');
const reportBtn = document.getElementById('reportBtn');
const emojiBtn = document.getElementById('emojiBtn');
const timerEl = document.getElementById('timer');

// Get camera and mic access
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    localOverlay.style.display = 'none';
    socket.emit('ready'); // Notify backend that we’re ready to be paired
  })
  .catch(err => {
    console.error('Error accessing media devices.', err);
    alert('Camera and microphone are required for ChillChat.');
  });

// Handle live user count
socket.on('userCount', count => {
  userCountEl.innerText = `Users Online: ${count}`;
});

// Create peer connection and set up handlers
function createPeerConnection() {
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
  peer.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };
  peer.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
    remoteOverlay.style.display = 'none';
  };
  return peer;
}

// Socket events for WebRTC signaling
socket.on('offer', async (id, description) => {
  remoteSocketId = id;
  peerConnection = createPeerConnection();
  await peerConnection.setRemoteDescription(description);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', id, peerConnection.localDescription);
  startTimer();
});

socket.on('answer', description => {
  peerConnection.setRemoteDescription(description);
});

socket.on('candidate', candidate => {
  if (peerConnection) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

socket.on('disconnectPeer', () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  remoteOverlay.innerText = 'Connecting...';
  remoteOverlay.style.display = 'flex';
  resetTimer();
});

// Messaging logic
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (message && remoteSocketId) {
    socket.emit('message', message);
    appendMessage(`You: ${message}`);
    chatInput.value = '';
  }
});

socket.on('message', msg => {
  appendMessage(`Stranger: ${msg}`);
});

function appendMessage(msg) {
  const p = document.createElement('p');
  p.innerText = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Typing indicator
chatInput.addEventListener('input', () => {
  socket.emit('typing');
});
socket.on('typing', () => {
  typingIndicator.style.display = 'block';
  setTimeout(() => {
    typingIndicator.style.display = 'none';
  }, 1500);
});

// Next Stranger functionality
nextBtn.addEventListener('click', () => {
  socket.emit('next');
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  remoteOverlay.innerText = 'Connecting...';
  remoteOverlay.style.display = 'flex';
  messagesDiv.innerHTML = '';
  resetTimer();
});

// Mute/Unmute
muteBtn.addEventListener('click', () => {
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
      muteBtn.innerText = track.enabled ? 'Mute' : 'Unmute';
    });
  }
});

// Like and Report buttons (send events to backend for logging)
likeBtn.addEventListener('click', () => {
  socket.emit('like');
  alert('You liked this session!');
});
reportBtn.addEventListener('click', () => {
  socket.emit('report');
  alert('This session has been reported.');
});

// Emoji picker (simple integration)
emojiBtn.addEventListener('click', () => {
  // This is a basic example; in a production system, integrate a proper emoji picker library.
  const emoji = prompt('Enter an emoji to insert:');
  if (emoji) {
    chatInput.value += emoji;
  }
});

// Connection timer
function startTimer() {
  connectionStartTime = Date.now();
  timerEl.innerText = "Time Connected: 0:00";
  connectionTimer = setInterval(() => {
    const diff = Date.now() - connectionStartTime;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timerEl.innerText = `Time Connected: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, 1000);
}

function resetTimer() {
  clearInterval(connectionTimer);
  timerEl.innerText = "Time Connected: 0:00";
}
