/* --------------------
   REF ID PERSISTENCE
---------------------*/
const urlParams = new URLSearchParams(window.location.search);
let refParam = urlParams.get('ref') || urlParams.get('drop') || urlParams.get('sample');

// Persist ref in sessionStorage
if (refParam) {
  sessionStorage.setItem('refParam', refParam);
} else {
  refParam = sessionStorage.getItem('refParam') || '';
}

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
   GOOGLE SHEET (CSV)
---------------------*/
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGQaoBZ7rMgXkLt9ZvLeF9zZ5V5qv1m4mlWWowx-VskRE6hrd1rHOVAg3M4JJfXCotw8wVVK_nVasH/pub?output=csv";

/* --------------------
   HELPER FUNCTIONS
---------------------*/
function cleanValue(value) {
  return value ? value.replace(/^"|"$/g, '').trim() : '';
}

function createBanner(message) {
  if (!message) return;
  const banner = document.createElement('div');
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

function updateButtonText(text) {
  const btnDefault = document.getElementById("contact-btn");
  if (text && btnDefault) btnDefault.textContent = text;
}

function updatePopupHeading() {
  const popupHeading = document.querySelector('#contact-popup h2');
  if (!popupHeading) return;

  if (refData.discountcode.toUpperCase().includes("DROP")) popupHeading.textContent = "Redeem Drop Reward";
  else if (refData.discountcode.toUpperCase().includes("SAMPLE")) popupHeading.textContent = "Redeem Sample Reward";
  else popupHeading.textContent = "Get free estimate";
}

/* --------------------
   POPUP FUNCTIONALITY
---------------------*/
function initPopup() {
  const popup = document.getElementById("contact-popup");
  const btnDefault = document.getElementById("contact-btn");
  const close = document.querySelector(".close");

  if (!popup || !btnDefault || !close) return;

  btnDefault.onclick = () => popup.style.display = "flex";
  close.onclick = () => popup.style.display = "none";
  window.onclick = e => { if (e.target === popup) popup.style.display = "none"; };
}

/* --------------------
   LOAD REFERRER DATA
---------------------*/
async function loadReferrerData() {
  if (!refParam) return;

  try {
    const res = await fetch(sheetURL);
    const text = await res.text();
    const rows = text.trim().split('\n').map(r => r.split(','));
    const headers = rows.shift().map(h => h.trim().toLowerCase());

    const match = rows.find(row =>
      row[0]?.trim().toLowerCase() === refParam.toLowerCase()
    );

    if (!match) {
      console.log("No matching ref found:", refParam);
      return;
    }

    headers.forEach((h, i) => {
      refData[h] = cleanValue(match[i]);
    });

    console.log("Loaded referral data:", refData);
  } catch (err) {
    console.error("Error loading spreadsheet:", err);
  }
}

/* --------------------
   FORM SUBMISSION
---------------------*/
function initForm() {
  const form = document.querySelector('#contact-popup form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const message = document.getElementById('message').value;
    const discount = document.getElementById('discount-code').value;

    const subject = encodeURIComponent(refData.emailsubject || "New Leaf Painting Inquiry");
    const bodyLines = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Message: ${message}`,
      `Discount Code: ${discount}`,
      refData.referrername ? `Referrer: ${refData.referrername}${refData.businessname ? " at " + refData.businessname : ""}` : ""
    ];
    const body = encodeURIComponent(bodyLines.join("\n"));

    window.location.href = `mailto:newleafpaintingcompany@gmail.com?subject=${subject}&body=${body}`;
  });
}

/* --------------------
   BUTTON HIDDEN FIELDS
---------------------*/
function setHiddenFields() {
  const btnDefault = document.getElementById("contact-btn");
  if (!btnDefault) return;

  btnDefault.addEventListener('click', () => {
    const discountField = document.getElementById('discount-code');
    if (discountField) discountField.value = refData.discountcode || "";

    let refField = document.getElementById('referrer');
    if (!refField) {
      refField = document.createElement('input');
      refField.type = 'hidden';
      refField.name = 'referrer';
      refField.id = 'referrer';
      document.querySelector('#contact-popup form').appendChild(refField);
    }
    refField.value = `${refData.referrername}${refData.businessname ? " at " + refData.businessname : ""}`;
  });
}

/* --------------------
   INITIALIZE EVERYTHING
---------------------*/
async function initGlobal() {
  initPopup();
  await loadReferrerData();

  // Inactive referral handling
  if (refData.activeinactive && refData.activeinactive.toLowerCase() === 'inactive') {
    document.body.innerHTML = '<h2>This referral is no longer active.</h2>';
    return;
  }

  if (refData.bannertext) createBanner(refData.bannertext);
  updateButtonText(refData.buttontext);
  updatePopupHeading();
  initForm();
  setHiddenFields();
}

// Run initialization
initGlobal();
