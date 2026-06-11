/**
 * Arabic Voice Recognition — mic only, transcript in textarea
 * Keeps listening until the user clicks the mic again to stop.
 */

const LANGUAGE = "ar-SA"; // Arabic (Saudi). Use "en-US" for English.

const transcriptEl = document.getElementById("transcript");
const micBtn = document.getElementById("micBtn");
const speakWaves = document.getElementById("speakWaves");
const micStatus = document.getElementById("micStatus");
const clearBtn = document.getElementById("clearBtn");

let micAvailable = false;
let finalTranscript = "";
let userWantsListening = false;

const SpeechRecognitionAPI =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const speechState = {
  listening: false,
  browserSupportsSpeechRecognition: !!SpeechRecognitionAPI,
  recognition: null,
};

function initSpeechRecognition() {
  if (!speechState.browserSupportsSpeechRecognition) return;

  speechState.recognition = new SpeechRecognitionAPI();
  const recognition = speechState.recognition;

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript;

      if (result.isFinal) {
        finalTranscript += text + " ";
      } else {
        interim += text;
      }
    }

    transcriptEl.value = (finalTranscript + interim).trim();
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);

    if (event.error === "not-allowed") {
      userWantsListening = false;
      speechState.listening = false;
      micStatus.textContent = "تم رفض إذن الميكروفون";
      updateMicUI();
    } else if (event.error !== "aborted" && event.error !== "no-speech") {
      micStatus.textContent = "حدث خطأ في التعرف على الصوت";
    }
  };

  recognition.onend = () => {
    if (userWantsListening) {
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    speechState.listening = false;
    updateMicUI();
  };
}

function startListening() {
  if (!speechState.recognition || !speechState.browserSupportsSpeechRecognition) return;

  finalTranscript = transcriptEl.value;
  if (finalTranscript && !finalTranscript.endsWith(" ")) {
    finalTranscript += " ";
  }

  userWantsListening = true;
  speechState.listening = true;
  speechState.recognition.lang = LANGUAGE;
  updateMicUI();

  try {
    speechState.recognition.start();
  } catch (err) {
    console.error(err);
    userWantsListening = false;
    speechState.listening = false;
    updateMicUI();
  }
}

function stopListening() {
  userWantsListening = false;
  speechState.listening = false;

  if (speechState.recognition) {
    speechState.recognition.stop();
  }

  updateMicUI();
}

async function checkMicrophone() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasMic = devices.some((d) => d.kind === "audioinput");
    micAvailable = hasMic && speechState.browserSupportsSpeechRecognition;
  } catch {
    micAvailable = false;
  }
  updateMicUI();
}

function setMicLabel(text) {
  micBtn.title = text;
  micBtn.setAttribute("aria-label", text);
}

function updateMicUI() {
  micBtn.classList.toggle("listening", speechState.listening);
  micBtn.classList.toggle("unavailable", !micAvailable);
  micBtn.disabled = !micAvailable;
  speakWaves.hidden = !speechState.listening;

  if (!speechState.browserSupportsSpeechRecognition) {
    micStatus.textContent = "المتصفح لا يدعم التعرف على الصوت";
    setMicLabel("غير متاح");
  } else if (!micAvailable) {
    micStatus.textContent = "الميكروفون غير متاح";
    setMicLabel("غير متاح");
  } else if (speechState.listening) {
    micStatus.textContent = "جاري الاستماع... (اضغط الميكروفون للإيقاف)";
    setMicLabel("إيقاف الاستماع");
  } else if (!micStatus.textContent.includes("خطأ") && !micStatus.textContent.includes("رفض")) {
    micStatus.textContent = "";
    setMicLabel("بدء الاستماع");
  }
}

function handleMicClick() {
  if (!micAvailable) return;

  if (speechState.listening) {
    stopListening();
  } else {
    startListening();
  }
}

clearBtn.addEventListener("click", () => {
  transcriptEl.value = "";
  finalTranscript = "";
  micStatus.textContent = "";
});

transcriptEl.addEventListener("input", () => {
  if (!speechState.listening) {
    finalTranscript = transcriptEl.value;
  }
});

micBtn.addEventListener("click", handleMicClick);

initSpeechRecognition();
checkMicrophone();
