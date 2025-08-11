document.addEventListener('DOMContentLoaded', () => {
  const includes = document.querySelectorAll('[data-include]');
  includes.forEach(async (el) => {
    const file = el.getAttribute('data-include');
    try {
      const resp = await fetch(file);
      if (!resp.ok) throw new Error(`Failed to load ${file}`);
      const html = await resp.text();
      el.outerHTML = html;
    } catch (err) {
      console.error(err);
    }
  });
});
