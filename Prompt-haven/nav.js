<script>
// Inject a consistent nav on every page
(function () {
  const html = `
  <div class="nav">
    <div class="wrap">
      <strong>PromptHaven</strong>
      <span class="menu" style="float:right">
        <a href="index.html">Home</a>
        <a href="write.html">Write</a>
        <a href="journal.html">Journal</a>
        <a href="streaks.html">Streaks</a>
        <a href="community.html">Community</a>
        <a href="billing.html">Premium</a>
        <a href="settings.html">Settings</a>
        <a href="login.html">Log in</a>
      </span>
    </div>
  </div>`;
  const style = `
  <style>
    :root{--bg:#f6fafb;--fg:#0f172a;--card:#fff;--muted:#6b7280}
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto;background:var(--bg);color:var(--fg)}
    .nav{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e7eb;z-index:99}
    .wrap{max-width:900px;margin:0 auto;padding:16px}
    .menu a{margin:0 8px;text-decoration:none;color:#111}
    .menu a.active{font-weight:600;text-decoration:underline}
    .card{background:var(--card);border-radius:14px;box-shadow:0 6px 18px rgba(0,0,0,.06);padding:20px}
    .btn{background:#111;color:#fff;padding:10px 14px;border-radius:10px;border:0;cursor:pointer}
  </style>`;
  const mount = document.getElementById('site-nav');
  if (mount) {
    mount.innerHTML = style + html;
    // set active link
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.menu a').forEach(a=>{
      const target = a.getAttribute('href');
      if (target === here) a.classList.add('active');
    });
  }
})();
</script>
