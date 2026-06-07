// bundle-slider-core.js


window.BundleSliderHandler = class BundleSliderHandler {
  constructor(bundleManager) {
    this.bundleManager = bundleManager;
    this.selectedItemsSliderInstance = null;
  }

  initSlider() {
    if (this.bundleManager.maxItems > 3) {
      requestAnimationFrame(() => {
        this.selectedItemSlider();
      });
    }
  }

  selectedItemSlider() {
    // Safety check: ensure bundle manager and selected section exist
    if (!this.bundleManager || !this.bundleManager.selectedSection) {
      console.warn('Bundle manager or selected section not found');
      return;
    }

    // Check if we're in slider mode (maxItems > 3)
    if (this.bundleManager.maxItems <= 3) {
      console.warn('Slider mode not enabled (maxItems <= 3)');
      return;
    }

    // The selected section is the container with class "selected-product-slider swiper"
    const swiperContainer = this.bundleManager.selectedSection;
    
    // Verify it has the swiper class
    if (!swiperContainer.classList.contains('swiper')) {
      console.warn('Selected section does not have swiper class');
      return;
    }

    const swiperWrapper = swiperContainer.querySelector(".swiper-wrapper");
    const prevButton = swiperContainer.querySelector(".swiper-button-prev.items_prev");
    const nextButton = swiperContainer.querySelector(".swiper-button-next.items_next");
    
    if (!swiperWrapper) {
      console.warn('Swiper wrapper not found');
      return;
    }

    // Only destroy if it exists and has necessary properties
    if (this.selectedItemsSliderInstance) {
      try {
        if (this.selectedItemsSliderInstance.destroy) {
          this.selectedItemsSliderInstance.destroy(true, true);
        }
      } catch (error) {
        console.warn('Error destroying slider:', error);
      }
      this.selectedItemsSliderInstance = null;
    }

    // Verify container is still in the DOM before creating new slider
    if (!document.body.contains(swiperContainer)) {
      console.warn('Swiper container is not in the DOM');
      return;
    }

    // Check if Swiper is available
    if (typeof Swiper === 'undefined') {
      console.error('Swiper library is not loaded');
      return;
    }

    try {
      this.selectedItemsSliderInstance = new Swiper(swiperContainer, {
        loop: false,
        slidesPerView: 3,
        spaceBetween: 20,
        grabCursor: true,
        centeredSlides: false,
        slidesPerGroup: 1,
        watchOverflow: true,
        watchSlidesProgress: true,
        resizeObserver: true,
        updateOnWindowResize: true,
        observer: true,
        observeParents: true,
        observeSlideChildren: true,
        pagination: false,
        navigation: {
          nextEl: nextButton,
          prevEl: prevButton,
        },
        breakpoints: {
          0: { slidesPerView: 1, spaceBetween: 15 },
          450: { slidesPerView: 2, spaceBetween: 20 },
          768: { slidesPerView: 3, spaceBetween: 20 },
          1024: { slidesPerView: 2, spaceBetween: 20 },
          1201: { slidesPerView: 3, spaceBetween: 20 }
        },
        on: {
          init: function() {
            try {
              this.update();
              this.updateSlides();
              this.updateProgress();
              this.updateSlidesClasses();
            } catch (error) {
              console.warn('Error in slider init:', error);
            }
          },
          resize: function() {
            try {
              this.update();
            } catch (error) {
              console.warn('Error in slider resize:', error);
            }
          }
        }
      });
      
      console.log('Swiper initialized successfully');
    } catch (error) {
      console.error('Error creating slider instance:', error);
    }
  }

  updateSlider() {
    if (!this.selectedItemsSliderInstance) {
      // If no slider exists, try to create one
      this.selectedItemSlider();
      return;
    }

    requestAnimationFrame(() => {
      try {
        if (this.bundleManager.temporaryBundle.size > 3) {
          // If we have more than 3 items, reinitialize with loop
          this.selectedItemSlider();
        } else if (this.selectedItemsSliderInstance && this.selectedItemsSliderInstance.update) {
          // Otherwise just update
          this.selectedItemsSliderInstance.update();
        }
      } catch (error) {
        console.warn('Error updating slider:', error);
      }
    });
  }

  destroySlider() {
    if (this.selectedItemsSliderInstance) {
      try {
        if (this.selectedItemsSliderInstance.destroy) {
          this.selectedItemsSliderInstance.destroy(true, true);
        }
      } catch (error) {
        console.warn('Error destroying slider:', error);
      }
      this.selectedItemsSliderInstance = null;
    }
  }

  safeUpdate() {
    if (this.selectedItemsSliderInstance && 
        this.selectedItemsSliderInstance.update && 
        this.selectedItemsSliderInstance.$el && 
        document.body.contains(this.selectedItemsSliderInstance.$el)) {
      try {
        this.selectedItemsSliderInstance.update();
      } catch (error) {
        console.warn('Safe update error:', error);
      }
    }
  }
};