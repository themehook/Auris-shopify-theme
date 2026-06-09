(function () {
  function initIfs(list) {
    var items = list.querySelectorAll(".ifs-item");
    var isHover = list.dataset.display !== "click";

    items.forEach(function (item) {
      function activate() {
        items.forEach(function (i) { i.classList.remove("is--active"); });
        item.classList.add("is--active");
      }

      if (isHover) {
        item.addEventListener("mouseenter", activate);
      } else {
        item.addEventListener("click", function (e) {
          if (!e.target.closest(".ifs-arrow")) activate();
        });
      }
    });
  }

  function init() {
    document.querySelectorAll(".ifs-list").forEach(initIfs);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("shopify:section:load", function (e) {
    e.target.querySelectorAll(".ifs-list").forEach(initIfs);
  });
})();
