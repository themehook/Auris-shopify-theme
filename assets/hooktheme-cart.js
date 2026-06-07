class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", (event) => {
      event.preventDefault();
      this.closest("cart-items").deleteQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define("cart-remove-button", CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement = document.getElementById(
      "shopping-cart-line-item-status"
    );

    this.currentItemCount = Array.from(
      this.querySelectorAll('[name="updates[]"]')
    ).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0
    );

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener("change", this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    this.updateQuantity(
      event.target.dataset.index,
      event.target.value,
      document.activeElement.getAttribute("name")
    );
  }

  renderContents(parsedState) {
    this.classList.toggle("is-empty", parsedState.item_count === 0);
    const cartFooter = document.getElementById("hooktheme-cart-footer");

    if (cartFooter)
      cartFooter.classList.toggle("is-empty", parsedState.item_count === 0);

    this.getSectionsToRender().forEach((section) => {
      if (!parsedState.sections[section.section]) return;

      const elementToReplaceCart =
        document.getElementById(section.id)?.querySelector(section.selector) ||
        document.getElementById(section.id);

      if (!elementToReplaceCart) return;

      const parsedHtml = new DOMParser().parseFromString(
        parsedState.sections[section.section],
        "text/html"
      );

      // Scope to parent container to avoid .js-contents collision
      // between hooktheme-cart-items and hooktheme-cart-footer
      const sourceParent = parsedHtml.getElementById(section.id);
      const sourceContent = sourceParent
        ? sourceParent.querySelector(section.selector) || sourceParent
        : parsedHtml.querySelector(section.selector);

      if (sourceContent) {
        elementToReplaceCart.innerHTML = sourceContent.innerHTML;
      }
    });
  }

  getSectionsToRender() {
    const sectionId = document.getElementById("hooktheme-cart-items").dataset.id;
    return [
      {
        id: "hooktheme-cart-items",
        section: sectionId,
        selector: ".js-contents",
      },
      {
        id: "hooktheme-cart-items",
        section: sectionId,
        selector: ".cart-items-card__count",
      },
      {
        id: "cart-live-region-text",
        section: "cart-live-region-text",
        selector: ".shopify-section",
      },
      {
        id: "hooktheme-cart-footer",
        section: sectionId,
        selector: ".js-contents",
      },
    ];
  }

  updateQuantity(line, quantity, name) {
    this.enableLoading(line);

    const sectionsToRender = this.getSectionsToRender();
    const uniqueSections = [...new Set(sectionsToRender.map((s) => s.section))];
    const body = JSON.stringify({
      line,
      quantity,
      sections: uniqueSections,
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);

        this.renderContents(parsedState);
        this.updateLiveRegions(line, parsedState.item_count);
        const lineItem = document.getElementById(`CartItem-${line}`);
        if (lineItem) lineItem.querySelector(`[name="${name}"]`).focus();
        this.disableLoading();
      })
      .catch(() => {
        this.querySelectorAll(".loading-overlay").forEach((overlay) =>
          overlay.classList.add("hidden")
        );
        document.getElementById("cart-errors").textContent =
          window.cartStrings.error;
        this.disableLoading();
      });
  }

  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      document
        .getElementById(`Line-item-error-${line}`)
        .querySelector(".cart-item__error-text").innerHTML =
        window.cartStrings.quantityError.replace(
          "[quantity]",
          document.getElementById(`Quantity-${line}`).value
        );
    }

    this.currentItemCount = itemCount;
    this.lineItemStatusElement.setAttribute("aria-hidden", true);

    const cartStatus = document.getElementById("cart-live-region-text");
    cartStatus.setAttribute("aria-hidden", false);

    setTimeout(() => {
      cartStatus.setAttribute("aria-hidden", true);
    }, 1000);
  }

  deleteQuantity(line, quantity, name) {
    this.enableLoading(line);
    const sectionsToRender = this.getSectionsToRender();
    const uniqueSections = [...new Set(sectionsToRender.map((s) => s.section))];
    const body = JSON.stringify({
      line,
      quantity,
      sections: uniqueSections,
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        this.renderContents(parsedState);
        this.disableLoading();
      })
      .catch(() => {
        this.querySelectorAll(".loading-overlay").forEach((overlay) =>
          overlay.classList.add("hidden")
        );
      });
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    document
      .getElementById("hooktheme-cart-items")
      .classList.add("cart__items--disabled");
    this.querySelectorAll(`#CartItem-${line} .loading-overlay`).forEach(
      (overlay) => overlay.classList.remove("hidden")
    );
    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute("aria-hidden", false);
  }

  disableLoading() {
    document
      .getElementById("hooktheme-cart-items")
      .classList.remove("cart__items--disabled");
  }
}

customElements.define("cart-items", CartItems);
