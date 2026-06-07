if (!customElements.get("rotating-text")) {
  customElements.define(
    "rotating-text",
    class SpinningText extends HTMLElement {
      constructor() {
        super();
        this.init();
      }

      get string() {
        return this.dataset.string.trim().replace(/\s+/g, "");
      }

      init() {
        const Config = {
          rotateText: this.string,
          wordCount: 2,
          spacing: 2,
        };

        const HEADING = document.createElement("div");
        HEADING.classList.add("single-character");

        [...Config.rotateText].forEach((char, index) => {
          const span = document.createElement("span");
          span.setAttribute("aria-hidden", "true");
          span.classList.add("single-char");
          span.style.setProperty("--char-index", index);
          span.textContent = char;
          HEADING.appendChild(span);
        });

        const visuallyHiddenSpan = document.createElement("span");
        visuallyHiddenSpan.classList.add("visually-hidden");
        visuallyHiddenSpan.textContent = Config.rotateText;
        HEADING.appendChild(visuallyHiddenSpan);

        this.style.setProperty("--char-count", Config.rotateText.length);
        this.style.setProperty("--font-size", Config.wordCount);
        this.style.setProperty("--character-width", Config.spacing);

        const canTrig = CSS.supports("(top: calc(sin(1) * 1px))");
        const innerAngle = 360 / Config.rotateText.length;
        const radius = canTrig
          ? "calc((var(--character-width) / sin(var(--inner-angle))) * -1ch)"
          : `calc((${Config.spacing} / ${Math.sin(
              innerAngle * (Math.PI / 180)
            )}) * -1ch)`;
        this.style.setProperty("--radius", radius);

        this.appendChild(HEADING);
      }
    }
  );
}
