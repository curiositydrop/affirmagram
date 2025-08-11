// Only run after DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  // Safe-guard: only init if the library loaded
  if (window.emailjs && !window._emailjsInited) {
    emailjs.init("YOUR_USER_ID"); // <-- replace with your EmailJS public key
    window._emailjsInited = true;
  }

  // Delegate submit for booking form (works even if it's in a partial)
  const form = document.getElementById('bookingForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!window.emailjs) return;

      emailjs.sendForm("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", form)
        .then(() => {
          const status = document.getElementById("bookingStatus");
          if (status) status.innerText = "Booking request sent successfully!";
          form.reset();
        })
        .catch(() => {
          const status = document.getElementById("bookingStatus");
          if (status) status.innerText = "Failed to send. Please try again.";
        });
    });
  }
});

// ---- Active menu link highlighter (waits for header include) ----
(function(){
  function highlightActive() {
    const page = document.body.dataset.page;
    const links = document.querySelectorAll('nav a');
    if (!links.length) return false;

    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      const isHome = page === 'home' && href.includes('index.html');
      const isPage = href.includes(page + '.html');
      if (isHome || isPage) link.classList.add('active');
    });
    return true;
  }

  // Try once after DOM ready (nav might already be present)
  document.addEventListener('DOMContentLoaded', () => {
    if (highlightActive()) return;

    // If not present yet, watch for includes.js inserting the header
    const obs = new MutationObserver(() => {
      if (highlightActive()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  });
})();
