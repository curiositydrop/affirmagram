<script>
/* --------------------
   POPUP FUNCTIONALITY
---------------------*/
const popup = document.getElementById("contact-popup");
const btnDefault = document.getElementById("contact-btn");
const popupClose = document.querySelector("#contact-popup .close");

btnDefault.addEventListener('click', () => popup.style.display = "flex");
popupClose.addEventListener('click', () => popup.style.display = "none");

// Use addEventListener instead of window.onclick
window.addEventListener('click', e => {
  if (e.target === popup) popup.style.display = "none";
});

/* --------------------
   URL PARAMETER
---------------------*/
const urlParams = new URLSearchParams(window.location.search);
const refParam = urlParams.get('ref') || urlParams.get('drop') || urlParams.get('sample');

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
  return value ? value.replace(/^"|"$/g, '').trim() : '';
}

/* --------------------
   CREATE BANNER
---------------------*/
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

/* --------------------
   UPDATE BUTTON TEXT
---------------------*/
function updateButtonText(text) {
  if (text) btnDefault.textContent = text;
}

/* --------------------
   UPDATE POPUP HEADING
---------------------*/
function updatePopupHeading() {
  const popupHeading = document.querySelector('#contact-popup h2');
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

    const rows = text.trim().split('\n').map(r => r.split(','));
    const headers = rows.shift().map(h => h.trim().toLowerCase());

    const match = rows.find(row => row[0]?.trim().toLowerCase() === refParam.toLowerCase());

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
   INITIALIZE PAGE
---------------------*/
async function init() {
  await loadReferrerData();

  if (refData.activeinactive?.toLowerCase() === 'inactive') {
    document.body.innerHTML = '<h2>This referral is no longer active.</h2>';
    return;
  }

  if (refData.bannertext) createBanner(refData.bannertext);
  if (refData.buttontext) updateButtonText(refData.buttontext);
  updatePopupHeading();
}

init();

/* --------------------
   FORM SUBMISSION
---------------------*/
const form = document.querySelector('#contact-popup form');
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

/* --------------------
   SET HIDDEN FIELDS ON CLICK
---------------------*/
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
</script>
