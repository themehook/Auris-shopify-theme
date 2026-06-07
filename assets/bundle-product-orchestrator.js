// bundle-product-orchestrator.js


if (!customElements.get('product-bundle-variant-item')) {
  customElements.define('product-bundle-variant-item', class ProductBundleVariantItem extends HTMLElement {
    constructor() {
      super();
    }
  });
}

if (!customElements.get('bundle-product-manager')) {
    customElements.define('bundle-product-manager', class BundleProductManager extends HTMLElement {
      constructor() {
        super();
        this.minItems = parseInt(this.dataset.minItems || 2);
        this.maxItems = parseInt(this.dataset.maxItems || 5);
        this.temporaryBundle = new Map();
        this.originalSlots = new Map();
        
        this.productItems = null;
        this.cartNotification = null;
        this.cartItems = null;
        this.bundleTotalPrice = null;
        this.addToCartAllButton = null;
        this.selectedSection = null;
        
        this.modalHandler = null;
        this.sliderHandler = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.saveOriginalSlots();
        this.updateTotalPrice();
        this.checkMinimumItems();
      }
  
      initializeElements() {
        this.bundleTotalPrice = this.querySelector('.bundle-total-price');
        this.addToCartAllButton = this.querySelector('.bundle-product-submit-button');
        this.productItems = this.querySelectorAll('product-bundle-variant-item');
        this.cartNotification = document.querySelector('cart-notification');
        this.cartItems = document.querySelector('cart-items');
        this.cartDrawer = document.querySelector('cart-drawer');

        // Always use the selected-items-section container directly
        this.selectedSection = this.querySelector('#selected-items-section');

        this.modalHandler = new BundleModalHandler(this);
        this.sliderHandler = new BundleSliderHandler(this);
      }
  
      connectedCallback() {
        this.initializeElements();
        this.saveOriginalSlots();
        this.updateTotalPrice();
        this.checkMinimumItems();
      }
  
      saveOriginalSlots() {
        if (!this.selectedSection) return;

        this.selectedSection.querySelectorAll('.bundle-selected-card-vertical[available]').forEach(slot => {
          const index = slot.getAttribute('data-slot-index');
          if (index) this.originalSlots.set(index, slot.innerHTML);
        });
      }
  
      setupEventListeners() {
        this.addToCartAllButton?.addEventListener('click', this.handleSubmit.bind(this));
        document.addEventListener('bundle:variantSelected', this.handleVariantSelected.bind(this));
        this.addEventListener('click', this.handleBundleClick.bind(this));
        document.addEventListener('bundle:addFromModal', this.handleAddFromModalEvent.bind(this));
        document.addEventListener('shopify:section:load', this.handleSectionLoad.bind(this));
        
        this.modalHandler.setupModalEventListeners();
      }
  
      handleSectionLoad(event) {
        const section = event.detail.target || event.target;
        if (section?.querySelector('bundle-product-manager') === this || section === this.closest('.shopify-section')) {
          this.connectedCallback();
          requestAnimationFrame(() => {
            this.updateAddButtons();
          });
        }
      }
  
      handleBundleClick(event) {
        const target = event.target;
        
        if (target.classList.contains('add-to-bundle-variant') || target.closest('.add-to-bundle-variant')) {
          this.handleAddToBundle(event);
        } else if (target.classList.contains('product-add-bundle') || target.closest('.product-add-bundle')) {
          this.handleDirectAddToBundle(event);
        } else if (target.classList.contains('remove-from-bundle') || target.closest('.remove-from-bundle')) {
          this.handleRemoveFromBundle(event);
        }
      }
  
      handleVariantSelected(event) {
        const { productHandle, variant } = event.detail;
      }
  
      handleAddToBundle(event) {
        const button = event.target.closest('.add-to-bundle-variant');
        if (!button) return;

        const productItem = button.closest('product-bundle-variant-item');
        if (!productItem) return;

        const productHandle = productItem.dataset.productHandle;
        if (!productHandle) {
          console.error('Missing product handle');
          return;
        }

        if (this.temporaryBundle.size >= this.maxItems) {
          alert(`You can only add up to ${this.maxItems} items to this bundle.`);
          return;
        }

        if (this.temporaryBundle.has(productHandle)) {
          alert('This product is already in your bundle.');
          return;
        }

        button.classList.add('loading');
        button.disabled = true;

        // Fetch product data to check if it has variants
        fetch(`/products/${productHandle}.js`)
          .then(response => response.json())
          .then(product => {
            // Check if product has real variants (not just default "Title" variant)
            const hasRealVariants = this.productHasRealVariants(product);

            if (hasRealVariants) {
              // Product has variants - open the modal
              this.modalHandler.setLastFocusedElement(button);
              this.modalHandler.openVariantModal(productHandle, button);
            } else {
              // Product has no variants - add directly to bundle
              const variant = product.variants[0];

              this.addItemToBundle(productHandle, {
                variant: {
                  id: variant.id,
                  price: variant.price,
                  title: variant.title || 'Default Title',
                  available: variant.available,
                  featured_image: variant.featured_image?.src || product.featured_image || null
                },
                element: productItem
              });

              productItem.classList.add('selected');
              button.classList.remove('loading');
              button.disabled = true;
              console.log('Product without variants added directly to bundle:', productHandle);
            }
          })
          .catch(error => {
            console.error('Error fetching product data:', error);
            button.classList.remove('loading');
            button.disabled = false;
          });
      }

      productHasRealVariants(product) {
        // Check if product has more than one variant
        if (product.variants.length > 1) {
          return true;
        }

        // Check if the single variant has options other than "Default Title"
        if (product.variants.length === 1) {
          const variant = product.variants[0];
          // If the only option is "Title" with value "Default Title", it's not a real variant
          if (product.options && product.options.length === 1) {
            const firstOption = typeof product.options[0] === 'string' ? product.options[0] : product.options[0]?.name;
            if (firstOption === 'Title' && variant.title === 'Default Title') {
              return false;
            }
          }
        }

        // Check if there are actual variant options defined
        if (product.options && product.options.length > 0) {
          const firstOption = typeof product.options[0] === 'string' ? product.options[0] : product.options[0]?.name;
          // If first option is "Title", it's likely a product without real variants
          if (firstOption === 'Title') {
            return false;
          }
          return true;
        }

        return false;
      }
  
      handleDirectAddToBundle(event) {
        const button = event.target.closest('.product-add-bundle');
        if (!button) return;

        const productItem = button.closest('product-bundle-variant-item');
        if (!productItem) return;

        const productHandle = productItem.dataset.productHandle;
        const variantId = button.dataset.id;
        const price = parseFloat(button.dataset.price || 0);

        if (!productHandle || !variantId) {
          console.error('Missing product handle or variant ID', { productHandle, variantId });
          return;
        }

        if (this.temporaryBundle.size >= this.maxItems) {
          alert(`You can only add up to ${this.maxItems} items to this bundle.`);
          return;
        }

        if (this.temporaryBundle.has(productHandle)) {
          console.log('Product already in bundle');
          return;
        }

        const titleElement = productItem.querySelector('.card__information .card__heading a, .card__information .card__heading, h3');
        const title = titleElement?.textContent?.trim() || 'Product';

        const variant = {
          id: variantId,
          price: price,
          title: 'Default Title',
          available: true,
          product_title: title
        };

        this.addItemToBundle(productHandle, { variant, element: productItem });
        productItem.classList.add('selected');
        button.disabled = true;
        button.textContent = 'Added to Bundle';
      }
  
      handleAddFromModalEvent(event) {
        console.log('=== handleAddFromModalEvent RECEIVED ===');
        console.log('Event detail:', event.detail);

        const { variant, productHandle } = event.detail;

        if (!variant || !productHandle) {
          console.error('Missing variant or product handle from modal event');
          console.error('Variant:', variant, 'ProductHandle:', productHandle);
          return;
        }

        console.log('Looking for product item with handle:', productHandle);
        this.productItems = this.querySelectorAll('product-bundle-variant-item');
        console.log('Total product items found:', this.productItems.length);

        const productItem = Array.from(this.productItems).find(item => item.dataset.productHandle === productHandle);

        if (!productItem) {
          console.error('Product item not found for handle:', productHandle);
          console.error('Available handles:', Array.from(this.productItems).map(item => item.dataset.productHandle));
          return;
        }

        console.log('Found product item, adding to bundle...');

        this.addItemToBundle(productHandle, {
          variant: {
            id: parseInt(variant.id),
            price: parseInt(variant.price) || 0,
            title: variant.title,
            options: variant.options || [],
            available: variant.available,
            featured_image: variant.featured_image
          },
          element: productItem
        });

        console.log('Item added to bundle, updating button state...');

        const addButton = productItem.querySelector('.add-to-bundle-variant, .product-add-bundle');
        if (addButton) {
          addButton.disabled = true;
          productItem.classList.add('selected');
          console.log('Button disabled and product marked as selected');
        }

        this.modalHandler.focusNextAvailableProduct(productItem, this.productItems);
        this.modalHandler.closeModal();
        console.log('Modal closed, process complete');
      }
  
      handleRemoveFromBundle(event) {
        event.preventDefault();
        event.stopPropagation();
  
        const button = event.target.classList.contains('remove-from-bundle')
          ? event.target
          : event.target.closest('.remove-from-bundle');
  
        if (!button) return;
  
        const productHandle = button.dataset.handle;
        if (!productHandle) return;
  
        this.removeItemFromBundle(productHandle);
      }
  
      addItemToBundle(productHandle, data) {
        if (this.temporaryBundle.has(productHandle)) return;
  
        data.quantity = 1;
        this.temporaryBundle.set(productHandle, data);
        this.renderSelectedItem(productHandle, data);
  
        this.updateTotalPrice();
        this.checkMinimumItems();
  
        requestAnimationFrame(() => {
          this.updateAddButtons();
        });
      }
  
      removeItemFromBundle(productHandle) {
        if (!this.temporaryBundle.get(productHandle)) return;

        this.temporaryBundle.delete(productHandle);

        const productItem = Array.from(this.productItems).find(item => item.dataset.productHandle === productHandle);
        if (productItem) {
          productItem.classList.remove('selected');
          const addButton = productItem.querySelector('.add-to-bundle-variant, .product-add-bundle');
          if (addButton) {
            addButton.disabled = false;
            addButton.classList.remove('loading');

            // Reset button text
            if (addButton.classList.contains('product-add-bundle')) {
              addButton.textContent = 'Add to Bundle';
            } else if (addButton.classList.contains('add-to-bundle-variant')) {
              addButton.textContent = 'Select Options';
            }
          }
        }

        this.reorganizeSlots();
        this.updateTotalPrice();
        this.checkMinimumItems();

        requestAnimationFrame(() => {
          this.updateAddButtons();
        });
      }
  
      reorganizeSlots() {
        if (!this.selectedSection) return;

        const filledSlots = [];

        this.temporaryBundle.forEach((bundleData, productHandle) => {
          filledSlots.push({ productHandle, bundleData });
        });

        this.selectedSection.innerHTML = '';

        // Calculate total slots: at least minItems, but show more if we have more filled slots
        const totalSlots = Math.max(this.minItems, Math.max(3, filledSlots.length));

        for (let i = 0; i < totalSlots; i++) {
          const slotData = filledSlots[i];
          const slot = document.createElement('div');
          slot.className = 'bundle-selected-card-vertical';
          slot.setAttribute('data-section-id', 'bundle-product-card');
          slot.setAttribute('data-slot-index', i + 1);

          if (slotData) {
            slot.setAttribute('data-product-handle', slotData.productHandle);
          } else {
            slot.setAttribute('available', '');
          }

          slot.innerHTML = this.getOriginalPlaceholderHTML();
          this.selectedSection.appendChild(slot);
        }

        const fetchPromises = filledSlots.map((slotData, index) => {
          console.log('reorganizeSlots - Fetching product card for:', slotData.productHandle);
          return fetch(`/products/${slotData.productHandle}?sections=bundle-product-card`)
            .then(response => {
              console.log('reorganizeSlots - Fetch response status:', response.status);
              return response.json();
            })
            .then(data => {
              console.log('reorganizeSlots - Received sections data:', data);

              // Try different possible keys for the section
              let html = data['bundle-product-card'] ||
                         data['sections--bundle-product-card'] ||
                         data['sections/bundle-product-card'];

              // If still not found, try to get the first available section
              if (!html) {
                const keys = Object.keys(data);
                console.log('reorganizeSlots - Available section keys:', keys);
                if (keys.length > 0) {
                  html = data[keys[0]];
                  console.log('reorganizeSlots - Using first available section with key:', keys[0]);
                }
              }

              if (!html) {
                console.error('reorganizeSlots - Section not found. Available sections:', Object.keys(data));
                return;
              }

              console.log('reorganizeSlots - Section HTML length:', html.length);
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = html;

              const card = tempDiv.querySelector('[data-section-id="bundle-product-card"]');
              console.log('reorganizeSlots - Found card in response:', !!card);
              if (!card) {
                console.error('reorganizeSlots - Card not found. HTML preview:', html.substring(0, 200));
                return;
              }

              const targetSlot = this.selectedSection.querySelector(`[data-product-handle="${slotData.productHandle}"]`);
              if (!targetSlot) return;

              targetSlot.removeAttribute('available');
              targetSlot.innerHTML = card.innerHTML;

              this.updateSelectedItem(targetSlot, slotData.bundleData.variant);

              const removeButton = targetSlot.querySelector('.remove-from-bundle');
              if (removeButton) {
                removeButton.dataset.handle = slotData.productHandle;
                removeButton.dataset.slotIndex = index + 1;
              }

              this.setupQuantityInput(targetSlot, slotData.productHandle);

              if (slotData.bundleData.quantity > 1) {
                const quantityInput = targetSlot.querySelector('.bundle-quantity-input');
                if (quantityInput) quantityInput.value = slotData.bundleData.quantity;
              }
            })
            .catch(error => console.error('Error loading slot:', error));
        });

        Promise.all(fetchPromises);
      }
  
      getOriginalPlaceholderHTML() {
        return '<div class="bundle__vertical-product-media placeholder"></div><div class="bundle-selected-info-vertical"><h4 class="bundle-selected-title"></h4><div class="price"></div></div>';
      }
  
      renderSelectedItem(productHandle, { variant, element }) {
        if (!this.selectedSection) {
          console.error('selectedSection not found');
          return;
        }

        const existingItem = this.selectedSection.querySelector(`[data-product-handle="${productHandle}"]`);
        if (existingItem) {
          this.updateSelectedItem(existingItem, variant);
          return;
        }

        let targetSlot = this.selectedSection.querySelector('.bundle-selected-card-vertical[available]');

        if (!targetSlot) {
          // No available slot, need to add a new one if under max limit
          if (this.temporaryBundle.size <= this.maxItems) {
            const newSlot = document.createElement('div');
            newSlot.className = 'bundle-selected-card-vertical';
            newSlot.setAttribute('data-section-id', 'bundle-product-card');
            newSlot.setAttribute('data-slot-index', this.temporaryBundle.size);
            newSlot.setAttribute('available', '');
            newSlot.innerHTML = this.getOriginalPlaceholderHTML();
            this.selectedSection.appendChild(newSlot);
            targetSlot = newSlot;
          } else {
            this.reorganizeSlots();
            return;
          }
        }

        console.log('Fetching product card for:', productHandle);
        fetch(`/products/${productHandle}?sections=bundle-product-card`)
          .then(response => {
            console.log('Fetch response status:', response.status);
            return response.json();
          })
          .then(data => {
            console.log('Received sections data:', data);

            // Try different possible keys for the section
            let html = data['bundle-product-card'] ||
                       data['sections--bundle-product-card'] ||
                       data['sections/bundle-product-card'];

            // If still not found, try to get the first available section
            if (!html) {
              const keys = Object.keys(data);
              console.log('Available section keys:', keys);
              if (keys.length > 0) {
                html = data[keys[0]];
                console.log('Using first available section with key:', keys[0]);
              }
            }

            if (!html) {
              console.error('Section "bundle-product-card" not found in response. Available sections:', Object.keys(data));
              return;
            }

            console.log('Section HTML length:', html.length);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const card = tempDiv.querySelector('[data-section-id="bundle-product-card"]');
            console.log('Found card in response:', !!card);
            if (!card) {
              console.error('Card not found in HTML response. HTML preview:', html.substring(0, 200));
              return;
            }

            const slotIndex = targetSlot.getAttribute('data-slot-index');
            targetSlot.removeAttribute('available');
            targetSlot.setAttribute('data-product-handle', productHandle);
            targetSlot.innerHTML = card.innerHTML;

            this.updateSelectedItem(targetSlot, variant);

            const removeButton = targetSlot.querySelector('.remove-from-bundle');
            if (removeButton) {
              removeButton.dataset.handle = productHandle;
              removeButton.dataset.slotIndex = slotIndex;
            }

            this.setupQuantityInput(targetSlot, productHandle);
          })
          .catch(error => {
            console.error('Error rendering selected item:', error);
          });
      }
  
      setupQuantityInput(card, productHandle) {
        const quantityInput = card.querySelector('.bundle-quantity-input');
        if (!quantityInput) return;
  
        const quantityWrapper = card.querySelector('.bundle-quantity-wrapper');
        const minusButton = quantityWrapper?.querySelector('.quantity__button[name="minus"]');
        const plusButton = quantityWrapper?.querySelector('.quantity__button[name="plus"]');
  
        const updateQuantity = (delta) => {
          const currentValue = parseInt(quantityInput.value) || 1;
          const maxValue = quantityInput.max ? parseInt(quantityInput.max) : 999;
          const newValue = Math.max(1, Math.min(maxValue, currentValue + delta));
          quantityInput.value = newValue;
          quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
        };
  
        if (minusButton) {
          const newMinusButton = minusButton.cloneNode(true);
          minusButton.parentNode.replaceChild(newMinusButton, minusButton);
          newMinusButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (parseInt(quantityInput.value) > 1) updateQuantity(-1);
          });
        }
  
        if (plusButton) {
          const newPlusButton = plusButton.cloneNode(true);
          plusButton.parentNode.replaceChild(newPlusButton, plusButton);
          newPlusButton.addEventListener('click', (e) => {
            e.preventDefault();
            updateQuantity(1);
          });
        }
  
        quantityInput.addEventListener('change', (e) => {
          const value = Math.max(1, Math.min(parseInt(e.target.max) || 999, parseInt(e.target.value) || 1));
          e.target.value = value;
          this.updateBundleItemQuantity(productHandle, value);
        });
      }
  
      updateBundleItemQuantity(productHandle, quantity) {
        const bundleData = this.temporaryBundle.get(productHandle);
        if (bundleData) {
          bundleData.quantity = quantity;
          this.updateTotalPrice();
        }
      }
  
      updateSelectedItem(element, variant) {
        if (!element || !variant) return;
  
        const variantTitle = element.querySelector('.variant-title');
        if (variantTitle) {
          variantTitle.textContent = variant.title !== 'Default Title' ? variant.title : 'Default';
        }
  
        const priceElement = element.querySelector('.price');
        if (priceElement && variant.price) {
          priceElement.textContent = this.formatMoney(variant.price, { showCurrencyCode: false });
        }
  
        const hiddenInput = element.querySelector('input[name="id"]');
        if (hiddenInput) {
          hiddenInput.value = variant.id;
          if (variant.price) hiddenInput.dataset.price = variant.price;
          hiddenInput.dataset.variantTitle = variant.title;
          // Use options array instead of deprecated option1/option2/option3
          if (variant.options && variant.options.length > 0) {
            hiddenInput.dataset.options = JSON.stringify(variant.options);
          }
        }
      }
  
      updateTotalPrice() {
        if (!this.bundleTotalPrice) return;
  
        let total = 0;
        this.temporaryBundle.forEach(({ variant, quantity }) => {
          if (variant?.price) total += parseInt(variant.price) * (quantity || 1);
        });
  
        this.bundleTotalPrice.textContent = this.temporaryBundle.size > 0
          ? this.formatMoney(total, { showCurrencyCode: true })
          : this.formatMoney(0, { showCurrencyCode: true });
      }
  
      get translations() {
        return {
          selectMoreItems: this.dataset.tSelectMoreItems || '*Select {count} more {item_text} to create bundle',
          item: this.dataset.tItem || 'item',
          items: this.dataset.tItems || 'items',
          readyToAdd: this.dataset.tReadyToAdd || '✓ Ready to add to cart!'
        };
      }
      getTranslation(key, replacements = {}) {
        let text = this.translations[key] || key;
        Object.keys(replacements).forEach(placeholder => {
          text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacements[placeholder]);
        });
        return text;
      }
      checkMinimumItems() {
        const selectedCount = this.temporaryBundle.size;
        const notice = this.querySelector('.bundle-minimum-notice');
        const footer = this.querySelector('.bundle-footer');
        if (!notice) return;
        if (selectedCount < this.minItems) {
          const remainingItems = this.minItems - selectedCount;
          const itemText = remainingItems === 1 
            ? this.translations.item 
            : this.translations.items;
          notice.innerHTML = this.getTranslation('selectMoreItems', {
            count: remainingItems,
            item_text: itemText
          });
          notice.style.color = '#e74c3c';
          footer?.classList.remove('ready');
          this.disableAddToCartButton();
        } else {
          notice.innerHTML = this.translations.readyToAdd;
          notice.style.color = '#28a745';
          footer?.classList.add('ready');
          this.enableAddToCartButton();
        }
      }
  
      updateAddButtons() {
        const allProductItems = this.querySelectorAll('product-bundle-variant-item');
        const isBundleFull = this.temporaryBundle.size >= this.maxItems;
  
        allProductItems.forEach(item => {
          const productHandle = item.dataset.productHandle;
          const isInBundle = this.temporaryBundle.has(productHandle);
          const addButtons = item.querySelectorAll('.add-to-bundle-variant, .product-add-bundle');
  
          addButtons.forEach(addButton => {
            if (isInBundle) {
              addButton.disabled = true;
              addButton.classList.remove('loading');
              item.classList.add('selected');
            } else if (isBundleFull) {
              addButton.disabled = true;
              addButton.classList.remove('loading');
              item.classList.remove('selected');
            } else {
              addButton.disabled = false;
              addButton.classList.remove('loading');
              item.classList.remove('selected');
            }
          });
        });
      }
  
      enableAddToCartButton() {
        if (this.addToCartAllButton) {
          this.addToCartAllButton.disabled = false;
          this.addToCartAllButton.classList.remove('disabled');
        }
      }
  
      disableAddToCartButton() {
        if (this.addToCartAllButton) {
          this.addToCartAllButton.disabled = true;
          this.addToCartAllButton.classList.add('disabled');
        }
      }
  
      formatMoney(cents, options = {}) {
        if (typeof cents === 'string') cents = cents.replace('.', '');
  
        const value = parseInt(cents, 10) || 0;
  
        if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
          return Shopify.formatMoney(value, theme.moneyFormat || '${{amount}}');
        }
  
        const amount = value / 100;
        const currency = Shopify?.currency?.active || 'USD';
  
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(amount);
  
        return options.showCurrencyCode === true ? `${formatted} ${currency}` : formatted;
      }
  
      handleSubmit(event) {
        event.preventDefault();

        if (this.temporaryBundle.size < this.minItems) {
          alert(`Please select at least ${this.minItems} items for the bundle`);
          return;
        }

        const selectedItems = [];

        this.temporaryBundle.forEach(({ variant, quantity }, productHandle) => {
          if (!variant?.id) return;

          const variantId = parseInt(variant.id);
          if (isNaN(variantId)) return;

          const card = this.selectedSection?.querySelector(`.bundle-selected-card-vertical[data-product-handle="${productHandle}"]`);

          let itemQuantity = quantity || 1;

          if (card) {
            const quantityInput = card.querySelector('.bundle-quantity-input');
            if (quantityInput) {
              const inputValue = parseInt(quantityInput.value);
              if (!isNaN(inputValue) && inputValue > 0) {
                itemQuantity = inputValue;
              }
            }
          }

          selectedItems.push({
            id: variantId,
            quantity: Math.max(1, itemQuantity),
            productHandle,
            variantTitle: variant.title || 'Unknown'
          });
        });
  
        if (selectedItems.length === 0) {
          alert('No valid items selected for bundle');
          return;
        }
  
        this.addToCartAllButton.classList.add('loading');
        this.addToCartAllButton.disabled = true;
  
        let sectionsToRender = [];
        if (this.cartNotification) {
          sectionsToRender = this.cartNotification.getSectionsToRender().map(section => section.id);
          this.cartNotification.setActiveElement(document.activeElement);
        }
  
        const cartItems = selectedItems.map(({ id, quantity }) => ({ id, quantity }));
  
        fetch(routes.cart_add_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            items: cartItems,
            sections: sectionsToRender,
            section_url: window.location.pathname
          })
        })
          .then(response => response.json())
          .then(data => {
            if (data.status && data.status !== 'success') {
              throw new Error(data.description || 'Error adding items to cart');
            }

            // Update cart notification and cart items
            if (this.cartNotification) {
              this.cartNotification.renderContents(data);
            }
            if (this.cartItems) {
              this.cartItems.renderContents(data);
            }

            // Open cart drawer if available
            if (this.cartDrawer) {
              this.cartDrawer.open();
            } else {
              // Fallback: try to find and open mini-cart-drawer
              const miniCartDrawer = document.querySelector('mini-cart-drawer');
              if (miniCartDrawer && typeof miniCartDrawer.open === 'function') {
                miniCartDrawer.open();
              } else {
                // Final fallback: trigger cart notification
                if (this.cartNotification) {
                  this.cartNotification.open();
                }
              }
            }

            // Reset bundle after successful add
            this.resetBundle();

            // Show success message
            console.log(`Successfully added ${selectedItems.length} items to cart`);
          })
          .catch(error => {
            console.error('Error adding bundle to cart:', error);
            alert(error.message || 'There was an error adding the bundle to your cart');
          })
          .finally(() => {
            this.addToCartAllButton.classList.remove('loading');
            this.addToCartAllButton.disabled = false;
          });
      }
  
      resetBundle() {
        this.temporaryBundle.clear();

        this.productItems.forEach(item => {
          item.classList.remove('selected');
          const addButton = item.querySelector('.add-to-bundle-variant, .product-add-bundle');
          if (addButton) {
            addButton.disabled = false;
            addButton.classList.remove('loading');
          }
        });

        if (this.selectedSection) {
          this.selectedSection.innerHTML = '';

          // Reset to show at least minItems placeholders (minimum 3 for display)
          const placeholderCount = Math.max(3, this.minItems);

          for (let i = 0; i < placeholderCount; i++) {
            const slot = document.createElement('div');
            slot.className = 'bundle-selected-card-vertical';
            slot.setAttribute('data-section-id', 'bundle-product-card');
            slot.setAttribute('data-slot-index', i + 1);
            slot.setAttribute('available', '');
            slot.innerHTML = this.getOriginalPlaceholderHTML();
            this.selectedSection.appendChild(slot);
          }
        }

        this.updateTotalPrice();
        this.checkMinimumItems();
        this.updateAddButtons();
      }
    });
  }