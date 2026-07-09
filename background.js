const ALARM_NAME = "studyTimer";

chrome.runtime.onInstalled.addListener(() => {
  // Initialize default storage
  chrome.storage.local.get(['blockedSites', 'sessions', 'subjects'], (data) => {
    if (!data.blockedSites) {
      chrome.storage.local.set({ blockedSites: ['discord.com', 'spotify.com', 'twitter.com', 'x.com'] });
    }
    if (!data.sessions) {
      chrome.storage.local.set({ sessions: [] });
    }
    if (!data.subjects) {
      chrome.storage.local.set({ subjects: [
        { name: 'Study', color: '#3b82f6' },
        { name: 'Work', color: '#ef4444' },
        { name: 'Coding', color: '#10b981' },
        { name: 'Reading', color: '#f59e0b' }
      ]});
    }
  });
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    endSession(true);
  }
});

function endSession(completed) {
  chrome.storage.local.get(['activeSession', 'sessions'], (data) => {
    if (data.activeSession) {
      const endTime = Date.now();
      const session = {
        startTime: data.activeSession.startTime,
        endTime: endTime,
        durationMinutes: data.activeSession.durationMinutes,
        completed: completed,
        subject: data.activeSession.subject || { name: 'Uncategorized', color: '#94a3b8' }
      };
      
      const updatedSessions = [session, ...(data.sessions || [])];
      
      chrome.storage.local.set({
        activeSession: null,
        sessions: updatedSessions,
        timerState: completed ? 'finished' : 'idle'
      });

      // Clear the alarm if it was cancelled manually
      if (!completed) {
        chrome.alarms.clear(ALARM_NAME);
      } else {
        // Send native Windows notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'logo.png',
          title: 'BlockForFocus',
          message: 'Your study session has ended! Great job focusing.',
          priority: 2
        });

        // Play custom chime via offscreen document
        playCustomSound(true);
      }

      // Remove blocking rules
      clearBlockingRules();
    }
  });
}

async function startSession(durationMinutes, subject) {
  const startTime = Date.now();
  const endTime = startTime + (durationMinutes * 60 * 1000);
  chrome.storage.local.set({
    activeSession: {
      startTime,
      durationMinutes,
      endTime,
      isPaused: false,
      subject: subject || { name: 'Uncategorized', color: '#94a3b8' }
    }
  });

  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: durationMinutes
  });

  await applyBlockingRules();
}

async function applyBlockingRules() {
  const data = await chrome.storage.local.get(['blockedSites']);
  const sites = data.blockedSites || [];
  
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const idsToRemove = existingRules.map(rule => rule.id);

  if (sites.length === 0) {
    if (idsToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: idsToRemove });
    }
    return;
  }

  const newRules = sites.map((site, index) => {
    const cleanSite = site.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0].trim();
    if (!cleanSite) return null;
    return {
      id: index + 1,
      priority: 1,
      action: {
        type: "block"
      },
      condition: {
        urlFilter: `||${cleanSite}`,
        resourceTypes: ["main_frame"]
      }
    };
  }).filter(Boolean); // Remove any null rules

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: idsToRemove,
    addRules: newRules
  });
}

async function clearBlockingRules() {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const idsToRemove = existingRules.map(rule => rule.id);
  
  if (idsToRemove.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: idsToRemove
    });
  }
}
// Force redirect for sites that use Service Workers (which bypass DNR redirects)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    try {
      const url = new URL(changeInfo.url);
      
      // Ignore chrome extensions and local pages
      if (url.protocol.startsWith('chrome')) return;

      const data = await chrome.storage.local.get(['activeSession', 'blockedSites']);
      if (data.activeSession && !data.activeSession.isPaused) {
        const sites = data.blockedSites || [];
        
        const isBlocked = sites.some(site => {
          const cleanSite = site.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0].trim();
          return cleanSite && url.hostname.includes(cleanSite);
        });
        
        if (isBlocked) {
          chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
        }
      }
    } catch (e) {
      // Invalid URL
    }
  }
});

// Message passing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSession') {
    startSession(request.durationMinutes, request.subject).then(() => sendResponse({ success: true }));
    return true; // async
  } else if (request.action === 'endSession') {
    endSession(false);
    sendResponse({ success: true });
  } else if (request.action === 'pauseSession') {
    chrome.storage.local.get(['activeSession'], (data) => {
      if (data.activeSession && !data.activeSession.isPaused) {
        const remainingMs = data.activeSession.endTime - Date.now();
        data.activeSession.isPaused = true;
        data.activeSession.remainingMs = remainingMs;
        chrome.storage.local.set({ activeSession: data.activeSession });
        chrome.alarms.clear(ALARM_NAME);
        clearBlockingRules();
      }
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'resumeSession') {
    chrome.storage.local.get(['activeSession'], (data) => {
      if (data.activeSession && data.activeSession.isPaused) {
        data.activeSession.isPaused = false;
        data.activeSession.endTime = Date.now() + data.activeSession.remainingMs;
        chrome.storage.local.set({ activeSession: data.activeSession });
        chrome.alarms.create(ALARM_NAME, { delayInMinutes: data.activeSession.remainingMs / 60000 });
        applyBlockingRules();
      }
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'getSession') {
    chrome.storage.local.get(['activeSession', 'timerState'], (data) => {
      sendResponse({ 
        activeSession: data.activeSession,
        timerState: data.timerState || 'idle'
      });
    });
    return true;
  } else if (request.action === 'acknowledgeSession') {
    chrome.storage.local.set({ timerState: 'idle' });
    stopCustomSound();
    sendResponse({ success: true });
  }
});

async function ensureOffscreenDocument() {
  const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
  let hasDoc = false;
  try {
    hasDoc = await chrome.offscreen.hasDocument();
  } catch (e) {}

  if (!hasDoc) {
    try {
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play focus music and alarm sounds'
      });
    } catch (e) {
      console.error('Failed to create offscreen document:', e);
    }
  }
}

async function playCustomSound(loop = false) {
  await ensureOffscreenDocument();
  chrome.runtime.sendMessage({ action: 'playChime', loop });
}

async function stopCustomSound() {
  try {
    if (await chrome.offscreen.hasDocument()) {
      chrome.runtime.sendMessage({ action: 'stopChime' });
    }
  } catch (e) {}
}
