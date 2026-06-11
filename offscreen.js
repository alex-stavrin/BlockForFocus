chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'playChime') {
    startLoopingAlarm();
    sendResponse({ success: true });
  } else if (request.action === 'stopChime') {
    stopLoopingAlarm();
    sendResponse({ success: true });
  }
});

// ---------------------------------------------------------
// ALARM CHIME
// ---------------------------------------------------------

let audioCtx = null;
let alarmOscillator = null;
let alarmLfo = null;
let alarmGain = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function startLoopingAlarm() {
  if (alarmOscillator) return;
  const ctx = getAudioCtx();
  
  alarmOscillator = ctx.createOscillator();
  alarmGain = ctx.createGain();
  
  alarmOscillator.type = 'sine';
  alarmOscillator.frequency.setValueAtTime(800, ctx.currentTime);
  
  alarmLfo = ctx.createOscillator();
  alarmLfo.type = 'square';
  alarmLfo.frequency.setValueAtTime(4, ctx.currentTime);
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0.5, ctx.currentTime);
  alarmLfo.connect(lfoGain);
  
  lfoGain.connect(alarmGain.gain);
  alarmGain.gain.setValueAtTime(0.5, ctx.currentTime);
  
  alarmOscillator.connect(alarmGain);
  alarmGain.connect(ctx.destination);
  
  alarmOscillator.start();
  alarmLfo.start();
}

function stopLoopingAlarm() {
  if (alarmOscillator) {
    alarmOscillator.stop();
    alarmOscillator = null;
  }
  if (alarmLfo) {
    alarmLfo.stop();
    alarmLfo = null;
  }
  alarmGain = null;
}
