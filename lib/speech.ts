export function warmupSpeech() {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  try {
    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.lang = "tr-TR";
    utterance.volume = 0;
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Speech warmup hatası:", error);
  }
}

export function speakText(text: string) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  if (!text?.trim()) return;

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Sesli uyarı hatası:", error);
  }
}