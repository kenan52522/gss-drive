let audioUnlocked = false;
let audioContextRef: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioCtx) return null;

  if (!audioContextRef) {
    audioContextRef = new AudioCtx();
  }

  return audioContextRef;
}

export async function unlockAudioEngine() {
  if (typeof window === "undefined") return;

  const ctx = getAudioContext();

  if (!ctx) {
    audioUnlocked = true;
    return;
  }

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.0001;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    oscillator.start(now);
    oscillator.stop(now + 0.05);

    audioUnlocked = true;
  } catch (error) {
    console.error("Ses motoru açılamadı:", error);
  }
}

async function playBeepPattern() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const now = ctx.currentTime;

  const pattern = [
    { start: 0.0, duration: 0.18, frequency: 880 },
    { start: 0.28, duration: 0.18, frequency: 880 },
    { start: 0.56, duration: 0.24, frequency: 660 },
  ];

  pattern.forEach((item) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = item.frequency;

    gainNode.gain.setValueAtTime(0.0001, now + item.start);
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + item.start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      now + item.start + item.duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now + item.start);
    oscillator.stop(now + item.start + item.duration + 0.03);
  });
}

function speakFallback(text: string) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  if (!text.trim()) return;

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Konuşma yedeği çalışmadı:", error);
  }
}

export async function playAlertSound(text?: string) {
  try {
    if (!audioUnlocked) {
      await unlockAudioEngine();
    }

    await playBeepPattern();

    if (text) {
      window.setTimeout(() => {
        speakFallback(text);
      }, 900);
    }
  } catch (error) {
    console.error("Uyarı sesi çalınamadı:", error);

    if (text) {
      speakFallback(text);
    }
  }
}