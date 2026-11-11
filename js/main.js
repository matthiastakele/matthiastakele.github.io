(function () {
  var body = document.body;
  var input = document.getElementById('switch');
  var STORAGE_KEY = 'mt-theme';

  function readStoredTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* private mode — fall back to session-only behavior */
    }
  }

  function applyTheme(isNight) {
    body.classList.toggle('night', isNight);
    if (input) input.checked = isNight;
  }

  // Dark is the designed default; an explicit choice always wins.
  var stored = readStoredTheme();
  applyTheme(stored ? stored === 'night' : true);

  // Listen on the input, not the label: the label's native activation runs
  // after click handlers and would flip the checkbox back out of sync.
  if (input) {
    input.addEventListener('change', function () {
      applyTheme(input.checked);
      storeTheme(input.checked ? 'night' : 'day');
    });
  }

  var topButton = document.getElementById('top-button');
  if (topButton) {
    var hero = document.querySelector('.hero');
    var threshold = hero ? hero.offsetHeight : window.innerHeight;

    function syncTopButton() {
      topButton.classList.toggle('is-visible', window.scrollY > threshold);
    }

    syncTopButton();
    window.addEventListener('scroll', syncTopButton, { passive: true });

    topButton.addEventListener('click', function () {
      if (window.__lenis) {
        window.__lenis.scrollTo(0);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
})();
