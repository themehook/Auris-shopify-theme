if (!customElements.get("cart-discount")) {
  customElements.define(
    "cart-discount",
    class CartDiscount extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector(".cart-discount__form");
        this.input = this.querySelector(".cart-discount__input");
        this.applyButton = this.querySelector(".cart-discount__button");
        this.removeButtons = this.querySelectorAll(".cart-discount__remove-btn");

        // Detect context: cart page vs cart drawer
        this.isCartPage = !!document.getElementById("hooktheme-cart-items");

        // AbortController for race condition prevention
        this.activeFetch = null;

        // Error state preserved across innerHTML replacements
        this.errorState = {
          isVisible: false,
          errorType: null,
        };

        // Store bound handlers to allow removal (prevent duplicate listeners)
        this._boundHandleApply = this.handleApplyDiscount.bind(this);
        this._boundHandleRemove = this.handleRemoveDiscount.bind(this);

        this.setupEventListeners();
      }

      setupEventListeners() {
        if (this.form) {
          this.form.removeEventListener("submit", this._boundHandleApply);
          this.form.addEventListener("submit", this._boundHandleApply);
        }

        this.removeButtons = this.querySelectorAll(".cart-discount__remove-btn");
        this.removeButtons.forEach((button) => {
          button.addEventListener("click", this._boundHandleRemove);
        });
      }

      createAbortController() {
        if (this.activeFetch) {
          this.activeFetch.abort();
        }
        const abortController = new AbortController();
        this.activeFetch = abortController;
        return abortController;
      }

      handleApplyDiscount(evt) {
        evt.preventDefault();

        const discountCode = this.input.value.trim();
        if (!discountCode) {
          this.showError("general");
          return;
        }

        // Check for duplicate
        const existingDiscounts = this.getExistingDiscounts();
        if (existingDiscounts.includes(discountCode)) {
          this.showError("duplicate");
          return;
        }

        this.setLoadingState(true);
        this.clearAllErrors();

        const abortController = this.createAbortController();

        this.updateCart(
          {
            discount: [...existingDiscounts, discountCode].join(","),
          },
          abortController.signal
        )
          .then((parsedState) => {
            // Check if discount code is invalid
            if (this.validateDiscountCode(parsedState, discountCode)) {
              if (this.input) this.input.value = "";
              this.showError("discount-code");
              return;
            }

            // Check for shipping discount errors
            if (
              this.validateShippingDiscount(
                parsedState,
                discountCode,
                existingDiscounts
              )
            ) {
              if (this.input) this.input.value = "";
              this.showError("shipping");
              return;
            }

            // Check if discount was actually applied
            const newDiscountCodes =
              this.getDiscountCodesFromResponse(parsedState);
            if (!newDiscountCodes.includes(discountCode)) {
              if (this.input) this.input.value = "";
              this.showError("discount-code");
              return;
            }

            if (this.input) this.input.value = "";
            this.clearAllErrors();
          })
          .catch((error) => {
            if (error.name === "AbortError") return;

            if (
              error.message &&
              error.message.includes("Invalid discount code")
            ) {
              this.showError("discount-code");
            } else if (error.message && error.message.includes("Network")) {
              this.showError("network");
            } else {
              this.showError("general");
            }
          })
          .finally(() => {
            this.setLoadingState(false);
            this.activeFetch = null;
          });
      }

      handleRemoveDiscount(evt) {
        evt.preventDefault();

        const button = evt.target.closest(".cart-discount__remove-btn");
        if (!button) return;

        const discountCode = button.dataset.discountCode;
        if (!discountCode) return;

        this.setRemoveButtonLoadingState(button, true);
        this.clearAllErrors();

        const existingDiscounts = this.getExistingDiscounts();
        const index = existingDiscounts.indexOf(discountCode);
        if (index === -1) {
          this.setRemoveButtonLoadingState(button, false);
          return;
        }

        existingDiscounts.splice(index, 1);

        const abortController = this.createAbortController();

        this.updateCart(
          {
            discount: existingDiscounts.join(","),
          },
          abortController.signal
        )
          .catch((error) => {
            if (error.name !== "AbortError") {
              this.showError("network");
            }
          })
          .finally(() => {
            this.setRemoveButtonLoadingState(button, false);
            this.activeFetch = null;
          });
      }

      showError(type) {
        this.clearAllErrors();
        this.errorState = { isVisible: true, errorType: type };

        // Add error class to parent section element (survives innerHTML replacement)
        this.addErrorClassToParent(type);

        // Also directly show the matching error element for immediate feedback
        const liveElement = this.getLiveElement();
        if (liveElement) {
          const errorContainer = liveElement.querySelector(
            ".cart-discount__error-container"
          );
          if (errorContainer) errorContainer.removeAttribute("hidden");
          const errorEl = liveElement.querySelector(
            `.cart-discount__error--${type}`
          );
          if (errorEl) errorEl.style.display = "block";
        }
      }

      clearAllErrors() {
        this.errorState = { isVisible: false, errorType: null };
        this.clearErrorClassesFromParent();

        // Also directly hide all error elements
        const liveElement = this.getLiveElement();
        if (liveElement) {
          liveElement
            .querySelectorAll(".cart-discount__error")
            .forEach((el) => {
              el.style.display = "";
            });
        }
      }

      // Get the live <cart-discount> element in the DOM
      // (may differ from `this` after drawer innerHTML replacement)
      getLiveElement() {
        if (this.isConnected) return this;
        // Fallback: find the element in the DOM by context
        const parent = this.isCartPage
          ? document.getElementById("hooktheme-cart-footer")
          : document.getElementById("cart-notification");
        return parent ? parent.querySelector("cart-discount") : null;
      }

      validateDiscountCode(parsedState, discountCode) {
        if (
          !parsedState.discount_codes ||
          !Array.isArray(parsedState.discount_codes)
        ) {
          return false;
        }

        const discountInfo = parsedState.discount_codes.find(
          (discount) => discount.code === discountCode
        );

        return discountInfo && discountInfo.applicable === false;
      }

      validateShippingDiscount(
        parsedState,
        discountCode,
        existingDiscounts
      ) {
        const sectionId = this.getErrorCheckSectionId();
        const newHtml =
          parsedState.sections && parsedState.sections[sectionId];

        if (!newHtml) return false;

        try {
          const parsedHtml = new DOMParser().parseFromString(
            newHtml,
            "text/html"
          );
          const discountPills = parsedHtml.querySelectorAll(
            ".cart-discount__pill"
          );

          const uiDiscountCodes = Array.from(discountPills)
            .map((pill) => pill.dataset.discountCode)
            .filter(Boolean);

          const discountInfo = parsedState.discount_codes?.find(
            (discount) =>
              discount.code === discountCode && discount.applicable === true
          );

          return (
            discountInfo &&
            uiDiscountCodes.length === existingDiscounts.length &&
            uiDiscountCodes.every((code) => existingDiscounts.includes(code))
          );
        } catch (error) {
          return false;
        }
      }

      getErrorCheckSectionId() {
        if (this.isCartPage) {
          return document.getElementById("hooktheme-cart-items")?.dataset.id || "hooktheme-cart-items";
        }
        return "mini-cart-drawer";
      }

      updateCart(params, signal) {
        return new Promise((resolve, reject) => {
          const sectionsToRender = this.getSectionsToRender();
          const uniqueSections = [...new Set(sectionsToRender.map((s) => s.section))];
          const body = JSON.stringify({
            ...params,
            sections: uniqueSections,
            sections_url: window.location.pathname,
          });

          const overlayElement = document.querySelector(
            ".cart_action_drawer_overlay"
          );
          if (overlayElement) {
            overlayElement.classList.add("active");
          }

          fetch(`${routes.cart_update_url}`, {
            ...fetchConfig(),
            body,
            signal,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Network error: ${response.status}`);
              }
              return response.text();
            })
            .then((state) => {
              const parsedState = JSON.parse(state);

              if (parsedState.errors) {
                reject(new Error("Invalid discount code"));
                return;
              }

              if (parsedState.status && parsedState.status !== 200) {
                reject(new Error("Invalid discount code"));
                return;
              }

              // Render updated cart sections
              this.renderContents(parsedState);
              resolve(parsedState);
            })
            .catch((error) => {
              if (error.name === "AbortError") {
                reject(error);
              } else {
                reject(new Error(`Network error: ${error.message}`));
              }
            })
            .finally(() => {
              if (overlayElement) {
                overlayElement.classList.remove("active");
              }
            });
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
        } else {
          return [
            {
              id: "mini-cart-drawer",
              section: "mini-cart-drawer",
              selector: ".shopify-section",
            },
            {
              id: "cart-notification-count",
              section: "cart-notification-count",
              selector: ".shopify-section",
            },
          ];
        }
      }

      renderContents(parsedState) {
        // Store current error state before innerHTML replacement
        const currentErrorState = { ...this.errorState };

        if (this.isCartPage) {
          this.renderCartPage(parsedState);
        } else {
          this.renderCartDrawer(parsedState);
        }

        // Re-query elements after DOM update
        this.form = this.querySelector(".cart-discount__form");
        this.input = this.querySelector(".cart-discount__input");
        this.applyButton = this.querySelector(".cart-discount__button");
        this.removeButtons = this.querySelectorAll(
          ".cart-discount__remove-btn"
        );

        // Re-apply error state after HTML update
        if (currentErrorState.isVisible && currentErrorState.errorType) {
          this.errorState = currentErrorState;
          this.addErrorClassToParent(currentErrorState.errorType);
        }

        // Re-setup event listeners after content update
        this.setupEventListeners();
      }

      renderCartPage(parsedState) {
        this.getSectionsToRender().forEach((section) => {
          if (!parsedState.sections[section.section]) return;

          const elementToReplace =
            document
              .getElementById(section.id)
              ?.querySelector(section.selector) ||
            document.getElementById(section.id);

          if (!elementToReplace) return;

          const parsedHtml = new DOMParser().parseFromString(
            parsedState.sections[section.section],
            "text/html"
          );

          // Scope to parent container to avoid .js-contents collision
          const sourceParent = parsedHtml.getElementById(section.id);
          const sourceContent = sourceParent
            ? sourceParent.querySelector(section.selector) || sourceParent
            : parsedHtml.querySelector(section.selector);

          if (sourceContent) {
            elementToReplace.innerHTML = sourceContent.innerHTML;
          }
        });

        // Update <cart-discount> content from the section response
        // (the element lives outside .js-contents, so update it manually)
        const sectionId =
          document.getElementById("hooktheme-cart-items")?.dataset.id;
        if (sectionId && parsedState.sections[sectionId]) {
          try {
            const parsedHtml = new DOMParser().parseFromString(
              parsedState.sections[sectionId],
              "text/html"
            );
            const newCartDiscount = parsedHtml.querySelector("cart-discount");
            if (newCartDiscount) {
              this.innerHTML = newCartDiscount.innerHTML;
            }
          } catch (e) {
            // Silently fail - the .js-contents update still worked
          }
        }

        // Update empty state
        const cartFooter = document.getElementById("hooktheme-cart-footer");
        if (cartFooter) {
          cartFooter.classList.toggle(
            "is-empty",
            parsedState.item_count === 0
          );
        }

        const cartItems = document.querySelector("cart-items");
        if (cartItems) {
          cartItems.classList.toggle(
            "is-empty",
            parsedState.item_count === 0
          );
        }
      }

      renderCartDrawer(parsedState) {
        // Update mini-cart-drawer
        const drawerElement = document.getElementById("mini-cart-drawer");
        if (drawerElement && parsedState.sections["mini-cart-drawer"]) {
          drawerElement.innerHTML = this.getSectionInnerHTML(
            parsedState.sections["mini-cart-drawer"]
          );
        }

        // Update cart-notification-count (desktop)
        const countElement = document.getElementById(
          "cart-notification-count"
        );
        if (countElement && parsedState.sections["cart-notification-count"]) {
          countElement.innerHTML = this.getSectionInnerHTML(
            parsedState.sections["cart-notification-count"]
          );
        }

        // Update cart-notification-count-mobile
        const mobileCountElement = document.getElementById(
          "cart-notification-count-mobile"
        );
        if (
          mobileCountElement &&
          parsedState.sections["cart-notification-count"]
        ) {
          mobileCountElement.innerHTML = this.getSectionInnerHTML(
            parsedState.sections["cart-notification-count"]
          );
        }

        // Do NOT call CartNotification.open() - drawer is already open
      }

      addErrorClassToParent(type) {
        const parentEl = this.isCartPage
          ? document.getElementById("hooktheme-cart-footer")
          : document.getElementById("cart-notification");

        if (parentEl) {
          this.clearErrorClassesFromParent();
          parentEl.classList.add(`cart-discount-error--${type}`);
        }
      }

      clearErrorClassesFromParent() {
        const parentEl = this.isCartPage
          ? document.getElementById("hooktheme-cart-footer")
          : document.getElementById("cart-notification");

        if (parentEl) {
          [
            "cart-discount-error--general",
            "cart-discount-error--discount-code",
            "cart-discount-error--shipping",
            "cart-discount-error--network",
            "cart-discount-error--duplicate",
          ].forEach((cls) => parentEl.classList.remove(cls));
        }
      }

      getSectionInnerHTML(html, selector = ".shopify-section") {
        return new DOMParser()
          .parseFromString(html, "text/html")
          .querySelector(selector).innerHTML;
      }

      getExistingDiscounts() {
        const liveElement = this.getLiveElement() || this;
        const discountCodes = [];
        liveElement.querySelectorAll(".cart-discount__pill").forEach((pill) => {
          if (pill.dataset.discountCode) {
            discountCodes.push(pill.dataset.discountCode);
          }
        });
        return discountCodes;
      }

      getDiscountCodesFromResponse(parsedState) {
        const discountCodes = [];
        const sectionId = this.getErrorCheckSectionId();
        const newHtml =
          parsedState.sections && parsedState.sections[sectionId];

        if (newHtml) {
          try {
            const parsedHtml = new DOMParser().parseFromString(
              newHtml,
              "text/html"
            );
            parsedHtml
              .querySelectorAll(".cart-discount__pill")
              .forEach((pill) => {
                if (pill.dataset.discountCode) {
                  discountCodes.push(pill.dataset.discountCode);
                }
              });
          } catch (error) {
            console.error("Error parsing discount codes:", error);
          }
        }

        return discountCodes;
      }

      setLoadingState(isLoading) {
        if (this.applyButton) {
          this.applyButton.disabled = isLoading;
          this.applyButton.textContent = isLoading
            ? this.applyButton.dataset.loadingText ||
              this.applyButton.textContent
            : this.applyButton.dataset.defaultText ||
              this.applyButton.textContent;
        }
        if (this.input) {
          this.input.disabled = isLoading;
        }
      }

      setRemoveButtonLoadingState(button, isLoading) {
        if (button) {
          button.disabled = isLoading;
        }
      }
    }
  );
}
