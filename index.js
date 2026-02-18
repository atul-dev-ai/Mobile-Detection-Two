function toggleMenu() {
  const menu = document.getElementById("navbar-sticky");
  menu.classList.toggle("hidden");
} 
// DOM Elements
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

// Variables
let model = undefined;
let stream = null;
let isDetecting = false;
let lastAlertTime = 0;

// 1. Load COCO-SSD Model
async function loadModel() {
  try {
    model = await cocoSsd.load();
    statusText.innerHTML =
      '<i class="fas fa-check-circle text-green-400"></i> AI Model Ready. System Standby.';
    statusText.classList.remove("text-blue-300");
    statusText.classList.add("text-green-400", "border-green-500");
    startBtn.disabled = false;
  } catch (err) {
    statusText.innerHTML =
      '<i class="fas fa-times-circle text-red-500"></i> Model Load Failed.';
    console.error("Model Error:", err);
  }
}

// Initialize Model on Page Load
loadModel();

// 2. Start Camera Function
startBtn.addEventListener("click", async () => {
  statusText.innerHTML =
    '<i class="fas fa-cog fa-spin"></i> Accessing Optical Sensors...';
  startBtn.disabled = true;

  // Check if browser supports media devices
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert(
      "Your browser does not support camera access. Please use Chrome or Safari on HTTPS.",
    );
    statusText.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i> Browser Not Supported.';
    return;
  }

  try {
    // Request Camera (Try back camera first 'environment', fallback to 'user')
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment", // Use back camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    video.srcObject = stream;

    // Wait for video to load data
    video.onloadeddata = () => {
      video.play();

      // Update UI
      placeholder.style.display = "none";
      scanLine.classList.remove("hidden"); // Show animation

      // Match canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");

      statusText.innerHTML =
        '<i class="fas fa-satellite-dish text-blue-400 animate-pulse"></i> Scanning Active. Monitoring Sector...';

      // Start Detection Loop
      isDetecting = true;
      detectFrame();
    };
  } catch (err) {
    console.error("Camera Error:", err);
    statusText.innerHTML =
      '<i class="fas fa-lock text-red-500"></i> Access Denied / Error.';
    startBtn.disabled = false;
    alert(
      "Camera Error: Please allow camera permissions and ensure you are using HTTPS.",
    );
  }
});

// 3. Stop Camera Function
stopBtn.addEventListener("click", () => {
  isDetecting = false;

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }

  // Reset UI
  scanLine.classList.add("hidden");
  placeholder.style.display = "flex";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  startBtn.classList.remove("hidden");
  startBtn.disabled = false;
  stopBtn.classList.add("hidden");

  statusText.innerHTML =
    '<i class="fas fa-pause-circle"></i> System Terminated.';

  // Reset Border Glow
  videoWrapper.style.boxShadow = "0 0 20px rgba(59,130,246,0.3)";
  videoWrapper.style.borderColor = "rgba(59,130,246,0.3)";
});

// 4. Detection Loop
function detectFrame() {
  if (!isDetecting) return;

  // Detect objects
  model.detect(video).then((predictions) => {
    if (!isDetecting) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let phoneFound = false;

    predictions.forEach((prediction) => {
      // Check if detected object is a cell phone
      if (prediction.class === "cell phone" || prediction.class === "remote") {
        phoneFound = true;

        const [x, y, width, height] = prediction.bbox;

        // Draw Futuristic Box
        ctx.strokeStyle = "#ec4899"; // Pink Neon
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ec4899";

        // Dashed Line Effect
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]); // Reset

        // Label Background
        ctx.fillStyle = "rgba(236, 72, 153, 0.8)";
        ctx.fillRect(x, y - 30, width, 30);

        // Label Text
        ctx.font = "bold 16px Courier New";
        ctx.fillStyle = "#fff";
        ctx.fillText(
          `⚠️ TARGET: PHONE (${Math.round(prediction.score * 100)}%)`,
          x + 5,
          y - 10,
        );
      }
    });

    // Alert Logic
    if (phoneFound) {
      const now = Date.now();
      // Play sound every 3 seconds if phone persists
      if (now - lastAlertTime > 3000) {
        alertSound.play().catch((e) => console.log("Audio play error:", e));
        lastAlertTime = now;
      }

      // Danger UI Effect
      videoWrapper.style.borderColor = "#ec4899";
      videoWrapper.style.boxShadow = "0 0 50px rgba(236, 72, 153, 0.8)";
      statusText.innerHTML =
        '<i class="fas fa-exclamation-circle text-red-500 animate-bounce"></i> WARNING: UNAUTHORIZED DEVICE!';
    } else {
      // Normal UI Effect
      videoWrapper.style.borderColor = "rgba(59,130,246,0.3)";
      videoWrapper.style.boxShadow = "0 0 20px rgba(59,130,246,0.3)";
      statusText.innerHTML =
        '<i class="fas fa-satellite-dish text-blue-400 animate-pulse"></i> Scanning Active...';
    }

    // Call next frame
    requestAnimationFrame(detectFrame);
  });
}
