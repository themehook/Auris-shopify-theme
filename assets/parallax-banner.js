/**
 * Parallax Banner - Smooth sticky stacking effect
 * Uses CSS sticky positioning with JS enhancements for smoother rendering
 */

class ParallaxBanner {
  constructor(container) {
    this.container = container;
    this.items = Array.from(container.querySelectorAll('[data-parallax-item]'));
    this.isInitialized = false;
    this.headerHeight = 0;

    // Check if user prefers reduced motion
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!this.prefersReducedMotion && this.items.length > 0) {
      this.init();
    }
  }

  init() {
    // Get header height for sticky top offset
    this.updateHeaderHeight();

    // Set up z-index for proper stacking
    this.items.forEach((item, index) => {
      item.style.zIndex = (index + 1) * 10;
      // Set sticky top position based on header height
      item.style.top = `${this.headerHeight}px`;
    });

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateHeaderHeight();
        this.updateStickyTop();
      }, 100);
    }, { passive: true });

    this.isInitialized = true;
  }

  updateHeaderHeight() {
    // Find the sticky header
    const stickyHeader = document.querySelector(
      '.header__sticky, .shopify-section-header-sticky, header.sticky, [data-sticky-header], .header-wrapper'
    );

    if (stickyHeader) {
      this.headerHeight = stickyHeader.offsetHeight;
    } else {
      const cssHeaderHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
      this.headerHeight = cssHeaderHeight ? parseInt(cssHeaderHeight, 10) : 0;
    }
  }

  updateStickyTop() {
    this.items.forEach((item) => {
      item.style.top = `${this.headerHeight}px`;
    });
  }

  destroy() {
    this.items.forEach((item) => {
      item.style.zIndex = '';
      item.style.top = '';
    });
  }
}

// Initialize when DOM is ready
function initParallaxBanners() {
  const containers = document.querySelectorAll(
    '.parallax-banner-section .parallax-banner-wrapper > .container, ' +
    '.parallax-banner-section .parallax-banner-wrapper > .container-fluid, ' +
    '.parallax-banner-section .parallax-banner-wrapper > [class*="container"]'
  );

  containers.forEach(container => {
    if (!container.dataset.parallaxInitialized) {
      container.dataset.parallaxInitialized = 'true';
      new ParallaxBanner(container);
    }
  });
}

// Run on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initParallaxBanners);
} else {
  initParallaxBanners();
}

// Also run on load for late-loading content
window.addEventListener('load', initParallaxBanners);
