const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const chatBox = document.getElementById('chatBox');
const chatMessage = document.getElementById('chatMessage');
const sendBtn = document.getElementById('sendBtn');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
    })
    .catch(err => {
        alert("Please allow camera access for ChillChat to work.");
    });

sendBtn.addEventListener("click", () => {
    const msg = chatMessage.value.trim();
    if (msg) {
        const div = document.createElement("div");
        div.textContent = "You: " + msg;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
        chatMessage.value = "";
    }
});
