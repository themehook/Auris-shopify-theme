// bundle-variant-controller.js


if (!customElements.get('bundle-variant-handler')) {
  customElements.define('bundle-variant-handler', class BundleVariantHandler extends HTMLElement {
    constructor() {
      super();
      this.bundleAddButton = null;
      this.productHandle = null;
      this.variantOptions = null;
      this.currentVariant = null;
      this.abortController = null;
      this.lastFocusedSelector = null;
      this.initialized = false;

      this.preProcessHtmlCallbacks = [this.preserveFocus.bind(this)];
      this.postProcessHtmlCallbacks = [this.restoreFocus.bind(this)];
    }

    init() {
      if (this.initialized) {
        console.log('Already initialized, skipping...');
        return;
      }

      console.log('=== Starting Bundle Variant Handler Initialization ===');

      // Get product handle from data attribute
      this.productHandle = this.dataset.productHandle;
      console.log('Product handle:', this.productHandle);

      this.bundleAddButton = this.querySelector('.add-this-bundle-item');
      this.variantOptions = this.querySelector('.bundle-variant-options');

      console.log('Found add button:', !!this.bundleAddButton);
      console.log('Found variant options container:', !!this.variantOptions);

      this.initCurrentVariant();
      this.initVariantInputListeners();
      this.attachButtonListener();

      this.initialized = true;
      console.log('=== Bundle variant handler initialization COMPLETE ===');
    }

    initVariantInputListeners() {
      const radioInputs = this.querySelectorAll('.bundle-variant-input');
      console.log(`Found ${radioInputs.length} radio inputs to attach listeners to`);

      if (radioInputs.length === 0) {
        console.error('WARNING: No radio inputs found! Check DOM structure.');
        return;
      }

      // Use arrow function to preserve 'this' context
      radioInputs.forEach((input, index) => {
        input.addEventListener('change', (e) => this.handleVariantInputChange(e));
        console.log(`Listener ${index + 1} attached to:`, input.value);
      });

      console.log(`Successfully initialized ${radioInputs.length} variant input listeners`);
    }

    handleVariantInputChange(event) {
      console.log('Variant input changed:', event.target.value);
      const selectedOptions = this.getSelectedOptions();
      console.log('Selected options:', selectedOptions);
      const matchingVariant = this.findVariantByOptions(selectedOptions);
      console.log('Matching variant:', matchingVariant);

      if (matchingVariant) {
        this.currentVariant = matchingVariant;
        this.updateSelectedVariantDisplay();
        this.updateButtonState();
        this.updateHiddenInput();
        this.updateOptionLabels();
        this.updatePriceDisplay();
        this.updateVariantImage();
      } else {
        // If no matching variant found, still update the display with selected options
        this.updateSelectedVariantDisplayFromOptions(selectedOptions);
      }
    }

    getSelectedOptions() {
      const options = [];
      const radioGroups = this.querySelectorAll('.bundle-variant-input:checked');
      radioGroups.forEach(radio => {
        options[radio.dataset.optionPosition - 1] = radio.value;
      });
      return options;
    }

    findVariantByOptions(options) {
      const variantsScript = this.querySelector('[data-product-variants]');
      if (!variantsScript) return null;

      try {
        const variants = JSON.parse(variantsScript.textContent);
        return variants.find(variant => {
          return options.every((option, index) => {
            const variantOption = variant[`option${index + 1}`];
            return variantOption === option;
          });
        });
      } catch (error) {
        console.error('Error parsing variants:', error);
        return null;
      }
    }

    updateSelectedVariantDisplay() {
      const titleElement = this.querySelector('.selected-variant-title');
      console.log('updateSelectedVariantDisplay - Title element:', titleElement, 'Variant:', this.currentVariant);
      if (titleElement && this.currentVariant) {
        titleElement.textContent = this.currentVariant.title;
        console.log('Updated selected display to:', this.currentVariant.title);
      }
    }

    updateSelectedVariantDisplayFromOptions(selectedOptions) {
      const titleElement = this.querySelector('.selected-variant-title');
      console.log('updateSelectedVariantDisplayFromOptions - Title element:', titleElement, 'Options:', selectedOptions);
      if (titleElement) {
        const displayText = selectedOptions.filter(Boolean).join(' / ');
        titleElement.textContent = displayText || 'Select options';
        console.log('Updated selected display to:', displayText);
      }
    }

    updateHiddenInput() {
      const hiddenInput = this.querySelector('input[name="id"]');
      if (hiddenInput && this.currentVariant) {
        hiddenInput.value = this.currentVariant.id;
        hiddenInput.dataset.price = this.currentVariant.price;
      }
    }

    updatePriceDisplay() {
      const priceElement = this.querySelector('.bundle-product-price .price');
      if (priceElement && this.currentVariant && this.currentVariant.price) {
        // Format price using Shopify's money format if available
        if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
          priceElement.textContent = Shopify.formatMoney(this.currentVariant.price, window.theme?.moneyFormat || '{{amount}}');
        } else {
          // Fallback: simple formatting
          const formattedPrice = (this.currentVariant.price / 100).toFixed(2);
          priceElement.textContent = formattedPrice;
        }
      }
    }

    updateVariantImage() {
      const imageElement = this.querySelector('.bundle-product-media img');
      if (!imageElement || !this.currentVariant) return;

      // Check if the variant has a featured image
      const variantImage = this.currentVariant.featured_image;

      if (variantImage) {
        // Update the image src with the variant's featured image
        const newImageUrl = variantImage;

        // Add a fade transition effect
        imageElement.style.opacity = '0';
        imageElement.style.transition = 'opacity 0.3s ease';

        // Create a new image to preload
        const tempImage = new Image();
        tempImage.onload = () => {
          imageElement.src = newImageUrl;
          imageElement.style.opacity = '1';
        };
        tempImage.onerror = () => {
          // If loading fails, restore opacity
          imageElement.style.opacity = '1';
        };
        tempImage.src = newImageUrl;

        console.log('Updated variant image to:', newImageUrl);
      }
    }

    updateOptionLabels() {
      const fieldsets = this.querySelectorAll('.js-bundle-variant-fieldset');
      console.log('Updating option labels, found fieldsets:', fieldsets.length);
      fieldsets.forEach(fieldset => {
        const checkedInput = fieldset.querySelector('.bundle-variant-input:checked');
        const valueSpan = fieldset.querySelector('.bundle-option-value');
        console.log('Checked input:', checkedInput?.value, 'Value span:', valueSpan);
        if (checkedInput && valueSpan) {
          valueSpan.textContent = checkedInput.value;
          console.log('Updated label to:', checkedInput.value);
        }
      });
    }
    
    preserveFocus(newContent) {
      const activeElement = document.activeElement;
      
      if (activeElement && this.contains(activeElement)) {
        if (activeElement.tagName === 'SELECT') {
          const selectWrapper = activeElement.closest('.product-form__input');
          if (selectWrapper) {
            const optionName = selectWrapper.querySelector('label')?.textContent?.trim();
            this.lastFocusedSelector = { type: 'select', name: optionName, value: activeElement.value };
          }
        } else if (activeElement.tagName === 'INPUT' && activeElement.type === 'radio') {
          const fieldset = activeElement.closest('fieldset');
          if (fieldset) {
            const legend = fieldset.querySelector('legend')?.textContent?.trim();
            this.lastFocusedSelector = { type: 'radio', name: legend, value: activeElement.value };
          }
        } else if (activeElement.classList.contains('add-this-bundle-item')) {
          this.lastFocusedSelector = { type: 'button', isAddButton: true };
        }
      }
    }
    
    restoreFocus(newNode) {
      if (!this.lastFocusedSelector) return;
      
      requestAnimationFrame(() => {
        const { type, isAddButton, name, value } = this.lastFocusedSelector;
        
        if (type === 'button' && isAddButton) {
          newNode.querySelector('.add-this-bundle-item')?.focus();
        } else if (type === 'select') {
          newNode.querySelectorAll('select').forEach(select => {
            const wrapper = select.closest('.product-form__input');
            if (wrapper?.querySelector('label')?.textContent?.trim() === name) {
              select.focus();
            }
          });
        } else if (type === 'radio') {
          newNode.querySelectorAll('fieldset').forEach(fieldset => {
            if (fieldset.querySelector('legend')?.textContent?.trim() === name) {
              fieldset.querySelector(`input[value="${value}"]`)?.focus();
            }
          });
        }
        
        this.lastFocusedSelector = null;
      });
    }
    
    initCurrentVariant() {
      const variantScript = this.querySelector('[data-selected-variant]');
      if (variantScript) {
        try {
          this.currentVariant = JSON.parse(variantScript.innerHTML);
          this.updateButtonState();
        } catch (error) {
          console.error('Error parsing initial variant data:', error);
        }
      }
    }
    
    connectedCallback() {
      if (this.moved) return;
      this.moved = true;
      this.dataset.section = this.closest('.shopify-section')?.id.replace('shopify-section-', '') || 'bundle-modal';

      console.log('connectedCallback fired - waiting for DOM to be ready');

      // Use a more reliable approach - wait for next animation frame twice
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            this.init();
            console.log('connectedCallback - Initialization complete');
          }, 100);
        });
      });
    }
    
    disconnectedCallback() {
      this.onVariantChangeUnsubscriber?.();
      this.abortController?.abort();
    }
    
    handleOptionValueChange({ data: { event, target, selectedOptionValues } }) {
      if (!this.contains(event.target)) return;
      
      this.resetButtonState();
      const productUrl = this.dataset.url || `/products/${this.productHandle}`;
      
      this.renderProductInfo({
        requestUrl: this.buildRequestUrlWithParams(productUrl, selectedOptionValues),
        targetId: target.id,
        callback: this.handleUpdateVariantInfo.bind(this)
      });
    }
    
    buildRequestUrlWithParams(url, optionValues) {
      const params = [];
      if (optionValues?.length) params.push(`option_values=${optionValues.join(',')}`);
      params.push('view=product-bundle');
      return `${url}?${params.join('&')}`;
    }
    
    renderProductInfo({ requestUrl, targetId, callback }) {
      this.abortController?.abort();
      this.abortController = new AbortController();
      
      fetch(requestUrl, { signal: this.abortController.signal })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.text();
        })
        .then(responseText => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          callback(html);
        })
        .catch(error => {
          if (error.name !== 'AbortError') {
            console.error('Error fetching variant data:', error);
          }
        });
    }
    
    handleUpdateVariantInfo(html) {
      const variant = this.getSelectedVariant(html);
      const isCorrectVariant = this.validateSelectedVariant(variant);
      
      if (!isCorrectVariant) {
        const correctVariant = this.findCorrectVariant(html);
        if (correctVariant) {
          this.handleVariantUpdate(html, correctVariant);
          return;
        }
      }
      
      this.handleVariantUpdate(html, variant);
      
      if (variant) {
        this.currentVariant = variant;
        this.updateButtonState();
      }
    }
    
    validateSelectedVariant(variant) {
      if (!variant) return false;

      const selectedValues = this.getSelectedOptions().filter(Boolean);
      const variantOptions = variant.options || [];

      return selectedValues.length === variantOptions.length &&
             selectedValues.every(value => variantOptions.includes(value));
    }

    findCorrectVariant(html) {
      const selectedValues = this.getSelectedOptions().filter(Boolean);
      
      const localVariantsScript = this.querySelector('[data-product-variants]');
      if (localVariantsScript) {
        try {
          const variants = JSON.parse(localVariantsScript.textContent);
          const matchingVariant = this.findMatchingVariantInList(variants, selectedValues);
          if (matchingVariant) return matchingVariant;
        } catch (error) {
          console.error('Error parsing local variants:', error);
        }
      }
      
      const scripts = html.querySelectorAll('script[type="application/json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          
          if (Array.isArray(data)) {
            const matchingVariant = this.findMatchingVariantInList(data, selectedValues);
            if (matchingVariant) return matchingVariant;
          }
          
          if (data.variants && Array.isArray(data.variants)) {
            const matchingVariant = this.findMatchingVariantInList(data.variants, selectedValues);
            if (matchingVariant) return matchingVariant;
          }
          
          if (data.id && data.options && data.options.length > 0) {
            const variantOptions = data.options || [];
            if (this.arraysMatch(selectedValues, variantOptions)) return data;
          }
        } catch (error) {
          continue;
        }
      }
      
      return null;
    }
    
    findMatchingVariantInList(variants, selectedValues) {
      return variants.find(variant => {
        const variantOptions = variant.options || [];
        return this.arraysMatch(selectedValues, variantOptions);
      });
    }
    
    arraysMatch(arr1, arr2) {
      if (arr1.length !== arr2.length) return false;
      const sorted1 = [...arr1].sort();
      const sorted2 = [...arr2].sort();
      return sorted1.every((val, index) => val === sorted2[index]);
    }
    
    handleVariantUpdate(html, variant) {
      const newBundleContent = html.querySelector('.bundle-product-content');
      const currentBundleContent = this.querySelector('.bundle-product-content');
      
      if (newBundleContent && currentBundleContent && variant) {
        this.updateContentWithCorrectVariant(newBundleContent, variant);
        
        if (typeof HTMLUpdateUtility !== 'undefined' && HTMLUpdateUtility.viewTransition) {
          HTMLUpdateUtility.viewTransition(
            currentBundleContent,
            newBundleContent,
            this.preProcessHtmlCallbacks,
            this.postProcessHtmlCallbacks
          );
        } else {
          this.preserveFocus(newBundleContent);
          currentBundleContent.innerHTML = newBundleContent.innerHTML;
          this.restoreFocus(currentBundleContent);
        }
        
        this.reinitializeAfterUpdate();
        this.forceUpdateButtonAttributes(variant);
        
        requestAnimationFrame(() => {
          this.attachButtonListener();
        });
      }
      
      this.updateVariantData(variant);

      // Only publish if PUB_SUB_EVENTS is available
      if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId: this.dataset.section || this.productHandle,
            html,
            variant
          }
        });
      }
    }
    
    updateContentWithCorrectVariant(contentElement, variant) {
      const hiddenInput = contentElement.querySelector('input[name="id"]');
      if (hiddenInput) {
        hiddenInput.value = variant.id;
        hiddenInput.dataset.price = variant.price;
      }

      const variantScript = contentElement.querySelector('[data-selected-variant]');
      if (variantScript) variantScript.textContent = JSON.stringify(variant);

      const radioInputs = contentElement.querySelectorAll('.bundle-variant-input');
      const variantOptions = variant.options || [];

      radioInputs.forEach((radio) => {
        const position = parseInt(radio.dataset.optionPosition) - 1;
        if (variantOptions[position] && radio.value === variantOptions[position]) {
          radio.checked = true;
        } else {
          radio.checked = false;
        }
      });

      const fieldsets = contentElement.querySelectorAll('.js-bundle-variant-fieldset');
      fieldsets.forEach((fieldset, index) => {
        const valueSpan = fieldset.querySelector('.bundle-option-value');
        if (valueSpan && variantOptions[index]) {
          valueSpan.textContent = variantOptions[index];
        }
      });

      const button = contentElement.querySelector('.add-this-bundle-item');
      if (button) {
        button.setAttribute('data-id', variant.id);
        button.dataset.id = variant.id;
        button.disabled = !variant.available;
        button.textContent = variant.available ? 'Add to Bundle' : (window.variantStrings?.soldOut || 'Sold Out');
      }
    }
    
    forceUpdateButtonAttributes(variant) {
      if (!variant) return;
      
      const button = this.querySelector('.add-this-bundle-item');
      if (!button) return;
      
      button.setAttribute('data-id', variant.id);
      button.dataset.id = variant.id;
      button.disabled = !variant.available;
      button.textContent = variant.available ? 'Add to Bundle' : (window.variantStrings?.soldOut || 'Sold Out');
      button.classList.toggle('disabled', !variant.available);
    }
    
    reinitializeAfterUpdate() {
      this.bundleAddButton = this.querySelector('.add-this-bundle-item');
      this.variantOptions = this.querySelector('.bundle-variant-options');

      const variantScript = this.querySelector('[data-selected-variant]');
      if (variantScript) {
        try {
          this.currentVariant = JSON.parse(variantScript.textContent);
          this.syncRadiosWithVariant(this.currentVariant);

          if (this.bundleAddButton) {
            const buttonDataId = this.bundleAddButton.getAttribute('data-id');
            if (buttonDataId != this.currentVariant.id) {
              this.bundleAddButton.setAttribute('data-id', this.currentVariant.id);
              this.bundleAddButton.dataset.id = this.currentVariant.id;
            }
          }
        } catch (error) {
          console.error('Error parsing variant data after update:', error);
        }
      }

      // Re-attach event listeners to new radio buttons
      this.initVariantInputListeners();
    }

    syncRadiosWithVariant(variant) {
      if (!variant) return;

      const variantOptions = variant.options || [];
      const radioInputs = this.querySelectorAll('.bundle-variant-input');

      radioInputs.forEach((radio) => {
        const position = parseInt(radio.dataset.optionPosition) - 1;
        if (variantOptions[position] && radio.value === variantOptions[position]) {
          radio.checked = true;
        }
      });

      this.updateOptionLabels();
    }
    
    getSelectedVariant(html) {
      const variantScript = html.querySelector('[data-selected-variant]');
      if (variantScript) {
        try {
          return JSON.parse(variantScript.innerHTML);
        } catch (error) {
          console.error('Error parsing variant data:', error);
        }
      }
      return null;
    }
    
    updateVariantData(variant) {
      this.currentVariant = variant;
      
      const variantScript = this.querySelector('[data-selected-variant]');
      if (variantScript && variant) {
        variantScript.textContent = JSON.stringify(variant);
      }
      
      const hiddenInput = this.querySelector('input[name="id"]');
      if (hiddenInput && variant) {
        hiddenInput.value = variant.id;
        hiddenInput.dataset.price = variant.price;
      }
      
      this.updateButtonState();
    }
    
    resetButtonState() {
      if (this.bundleAddButton) {
        this.bundleAddButton.disabled = true;
      }
    }
    
    updateButtonState() {
      if (!this.bundleAddButton) return;
      
      if (this.currentVariant) {
        this.bundleAddButton.disabled = !this.currentVariant.available;
        this.bundleAddButton.textContent = this.currentVariant.available 
          ? 'Add to Bundle' 
          : window.variantStrings.soldOut;
        this.bundleAddButton.dataset.id = this.currentVariant.id;
      } else {
        this.bundleAddButton.disabled = true;
        this.bundleAddButton.textContent = window.variantStrings.unavailable;
      }
    }
    
    attachButtonListener() {
      const button = this.querySelector('.add-this-bundle-item');
      console.log('attachButtonListener - Found button:', !!button);

      if (!button) {
        console.error('attachButtonListener - No add button found!');
        return;
      }

      // Clone and replace to remove old listeners
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      this.bundleAddButton = newButton;

      console.log('attachButtonListener - Button listener attached, current variant:', this.currentVariant);

      newButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('=== Add to Bundle button CLICKED ===');
        console.log('Current variant:', this.currentVariant);
        console.log('Product handle:', this.productHandle);

        if (!this.currentVariant) {
          console.error('No variant selected');
          alert('Please select a variant first');
          return;
        }

        console.log('Dispatching bundle:addFromModal event...');
        document.dispatchEvent(new CustomEvent('bundle:addFromModal', {
          detail: { variant: this.currentVariant, productHandle: this.productHandle },
          bubbles: true
        }));
        console.log('Event dispatched successfully');
      });
    }
  });
}