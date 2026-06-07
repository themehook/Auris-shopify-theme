if (!customElements.get("collection-tab-component")) {
  class CollectionTabComponent extends HTMLElement {
    constructor() {
      super();
      this.links = [];
      this.tabItems = [];
      this.images = [];
    }
    connectedCallback() {
      this.links = [...this.querySelectorAll('[data-ref="link"]')];
      this.tabItems = [...this.querySelectorAll("collection-tab-item")];
      this.images = [...this.querySelectorAll('[data-ref="collection-image"]')];

      const selectedIndex = this.links.findIndex(link => link.getAttribute("aria-selected") === "true");
      this.select(selectedIndex >= 0 ? selectedIndex : 0);

      this.links.forEach((link, index) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          this.select(index);
        });
      });

      if (Shopify.designMode) {
        document.addEventListener("shopify:block:select", (e) => {
          const blockId = e.detail.blockId;
          const index = this.tabItems.findIndex(item => item.getAttribute("block-attr") === blockId);
          if (index >= 0) {
            this.select(index);
          }
        });
      }
    }

    select(index) {
      if (this.currentIndex === index) return;
      this.currentIndex = index;
      this.updateSelectedLink(index);
      this.updateSelectedTabItem(index);
      this.updateSelectedImage(index);

      // Force Swiper update on tab switch
      const activeTabItem = this.tabItems[index];
      const swiperEl = activeTabItem.querySelector(".swiper, .swiper-container");
      if (swiperEl?.swiper) {
        setTimeout(() => {
          swiperEl.swiper.update();
        }, 50);
      }
    }

    updateSelectedLink(index) {
      this.links.forEach((link, i) => {
        link.setAttribute("aria-selected", (i === index).toString());
      });
    }

    updateSelectedTabItem(index) {
      this.tabItems.forEach((item, i) => {
        const isVisible = i === index;
        item.setAttribute("aria-hidden", (!isVisible).toString());
        item.toggleAttribute("hidden", !isVisible);
      });
    }

    updateSelectedImage(index) {
      this.images.forEach((img, i) => {
        const isVisible = i === index;
        img.setAttribute("aria-hidden", (!isVisible).toString());
        img.toggleAttribute("hidden", !isVisible);
      });
    }
  }

  customElements.define("collection-tab-component", CollectionTabComponent);
}

// Swiper slider per tab item
if (!customElements.get("collection-tab-item")) {
  customElements.define("collection-tab-item", class extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      const tabPan = this.querySelectorAll(".tab-slider__activate");
      tabPan.forEach((item) => {
        const blockId = item.getAttribute("data-block-id");
        this.initSwiperSlider(blockId);
      });
    }

    initSwiperSlider(blockId) {
      const slideShowOnXl = this.getAttribute("data-show-extra-large"),
            slideShowOnMobile = this.getAttribute("data-show-mobile"),
            slideAutoplay = this.getAttribute("data-autoplay"),
            slideAutoplayTime = this.getAttribute("data-autoplay-time"),
            paginationType = this.getAttribute("data-pagination");

      let autoPlayInit = false;
      if (slideAutoplay === "true") {
        autoPlayInit = { 
          delay: parseInt(slideAutoplayTime || "3000"),
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }
      }

      const swiperContainer = document.getElementById(blockId);
      if (!swiperContainer) {
        console.error(`Swiper container with ID ${blockId} not found.`);
        return;
      }

      const nextEl = this.querySelector('.swiper-button-next');
      const prevEl = this.querySelector('.swiper-button-prev');
      const paginationInit = paginationType === "dots" ? "bullets" : "fraction";

      // Prevent double initialization
      if (swiperContainer.swiper) return;

      new Swiper(swiperContainer, {
        slidesPerView: parseInt(slideShowOnXl || "3"),
        spaceBetween: 24,
        loop: true,
        autoplay: autoPlayInit,
        pagination: {
          el: this.querySelector('.swiper-pagination'),
          clickable: true,
          type: paginationInit,
        },
        navigation: {
          nextEl,
          prevEl,
        },
        breakpoints: {
          320: { slidesPerView: parseInt(slideShowOnMobile || "1") },
          480: { slidesPerView: 2 },
          768: { slidesPerView: 2 },
          992: { slidesPerView: 2 },
          1200: { slidesPerView: parseInt(slideShowOnXl || "3") },
        },
      });
    }
  });
}
