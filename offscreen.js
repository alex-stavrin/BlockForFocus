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

let alarmAudio = null;

function startLoopingAlarm() {
  if (!alarmAudio) {
    alarmAudio = new Audio('alarm.mp3');
    alarmAudio.loop = true;
  }
  alarmAudio.play().catch(e => {
    console.error("Could not play alarm.mp3:", e);
  });
}

function stopLoopingAlarm() {
  if (alarmAudio) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  }
}
