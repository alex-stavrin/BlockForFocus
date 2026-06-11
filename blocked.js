document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-btn');
  closeBtn.addEventListener('click', () => {
    // Attempt to close the tab or go back
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });
});
