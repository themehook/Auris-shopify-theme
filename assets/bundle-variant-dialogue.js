// bundle-variant-dialogue.js


window.BundleModalHandler = class BundleModalHandler {
  constructor(bundleManager) {
    this.bundleManager = bundleManager;
    this.modalContainer = document.getElementById('bundle-view-modal-container');
    this.focusableElements = [];
    this.firstFocusable = null;
    this.lastFocusable = null;
    this.lastFocusedElement = null;
  }

  openVariantModal(productHandle, triggerButton = null) {
    const modal = this.modalContainer;
    if (!modal) {
      console.error('Modal container not found');
      if (triggerButton) {
        triggerButton.classList.remove('loading');
        triggerButton.disabled = false;
      }
      return;
    }

    // Fetch product JSON data
    const url = `/products/${productHandle}.js`;

    console.log('Opening modal for product:', productHandle);
    console.log('Fetching URL:', url);

    modal.classList.add('open');
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = scrollbarWidth + 'px';
    document.body.style.overflow = 'hidden';

    fetch(url)
      .then(response => {
        console.log('Fetch response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(product => {
        console.log('Product data received:', product.title);

        // Build modal HTML
        const modalHTML = this.buildModalHTML(product);
        modal.innerHTML = modalHTML;

        console.log('Modal content appended to DOM');

        // Wait for custom element to initialize
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              const variantHandler = modal.querySelector('bundle-variant-handler');
              console.log('Modal opened - Found variant handler:', !!variantHandler);

              if (variantHandler) {
                console.log('Variant handler exists, connectedCallback should initialize it');
              }

              this.setupFocusTrap();
              this.firstFocusable?.focus();

              if (triggerButton) {
                triggerButton.classList.remove('loading');
              }
            }, 300);
          });
        });
      })
      .catch(error => {
        console.error('Error loading variant modal:', error);
        modal.classList.remove('open');
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
        alert(`Error loading product: ${error.message}`);

        if (triggerButton) {
          triggerButton.classList.remove('loading');
          triggerButton.disabled = false;
        }
      });
  }

  buildModalHTML(product) {
    const variant = product.variants[0] || {};
    const imageUrl = variant.featured_image?.src || product.featured_image || '';

    let variantOptionsHTML = '';
    if (product.options && product.options.length > 0) {
      // Check if first option is 'Title' (default for products without variants)
      const firstOptionName = typeof product.options[0] === 'string' ? product.options[0] : (product.options[0]?.name || 'Title');
      if (firstOptionName === 'Title') {
        // Product has no variants, skip options
      } else {
        variantOptionsHTML = '<div class="bundle-variant-options">';

        product.options.forEach((option, optionIndex) => {
          // Handle both string format and object format
          const optionName = typeof option === 'string' ? option : (option?.name || `Option ${optionIndex + 1}`);
          const values = [...new Set(product.variants.map(v => v[`option${optionIndex + 1}`]).filter(Boolean))];

          variantOptionsHTML += `
            <fieldset class="js-bundle-variant-fieldset" data-option-index="${optionIndex}">
              <legend class="form__label">
                <span class="bundle-option-name">${optionName}:</span>
                <span class="bundle-option-value">${values[0]}</span>
              </legend>
              <div class="bundle-variant-pills">`;

        values.forEach((value, valueIndex) => {
          const isChecked = valueIndex === 0 ? 'checked' : '';
          const inputId = `bundle-${product.id}-option${optionIndex + 1}-${valueIndex}`;
          variantOptionsHTML += `
            <input
              type="radio"
              id="${inputId}"
              name="bundle-option-${optionIndex + 1}"
              value="${value}"
              class="bundle-variant-input"
              data-option-position="${optionIndex + 1}"
              ${isChecked}
            >
            <label
              for="${inputId}"
              class="bundle-variant-label"
            >
              ${value}
            </label>`;
        });

        variantOptionsHTML += `
            </div>
          </fieldset>`;
        });

        variantOptionsHTML += `
          </div>
          <div class="bundle-selected-variant">
            <span class="selected-variant-title">${variant.title || 'Default'}</span>
          </div>`;
      }
    }

    const variantsJSON = JSON.stringify(product.variants.map(v => ({
      id: v.id,
      title: v.title,
      options: v.options || [],
      price: v.price,
      compare_at_price: v.compare_at_price || 0,
      available: v.available,
      featured_image: v.featured_image?.src || null
    })));

    const selectedVariantJSON = JSON.stringify({
      id: variant.id,
      title: variant.title,
      options: variant.options || [],
      price: variant.price,
      compare_at_price: variant.compare_at_price || 0,
      available: variant.available,
      featured_image: variant.featured_image?.src || null
    });

    const priceFormatted = this.formatMoney(variant.price);
    const compareAtPriceFormatted = variant.compare_at_price ? this.formatMoney(variant.compare_at_price) : '';

    return `
      <div class="product-bundle-view">
        <button type="button" class="bundle-modal-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <bundle-variant-handler
          class="bundle-variant-handler"
          data-product-handle="${product.handle}"
          data-url="/products/${product.handle}"
        >
          <div class="bundle-product-content">
            <div class="bundle-product-media">
              ${imageUrl ? `<img src="${imageUrl}" alt="${product.title}" loading="lazy">` : '<div class="placeholder-svg"></div>'}
            </div>

            <div class="bundle-product-info">
              <h2 class="bundle-product-title">${product.title}</h2>

              <div class="bundle-product-price">
                <div class="price">
                  ${variant.compare_at_price && variant.compare_at_price > variant.price ?
                    `<span class="price__sale">
                      <s class="price__compare">${compareAtPriceFormatted}</s>
                      ${priceFormatted}
                    </span>` : priceFormatted}
                </div>
              </div>

              <div class="bundle-product-variant-container">
                <form method="post" id="bundle-product-form-${product.id}" class="bundle-product-form">
                  <input type="hidden" name="id" value="${variant.id}" data-price="${variant.price}">

                  ${variantOptionsHTML}

                  <script type="application/json" data-product-variants>${variantsJSON}</script>
                  <script type="application/json" data-selected-variant>${selectedVariantJSON}</script>

                  <div class="bundle-product-actions">
                    <button
                      type="button"
                      class="button button--primary add-this-bundle-item"
                      data-id="${variant.id}"
                      ${!variant.available ? 'disabled' : ''}
                    >
                      ${variant.available ? 'Add to Bundle' : 'Sold Out'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </bundle-variant-handler>
      </div>`;
  }

  formatMoney(cents) {
    // Convert cents to number if it's a string
    const priceInCents = typeof cents === 'string' ? parseInt(cents, 10) : cents;

    // Try to use Shopify's formatMoney if available
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      try {
        const moneyFormat = window.theme?.moneyFormat || theme?.moneyFormat || '{{amount}}';
        return Shopify.formatMoney(priceInCents, moneyFormat);
      } catch (e) {
        console.warn('Shopify.formatMoney failed, using fallback');
      }
    }

    // Fallback: format manually
    const amount = priceInCents / 100;
    const currency = Shopify?.currency?.active || 'BDT';

    // Format based on common currency patterns
    if (currency === 'BDT') {
      return `Tk ${amount.toFixed(2)}`;
    } else if (currency === 'USD' || currency === 'CAD' || currency === 'AUD') {
      return `$${amount.toFixed(2)}`;
    } else if (currency === 'EUR') {
      return `€${amount.toFixed(2)}`;
    } else if (currency === 'GBP') {
      return `£${amount.toFixed(2)}`;
    }

    // Generic fallback
    return `${currency} ${amount.toFixed(2)}`;
  }

  closeModal() {
    const modal = this.modalContainer;
    if (!modal) return;

    modal.classList.remove('open');
    modal.innerHTML = '';
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';

    const allButtons = document.querySelectorAll('.add-to-bundle-variant');
    allButtons.forEach(button => {
      button.classList.remove('loading');
      const productItem = button.closest('.product-card');
      if (productItem && !this.bundleManager.temporaryBundle.has(productItem.dataset.productHandle)) {
        button.disabled = false;
      }
    });

    if (this.lastFocusedElement) {
      requestAnimationFrame(() => {
        this.lastFocusedElement.focus();
        this.lastFocusedElement = null;
      });
    }
  }

  setupFocusTrap() {
    if (!this.modalContainer) return;

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    this.focusableElements = Array.from(this.modalContainer.querySelectorAll(focusableSelectors))
      .filter(el => el.offsetParent !== null && !el.hasAttribute('hidden') && el.tabIndex !== -1);

    if (this.focusableElements.length > 0) {
      this.firstFocusable = this.focusableElements[0];
      this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
    }
  }

  handleTabKey(event) {
    if (!this.focusableElements?.length) return;

    if (event.shiftKey && document.activeElement === this.firstFocusable) {
      event.preventDefault();
      this.lastFocusable.focus();
    } else if (!event.shiftKey && document.activeElement === this.lastFocusable) {
      event.preventDefault();
      this.firstFocusable.focus();
    }
  }

  setupModalEventListeners() {
    // Handle clicks at the modal container level and stop propagation
    // This prevents other components' body-click handlers (CartNotification,
    // DetailsModal, OpenMiniCart) from firing and toggling body overflow classes
    if (this.modalContainer) {
      this.modalContainer.addEventListener('click', (event) => {
        if (!this.modalContainer.classList.contains('open')) return;

        // Handle close button click
        if (event.target.closest('.bundle-modal-close')) {
          this.closeModal();
          event.stopPropagation();
          return;
        }

        // Handle overlay click (clicking directly on the container background)
        if (event.target === this.modalContainer) {
          this.closeModal();
          event.stopPropagation();
          return;
        }

        // Stop all clicks inside the modal from bubbling to body/document
        event.stopPropagation();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (!this.modalContainer?.classList.contains('open')) return;

      if (event.key === 'Escape') {
        this.closeModal();
      } else if (event.key === 'Tab') {
        this.handleTabKey(event);
      }
    });
  }

  focusNextAvailableProduct(currentProductItem, productItems) {
    const productItemsArray = Array.from(productItems);
    const currentIndex = productItemsArray.indexOf(currentProductItem);

    for (let i = currentIndex + 1; i < productItemsArray.length; i++) {
      const addButton = productItemsArray[i].querySelector('.add-to-bundle-variant, .product-add-bundle');
      if (addButton && !addButton.disabled && !this.bundleManager.temporaryBundle.has(productItemsArray[i].dataset.productHandle)) {
        this.lastFocusedElement = addButton;
        return;
      }
    }

    for (let i = 0; i < currentIndex; i++) {
      const addButton = productItemsArray[i].querySelector('.add-to-bundle-variant, .product-add-bundle');
      if (addButton && !addButton.disabled && !this.bundleManager.temporaryBundle.has(productItemsArray[i].dataset.productHandle)) {
        this.lastFocusedElement = addButton;
        return;
      }
    }

    this.lastFocusedElement = this.bundleManager.addToCartAllButton?.disabled
      ? currentProductItem.querySelector('.add-to-bundle-variant, .product-add-bundle')
      : this.bundleManager.addToCartAllButton;
  }

  setLastFocusedElement(element) {
    this.lastFocusedElement = element;
  }
};