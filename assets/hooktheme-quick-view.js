/**
 * Hooktheme Quick View Component
 * Extends the existing ModalDialog pattern with AJAX content loading
 *
 * Usage:
 * <hooktheme-quick-view id="QuickView-123-section">
 *   <div role="dialog" class="hooktheme-quick-view__content">
 *     <button data-modal-close>Close</button>
 *     <div id="QuickViewInfo-123-section" class="hooktheme-quick-view__content-info"></div>
 *   </div>
 * </hooktheme-quick-view>
 *
 * Triggered by:
 * <modal-opener data-modal="#QuickView-123-section">
 *   <button data-product-url="product-handle">Quick View</button>
 * </modal-opener>
 */

// Prevent duplicate class declaration when script is loaded multiple times
if (!customElements.get('hooktheme-quick-view')) {

class HookthemeQuickView extends HTMLElement {
  constructor() {
    super();
    this.bindEvents();
  }

  bindEvents() {
    // Close button handling
    this.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.hide());
    });

    // ESC key to close
    this.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') this.hide();
    });

    // Click overlay to close
    this.addEventListener('click', (e) => {
      if (e.target === this) this.hide();
    });
  }

  connectedCallback() {
    // Move to body for proper z-index stacking (like ModalDialog)
    if (!this.moved) {
      this.moved = true;
      document.body.appendChild(this);
    }
  }

  /**
   * Get the container element for product content
   */
  getContentContainer() {
    if (!this.contentContainer) {
      this.contentContainer = this.querySelector('[id^="QuickViewInfo-"]');
    }
    return this.contentContainer;
  }

  /**
   * Show modal and fetch product content
   * Called by modal-opener via: modal.show(button)
   * @param {HTMLElement} opener - The trigger button
   */
  show(opener) {
    this.openedBy = opener;

    // Get product URL from the trigger button
    const productUrl = opener.getAttribute('data-product-url');

    if (!productUrl) {
      console.error('[HookthemeQuickView] Missing data-product-url on trigger');
      return;
    }

    this.setLoading(opener, true);

    this.fetchProductContent(productUrl)
      .then((productHTML) => {
        this.renderProduct(productHTML);
        this.initializeFeatures();
        this.openModal();
      })
      .catch((error) => {
        console.error('[HookthemeQuickView] Failed to load product:', error);
      })
      .finally(() => {
        this.setLoading(opener, false);
      });
  }

  /**
   * Open the modal (after content is loaded)
   */
  openModal() {
    // Compensate for scrollbar removal to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = scrollbarWidth + 'px';
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');

    // Focus management (using existing global function)
    if (typeof trapFocus === 'function') {
      trapFocus(this, this.querySelector('[role="dialog"]'));
    }

    // Pause background media
    if (typeof window.pauseAllMedia === 'function') {
      window.pauseAllMedia();
    }
  }

  /**
   * Hide modal and clear content
   */
  hide() {
    document.body.style.paddingRight = '';
    document.body.classList.remove('overflow-hidden');
    this.removeAttribute('open');

    // Clear content on close (key difference from ModalDialog)
    const container = this.getContentContainer();
    if (container) {
      container.innerHTML = '';
    }

    // Remove visual state from product card
    document
      .querySelector('.product__card.quick--view-opened')
      ?.classList.remove('quick--view-opened');

    // Restore focus without triggering browser scroll-into-view on the off-screen button
    if (typeof removeTrapFocus === 'function') {
      removeTrapFocus();
    }
    if (this.openedBy) {
      this.openedBy.focus({ preventScroll: true });
    }

    // Pause media
    if (typeof window.pauseAllMedia === 'function') {
      window.pauseAllMedia();
    }
  }

  /**
   * Fetch product content via AJAX
   * @param {string} productUrl - Product handle
   * @returns {Promise<Document>}
   */
  async fetchProductContent(productUrl) {
    const response = await fetch(`/products/${productUrl}?view=quickview`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const html = await response.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  /**
   * Render product content into modal
   * @param {Document} responseHTML - Parsed HTML document
   */
  renderProduct(responseHTML) {
    const productElement = responseHTML.querySelector('.quick_view__body');
    if (!productElement) {
      console.error('[HookthemeQuickView] .quick_view__body not found in response');
      return;
    }

    const container = this.getContentContainer();

    this.injectStylesheets(responseHTML);
    this.applyColorScheme(productElement, container);
    this.rewriteElementIds(productElement);
    this.injectContent(container, productElement.outerHTML);
  }

  /**
   * Inject stylesheets that aren't already loaded
   */
  injectStylesheets(responseHTML) {
    responseHTML.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && !document.querySelector(`link[href="${href}"]`)) {
        document.head.appendChild(link.cloneNode(true));
      }
    });

    // Inject inline styles from the response
    responseHTML.querySelectorAll('style').forEach((style) => {
      if (!document.querySelector('style[data-quick-view-styles]')) {
        const newStyle = style.cloneNode(true);
        newStyle.setAttribute('data-quick-view-styles', 'true');
        document.head.appendChild(newStyle);
      }
    });
  }

  /**
   * Apply color scheme from response to container
   */
  applyColorScheme(productElement, container) {
    const colorScheme = productElement.querySelector('[class*="color-"]');
    if (colorScheme) {
      const colorClass = Array.from(colorScheme.classList).find((cls) =>
        cls.startsWith('color-')
      );
      if (colorClass) {
        container.classList.add(colorClass);
      }
    }
  }

  /**
   * Rewrite element IDs to prevent duplicates while preserving internal relationships
   * This is critical for variant picker to work correctly
   */
  rewriteElementIds(productElement) {
    // Generate unique prefix for this modal instance
    const uniquePrefix = `qv-${Date.now()}`;

    // Find the original section ID
    const sectionElement = productElement.querySelector('[data-section]');
    const originalSectionId = sectionElement?.dataset.section;

    if (!originalSectionId) return;

    // Store original section ID on variant pickers for reference
    productElement.querySelectorAll('hooktheme-variant-picker').forEach((picker) => {
      picker.dataset.originalSection = originalSectionId;
      picker.dataset.quickViewSection = uniquePrefix;
    });

    // Update form IDs to prevent conflicts with main page
    // Note: Use getAttribute('id') instead of .id because forms with input[name="id"]
    // will return the input element when accessing .id property
    productElement.querySelectorAll('form[id]').forEach((form) => {
      const formId = form.getAttribute('id');
      if (formId && typeof formId === 'string' && formId.includes(originalSectionId)) {
        form.setAttribute('id', formId.replace(originalSectionId, uniquePrefix));
      }
    });

    // Update form references (elements with form attribute)
    productElement.querySelectorAll('[form]').forEach((el) => {
      const formAttr = el.getAttribute('form');
      if (formAttr && formAttr.includes(originalSectionId)) {
        el.setAttribute('form', formAttr.replace(originalSectionId, uniquePrefix));
      }
    });

    // Update price container IDs
    productElement.querySelectorAll('[id^="price-"]').forEach((el) => {
      const elId = el.getAttribute('id');
      if (elId && elId.includes(originalSectionId)) {
        el.setAttribute('id', elId.replace(originalSectionId, uniquePrefix));
      }
    });

    // Update quantity input IDs
    productElement.querySelectorAll('[id^="Quantity-"]').forEach((el) => {
      const elId = el.getAttribute('id');
      if (elId && elId.includes(originalSectionId)) {
        el.setAttribute('id', elId.replace(originalSectionId, uniquePrefix));
      }
    });

    // Update option select IDs and labels
    productElement.querySelectorAll('[id^="Option-"]').forEach((el) => {
      const elId = el.getAttribute('id');
      if (elId && elId.includes(originalSectionId)) {
        el.setAttribute('id', elId.replace(originalSectionId, uniquePrefix));
      }
    });

    productElement.querySelectorAll('[for^="Option-"]').forEach((el) => {
      const forAttr = el.getAttribute('for');
      if (forAttr) {
        el.setAttribute('for', forAttr.replace(originalSectionId, uniquePrefix));
      }
    });

    // Update variant select IDs
    productElement.querySelectorAll('[id^="Variants-"]').forEach((el) => {
      const elId = el.getAttribute('id');
      if (elId && elId.includes(originalSectionId)) {
        el.setAttribute('id', elId.replace(originalSectionId, uniquePrefix));
      }
    });

    productElement.querySelectorAll('[for^="Variants-"]').forEach((el) => {
      const forAttr = el.getAttribute('for');
      if (forAttr) {
        el.setAttribute('for', forAttr.replace(originalSectionId, uniquePrefix));
      }
    });

    // Update data-section attributes
    productElement.querySelectorAll('[data-section]').forEach((el) => {
      el.dataset.originalSection = originalSectionId;
      el.dataset.section = uniquePrefix;
    });

    // Update media IDs
    productElement.querySelectorAll('[data-media-id]').forEach((el) => {
      const mediaId = el.dataset.mediaId;
      if (mediaId && mediaId.includes(originalSectionId)) {
        el.dataset.mediaId = mediaId.replace(originalSectionId, uniquePrefix);
      }
    });

    // Update noscript wrapper classes
    productElement.querySelectorAll(`[class*="${originalSectionId}"]`).forEach((el) => {
      el.className = el.className.replace(new RegExp(originalSectionId, 'g'), uniquePrefix);
    });
  }

  /**
   * Inject content and re-execute scripts
   */
  injectContent(container, html) {
    container.innerHTML = html;

    // Re-execute scripts for custom elements to initialize
    container.querySelectorAll('script').forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.innerHTML) {
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }

  /**
   * Initialize Shopify features after content injection
   */
  initializeFeatures() {
    // Initialize Shopify Payment Button
    if (window.Shopify?.PaymentButton) {
      Shopify.PaymentButton.init();
    }

    // Initialize 3D models
    if (window.ProductModel) {
      window.ProductModel.loadShopifyXR();
    }

    // Re-initialize variant pickers in the modal
    this.initializeVariantPickers();
  }

  /**
   * Initialize variant pickers that were loaded via AJAX
   * Custom elements need manual initialization when added via innerHTML
   */
  initializeVariantPickers() {
    const container = this.getContentContainer();
    if (!container) return;

    // Find all variant pickers in the loaded content
    const variantPickers = container.querySelectorAll('hooktheme-variant-picker');

    variantPickers.forEach((picker) => {
      // If the picker has an init method, call it
      if (typeof picker.init === 'function') {
        picker.init();
      } else if (typeof picker.connectedCallback === 'function') {
        // Some custom elements may need connectedCallback re-called
        // This is a fallback in case init doesn't exist
        try {
          picker.connectedCallback();
        } catch (e) {
          // Ignore errors if connectedCallback was already called
        }
      }
    });

    // Also initialize product-form if present
    const productForms = container.querySelectorAll('product-form');
    productForms.forEach((form) => {
      if (typeof form.init === 'function') {
        form.init();
      }
    });

    // Initialize quantity inputs
    const quantityInputs = container.querySelectorAll('quantity-input');
    quantityInputs.forEach((input) => {
      if (typeof input.connectedCallback === 'function') {
        try {
          input.connectedCallback();
        } catch (e) {
          // Ignore errors
        }
      }
    });
  }

  /**
   * Set loading state on trigger element
   */
  setLoading(element, isLoading) {
    if (!element) return;

    if (isLoading) {
      element.setAttribute('aria-disabled', 'true');
      element.classList.add('loading');
    } else {
      element.removeAttribute('aria-disabled');
      element.classList.remove('loading');
    }
  }
}

// Register custom element
customElements.define('hooktheme-quick-view', HookthemeQuickView);

} // End of duplicate declaration prevention check
