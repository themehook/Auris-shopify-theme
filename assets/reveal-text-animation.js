customElements.get("text-animation") ||
  customElements.define(
    "text-animation",
    class extends HTMLElement {
      constructor() {
        super();
        this.scrollHandler = null;
        this.resizeHandler = null;
        this.setupComponent();
      }

      setupComponent() {
        this.contentWrapper = this.querySelector(".reveal__heading--title");

        if (!this.contentWrapper) {
          console.warn("[text-animation] .reveal__heading--title not found.");
          return;
        }

        this.settings = {
          triggerPoint: 0.7,
          fadeMin: 0.1,
          debounceDelay: 10,
        };

        this.originalNodes = Array.from(this.contentWrapper.childNodes);

        this.buildAnimatedStructure();
        this.attachScrollListeners();
        this.updateAnimationState();
      }

      buildAnimatedStructure() {
        this.contentWrapper.innerHTML = "";
        this.contentWrapper.classList.add("reveal-text-trigger");

        this.originalNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            this.createAnimatedText(node.textContent.trim());
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            this.processElementNode(node);
          }
        });
      }

      processElementNode(element) {
        const tagName = element.tagName.toLowerCase();

        if (tagName === "p" || tagName === "div") {
          const text = this.extractTextWithFormatting(element);
          if (text.trim()) {
            this.createAnimatedText(text.trim());
          }
        } else {
          this.contentWrapper.appendChild(element.cloneNode(true));
        }
      }

      extractTextWithFormatting(element) {
        let text = "";
        element.childNodes.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            text += child.textContent;
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            text += child.textContent;
          }
        });
        return text;
      }

      createAnimatedText(textContent) {
        const wordArray = textContent
          .split(/\s+/)
          .filter((word) => word.length > 0);

        wordArray.forEach((word, wordIndex) => {
          const wordElement = document.createElement("div");
          wordElement.className = "reveal-word";

          const characters = word.split("");
          characters.forEach((character) => {
            const charElement = document.createElement("span");
            charElement.className = "scroll-char";
            charElement.textContent = character;
            wordElement.appendChild(charElement);
          });

          this.contentWrapper.appendChild(wordElement);

          if (wordIndex < wordArray.length - 1) {
            const spaceElement = document.createElement("span");
            spaceElement.className = "word-space";
            spaceElement.innerHTML = "&nbsp;";
            this.contentWrapper.appendChild(spaceElement);
          }
        });
      }

      attachScrollListeners() {
        let timeoutId = null;

        const debouncedUpdate = () => {
          if (timeoutId) return;

          timeoutId = setTimeout(() => {
            requestAnimationFrame(() => {
              this.updateAnimationState();
              timeoutId = null;
            });
          }, this.settings.debounceDelay);
        };

        this.scrollHandler = debouncedUpdate;
        this.resizeHandler = debouncedUpdate;

        window.addEventListener("scroll", this.scrollHandler, {
          passive: true,
        });
        window.addEventListener("resize", this.resizeHandler, {
          passive: true,
        });
      }

      updateAnimationState() {
        const viewportHeight = window.innerHeight;
        const triggerOffset = viewportHeight * this.settings.triggerPoint;

        const animatedChars =
          this.contentWrapper.querySelectorAll(".scroll-char");

        animatedChars.forEach((char) => {
          this.applyCharacterAnimation(char, triggerOffset);
        });
      }

      applyCharacterAnimation(element, triggerOffset) {
        const bounds = element.getBoundingClientRect();
        const distanceFromTrigger = bounds.top - triggerOffset;

        const horizontalFactor = bounds.left * 0.001;
        const verticalFactor = distanceFromTrigger * 0.01;
        const combinedFactor = verticalFactor + horizontalFactor;

        const opacity = Math.max(
          this.settings.fadeMin,
          Math.min(1, 1 - combinedFactor)
        );

        const translationFactor =
          distanceFromTrigger * 0.1 + bounds.left * 0.01;
        const translateY = Math.min(10, Math.max(translationFactor, 0));

        element.style.opacity = opacity.toFixed(4);
        element.style.transform = `translateY(${translateY.toFixed(4)}px)`;
      }

      disconnectedCallback() {
        if (this.scrollHandler) {
          window.removeEventListener("scroll", this.scrollHandler);
        }
        if (this.resizeHandler) {
          window.removeEventListener("resize", this.resizeHandler);
        }
      }
    }
  );
