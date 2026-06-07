class FeaturedCollections extends HTMLElement {
  constructor() {
    super();
    this.activeIndex = 0;
    this.interactionMode = this.dataset.interactionMode || 'hover';
    this.init();
  }

  init() {
    this.collections = this.querySelectorAll('.featured__collections-images');
    this.items = this.querySelectorAll('.featured__collections-item');

    this.items.forEach((item, index) => {
      // Click event - always listen but behavior depends on mode
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleClick(index, item);
      });

      // Hover event - only works in hover mode on desktop
      item.addEventListener('mouseenter', () => {
        this.handleHover(index);
      });

      // Keyboard accessibility
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleClick(index, item);
        }
      });
    });

    if (Shopify.designMode) {
      document.addEventListener('shopify:block:select', (event) => {
        const blockId = event.detail.blockId;
        const collectionIndex = Array.from(this.collections).findIndex(
          collection => collection.id === `tab-collection-${blockId}`
        );
        if (collectionIndex !== -1) {
          this.setActiveCollection(collectionIndex);
        }
      });
    }

    this.initMobileSwipe();
  }

  // Check if we're on mobile (width < 750px)
  isMobile() {
    return window.innerWidth < 750;
  }

  // Get effective interaction mode (mobile always uses click)
  getEffectiveMode() {
    return this.isMobile() ? 'click' : this.interactionMode;
  }

  handleHover(index) {
    // Only change on hover if in hover mode and on desktop
    if (this.getEffectiveMode() === 'hover') {
      this.setActiveCollection(index);
    }
  }

  handleClick(index, item) {
    const effectiveMode = this.getEffectiveMode();

    // In click mode (or on mobile), clicking changes the active collection
    if (effectiveMode === 'click') {
      // If already active, navigate to collection
      if (this.activeIndex === index) {
        this.navigateToCollection(item);
      } else {
        // Change active collection
        this.setActiveCollection(index);
      }
    } else {
      // In hover mode on desktop, clicking navigates directly
      this.navigateToCollection(item);
    }
  }

  navigateToCollection(item) {
    const collectionUrl = item.dataset.collectionUrl;
    if (collectionUrl) {
      window.location.href = collectionUrl;
    }
  }

  setActiveCollection(index) {
    // Update active states
    this.activeIndex = index;

    this.items.forEach((item, i) => {
      item.classList.toggle('is-active', i === index);
    });

    this.collections.forEach((collection, i) => {
      if (i === index) {
        collection.classList.add('is-active');
        collection.removeAttribute('hidden');

        // Reset image animations
        const images = collection.querySelectorAll('.collection__image');
        images.forEach(image => {
          image.style.transition = 'none';
          image.offsetHeight; // Force reflow
          image.style.transition = '';
        });
      } else {
        collection.classList.remove('is-active');
        collection.setAttribute('hidden', '');
      }
    });
  }

  initMobileSwipe() {
    let touchStartX = 0;
    let touchEndX = 0;

    this.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    this.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe(touchStartX, touchEndX);
    }, { passive: true });
  }

  handleSwipe(startX, endX) {
    const SWIPE_THRESHOLD = 50;
    const diff = startX - endX;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0 && this.activeIndex < this.items.length - 1) {
        // Swipe left - next
        this.setActiveCollection(this.activeIndex + 1);
      } else if (diff < 0 && this.activeIndex > 0) {
        // Swipe right - previous
        this.setActiveCollection(this.activeIndex - 1);
      }
    }
  }
}

if (!customElements.get('featured-collections')) {
  customElements.define('featured-collections', FeaturedCollections);
}
