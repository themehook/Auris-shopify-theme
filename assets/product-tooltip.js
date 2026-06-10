(function () {
  function initPct(root) {
    root.querySelectorAll('.pct-wrap').forEach(function (wrap) {
      if (wrap.__pctBound) return;
      wrap.__pctBound = true;

      var trigger = wrap.querySelector('.pct-trigger');
      var panel   = wrap.querySelector('.pct-panel');
      var close   = wrap.querySelector('.pct-close');
      if (!trigger || !panel) return;

      function open() {
        trigger.setAttribute('aria-expanded', 'true');
        panel.classList.add('is--open');
        panel.setAttribute('aria-hidden', 'false');
      }

      function shut() {
        trigger.setAttribute('aria-expanded', 'false');
        panel.classList.remove('is--open');
        panel.setAttribute('aria-hidden', 'true');
      }

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        panel.classList.contains('is--open') ? shut() : open();
      });

      if (close) {
        close.addEventListener('click', function (e) {
          e.stopPropagation();
          shut();
        });
      }

      document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) shut();
      });
    });
  }

  function init() {
    initPct(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    initPct(e.target);
  });
})();
