// Offscreen document — handles audio playback for the extension
// This runs in a hidden page that has access to Web Audio API

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== 'offscreen') return
  if (msg.type === 'PLAY_SOUND') playSound(msg.sound, msg.volume ?? 0.7)
})

function playSound(type, volume) {
  try {
    const ctx = new AudioContext()

    const schedule = (freq, startTime, duration, waveType = 'sine') => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = waveType
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime)
      gain.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + startTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)
      osc.start(ctx.currentTime + startTime)
      osc.stop(ctx.currentTime + startTime + duration + 0.05)
    }

    if (type === 'focus_complete') {
      // Three ascending chime notes
      schedule(523, 0.0, 0.5)   // C5
      schedule(659, 0.3, 0.5)   // E5
      schedule(784, 0.6, 0.8)   // G5
    } else if (type === 'break_complete') {
      // Two soft descending tones
      schedule(659, 0.0, 0.5)   // E5
      schedule(523, 0.35, 0.7)  // C5
    } else if (type === 'tick') {
      // Subtle tick
      schedule(1000, 0, 0.05, 'square')
    }

    // Close context after sounds finish
    setTimeout(() => ctx.close(), 2000)
  } catch (e) {
    console.error('Audio error:', e)
  }
}
