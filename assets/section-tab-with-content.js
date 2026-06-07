if (!customElements.get("tab-width-content")) {
  class TabCollage extends HTMLElement {
    constructor() {
      super();

      this.querySelectorAll(".tab-width-content-list-item").forEach((button) => {
        if (this.dataset.tabDisplay == "hover") {
          button.addEventListener(
            "mouseover",
            this.setupEventListeners.bind(this)
          );
        } else {
          button.addEventListener("click", this.setupEventListeners.bind(this));
        }
      });

      // Shopify Theme Editor support
      this.initEditorSupport();
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

    // Activate tab by block ID
    activateTabByBlockId(blockId) {
      const tabIndex = `collage--tab-${blockId}`;
      this.pauseAllMedia();

      this.querySelectorAll("[data-tab-index]").forEach((element) => {
        if (element.dataset.tabIndex === tabIndex) {
          element.classList.add("is--open");
        } else {
          element.classList.remove("is--open");
        }
      });
    }

    // Initialize Shopify Theme Editor support
    initEditorSupport() {
      if (Shopify.designMode) {
        document.addEventListener("shopify:block:select", (event) => {
          // Check if the selected block belongs to this section
          if (this.contains(event.target)) {
            const blockId = event.detail.blockId;
            this.activateTabByBlockId(blockId);
          }
        });
      }
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
  customElements.define("tab-width-content", TabCollage);
}
