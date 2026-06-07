/**
 * Product Card Swatches
 *
 * Swatch styles are rendered via Liquid using:
 * - Native swatches: value.swatch.color / value.swatch.image
 * - Custom swatches: value.variant.featured_image
 *
 * This JS only handles click interactions to update product card content.
 */

if (!customElements.get("product-card-swatches")) {
  customElements.define("product-card-swatches", class extends HTMLElement {});
}

if (!customElements.get("product-card-swatch")) {
  customElements.define(
    "product-card-swatch",
    class extends HTMLElement {
      constructor() {
        super();
        this.addEventListener("click", this.onClick.bind(this));
      }

      onClick() {
        const { variantId, productHandle } = this.dataset;
        if (!variantId || !productHandle) return;

        // Fetch variant data and update card
        fetch(`/products/${productHandle}?variant=${variantId}&view=colorswatch`)
          .then((res) => res.text())
          .then((text) => {
            const html = new DOMParser().parseFromString(text, "text/html");
            this.updateCard(html);
          })
          .catch(console.error);

        // Update active state
        this.closest(".product--color-swatch-wrapper")
          ?.querySelectorAll(".product--color-swatch")
          .forEach((el) => el.classList.remove("checked-color"));
        this.classList.add("checked-color");
      }

      updateCard(html) {
        const card = this.closest(".product__card");
        if (!card) return;

        // Update thumbnail
        const imgDest = card.querySelector(".media")?.firstChild;
        const imgSrc = html.querySelector(".media")?.firstChild;
        if (imgSrc && imgDest) {
          imgDest.src = imgSrc.src;
          imgDest.srcset = imgSrc.srcset;
        }

        // Update link
        const linkDest = card.querySelector(".product__card--link");
        const linkSrc = html.querySelector(".product__card--link")?.getAttribute("href");
        if (linkDest && linkSrc) linkDest.setAttribute("href", linkSrc);

        // Update title
        const titleDest = card.querySelector(".product-grid-item__title");
        const titleSrc = html.querySelector(".product-grid-item__title");
        if (titleSrc && titleDest) titleDest.innerHTML = titleSrc.innerHTML;

        // Update price
        const priceDest = card.querySelector(".price");
        const priceSrc = html.querySelector(".price");
        if (priceSrc && priceDest) priceDest.innerHTML = priceSrc.innerHTML;
      }
    }
  );
}
