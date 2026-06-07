/**
 * HookTheme Variant Picker
 * Unified custom element for handling all product variant selection types
 * Supports: radios, buttons, dropdowns, swatches, and swatch_dropdowns
 * Uses option_values API for high-variant products (250+ variants)
 *
 * Works across all contexts:
 * - Product page (data-section="main-xxx")
 * - Featured product (data-section="featured-xxx")
 * - Quick View (data-section="qv-xxx", data-original-section="main-xxx")
 *
 * Uses pub/sub pattern for decoupled component communication
 * @version 2.0.0
 */

if (!customElements.get("hooktheme-variant-picker")) {
class HookthemeVariantPicker extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("change", this.handleVariantChange);

    // Initialize data
    this.selectedOptionValueIds = [];
    this.variantData = null;
    this.currentVariant = null;
    this.options = [];

    // Subscription cleanup reference
    this.variantChangeUnsubscriber = null;
  }

  /**
   * Called when element is added to DOM
   */
  connectedCallback() {
    // Initialize custom swatches styling
    this.initializeCustomSwatches();
    // Setup pub/sub subscriptions
    this.setupSubscriptions();
  }

  /**
   * Called when element is removed from DOM
   * Clean up subscriptions to prevent memory leaks
   */
  disconnectedCallback() {
    if (this.variantChangeUnsubscriber) {
      this.variantChangeUnsubscriber();
      this.variantChangeUnsubscriber = null;
    }
  }

  /**
   * Setup pub/sub subscriptions for external variant change events
   * Useful when another component needs to coordinate variant updates
   */
  setupSubscriptions() {
    // Check if pub/sub system is available
    if (typeof subscribe === 'undefined' || typeof PUB_SUB_EVENTS === 'undefined') {
      return;
    }

    // Subscribe to variant change events (for coordination between pickers)
    this.variantChangeUnsubscriber = subscribe(
      PUB_SUB_EVENTS.variantChange,
      (event) => {
        // Only respond if event is NOT from this picker (prevent loops)
        // and is for a related section (e.g., bundle coordination)
        if (event.data && event.data.sectionId !== this.getDisplaySectionId()) {
          // External component triggered a variant change
          // This could be used for bundle product coordination
        }
      }
    );
  }

  /**
   * Initialize custom swatches with variant image/color backgrounds
   *
   * NOTE: As of v1.1.0, swatch styles are now rendered server-side via Liquid
   * using value.variant.featured_image (see snippets/product-variant-options.liquid).
   * This eliminates FOUC (flash of unstyled content) and removes JS dependency.
   *
   * This method is kept for backward compatibility but is now a no-op.
   * The inline styles are applied directly in Liquid:
   * - --swatch-background-image: url(...) for image swatches
   * - --swatch-background-color: [color name] for color swatches
   * - --swatch-focal-point: [focal point] for image positioning
   */
  initializeCustomSwatches() {
    // Swatch styles are now rendered via Liquid (value.variant.featured_image)
    // No JavaScript processing needed - styles are applied at render time
    return;
  }

  /**
   * Get the section ID to use for API fetching
   * For Quick View, this returns the original section ID (before ID rewriting)
   * For other contexts, returns the current section ID
   * @returns {string} The section ID for server requests
   */
  getFetchSectionId() {
    return this.dataset.originalSection || this.dataset.section;
  }

  /**
   * Get the section ID to use for DOM element targeting
   * This is always the current section ID (possibly rewritten for Quick View)
   * @returns {string} The section ID for DOM queries
   */
  getDisplaySectionId() {
    return this.dataset.section;
  }

  /**
   * Check if we're in Quick View context
   * @returns {boolean} True if running inside Quick View modal
   */
  isQuickViewContext() {
    return !!this.dataset.originalSection && this.dataset.originalSection !== this.dataset.section;
  }

  /**
   * Main handler for variant option changes
   */
  handleVariantChange(event) {
    this.collectSelectedOptions();
    this.syncOptionLabels();
    this.resolveCurrentVariant();
    this.syncSwatchDisplay(event);
    this.setAddButtonState(true, "", false);
    this.getPreorderJSON();
    this.syncPickupAvailability();
    this.syncNotificationWidget();
    this.syncOptionAvailability();

    // Check if we have option value IDs for API call
    if (!this.hasOptionValueIds()) {
      this.setAddButtonState(true, "", true);
      this.renderUnavailableState();
      return;
    }

    // Sync media and form if we have a local variant match (immediate feedback)
    if (this.currentVariant) {
      this.syncMediaGallery();
      this.syncFormInput();
    }

    this.syncBrowserURL();
    this.fetchAndRenderVariant();
  }

  /**
   * Collect selected option values from both SELECT and FIELDSET elements
   */
  collectSelectedOptions() {
    this.options = [];
    this.selectedOptionValueIds = [];

    this.querySelectorAll("select, fieldset").forEach((element) => {
      if (element.tagName === "SELECT") {
        const selectedOption = element.selectedOptions[0];
        if (selectedOption) {
          this.options.push(selectedOption.value);
          if (selectedOption.dataset.optionValueId) {
            this.selectedOptionValueIds.push(selectedOption.dataset.optionValueId);
          }
        }
      } else if (element.tagName === "FIELDSET") {
        const checkedInput = element.querySelector("input:checked");
        if (checkedInput) {
          this.options.push(checkedInput.value);
          if (checkedInput.dataset.optionValueId) {
            this.selectedOptionValueIds.push(checkedInput.dataset.optionValueId);
          }
        }
      }
    });
  }

  /**
   * Check if option_values API can be used
   */
  hasOptionValueIds() {
    return this.selectedOptionValueIds && this.selectedOptionValueIds.length > 0;
  }

  /**
   * Sync option labels with selected values
   */
  syncOptionLabels() {
    // Update dropdown labels
    this.querySelectorAll(".product-form__input--dropdown").forEach((wrapper, index) => {
      const label = wrapper.querySelector(".form__label span");
      if (label && this.options[index]) {
        label.innerHTML = this.options[index];
      }
    });

    // Update fieldset legend labels
    this.querySelectorAll("fieldset").forEach((fieldset, index) => {
      const legend = fieldset.querySelector("legend span");
      if (legend && this.options[index]) {
        legend.innerHTML = this.options[index];
      }
    });
  }

  /**
   * Find current variant based on selected options
   */
  resolveCurrentVariant() {
    const variantData = this.getVariantJSON();
    if (!variantData || variantData.length === 0) {
      this.currentVariant = null;
      return;
    }

    this.currentVariant = variantData.find((variant) => {
      if (!variant.options) return false;
      return !variant.options
        .map((option, index) => this.options[index] === option)
        .includes(false);
    });
  }

  /**
   * Update swatch display when selection changes
   */
  syncSwatchDisplay(event) {
    if (!event || !event.target) return;

    const { name, value, tagName } = event.target;

    if (tagName === "SELECT" && event.target.selectedOptions.length) {
      // Update dropdown swatch preview
      // Note: 'name' is already "options[Color]" format from the select element
      const swatchValue = event.target.selectedOptions[0].dataset.optionSwatchValue;
      const swatchPreview = this.querySelector(
        `[data-selected-dropdown-swatch="${name}"] > .swatch`
      );

      if (swatchPreview) {
        if (swatchValue) {
          swatchPreview.style.setProperty("--swatch--background", swatchValue);
          swatchPreview.classList.remove("swatch--unavailable");
        } else {
          swatchPreview.style.setProperty("--swatch--background", "unset");
          swatchPreview.classList.add("swatch--unavailable");
        }
      }
    } else if (tagName === "INPUT" && event.target.type === "radio") {
      // Update swatch selected value label
      const selectedLabel = this.querySelector(`[data-selected-swatch-value="${name}"]`);
      if (selectedLabel) selectedLabel.innerHTML = value;
    }
  }

  /**
   * Update media gallery to show variant's featured media
   * Supports both standard MediaGallery component and Quick View scroll gallery
   */
  syncMediaGallery() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const displaySectionId = this.getDisplaySectionId();

    // Primary: Standard MediaGallery component (product page)
    const mediaGallery = document.getElementById(`MediaGallery-${displaySectionId}`);
    if (mediaGallery && mediaGallery.setActiveMedia) {
      mediaGallery.setActiveMedia(
        `${displaySectionId}-${this.currentVariant.featured_media.id}`,
        true
      );
      return;
    }

    // Fallback: Quick View scroll gallery
    const newMedia = document.querySelector(
      `[data-media-id="${displaySectionId}-${this.currentVariant.featured_media.id}"]`
    );
    if (newMedia) {
      const parent = newMedia.parentElement;
      if (parent && parent.firstChild !== newMedia) {
        parent.prepend(newMedia);
        parent.scroll(0, 0);
      }
    }
  }

  /**
   * Update hidden form input with current variant ID
   */
  syncFormInput() {
    if (!this.currentVariant) return;

    const displaySectionId = this.getDisplaySectionId();
    const productForms = document.querySelectorAll(
      `#product-form-${displaySectionId}, #product-form-installment`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      if (input) {
        input.value = this.currentVariant.id;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  /**
   * Update form input from fetched HTML response
   */
  syncFormInputFromResponse(variantId) {
    const displaySectionId = this.getDisplaySectionId();
    const productForms = document.querySelectorAll(
      `#product-form-${displaySectionId}, #product-form-installment`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      if (input) {
        input.value = variantId;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  /**
   * Update browser URL with variant parameter
   */
  syncBrowserURL() {
    if (this.dataset.updateUrl === "false") return;

    let newUrl;
    if (this.currentVariant) {
      newUrl = `${this.dataset.url}?variant=${this.currentVariant.id}`;
    } else if (this.hasOptionValueIds()) {
      newUrl = `${this.dataset.url}?option_values=${this.selectedOptionValueIds.join(",")}`;
    } else {
      return;
    }

    window.history.replaceState({}, "", newUrl);
  }

  /**
   * Update back-in-stock notification widget
   */
  syncNotificationWidget() {
    const variant = this.currentVariant;
    const variantId = variant?.id ?? null;
    const displaySectionId = this.getDisplaySectionId();

    const notifyWrapperList = document.querySelectorAll(
      `.notify__me--available-${displaySectionId}`
    );

    if (notifyWrapperList.length > 0) {
      notifyWrapperList.forEach((wrapper) => {
        if (variantId != null && !variant.available) {
          const soldOutUrl = document.querySelector(".soldout__product_url");
          if (soldOutUrl) {
            soldOutUrl.value = `${this.dataset.origin}${this.dataset.url}?variant=${variantId}`;
          }
          wrapper.classList.remove("no-js-inline");
        } else {
          wrapper.classList.add("no-js-inline");
        }
      });
    }
  }

  /**
   * Update pickup availability information
   */
  syncPickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }

  /**
   * Update option availability status
   */
  syncOptionAvailability() {
    const variantData = this.getVariantJSON();
    if (!variantData || variantData.length === 0) return;

    const firstChecked = this.querySelector(":checked");
    if (!firstChecked) return;

    const selectedOptionOneVariants = variantData.filter(
      (variant) => variant.options && firstChecked.value === variant.options[0]
    );

    const inputWrappers = [...this.querySelectorAll(".product-form__input, fieldset")];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;

      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
      const previousWrapper = inputWrappers[index - 1];
      const previousChecked = previousWrapper.querySelector(":checked") ||
                              previousWrapper.querySelector("select")?.selectedOptions[0];
      if (!previousChecked) return;

      const previousOptionSelected = previousChecked.value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant.available &&
            variant.options &&
            variant.options[index - 1] === previousOptionSelected
        )
        .map((variant) => variant.options ? variant.options[index] : null)
        .filter(Boolean);

      this.setOptionInputState(optionInputs, availableOptionInputsValue);
    });
  }

  /**
   * Set disabled state for option inputs based on availability
   */
  setOptionInputState(elementList, availableValuesList) {
    elementList.forEach((element) => {
      const value = element.getAttribute("value");
      const isAvailable = availableValuesList.includes(value);

      if (element.tagName === "INPUT") {
        element.classList.toggle("disabled", !isAvailable);
      } else if (element.tagName === "OPTION") {
        element.innerText = isAvailable
          ? value
          : window.variantStrings?.unavailable_with_option?.replace("[value]", value) || value;
      }
    });
  }

  /**
   * Fetch variant data from server using option_values API
   * Uses ID mapping to handle Quick View context where section IDs are rewritten
   */
  fetchAndRenderVariant() {
    if (!this.hasOptionValueIds()) return;

    // Use original section ID for fetching (server doesn't know about rewritten IDs)
    const fetchSectionId = this.getFetchSectionId();
    // Use display section ID for updating DOM elements (IDs have been rewritten)
    const displaySectionId = this.getDisplaySectionId();

    const fetchUrl = `${this.dataset.url}?option_values=${this.selectedOptionValueIds.join(",")}&section_id=${fetchSectionId}`;

    fetch(fetchUrl)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html");

        // Update elements with ID mapping (source ID from server -> target ID in DOM)
        this.updateElementWithIdMapping(html, 'price', fetchSectionId, displaySectionId);
        this.updateElementWithIdMapping(html, 'inventory__stock', fetchSectionId, displaySectionId);
        this.updateElementWithIdMapping(html, 'sku', fetchSectionId, displaySectionId);
        this.updateElementWithIdMapping(html, 'barcode', fetchSectionId, displaySectionId);

        // Extract variant ID from response
        const variantInput = html.querySelector('input[name="id"]');
        const variantId = variantInput?.value;

        if (variantId) {
          // Update or create currentVariant
          this.currentVariant = this.getVariantJSON().find((v) => v.id == variantId) || {
            id: parseInt(variantId),
            available: !html.querySelector('[name="add"][disabled]'),
          };

          this.syncFormInputFromResponse(variantId);
          this.syncMediaFromResponse(html, fetchSectionId, displaySectionId);
          this.syncBrowserURL();
        }

        // Update add button state
        const isUnavailable = this.currentVariant
          ? !this.currentVariant.available
          : !!html.querySelector('[name="add"][disabled]');

        this.setAddButtonState(isUnavailable, window.variantStrings?.soldOut || "Sold Out");

        // Publish variant change event via pub/sub and DOM event
        this.publishVariantChange(html);
      })
      .catch((error) => {
        console.error("Error fetching variant data:", error);
        this.handleFetchError();
      });
  }

  /**
   * Update element content from fetched HTML with ID mapping
   * Handles the case where source HTML has original IDs but DOM has rewritten IDs
   *
   * @param {Document} html - Parsed HTML document from server
   * @param {string} prefix - Element ID prefix (e.g., 'price', 'inventory__stock')
   * @param {string} sourceId - Section ID in the source HTML (original)
   * @param {string} targetId - Section ID in the DOM (possibly rewritten)
   */
  updateElementWithIdMapping(html, prefix, sourceId, targetId) {
    // Try different ID formats used across the theme
    const idFormats = [
      { source: `${prefix}-${sourceId}`, target: `${prefix}-${targetId}` },
      { source: `${prefix}__${sourceId}`, target: `${prefix}__${targetId}` },
      { source: `${prefix}_${sourceId}`, target: `${prefix}_${targetId}` }
    ];

    for (const format of idFormats) {
      const source = html.getElementById(format.source);
      const destination = document.getElementById(format.target);

      if (source && destination) {
        destination.innerHTML = source.innerHTML;
        // Copy classes that might indicate state (like price--sold-out)
        if (source.className) {
          destination.className = source.className;
        }
        return; // Found and updated, exit
      }
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use updateElementWithIdMapping instead
   */
  updateElementFromHtml(html, elementId) {
    const source = html.getElementById(elementId);
    const destination = document.getElementById(elementId);
    if (source && destination) {
      destination.innerHTML = source.innerHTML;
    }
  }

  /**
   * Update media gallery from fetched HTML response with ID mapping
   *
   * @param {Document} html - Parsed HTML document from server
   * @param {string} sourceId - Section ID in the source HTML
   * @param {string} targetId - Section ID in the DOM
   */
  syncMediaFromResponse(html, sourceId, targetId) {
    // Try to find featured media element with original section ID
    const featuredMediaElement = html.querySelector(`#featured-media-id-${sourceId}`);
    if (!featuredMediaElement) return;

    const featuredMediaId = featuredMediaElement.dataset.featuredMediaId;
    if (!featuredMediaId) return;

    // Try standard MediaGallery component with target (display) section ID
    const mediaGallery = document.getElementById(`MediaGallery-${targetId}`);
    if (mediaGallery && mediaGallery.setActiveMedia) {
      mediaGallery.setActiveMedia(`${targetId}-${featuredMediaId}`, true);
      return;
    }

    // Fallback: Quick View scroll gallery - find by data-media-id
    const newMedia = document.querySelector(
      `[data-media-id="${targetId}-${featuredMediaId}"]`
    );
    if (newMedia) {
      const parent = newMedia.parentElement;
      if (parent && parent.firstChild !== newMedia) {
        parent.prepend(newMedia);
        parent.scroll(0, 0);
      }
    }
  }

  /**
   * Publish variant change event via pub/sub system and DOM CustomEvent
   * This allows other components to react to variant changes
   *
   * @param {Document} html - Parsed HTML document from server response
   */
  publishVariantChange(html) {
    const eventData = {
      data: {
        sectionId: this.getDisplaySectionId(),
        originalSectionId: this.getFetchSectionId(),
        variant: this.currentVariant,
        html: html,
        isQuickView: this.isQuickViewContext()
      }
    };

    // Method 1: Pub/Sub pattern (for decoupled components like recipient-form)
    if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
      publish(PUB_SUB_EVENTS.variantChange, eventData);
    }

    // Method 2: DOM CustomEvent (for direct component communication)
    document.dispatchEvent(new CustomEvent("variant:changed", {
      detail: {
        variant: this.currentVariant,
        sectionId: this.getDisplaySectionId(),
        originalSectionId: this.getFetchSectionId(),
        isQuickView: this.isQuickViewContext()
      }
    }));
  }

  /**
   * Handle fetch errors gracefully
   */
  handleFetchError() {
    if (this.currentVariant) {
      this.syncFormInput();
      this.setAddButtonState(!this.currentVariant.available, window.variantStrings?.soldOut);
    } else {
      this.renderUnavailableState();
    }
  }

  /**
   * Set add to cart button state
   * Supports both product page (with .cart--button-text span) and Quick View (direct button text)
   */
  setAddButtonState(disable = true, text, modifyClass = true) {
    const displaySectionId = this.getDisplaySectionId();
    const productForm = document.getElementById(`product-form-${displaySectionId}`);
    if (!productForm) return;

    const addButton = productForm.querySelector('[name="add"]');
    if (!addButton) return;

    // Support both structures: with .cart--button-text wrapper (product page) and without (Quick View)
    const addButtonText = addButton.querySelector(".cart--button-text");
    const textTarget = addButtonText || addButton;

    if (disable) {
      addButton.setAttribute("disabled", true);
      if (text) textTarget.textContent = text;
    } else {
      addButton.removeAttribute("disabled");
      textTarget.textContent = window.variantStrings?.addToCart || "Add to Cart";
    }

    // Preorder handling
    if (window.preorder_button && this.currentVariant) {
      this.handlePreorderButton(addButton, textTarget);
    }
  }

  /**
   * Handle preorder button state
   * @param {HTMLElement} addButton - The add to cart button
   * @param {HTMLElement} textTarget - The element containing button text (span or button itself)
   */
  handlePreorderButton(addButton, textTarget) {
    const productVarArray = this.PreorderVariantData;
    const variant = this.currentVariant;
    const varInventoryManagement = variant?.inventory_management ?? null;

    if (varInventoryManagement != null && productVarArray) {
      for (let variant_id in productVarArray) {
        if (variant.id == variant_id) {
          const inventoryQuantity = parseInt(productVarArray[variant_id].qty);
          const inventoryPolicy = productVarArray[variant_id].inventory_policy;

          if (inventoryQuantity <= 0 && inventoryPolicy === "continue") {
            addButton.removeAttribute("disabled");
            textTarget.textContent = window.variantStrings?.preorder || "Pre-order";
          } else if (inventoryQuantity <= 0 && inventoryPolicy !== "continue") {
            addButton.setAttribute("disabled", true);
            textTarget.textContent = window.variantStrings?.soldOut || "Sold Out";
          } else {
            addButton.removeAttribute("disabled");
            textTarget.textContent = window.variantStrings?.addToCart || "Add to Cart";
          }
          break;
        }
      }
    }
  }

  /**
   * Render unavailable state
   * Supports both product page (with .cart--button-text span) and Quick View (direct button text)
   */
  renderUnavailableState() {
    const displaySectionId = this.getDisplaySectionId();
    const productForm = document.getElementById(`product-form-${displaySectionId}`);
    if (!productForm) return;

    const addButton = productForm.querySelector('[name="add"]');
    if (!addButton) return;

    // Support both structures: with .cart--button-text wrapper (product page) and without (Quick View)
    const addButtonText = addButton.querySelector(".cart--button-text");
    const textTarget = addButtonText || addButton;
    const price = document.getElementById(`price-${displaySectionId}`);

    addButton.setAttribute("disabled", true);
    textTarget.textContent = window.variantStrings?.unavailable || "Unavailable";
    if (price) price.classList.add("no-js-inline");
  }

  /**
   * Get variant data from JSON script tag
   */
  getVariantJSON() {
    if (this.variantData) return this.variantData;

    const dataElement = this.querySelector("[data-variant]");
    if (!dataElement) return [];

    try {
      this.variantData = JSON.parse(dataElement.textContent);
    } catch (e) {
      this.variantData = [];
    }
    return this.variantData;
  }

  /**
   * Get preorder variant data from JSON script tag
   */
  getPreorderJSON() {
    if (this.PreorderVariantData) return;

    const dataElement = this.querySelector("[data-preorder]");
    if (!dataElement) return;

    try {
      this.PreorderVariantData = JSON.parse(dataElement.textContent);
    } catch (e) {
      this.PreorderVariantData = {};
    }
  }
}

customElements.define("hooktheme-variant-picker", HookthemeVariantPicker);
}
