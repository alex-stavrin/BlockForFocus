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

  // Subjects Setup
  const subjectSelect = document.getElementById('subject-select');
  const manageSubjectSelect = document.getElementById('manage-subject-select');
  const subjectItemsList = document.getElementById('subject-items-list');
  const manageSubjectItemsList = document.getElementById('manage-subject-items-list');
  const subjectSelected = document.querySelector('#subject-custom-select .select-selected');
  const manageSubjectSelected = document.querySelector('#manage-subject-custom-select .select-selected');
  
  const subjectItems = document.getElementById('subject-items');
  const newSubjectInput = document.getElementById('new-subject-input');
  const addSubjectBtn = document.getElementById('add-subject-btn');
  const activeSubject = document.getElementById('active-subject');

  const newSubjectColor = document.getElementById('new-subject-color');

  function selectSessionSubject(subject) {
    if (!subject || subject.name === 'Uncategorized') {
      subjectSelect.value = 'Uncategorized';
      subjectSelected.textContent = 'Uncategorized';
      return;
    }

    const badgeHtml = `<span class="subject-color-badge" style="background-color: ${subject.color}"></span>`;
    subjectSelect.value = JSON.stringify(subject);
    subjectSelected.innerHTML = `${badgeHtml}${subject.name}`;
  }

  // Custom select toggle events
  subjectSelected.addEventListener('click', function(e) {
    e.stopPropagation();
    closeAllSelect(this);
    this.nextElementSibling.classList.toggle('select-hide');
    this.classList.toggle('select-arrow-active');
  });

  manageSubjectSelected.addEventListener('click', function(e) {
    e.stopPropagation();
    closeAllSelect(this);
    this.nextElementSibling.classList.toggle('select-hide');
    this.classList.toggle('select-arrow-active');
  });

  function closeAllSelect(elmnt) {
    const x = document.getElementsByClassName("select-items");
    const y = document.getElementsByClassName("select-selected");
    for (let i = 0; i < y.length; i++) {
      if (elmnt !== y[i]) {
        y[i].classList.remove("select-arrow-active");
      }
    }
    for (let i = 0; i < x.length; i++) {
      if (elmnt && elmnt.nextElementSibling === x[i]) continue;
      x[i].classList.add("select-hide");
    }
  }

  document.addEventListener("click", closeAllSelect);

  function renderSubjects(subjects) {
    subjectItemsList.innerHTML = '';
    manageSubjectItemsList.innerHTML = '';
    subjectItems.innerHTML = '';
    
    if (!subjects || subjects.length === 0) {
      const div1 = document.createElement('div');
      div1.textContent = "No subjects made";
      div1.className = "disabled";
      subjectItemsList.appendChild(div1);

      const div2 = document.createElement('div');
      div2.textContent = "No subjects made";
      div2.className = "disabled";
      manageSubjectItemsList.appendChild(div2);

      subjectItems.innerHTML = '<li style="justify-content:center; color: var(--text-muted)">No subjects created</li>';
      return;
    }

    subjects.forEach(subject => {
      const subjectJson = JSON.stringify(subject);
      const badgeHtml = `<span class="subject-color-badge" style="background-color: ${subject.color}"></span>`;

      // Setup dropdown 1
      const div1 = document.createElement('div');
      div1.innerHTML = `${badgeHtml}${subject.name}`;
      div1.addEventListener('click', () => {
        selectSessionSubject(subject);
        chrome.storage.local.set({ lastSelectedSubject: subject });
        subjectItemsList.classList.add('select-hide');
        subjectSelected.classList.remove('select-arrow-active');
      });
      subjectItemsList.appendChild(div1);

      // Setup dropdown 2
      const div2 = document.createElement('div');
      div2.innerHTML = `${badgeHtml}${subject.name}`;
      div2.addEventListener('click', () => {
        manageSubjectSelected.innerHTML = `${badgeHtml}${subject.name}`;
        manageSubjectSelect.value = subjectJson;
        manageSubjectItemsList.classList.add('select-hide');
        manageSubjectSelected.classList.remove('select-arrow-active');
      });
      manageSubjectItemsList.appendChild(div2);
    });

    subjects.forEach((subject, index) => {
      const li = document.createElement('li');
      const badgeHtml = `<span class="subject-color-badge" style="background-color: ${subject.color}"></span>`;
      li.innerHTML = `<div>${badgeHtml}${subject.name}</div>`;

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.onclick = () => {
        const newSubjects = [...subjects];
        newSubjects.splice(index, 1);
        chrome.storage.local.set({ subjects: newSubjects }, () => {
          renderSubjects(newSubjects);
          if (subjectSelect.value === JSON.stringify(subject)) {
            selectSessionSubject(null);
            chrome.storage.local.set({ lastSelectedSubject: null });
          }
          if (manageSubjectSelect.value === JSON.stringify(subject)) {
            manageSubjectSelect.value = "Uncategorized";
            manageSubjectSelected.textContent = "Uncategorized";
          }
        });
      };

      li.appendChild(delBtn);
      subjectItems.appendChild(li);
    });
  }

  chrome.storage.local.get(['subjects', 'lastSelectedSubject'], (data) => {
    let subjects = data.subjects || [];
    // Migration from strings to objects
    if (subjects.length > 0 && typeof subjects[0] === 'string') {
      subjects = subjects.map(name => ({ name, color: '#8b5cf6' }));
      chrome.storage.local.set({ subjects });
    }
    renderSubjects(subjects);

    const lastSubjectName = typeof data.lastSelectedSubject === 'string'
      ? data.lastSelectedSubject
      : data.lastSelectedSubject && data.lastSelectedSubject.name;
    const lastSelectedSubject = subjects.find(subject => subject.name === lastSubjectName);
    selectSessionSubject(lastSelectedSubject);

    if (data.lastSelectedSubject && !lastSelectedSubject) {
      chrome.storage.local.set({ lastSelectedSubject: null });
    }
  });

  addSubjectBtn.addEventListener('click', () => {
    const name = newSubjectInput.value.trim();
    const color = newSubjectColor.value;
    if (name) {
      chrome.storage.local.get(['subjects'], (data) => {
        const subjects = data.subjects || [];
        if (!subjects.find(s => s.name === name)) {
          subjects.push({ name, color });
          chrome.storage.local.set({ subjects: subjects }, () => {
            renderSubjects(subjects);
            newSubjectInput.value = '';
          });
        }
      });
    }
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

  function startTimerUI(endTime, isPaused, remainingMs, subject) {
    setupState.classList.add('hidden');
    finishedState.classList.add('hidden');
    activeState.classList.remove('hidden');
    
    if (subject && subject.name !== 'Uncategorized') {
      activeSubject.innerHTML = `<span class="subject-color-badge" style="background-color: ${subject.color}"></span>${subject.name}`;
    } else {
      activeSubject.textContent = 'Uncategorized';
    }

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
      startTimerUI(session.endTime, session.isPaused, session.remainingMs, session.subject);
    } else {
      showSetupUI();
    }
  });

  startBtn.addEventListener('click', () => {
    const minutes = parseInt(durationMin.value, 10) || 0;
    const seconds = parseInt(durationSec.value, 10) || 0;
    const totalMinutes = minutes + (seconds / 60);

    if (totalMinutes <= 0) return;
    
    let subject = { name: 'Uncategorized', color: '#94a3b8' };
    try {
      if (subjectSelect.value !== 'Uncategorized') {
        subject = JSON.parse(subjectSelect.value);
      }
    } catch(e) {}

    chrome.storage.local.set({
      lastSelectedSubject: subject.name === 'Uncategorized' ? null : subject
    });

    chrome.runtime.sendMessage({ action: 'startSession', durationMinutes: totalMinutes, subject: subject }, (response) => {
      if (response && response.success) {
        startTimerUI(Date.now() + totalMinutes * 60 * 1000, false, null, subject);
      }
    });
  });

  pauseBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pauseSession' }, () => {
      chrome.runtime.sendMessage({ action: 'getSession' }, (res) => {
        if (res && res.activeSession) {
          startTimerUI(res.activeSession.endTime, res.activeSession.isPaused, res.activeSession.remainingMs, res.activeSession.subject);
        }
      });
    });
  });

  resumeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resumeSession' }, () => {
      chrome.runtime.sendMessage({ action: 'getSession' }, (res) => {
        if (res && res.activeSession) {
          startTimerUI(res.activeSession.endTime, res.activeSession.isPaused, res.activeSession.remainingMs, res.activeSession.subject);
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
  const addCurrentTabBtn = document.getElementById('add-current-tab-btn');

  function renderBlocklist(sites) {
    blocklistItems.innerHTML = '';
    sites.forEach((site, index) => {
      const li = document.createElement('li');
      
      const contentDiv = document.createElement('div');
      contentDiv.style.display = 'flex';
      contentDiv.style.alignItems = 'center';
      contentDiv.style.gap = '10px';

      const img = document.createElement('img');
      img.src = `https://www.google.com/s2/favicons?domain=${site}&sz=32`;
      img.style.width = '18px';
      img.style.height = '18px';
      img.style.borderRadius = '4px';

      const textSpan = document.createElement('span');
      textSpan.textContent = site;

      contentDiv.appendChild(img);
      contentDiv.appendChild(textSpan);

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

      li.appendChild(contentDiv);
      li.appendChild(delBtn);
      blocklistItems.appendChild(li);
    });
  }

  chrome.storage.local.get(['blockedSites'], (data) => {
    renderBlocklist(data.blockedSites || []);
  });

  function addBlockedSite(site, onAdded) {
    if (!site) return;

    chrome.storage.local.get(['blockedSites'], (data) => {
      const sites = data.blockedSites || [];
      if (sites.includes(site)) {
        showToast(`${site} is already blocked`, 'error');
        return;
      }

      const newSites = [site, ...sites];
      chrome.storage.local.set({ blockedSites: newSites }, () => {
        renderBlocklist(newSites);
        if (onAdded) onAdded();
      });
    });
  }

  addSiteBtn.addEventListener('click', () => {
    const site = newSiteInput.value.trim().toLowerCase();
    addBlockedSite(site, () => {
      newSiteInput.value = '';
    });
  });

  addCurrentTabBtn.addEventListener('click', () => {
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, (browserWindow) => {
      if (chrome.runtime.lastError || !browserWindow) {
        showToast('Could not find the current browser tab', 'error');
        return;
      }

      chrome.tabs.query({ active: true, windowId: browserWindow.id }, (tabs) => {
        if (chrome.runtime.lastError || !tabs[0] || !tabs[0].url) {
          showToast('Could not read the current tab', 'error');
          return;
        }

        try {
          const url = new URL(tabs[0].url);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            showToast('This type of page cannot be blocked', 'error');
            return;
          }

          const site = url.hostname.toLowerCase().replace(/^www\./, '');
          addBlockedSite(site, () => {
            showToast(`Added ${site} to the blocklist`);
          });
        } catch (error) {
          showToast('Could not read the current tab address', 'error');
        }
      });
    });
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

      sessions.slice(0, 10).forEach((session, sessionIndex) => {
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
        
        let subjectStr = '';
        if (session.subject) {
          if (typeof session.subject === 'string') {
            subjectStr = `<span style="margin: 0 6px;">&bull;</span><span class="subject-color-badge" style="background-color: #94a3b8; width: 8px; height: 8px; margin-right: 6px;"></span>${session.subject}`;
          } else if (session.subject.name) {
            subjectStr = `<span style="margin: 0 6px;">&bull;</span><span class="subject-color-badge" style="background-color: ${session.subject.color}; width: 8px; height: 8px; margin-right: 6px;"></span>${session.subject.name}`;
          }
        } else {
          subjectStr = `<span style="margin: 0 6px;">&bull;</span><span class="subject-color-badge" style="background-color: #94a3b8; width: 8px; height: 8px; margin-right: 6px;"></span>Uncategorized`;
        }

        li.innerHTML = `
          <div class="history-date">${dateStr} <span style="margin: 0 4px;">&bull;</span> ${startTimeStr} - ${endTimeStr}${subjectStr}</div>
          <div class="history-details">
            <span>${displayStr}</span>
            <div class="history-actions">
              <span class="${statusClass}">${statusText}</span>
            </div>
          </div>
        `;

        const deleteSessionBtn = document.createElement('button');
        deleteSessionBtn.className = 'history-delete-btn';
        deleteSessionBtn.type = 'button';
        deleteSessionBtn.title = 'Delete session';
        deleteSessionBtn.setAttribute('aria-label', `Delete session from ${dateStr}`);
        deleteSessionBtn.innerHTML = '&times;';
        deleteSessionBtn.addEventListener('click', () => {
          const updatedSessions = sessions.filter((_, index) => index !== sessionIndex);
          chrome.storage.local.set({ sessions: updatedSessions }, () => {
            loadHistory();
            loadStats();
            showToast('Session deleted');
          });
        });

        li.querySelector('.history-actions').appendChild(deleteSessionBtn);
        historyItems.appendChild(li);
      });
    });
  }

  loadHistory();

  // Stats
  const statsItems = document.getElementById('stats-items');
  const statsDaysInput = document.getElementById('stats-days-input');

  function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatStatsDuration(totalMinutes) {
    const totalSeconds = Math.max(0, Math.round(totalMinutes * 60));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (totalSeconds === 0) return '0 min';
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} min`;
  }

  function getSessionSubject(subject) {
    if (typeof subject === 'string') {
      return { name: subject || 'Uncategorized', color: '#94a3b8' };
    }

    const color = subject && /^#[0-9a-f]{6}$/i.test(subject.color)
      ? subject.color
      : '#94a3b8';
    return {
      name: subject && subject.name ? subject.name : 'Uncategorized',
      color
    };
  }

  function createStatsDay(day) {
    const totalMinutes = Math.max(0, day.totalMinutes);
    const subjectTotals = Object.values(day.subjects)
      .map(subject => ({ ...subject, minutes: Math.max(0, subject.minutes) }))
      .filter(subject => subject.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
    const chartTotal = subjectTotals.reduce((total, subject) => total + subject.minutes, 0);

    const li = document.createElement('li');
    li.className = 'stats-day-item';

    const summary = document.createElement('button');
    summary.className = 'stats-day-summary';
    summary.type = 'button';
    summary.setAttribute('aria-expanded', 'false');

    const dateLabel = document.createElement('span');
    dateLabel.textContent = day.label;

    const summaryRight = document.createElement('span');
    summaryRight.className = 'stats-day-summary-right';

    const duration = document.createElement('span');
    duration.className = 'stats-day-duration';
    duration.textContent = formatStatsDuration(totalMinutes);

    const chevron = document.createElement('span');
    chevron.className = 'stats-day-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '›';

    summaryRight.appendChild(duration);
    summaryRight.appendChild(chevron);
    summary.appendChild(dateLabel);
    summary.appendChild(summaryRight);

    const details = document.createElement('div');
    details.className = 'stats-day-details';
    details.hidden = true;

    if (subjectTotals.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'stats-day-empty';
      empty.textContent = 'No completed study sessions';
      details.appendChild(empty);
    } else {
      let progress = 0;
      const segments = subjectTotals.map(subject => {
        const start = progress;
        progress += (subject.minutes / chartTotal) * 100;
        return `${subject.color} ${start}% ${progress}%`;
      });

      const pie = document.createElement('div');
      pie.className = 'stats-pie-chart';
      pie.style.background = `conic-gradient(${segments.join(', ')})`;
      pie.setAttribute('role', 'img');
      pie.setAttribute('aria-label', `Study time by subject for ${day.label}`);

      const legend = document.createElement('div');
      legend.className = 'stats-subject-legend';

      subjectTotals.forEach(subject => {
        const row = document.createElement('div');
        row.className = 'stats-subject-row';

        const subjectLabel = document.createElement('span');
        subjectLabel.className = 'stats-subject-label';

        const dot = document.createElement('span');
        dot.className = 'stats-subject-dot';
        dot.style.backgroundColor = subject.color;

        const name = document.createElement('span');
        name.className = 'stats-subject-name';
        name.textContent = subject.name;

        const subjectDuration = document.createElement('span');
        subjectDuration.className = 'stats-subject-duration';
        const percentage = Math.round((subject.minutes / chartTotal) * 100);
        subjectDuration.textContent = `${formatStatsDuration(subject.minutes)} · ${percentage}%`;

        subjectLabel.appendChild(dot);
        subjectLabel.appendChild(name);
        row.appendChild(subjectLabel);
        row.appendChild(subjectDuration);
        legend.appendChild(row);
      });

      details.appendChild(pie);
      details.appendChild(legend);
    }

    summary.addEventListener('click', () => {
      const isExpanded = summary.getAttribute('aria-expanded') === 'true';
      summary.setAttribute('aria-expanded', String(!isExpanded));
      details.hidden = isExpanded;
      li.classList.toggle('expanded', !isExpanded);
    });

    li.appendChild(summary);
    li.appendChild(details);
    return li;
  }

  function loadStats() {
    chrome.storage.local.get(['sessions'], (data) => {
      const sessions = data.sessions || [];
      const daysToLookBack = Math.min(30, Math.max(1, parseInt(statsDaysInput.value, 10) || 7));

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const days = [];
      const daysByKey = {};

      for (let i = 0; i < daysToLookBack; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const day = {
          label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          totalMinutes: 0,
          subjects: {}
        };
        days.push(day);
        daysByKey[getLocalDateKey(date)] = day;
      }

      sessions.forEach(session => {
        if (!session.completed || !Number.isFinite(session.durationMinutes)) return;
        const sessionDate = new Date(session.startTime);
        const day = daysByKey[getLocalDateKey(sessionDate)];
        if (!day) return;

        const subject = getSessionSubject(session.subject);
        day.totalMinutes += session.durationMinutes;
        if (!day.subjects[subject.name]) {
          day.subjects[subject.name] = { ...subject, minutes: 0 };
        }
        day.subjects[subject.name].minutes += session.durationMinutes;
      });

      statsItems.innerHTML = '';
      days.forEach(day => statsItems.appendChild(createStatsDay(day)));
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
    
    let subject = { name: 'Uncategorized', color: '#94a3b8' };
    try {
      if (manageSubjectSelect.value !== 'Uncategorized') {
        subject = JSON.parse(manageSubjectSelect.value);
      }
    } catch(e) {}

    if (totalMinutes > 0) {
      chrome.storage.local.get(['sessions'], (data) => {
        const now = Date.now();
        const dummySession = {
          startTime: now - (totalMinutes * 60 * 1000), // Fake start time in the past
          endTime: now,
          durationMinutes: isAdding ? totalMinutes : -totalMinutes,
          completed: true,
          subject: subject
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

  // Enter key support for inputs
  const addEnterListener = (input, button) => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        button.click();
      }
    });
  };

  addEnterListener(newSiteInput, addSiteBtn);
  addEnterListener(newSubjectInput, addSubjectBtn);
  addEnterListener(durationMin, startBtn);
  addEnterListener(durationSec, startBtn);
  addEnterListener(manageTimeMin, addTimeBtn);
  addEnterListener(manageTimeSec, addTimeBtn);

  statsDaysInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      statsDaysInput.blur();
      loadStats();
    }
  });
});
