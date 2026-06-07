if (!customElements.get("video-reels-slider")) {
  customElements.define(
    "video-reels-slider",
    class VideoReelsSlider extends HTMLElement {
      constructor() {
        super();
        this.videos = new Map();
        this.currentVideo = null;
        this.isAutoplay = this.hasAttribute("autoplay");
        this.isVisible = false;
        this.initialized = false;

        // Bind methods
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleIntersection = this.handleIntersection.bind(this);
        this.handleSlideChange = this.handleSlideChange.bind(this);

        // Create intersection observer
        this.observer = new IntersectionObserver(this.handleIntersection, {
          threshold: 0.5,
        });
      }

      connectedCallback() {
        this.setupEventListeners();
        this.initializeComponent();
        this.observer.observe(this);
      }

      disconnectedCallback() {
        this.cleanup();
      }

      initializeComponent() {
        this.initializeSwiper();
        this.initializeVideos();

        if (this.isAutoplay && !this.initialized) {
          this.initialized = true;
          requestAnimationFrame(() => {
            this.playVideoInActiveSlide();
          });
        }
      }

      initializeSwiper() {
        const swiperOptions = {
          slidesPerView: "auto",
          centeredSlides: true,
          spaceBetween: 20,
          loop: true,
          speed: 600,
          watchSlidesProgress: true,
          slideToClickedSlide: true,
          roundLengths: true,
          navigation: {
            nextEl: ".video-reels__nav-button--next",
            prevEl: ".video-reels__nav-button--prev",
          },
          pagination: {
            el: ".video-reels__pagination",
            clickable: true,
            type: "bullets",
          },
          breakpoints: {
            320: {
              slidesPerView: 1.2,
              spaceBetween: 10,
            },
            480: {
              slidesPerView: 1.5,
              spaceBetween: 15,
            },
            768: {
              slidesPerView: 3.5,
              spaceBetween: 20,
            },
            992: {
              slidesPerView: 4.2,
              spaceBetween: 30,
            },
            1500: {
              slidesPerView: 5.5,
              spaceBetween: 30,
            },
          },
          on: {
            init: () => {
              if (this.isAutoplay) {
                this.playVideoInActiveSlide();
              }
            },
            slideChange: this.handleSlideChange,
            touchStart: () => {
              this.isUserInteracting = true;
            },
            touchEnd: () => {
              this.isUserInteracting = false;
            },
            beforeTransitionStart: () => {
              this.updateSlides();
            },
            afterTransitionStart: () => {
              this.updateSlides();
            },
            afterTransitionEnd: () => {
              this.updateSlides();
            },
          },
        };

        this.swiper = new Swiper(
          this.querySelector(".video-reels__container"),
          swiperOptions
        );
      }

      initializeVideos() {
        const videoSlides = this.querySelectorAll(".swiper-slide");

        videoSlides.forEach((slide) => {
          const video = slide.querySelector("video");
          if (!video) return;

          // Store video state
          this.videos.set(video, {
            currentTime: 0,
            isPlaying: false,
            isMuted: true,
            container: slide,
          });

          // Basic video setup
          video.playsInline = true;
          video.muted = true;
          video.loop = true;
          video.preload = "metadata";
          video.setAttribute("playsinline", "");
          video.setAttribute("webkit-playsinline", "");

          this.setupVideoControls(video, slide);
        });
      }

      setupVideoControls(video, container) {
        const playBtn = container.querySelector(".video-reels__play-btn");
        const muteBtn = container.querySelector(".video-reels__mute-btn");
        const progress = container.querySelector(".video-reels__progress");

        if (playBtn) {
          playBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!container.classList.contains("swiper-slide-active")) return;

            if (video.paused) {
              this.playVideo(video, container);
            } else {
              this.pauseVideo(video, container);
            }
          });
        }

        if (muteBtn) {
          muteBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!container.classList.contains("swiper-slide-active")) return;

            video.muted = !video.muted;
            muteBtn.setAttribute(
              "data-state",
              video.muted ? "muted" : "unmuted"
            );

            const videoState = this.videos.get(video);
            if (videoState) {
              videoState.isMuted = video.muted;
            }
          });
        }

        if (progress) {
          video.addEventListener("timeupdate", () => {
            if (container.classList.contains("swiper-slide-active")) {
              const percent = (video.currentTime / video.duration) * 100;
              progress.style.width = `${percent}%`;
            }
          });
        }

        video.addEventListener("pause", () => {
          const videoState = this.videos.get(video);
          if (videoState) {
            videoState.currentTime = video.currentTime;
            videoState.isPlaying = false;
          }
        });

        video.addEventListener("ended", () => {
          if (video.loop) {
            video.currentTime = 0;
            video.play().catch(() => { });
          }
        });
      }

      async playVideo(video, container) {
        if (!video || !container) return;

        try {
          const videoState = this.videos.get(video);
          if (videoState) {
            video.currentTime = videoState.currentTime;
            await video.play();
            videoState.isPlaying = true;
          }

          const playBtn = container.querySelector(".video-reels__play-btn");
          if (playBtn) {
            playBtn.setAttribute("data-state", "playing");
          }

          this.currentVideo = video;
        } catch (error) {
          console.warn("Video playback failed:", error);
        }
      }

      pauseVideo(video, container) {
        if (!video || !container) return;

        const videoState = this.videos.get(video);
        if (videoState) {
          videoState.currentTime = video.currentTime;
          videoState.isPlaying = false;
        }

        video.pause();

        const playBtn = container.querySelector(".video-reels__play-btn");
        if (playBtn) {
          playBtn.setAttribute("data-state", "paused");
        }

        if (this.currentVideo === video) {
          this.currentVideo = null;
        }
      }

      pauseAllVideos() {
        this.videos.forEach((state, video) => {
          this.pauseVideo(video, state.container);
        });
      }

      async playVideoInActiveSlide() {
        if (!this.swiper || !this.isVisible) return;

        const activeSlide = this.swiper.slides[this.swiper.activeIndex];
        if (!activeSlide) return;

        const video = activeSlide.querySelector("video");
        if (!video) return;

        this.pauseAllVideos();

        try {
          await this.playVideo(video, activeSlide);
        } catch (error) {
          console.warn("Failed to play video in active slide:", error);
        }
      }

      handleSlideChange() {
        requestAnimationFrame(() => {
          this.updateSlides();
          this.playVideoInActiveSlide();
        });
      }

      updateSlides() {
        if (!this.swiper?.slides) return;

        const slides = this.swiper.slides;

        slides.forEach((slide) => {
          const isActive = slide.classList.contains("swiper-slide-active");

          // Update opacity
          slide.style.opacity = isActive ? "1" : "0.7";

          // Update z-index
          slide.style.zIndex = isActive ? "2" : "1";

          // Show/hide controls
          const controls = slide.querySelector(
            ".video-reels__controls-overlay"
          );
          if (controls) {
            controls.style.display = isActive ? "block" : "none";
          }

          // Show/hide product overlay
          const productOverlay = slide.querySelector(
            ".video-reels__product-overlay"
          );
          if (productOverlay) {
            productOverlay.style.transform = isActive
              ? "translateY(0)"
              : "translateY(100%)";
          }
        });
      }

      handleIntersection(entries) {
        const [entry] = entries;
        this.isVisible = entry.isIntersecting;

        if (this.isVisible) {
          if (this.isAutoplay) {
            this.playVideoInActiveSlide();
          }
        } else {
          this.pauseAllVideos();
        }
      }

      handleVisibilityChange() {
        if (document.hidden) {
          this.pauseAllVideos();
        } else if (this.isVisible && this.isAutoplay) {
          this.playVideoInActiveSlide();
        }
      }

      setupEventListeners() {
        document.addEventListener(
          "visibilitychange",
          this.handleVisibilityChange
        );

        if (window.Shopify?.designMode) {
          document.addEventListener("shopify:section:load", (event) => {
            if (event.target.contains(this)) {
              this.initializeComponent();
            }
          });

          document.addEventListener("shopify:section:unload", (event) => {
            if (event.target.contains(this)) {
              this.cleanup();
            }
          });

          document.addEventListener("shopify:block:select", (event) => {
            if (!this.contains(event.target)) return;

            const slide = event.target.closest(".swiper-slide");
            if (slide) {
              const index = Array.from(this.swiper.slides).indexOf(slide);
              if (index !== -1) {
                this.swiper.slideTo(index);
              }
            }
          });
        }
      }

      cleanup() {
        this.observer.disconnect();
        document.removeEventListener(
          "visibilitychange",
          this.handleVisibilityChange
        );
        this.pauseAllVideos();

        if (this.swiper) {
          this.swiper.destroy();
        }
      }
    }
  );
}
