if (!customElements.get("tab-collage")) {
  class TabCollage extends HTMLElement {
    constructor() {
      super();

      this.querySelectorAll(".tab--collage-list-item").forEach((button) => {
        if (this.dataset.tabDisplay == "hover") {
          button.addEventListener(
            "mouseover",
            this.setupEventListeners.bind(this)
          );
        } else {
          button.addEventListener("click", this.setupEventListeners.bind(this));
        }
      });
    }

    //  Setup Event Listener
    setupEventListeners(event) {
      const target = event.target;
      this.pauseAllMedia();
      this.querySelectorAll("[data-tab-index]").forEach((button) => {
        if (target.dataset.tabIndex === button.dataset.tabIndex) {
          button.classList.add("is--open");
        } else {
          button.classList.remove("is--open");
        }
      });
    }

    pauseAllMedia() {
      this.querySelectorAll(".js-youtube").forEach((video) => {
        video.contentWindow.postMessage(
          '{"event":"command","func":"' + "pauseVideo" + '","args":""}',
          "*"
        );
      });
      this.querySelectorAll(".js-vimeo").forEach((video) => {
        video.contentWindow.postMessage('{"method":"pause"}', "*");
      });
      this.querySelectorAll("video").forEach((video) => video.pause());
      document.querySelectorAll("video").forEach((video) => video.pause());
    }
  }
  customElements.define("tab-collage", TabCollage);
}
