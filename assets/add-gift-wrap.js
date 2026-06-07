if (!customElements.get("add-gift-wrap")) {
class AddGiftWrap extends HTMLElement {
  constructor() {
    super();

    this.giftWrapProductId = parseInt(this.dataset.giftWrapProductId);
    this.cartDrawer = document.querySelector("cart-notification");

    // Detect context: cart page vs cart drawer
    this.isCartPage = !!document.getElementById("hooktheme-cart-items");

    // When the gift-wrapping checkbox is checked or unchecked.
    this.querySelector('[name="attributes[gift-wrapping]"]').addEventListener(
      "change",
      (event) => {
        if (event.target.checked) {
          this.setGiftWrap();
        } else {
          this.removeGiftWrap();
        }
      }
    );

    // Validation variable
    this.cartItemsSize = this.dataset.cartItemsSize;
    this.giftWrapsInCart = this.dataset.giftWrapInCart;
    this.giftWrapProduct =
      this.dataset.giftWrapProduct == "true" ? true : false;

    // If we have nothing but gift-wrap items in the cart.
    if (this.cartItemsSize == 1 && this.giftWrapsInCart > 0) {
      this.removeGiftWrap();
    }
    // If we have more than one gift-wrap item in the cart.
    else if (this.giftWrapsInCart > 1) {
      this.setGiftWrap();
    }
    // If we have a gift-wrap item in the cart but our gift-wrapping cart attribute has not been set.
    else if (this.giftWrapsInCart > 0 && this.giftWrapProduct === false) {
      this.setGiftWrap();
    }
    // If we have no gift-wrap item in the cart but our gift-wrapping cart attribute has been set.
    else if (this.giftWrapsInCart == 0 && this.giftWrapProduct) {
      this.setGiftWrap();
    }
  }

  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      const sectionId = section.section || section.id;
      const sectionHtml = parsedState.sections[sectionId];
      if (!sectionHtml) return;

      const elementToReplace = document.getElementById(section.id);
      if (!elementToReplace) return;

      const selector = section.selector || ".shopify-section";
      const targetEl = elementToReplace.querySelector(selector) || elementToReplace;

      const parsedHtml = new DOMParser().parseFromString(sectionHtml, "text/html");

      // Scope to parent container to avoid .js-contents collision
      const sourceParent = parsedHtml.getElementById(section.id);
      const sourceContent = sourceParent
        ? sourceParent.querySelector(selector) || sourceParent
        : parsedHtml.querySelector(selector);

      if (sourceContent) {
        targetEl.innerHTML = sourceContent.innerHTML;
      }
    });

    // On cart page, toggle gift message visibility after re-render
    if (this.isCartPage) {
      const giftMessage = document.getElementById("cart-gift-message");
      const checkbox = document.getElementById("gift-wrapping-check");
      if (giftMessage && checkbox) {
        giftMessage.classList.toggle("hidden", !checkbox.checked);
      }
    }
  }
  setGiftWrap() {
    const overlayElement = document.querySelector(".cart_action_drawer_overlay");
    if (overlayElement) overlayElement.classList.add("active");

    // Cart page: show loading state on gift options card
    const giftOptionsCard = this.isCartPage ? this.closest(".cart-gift-options") : null;
    if (giftOptionsCard) giftOptionsCard.classList.add("cart-gift-options--loading");

    const sectionsToRender = this.getSectionsToRender();
    const uniqueSections = [...new Set(sectionsToRender.map((s) => s.section || s.id))];
    const body = JSON.stringify({
      updates: {
        [this.giftWrapProductId]: 1,
      },
      attributes: {
        "gift-wrapping": true,
      },
      sections: uniqueSections,
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        let parsedState = JSON.parse(state);
        this.renderContents(parsedState);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        if (overlayElement) overlayElement.classList.remove("active");
        if (giftOptionsCard) giftOptionsCard.classList.remove("cart-gift-options--loading");
      });
  }

  removeGiftWrap() {
    const overlayElement = document.querySelector(".cart_action_drawer_overlay");
    if (overlayElement) overlayElement.classList.add("active");

    // Cart page: show loading state on gift options card
    const giftOptionsCard = this.isCartPage ? this.closest(".cart-gift-options") : null;
    if (giftOptionsCard) giftOptionsCard.classList.add("cart-gift-options--loading");

    const sectionsToRender = this.getSectionsToRender();
    const uniqueSections = [...new Set(sectionsToRender.map((s) => s.section || s.id))];
    const body = JSON.stringify({
      updates: {
        [this.giftWrapProductId]: 0,
      },
      attributes: {
        "gift-wrapping": "",
        "gift_note": "",
      },
      sections: uniqueSections,
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        let parsedState = JSON.parse(state);
        this.renderContents(parsedState);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        if (overlayElement) overlayElement.classList.remove("active");
        if (giftOptionsCard) giftOptionsCard.classList.remove("cart-gift-options--loading");
      });
  }

  getSectionsToRender() {
    if (this.isCartPage) {
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
          id: "hooktheme-cart-footer",
          section: sectionId,
          selector: ".js-contents",
        },
      ];
    }

    return [
      {
        id: "mini-cart-drawer",
      },
      {
        id: "cart-notification-count",
      },
      {
        id: "gift-wrapping",
      },
    ];
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }
}
customElements.define("add-gift-wrap", AddGiftWrap);
}
