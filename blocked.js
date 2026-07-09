document.addEventListener('DOMContentLoaded', () => {
  const focusSubject = document.getElementById('focus-subject');
  chrome.storage.local.get(['activeSession'], (data) => {
    if (data.activeSession && data.activeSession.subject && data.activeSession.subject.name !== 'Uncategorized') {
      const subject = data.activeSession.subject;
      focusSubject.innerHTML = `Focusing on: <span style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color:${subject.color}; vertical-align:-2px; margin-right:6px;"></span>${subject.name}`;
      focusSubject.style.display = 'block';
    }
  });
});
