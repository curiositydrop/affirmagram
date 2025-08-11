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
