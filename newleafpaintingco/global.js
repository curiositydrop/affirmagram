/* --------------------
   LOAD GLOBAL HTML (header, footer, popup, button)
---------------------*/
async function loadGlobalHTML() {
  try {
    const res = await fetch("global.html");
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Insert header/footer into placeholders if placeholders exist
    const headerTarget = document.getElementById("global-header");
    const footerTarget = document.getElementById("global-footer");

    if (headerTarget) headerTarget.innerHTML = doc.querySelector("header")?.outerHTML || "";
    if (footerTarget) footerTarget.innerHTML = doc.querySelector("footer")?.outerHTML || "";

    // Insert popup and contact button once if not already on page
    if (!document.getElementById("contact-popup") && doc.querySelector("#contact-popup")) {
      document.body.insertAdjacentHTML("beforeend", doc.querySelector("#contact-popup").outerHTML);
    }
    if (!document.getElementById("contact-btn") && doc.querySelector("#contact-btn")) {
      document.body.insertAdjacentHTML("beforeend", doc.querySelector("#contact-btn").outerHTML);
    }

    // Setup popup
    setupPopup();

    // Preserve ref across links
    preserveRefAcrossLinks();

    // Highlight active link
    highlightActiveLink();

  } catch (err) {
    console.error("Error loading global.html:", err);
  }
}

/* --------------------
   SETUP POPUP FUNCTIONALITY
---------------------*/
function setupPopup() {
  const popup = document.getElementById("contact-popup");
  const btnDefault = document.getElementById("contact-btn");
  const popupClose = document.querySelector("#contact-popup .close");

  if (!popup || !btnDefault || !popupClose) return;

  btnDefault.addEventListener("click", () => popup.style.display = "flex");
  popupClose.addEventListener("click", () => popup.style.display = "none");

  window.addEventListener("click", e => {
    if (e.target === popup) popup.style.display = "none";
  });
}

/* --------------------
   PRESERVE REF PARAM ACROSS LINKS
---------------------*/
function preserveRefAcrossLinks() {
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get("ref") || urlParams.get("drop") || urlParams.get("sample");
  if (!refParam) return;

  document.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href");
    if (href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.includes("javascript:")) {
      const url = new URL(href, window.location.origin);
      if (!url.searchParams.has("ref") && !url.searchParams.has("drop") && !url.searchParams.has("sample")) {
        url.searchParams.set("ref", refParam);
      }
      link.setAttribute("href", url.pathname + url.search);
    }
  });
}

/* --------------------
   HIGHLIGHT ACTIVE LINK
---------------------*/
function highlightActiveLink() {
  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll("nav a").forEach(link => {
    const linkPage = link.getAttribute("href").split("?")[0];
    if (linkPage === currentPage) link.classList.add("active");
    else link.classList.remove("active");
  });
}

/* --------------------
   URL PARAMETER
---------------------*/
const urlParams = new URLSearchParams(window.location.search);
const refParam = urlParams.get("ref") || urlParams.get("drop") || urlParams.get("sample");

/* --------------------
   GOOGLE SHEET (CSV)
---------------------*/
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGQaoBZ7rMgXkLt9ZvLeF9zZ5V5qv1m4mlWWowx-VskRE6hrd1rHOVAg3M4JJfXCotw8wVVK_nVasH/pub?output=csv";

/* --------------------
   DEFAULT REF DATA
---------------------*/
let refData = {
  id: "",
  referrername: "",
  businessname: "",
  discountcode: "",
  bannertext: "",
  buttontext: "Get free estimate",
  emailsubject: "New Leaf Painting Inquiry",
  activeinactive: ""
};

/* --------------------
   CLEAN VALUE
---------------------*/
function cleanValue(value) {
  return value ? value.replace(/^"|"$/g, "").trim() : "";
}

/* --------------------
   CREATE BANNER
---------------------*/
function createBanner(message) {
  if (!message || document.getElementById("drop-banner")) return;
  const banner = document.createElement("div");
  banner.id = "drop-banner";
  banner.textContent = message;
  Object.assign(banner.style, {
    backgroundColor: "#4CAF50",
    color: "#fff",
    textAlign: "center",
    padding: "10px",
    fontWeight: "bold",
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    zIndex: "200"
  });
  document.body.prepend(banner);
}

/* --------------------
   UPDATE BUTTON TEXT
---------------------*/
function updateButtonText(text) {
  const btnDefault = document.getElementById("contact-btn");
  if (text && btnDefault) btnDefault.textContent = text;
}

/* --------------------
   UPDATE POPUP HEADING
---------------------*/
function updatePopupHeading() {
  const popupHeading = document.querySelector("#contact-popup h2");
  if (!popupHeading) return;

  if (refData.discountcode.toUpperCase().includes("DROP")) popupHeading.textContent = "Redeem Drop Reward";
  else if (refData.discountcode.toUpperCase().includes("SAMPLE")) popupHeading.textContent = "Redeem Sample Reward";
  else popupHeading.textContent = "Get free estimate";
}

/* --------------------
   LOAD REFERRER DATA FROM CSV
---------------------*/
async function loadReferrerData() {
  if (!refParam) return;

  try {
    const res = await fetch(sheetURL);
    const text = await res.text();
    const rows = text.trim().split("\n").map(r => r.split(","));
    const headers = rows.shift().map(h => h.trim().toLowerCase());

    const match = rows.find(row => row[0]?.trim().toLowerCase() === refParam.toLowerCase());
    if (!match) return;

    headers.forEach((h, i) => {
      refData[h] = cleanValue(match[i]);
    });
    console.log("Loaded referral data:", refData);
  } catch (err) {
    console.error("Error loading spreadsheet:", err);
  }
}

/* --------------------
   INITIALIZE PAGE
---------------------*/
async function init() {
  await loadGlobalHTML();
  await loadReferrerData();

  if (refData.activeinactive?.toLowerCase() === "inactive") {
    document.body.innerHTML = "<h2>This referral is no longer active.</h2>";
    return;
  }

 
