/**
 * Luvix Sticky Gallery Web Component
 *
 * Custom element that creates a sticky scroll showcase effect with:
 * - Fixed content that remains centered in viewport
 * - Scrolling images with optional rotation animation
 * - Performance-optimized scroll handling with requestAnimationFrame
 * - Intersection Observer for lazy animation triggers
 *
 * @version 1.0.0
 */

customElements.get('luvix-sticky-gallery') ||
  customElements.define(
    'luvix-sticky-gallery',
    class LuvixStickyGallery extends HTMLElement {
      /**
       * Initialize component properties
       */
      constructor() {
        super();

        // Configuration
        this.imageFrames = Array.from(
          this.querySelectorAll('.luvix-sticky-showcase__image-frame')
        );
        this.isRotationEnabled = this.dataset.enableRotation === 'true';
        this.maxRotationDegrees = 15;

        // Performance optimization
        this.animationFrameId = null;
        this.scrollHandler = this.handleImageRotation.bind(this);
        this.requestScrollUpdate = this.requestScrollUpdate.bind(this);

        // Observer reference
        this.intersectionObserver = null;
      }

      /**
       * Called when element is added to the DOM
       */
      connectedCallback() {
        // Slight delay to ensure DOM is fully ready
        setTimeout(() => {
          this.applyImagePositionClasses();
          this.initializeScrollListener();
          this.handleImageRotation();
          this.initializeIntersectionObserver();
        }, 100);
      }

      /**
       * Called when element is removed from the DOM
       * Cleanup to prevent memory leaks
       */
      disconnectedCallback() {
        window.removeEventListener('scroll', this.requestScrollUpdate);

        if (this.intersectionObserver) {
          this.intersectionObserver.disconnect();
        }

        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }
      }

      /**
       * Apply alternating position classes to images
       * Used to determine rotation direction
       */
      applyImagePositionClasses() {
        this.querySelectorAll('.luvix-sticky-showcase__image-item').forEach(
          (item, index) => {
            const imageFrame = item.querySelector('.luvix-sticky-showcase__image-frame');
            if (imageFrame) {
              const positionClass = index % 2 === 0
                ? 'luvix-sticky-showcase__image-frame--left'
                : 'luvix-sticky-showcase__image-frame--right';
              imageFrame.classList.add(positionClass);
            }
          }
        );
      }

      /**
       * Initialize scroll event listener with passive flag
       */
      initializeScrollListener() {
        window.addEventListener('scroll', this.requestScrollUpdate, {
          passive: true,
        });
      }

      /**
       * Request animation frame for scroll updates
       * Prevents multiple animation frames from being queued
       */
      requestScrollUpdate() {
        if (!this.animationFrameId) {
          this.animationFrameId = requestAnimationFrame(() => {
            this.handleImageRotation();
            this.animationFrameId = null;
          });
        }
      }

      /**
       * Initialize Intersection Observer for animation triggers
       * Handles fade-in animations when section enters viewport
       */
      initializeIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
          return;
        }

        this.intersectionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const animationTrigger = entry.target.querySelector('.scroll-trigger');

                if (animationTrigger && animationTrigger.classList.contains('animate--slide-in')) {
                  animationTrigger.style.animationDelay = '0.3s';
                  animationTrigger.style.animationPlayState = 'running';
                }
              }
            });
          },
          {
            threshold: 0.1,
            rootMargin: '0px'
          }
        );

        this.intersectionObserver.observe(this);
      }

      /**
       * Handle image rotation based on scroll position
       * Applies rotation transform to create parallax effect
       */
      handleImageRotation() {
        const viewportHeight = window.innerHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        this.imageFrames.forEach((imageFrame) => {
          const imageRect = imageFrame.getBoundingClientRect();

          // Check if image is in visible range with buffer
          const isInViewport = imageRect.top < viewportHeight * 1.5;

          if (isInViewport && this.isRotationEnabled) {
            // Calculate visibility percentage
            const visiblePercentage = ((viewportHeight - imageRect.top) / viewportHeight) * 100;

            // Calculate rotation based on visibility (0 to maxRotationDegrees)
            let rotationDegree = Math.min(
              (visiblePercentage / 100) * this.maxRotationDegrees,
              this.maxRotationDegrees
            );

            // Apply negative rotation for left-aligned images
            if (imageFrame.classList.contains('luvix-sticky-showcase__image-frame--left')) {
              rotationDegree *= -1;
            }

            // Apply 3D transform for better performance
            imageFrame.style.transform = `translate3d(0px, 0px, 0px) rotate(${rotationDegree}deg)`;
          } else if (!this.isRotationEnabled) {
            // Reset rotation when disabled
            imageFrame.style.transform = 'translate3d(0px, 0px, 0px) rotate(0deg)';
          }
        });
      }
    }
  );
