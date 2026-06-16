document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active nav button
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active view
      const targetId = `view-${btn.id.split('-')[1]}`;
      views.forEach(v => {
        if (v.id === targetId) {
          v.classList.add('active');
          v.classList.remove('hidden');
        } else {
          v.classList.remove('active');
          v.classList.add('hidden');
        }
      });
    });
  });

  // Popout feature
  const popoutBtn = document.getElementById('popout-btn');
  if (window.location.search.includes('popout=true')) {
    popoutBtn.style.display = 'none';
  } else {
    popoutBtn.addEventListener('click', () => {
      chrome.windows.create({
        url: 'popup.html?popout=true',
        type: 'popup',
        width: 360,
        height: 600
      });
      window.close();
    });
  }

  // Timer UI elements
  const setupState = document.getElementById('setup-state');
  const activeState = document.getElementById('active-state');
  const finishedState = document.getElementById('finished-state');
  const durationMin = document.getElementById('duration-min');
  const durationSec = document.getElementById('duration-sec');
  const startBtn = document.getElementById('start-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const stopAlarmBtn = document.getElementById('stop-alarm-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const activeTitle = document.getElementById('active-title');
  const countdownDisplay = document.getElementById('countdown-display');

  // Load last used time preference
  chrome.storage.local.get(['defaultMin', 'defaultSec'], (data) => {
    if (data.defaultMin !== undefined) durationMin.value = data.defaultMin.toString().padStart(2, '0');
    if (data.defaultSec !== undefined) durationSec.value = data.defaultSec.toString().padStart(2, '0');
  });

  durationMin.addEventListener('blur', () => {
    if (durationMin.value) {
      durationMin.value = durationMin.value.padStart(2, '0');
    } else {
      durationMin.value = '00';
    }
  });

  durationSec.addEventListener('blur', () => {
    if (durationSec.value) {
      durationSec.value = durationSec.value.padStart(2, '0');
    } else {
      durationSec.value = '00';
    }
  });

  function saveTimePreference() {
    const minutes = parseInt(durationMin.value, 10) || 0;
    const seconds = parseInt(durationSec.value, 10) || 0;
    chrome.storage.local.set({ defaultMin: minutes, defaultSec: seconds });
  }

  durationMin.addEventListener('input', saveTimePreference);
  durationSec.addEventListener('input', saveTimePreference);

  let timerInterval = null;

  function updateTimerDisplay(remainingMs) {
    if (remainingMs <= 0) {
      countdownDisplay.textContent = "00:00";
      return;
    }
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    countdownDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function startTimerUI(endTime, isPaused, remainingMs) {
    setupState.classList.add('hidden');
    finishedState.classList.add('hidden');
    activeState.classList.remove('hidden');

    if (timerInterval) clearInterval(timerInterval);

    if (isPaused) {
      activeTitle.textContent = "Paused";
      pauseBtn.classList.add('hidden');
      resumeBtn.classList.remove('hidden');
      updateTimerDisplay(remainingMs);
    } else {
      activeTitle.textContent = "Focusing...";
      pauseBtn.classList.remove('hidden');
      resumeBtn.classList.add('hidden');

      timerInterval = setInterval(() => {
        const now = Date.now();
        const remaining = endTime - now;
        if (remaining <= 0) {
          clearInterval(timerInterval);
          showFinishedUI();
          loadHistory(); // refresh history
          loadStats(); // refresh stats
        } else {
          updateTimerDisplay(remaining);
        }
      }, 1000);

      // Initial update
      updateTimerDisplay(endTime - Date.now());
    }
  }

  function showSetupUI() {
    if (timerInterval) clearInterval(timerInterval);
    activeState.classList.add('hidden');
    finishedState.classList.add('hidden');
    setupState.classList.remove('hidden');
  }

  function showFinishedUI() {
    if (timerInterval) clearInterval(timerInterval);
    setupState.classList.add('hidden');
    activeState.classList.add('hidden');
    finishedState.classList.remove('hidden');
  }

  // Check active session on load
  chrome.runtime.sendMessage({ action: 'getSession' }, (response) => {
    if (chrome.runtime.lastError) {
      showSetupUI();
      return;
    }
    if (response && response.timerState === 'finished') {
      showFinishedUI();
    } else if (response && response.activeSession) {
      const session = response.activeSession;
      startTimerUI(session.endTime, session.isPaused, session.remainingMs);
    } else {
      showSetupUI();
    }
  });

  startBtn.addEventListener('click', () => {
    const minutes = parseInt(durationMin.value, 10) || 0;
    const seconds = parseInt(durationSec.value, 10) || 0;
    const totalMinutes = minutes + (seconds / 60);

    if (totalMinutes <= 0) return;

    chrome.runtime.sendMessage({ action: 'startSession', durationMinutes: totalMinutes }, (response) => {
      if (response && response.success) {
        startTimerUI(Date.now() + totalMinutes * 60 * 1000, false, null);
      }
    });
  });

  pauseBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pauseSession' }, () => {
      chrome.runtime.sendMessage({ action: 'getSession' }, (res) => {
        if (res && res.activeSession) {
          startTimerUI(res.activeSession.endTime, res.activeSession.isPaused, res.activeSession.remainingMs);
        }
      });
    });
  });

  resumeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resumeSession' }, () => {
      chrome.runtime.sendMessage({ action: 'getSession' }, (res) => {
        if (res && res.activeSession) {
          startTimerUI(res.activeSession.endTime, res.activeSession.isPaused, res.activeSession.remainingMs);
        }
      });
    });
  });

  cancelBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'endSession' }, (response) => {
      showSetupUI();
      loadHistory();
      loadStats();
    });
  });

  stopAlarmBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'acknowledgeSession' }, () => {
      showSetupUI();
      loadHistory();
      loadStats();
    });
  });

  // Blocklist
  const blocklistItems = document.getElementById('blocklist-items');
  const newSiteInput = document.getElementById('new-site-input');
  const addSiteBtn = document.getElementById('add-site-btn');

  function renderBlocklist(sites) {
    blocklistItems.innerHTML = '';
    sites.forEach((site, index) => {
      const li = document.createElement('li');
      li.textContent = site;

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.onclick = () => {
        const newSites = [...sites];
        newSites.splice(index, 1);
        chrome.storage.local.set({ blockedSites: newSites }, () => {
          renderBlocklist(newSites);
        });
      };

      li.appendChild(delBtn);
      blocklistItems.appendChild(li);
    });
  }

  chrome.storage.local.get(['blockedSites'], (data) => {
    renderBlocklist(data.blockedSites || []);
  });

  addSiteBtn.addEventListener('click', () => {
    const site = newSiteInput.value.trim().toLowerCase();
    if (site) {
      chrome.storage.local.get(['blockedSites'], (data) => {
        const sites = data.blockedSites || [];
        if (!sites.includes(site)) {
          sites.push(site);
          chrome.storage.local.set({ blockedSites: sites }, () => {
            renderBlocklist(sites);
            newSiteInput.value = '';
          });
        }
      });
    }
  });

  // History
  const historyItems = document.getElementById('history-items');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your entire session history?')) {
      chrome.storage.local.set({ sessions: [] }, () => {
        loadHistory();
        loadStats();
      });
    }
  });

  function loadHistory() {
    chrome.storage.local.get(['sessions'], (data) => {
      const sessions = data.sessions || [];
      historyItems.innerHTML = '';

      if (sessions.length === 0) {
        historyItems.innerHTML = '<li style="justify-content:center; color: var(--text-muted)">No past sessions</li>';
        return;
      }

      sessions.slice(0, 10).forEach(session => {
        const li = document.createElement('li');
        li.className = 'history-item';

        const startDate = new Date(session.startTime);
        const endDate = new Date(session.endTime);

        const dateStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const startTimeStr = startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const endTimeStr = endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        const statusClass = session.completed ? 'status-badge' : 'status-badge cancelled';
        const statusText = session.completed ? 'Completed' : 'Cancelled';

        let durationSecsTotal = Math.round(session.durationMinutes * 60);
        const isRemoval = durationSecsTotal < 0;
        durationSecsTotal = Math.abs(durationSecsTotal);
        
        const mins = Math.floor(durationSecsTotal / 60);
        const secs = durationSecsTotal % 60;
        const durationStr = secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
        const displayStr = isRemoval ? `Removed ${durationStr}` : durationStr;

        li.innerHTML = `
          <div class="history-date">${dateStr} &bull; ${startTimeStr} - ${endTimeStr}</div>
          <div class="history-details">
            <span>${displayStr}</span>
            <span class="${statusClass}">${statusText}</span>
          </div>
        `;
        historyItems.appendChild(li);
      });
    });
  }

  loadHistory();

  // Stats
  const statsItems = document.getElementById('stats-items');
  const statsDaysInput = document.getElementById('stats-days-input');

  function loadStats() {
    chrome.storage.local.get(['sessions'], (data) => {
      const sessions = data.sessions || [];
      const daysToLookBack = parseInt(statsDaysInput.value, 10) || 7;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const dailyTotals = {};
      const dateStrings = [];

      // Initialize the last N days with 0 minutes
      for (let i = 0; i < daysToLookBack; i++) {
        const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
        const dateString = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        dailyTotals[dateString] = 0;
        dateStrings.push(dateString);
      }

      sessions.forEach(session => {
        if (!session.completed) return; // Only count completed sessions
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((now - sessionDate) / (24 * 60 * 60 * 1000));

        if (diffDays >= 0 && diffDays < daysToLookBack) {
          const dateString = sessionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          if (dailyTotals[dateString] !== undefined) {
            dailyTotals[dateString] += session.durationMinutes;
          }
        }
      });

      statsItems.innerHTML = '';

      dateStrings.forEach(dateStr => {
        const totalMinutes = Math.max(0, dailyTotals[dateStr]);
        const li = document.createElement('li');
        li.className = 'history-item';

        const totalSecs = Math.round(totalMinutes * 60);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const durationStr = totalMinutes === 0 ? "0 min" : (secs > 0 ? `${mins}m ${secs}s` : `${mins} min`);

        li.innerHTML = `
          <div class="history-details" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <span>${dateStr}</span>
            <span style="color: var(--primary-color); font-weight: 700;">${durationStr}</span>
          </div>
        `;
        statsItems.appendChild(li);
      });
    });
  }

  statsDaysInput.addEventListener('change', loadStats);
  loadStats();

  // Manage Time View
  const addTimeBtn = document.getElementById('add-time-submit-btn');
  const removeTimeBtn = document.getElementById('remove-time-submit-btn');
  const manageTimeMin = document.getElementById('manage-time-min');
  const manageTimeSec = document.getElementById('manage-time-sec');

  function handleManageTime(isAdding) {
    const minutes = parseInt(manageTimeMin.value, 10) || 0;
    const seconds = parseInt(manageTimeSec.value, 10) || 0;
    const totalMinutes = minutes + (seconds / 60);

    if (totalMinutes > 0) {
      chrome.storage.local.get(['sessions'], (data) => {
        const now = Date.now();
        const dummySession = {
          startTime: now - (totalMinutes * 60 * 1000), // Fake start time in the past
          endTime: now,
          durationMinutes: isAdding ? totalMinutes : -totalMinutes,
          completed: true
        };
        const updatedSessions = [dummySession, ...(data.sessions || [])];
        chrome.storage.local.set({ sessions: updatedSessions }, () => {
          manageTimeMin.value = '15';
          manageTimeSec.value = '0';
          loadHistory();
          loadStats();
          // Show toast
          const actionText = isAdding ? "Added" : "Removed";
          const timeText = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} min`;
          showToast(`Successfully ${actionText.toLowerCase()} ${timeText}`, isAdding ? 'success' : 'error');
        });
      });
    }
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger reflow to ensure the transition plays
    void toast.offsetWidth;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 2500);
  }

  addTimeBtn.addEventListener('click', () => handleManageTime(true));
  removeTimeBtn.addEventListener('click', () => handleManageTime(false));
});
