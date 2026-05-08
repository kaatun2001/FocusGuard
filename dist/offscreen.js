import "./assets/modulepreload-polyfill-B5Qt9EMX.js";
chrome.runtime.onMessage.addListener((n) => {
  n.target === "offscreen" &&
    n.type === "PLAY_SOUND" &&
    s(n.sound, n.volume ?? 0.7);
});
function s(n, u) {
  try {
    const e = new AudioContext(),
      o = (a, t, i, l = "sine") => {
        const c = e.createOscillator(),
          r = e.createGain();
        (c.connect(r),
          r.connect(e.destination),
          (c.type = l),
          (c.frequency.value = a),
          r.gain.setValueAtTime(0, e.currentTime + t),
          r.gain.linearRampToValueAtTime(u * 0.5, e.currentTime + t + 0.01),
          r.gain.exponentialRampToValueAtTime(0.001, e.currentTime + t + i),
          c.start(e.currentTime + t),
          c.stop(e.currentTime + t + i + 0.05));
      };
    (n === "focus_complete" ?
      (o(523, 0, 0.5), o(659, 0.3, 0.5), o(784, 0.6, 0.8))
    : n === "break_complete" ? (o(659, 0, 0.5), o(523, 0.35, 0.7))
    : n === "tick" && o(1e3, 0, 0.05, "square"),
      setTimeout(() => e.close(), 2e3));
  } catch (e) {
    console.error("Audio error:", e);
  }
}
