
const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const messagesDiv = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const messageInput = document.getElementById('messageInput');
const chatForm = document.getElementById('chat-form');
const nextBtn = document.getElementById('nextBtn');
const userCountEl = document.getElementById('user-count');

let peerConnection;
let localStream;

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  localStream = stream;
  localVideo.srcObject = stream;
  socket.emit('ready');
});

socket.on('user-count', count => {
  userCountEl.innerText = `Users Online: ${count}`;
});

socket.on('offer', async (id, description) => {
  peerConnection = createPeer();
  await peerConnection.setRemoteDescription(description);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', id, peerConnection.localDescription);
});

socket.on('answer', description => {
  peerConnection.setRemoteDescription(description);
});

socket.on('candidate', candidate => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('disconnectPeer', () => {
  if (peerConnection) peerConnection.close();
  remoteVideo.srcObject = null;
});

function createPeer() {
  const peer = new RTCPeerConnection();
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
  peer.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };
  peer.onicecandidate = e => {
    if (e.candidate) socket.emit('candidate', e.candidate);
  };
  socket.emit('createOffer');
  return peer;
}

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = messageInput.value;
  if (message) {
    socket.emit('message', message);
    appendMessage('You: ' + message);
    messageInput.value = '';
  }
});

messageInput.addEventListener('input', () => {
  socket.emit('typing');
});

socket.on('typing', () => {
  typingIndicator.style.display = 'block';
  setTimeout(() => typingIndicator.style.display = 'none', 1000);
});

socket.on('message', msg => {
  appendMessage('Stranger: ' + msg);
});

function appendMessage(msg) {
  const p = document.createElement('p');
  p.innerText = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

nextBtn.addEventListener('click', () => {
  socket.emit('next');
});
