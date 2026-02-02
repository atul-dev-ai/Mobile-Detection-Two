const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const placeholder = document.getElementById("placeholder");
const scanLine = document.getElementById("scanLine");
const alertSound = document.getElementById("alertSound");
const videoWrapper = document.querySelector(".video-wrapper");

let model = undefined;
let stream = null;
let isDetecting = false;
let lastAlertTime = 0;

// 1. Load Model
cocoSsd
  .load()
  .then((loadedModel) => {
    model = loadedModel;
    statusText.innerHTML =
      '<i class="fas fa-check-circle" style="color:#00f3ff"></i> AI Model Ready. Awaiting Input.';
    statusText.style.borderColor = "rgba(0, 243, 255, 0.5)";
    startBtn.disabled = false;
  })
  .catch((err) => {
    statusText.innerHTML =
      '<i class="fas fa-times-circle" style="color:#ff0055"></i> Model Failed to Load.';
    console.error("Model Load Error:", err);
  });

// 2. Start Camera
async function startCamera() {
  statusText.innerHTML =
    '<i class="fas fa-cog fa-spin"></i> Accessing Optical Sensors...';
  startBtn.disabled = true;

  try {
    // Universal camera constraints
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    video.srcObject = stream;

    video.onloadedmetadata = () => {
      placeholder.style.display = "none";
      video.style.display = "block";
      scanLine.style.display = "block"; // Activate scanning animation
      video.play();

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      startBtn.style.display = "none";
      stopBtn.style.display = "inline-block";
      statusText.innerHTML =
        '<i class="fas fa-satellite-dish" style="color:#00f3ff"></i> Scanning Active. Monitoring Sector.';

      isDetecting = true;
      detectFrame();
    };
  } catch (err) {
    console.error("Camera Error:", err);
    statusText.innerHTML =
      '<i class="fas fa-exclamation-triangle" style="color:#ff0055"></i> Sensor Access Denied.';
    statusText.style.borderColor = "#ff0055";
    startBtn.disabled = false;
    alert("Could not access camera. Please check browser permissions.");
  }
}

// 3. Stop Camera
function stopCamera() {
  isDetecting = false;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
  // Reset UI
  video.style.display = "none";
  scanLine.style.display = "none";
  placeholder.style.display = "block";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  startBtn.style.display = "inline-block";
  startBtn.disabled = false;
  stopBtn.style.display = "none";
  statusText.innerHTML =
    '<i class="fas fa-pause-circle"></i> System Terminated.';
  statusText.style.borderColor = "rgba(255, 255, 255, 0.3)";

  // Reset border glow
  videoWrapper.style.boxShadow = "0 0 25px rgba(0, 243, 255, 0.2)";
  videoWrapper.style.borderColor = "rgba(0, 243, 255, 0.4)";
}

// 4. Detection Loop
function detectFrame() {
  if (!isDetecting) return;

  model.detect(video).then((predictions) => {
    if (!isDetecting) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let phoneFound = false;

    predictions.forEach((prediction) => {
      if (prediction.class === "cell phone") {
        phoneFound = true;
        const [x, y, width, height] = prediction.bbox;

        // Futuristic Box Style (Neon Pink)
        ctx.strokeStyle = "#ff0055";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]); // Dashed cyberpunk line
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]); // Reset dash

        // Label Background
        ctx.fillStyle = "rgba(255, 0, 85, 0.8)";
        ctx.fillRect(x, y - 30, width, 30);

        // Label Text
        ctx.font = "bold 14px Orbitron";
        ctx.fillStyle = "#fff";
        ctx.fillText("⚠️ TARGET: PHONE", x + 10, y - 10);
      }
    });

    // Visual & Audio Feedback on Detection
    if (phoneFound) {
      const now = Date.now();
      if (now - lastAlertTime > 3000) {
        alertSound.play().catch(() => {});
        lastAlertTime = now;
      }
      // Change border to Danger Red/Pink
      videoWrapper.style.boxShadow = "0 0 40px rgba(255, 0, 85, 0.7)";
      videoWrapper.style.borderColor = "#ff0055";
    } else {
      // Revert to Passive Blue
      videoWrapper.style.boxShadow = "0 0 25px rgba(0, 243, 255, 0.2)";
      videoWrapper.style.borderColor = "rgba(0, 243, 255, 0.4)";
    }

    requestAnimationFrame(detectFrame);
  });
}
