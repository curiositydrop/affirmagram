// Redirect location
const REDIRECT_URL = "https://curiositydrop.com/newleafpaintingco"; // ← CHANGE THIS

let timeLeft = 12;
const countdownEl = document.getElementById("countdown");
const goNowBtn = document.getElementById("goNow");

const timer = setInterval(() => {
    timeLeft--;
    countdownEl.textContent = timeLeft;

    if (timeLeft <= 0) {
        clearInterval(timer);
        window.location.href = REDIRECT_URL;
    }
}, 1000);

goNowBtn.addEventListener("click", () => {
    clearInterval(timer);
    window.location.href = REDIRECT_URL;
});
