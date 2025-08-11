(function () {
  async function doIncludes() {
    const nodes = document.querySelectorAll('[data-include]');
    await Promise.all(Array.from(nodes).map(async (el) => {
      const url = el.getAttribute('data-include');
      try {
        const resp = await fetch(url, { credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`Failed to load ${url}`);
        const html = await resp.text();
        el.outerHTML = html;
      } catch (e) { console.error(e); }
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doIncludes);
  } else {
    // DOM is already parsed—go right now
    doIncludes();
  }
})();
