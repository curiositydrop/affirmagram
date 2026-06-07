import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyApLiiJsKTw1Fp8J3aQatMqiSZoP_6EycE",
  authDomain: "bandfanwall.firebaseapp.com",
  databaseURL: "https://bandfanwall-default-rtdb.firebaseio.com",
  projectId: "bandfanwall",
  storageBucket: "bandfanwall.firebasestorage.app",
  messagingSenderId: "619241154826",
  appId: "1:619241154826:web:25ddc58eef094e3c0732f3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const adminContainer = document.getElementById("adminSubmissions");

const submissionsRef = ref(db, "RadioSubmissions");

onValue(submissionsRef, (snapshot) => {

  const data = snapshot.val();

  adminContainer.innerHTML = "";

  if (!data) {
    adminContainer.innerHTML = "<p>No submissions found.</p>";
    return;
  }

  Object.entries(data).reverse().forEach(([key, song]) => {

    const card = document.createElement("div");
    card.className = "submission-card";

    card.innerHTML = `
      <h2>${song.artist || "Unknown Artist"}</h2>

      <p><strong>Title:</strong> ${song.title || ""}</p>
      <p><strong>Album:</strong> ${song.album || ""}</p>
      <p><strong>Genre:</strong> ${song.genre || ""}</p>

      <button class="admin-btn" data-key="${key}">
        Approve Song
      </button>
    `;

    adminContainer.appendChild(card);
  });

  document.querySelectorAll(".admin-btn").forEach(button => {

    button.addEventListener("click", async () => {

      const submissionKey = button.dataset.key;

      const song = data[submissionKey];

      const trackKey =
        (song.artist + "-" + song.title)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-");

      try {

        await set(
          ref(db, `RadioTracks/${trackKey}`),
          {
            ...song,
            approved: true
          }
        );

        alert(`${song.title} approved and added to RadioTracks`);

      } catch (error) {

        console.error(error);
        alert("Approval failed");

      }

    });

  });

});
