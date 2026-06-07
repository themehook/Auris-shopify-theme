theme.announcement = (function () {
  function announcementModule(e) {
      let sliderWrapper = e.querySelector(".announcement--slider-init"),
      slideLoop = e.dataset.slideLoop,
      slideAutoplay = e.dataset.slideAutoplay,
      autoplayDuration = e.dataset.autoplayDuration,
      slideLoopValue = true,
      autoplay = false,
      slideNavPrev = e.querySelector(".swiper-button-prev"),
      slideNavNext = e.querySelector(".swiper-button-next"),
      sliderPagination = e.querySelector(".swiper-pagination");

    
    if (slideLoop == "false") {
      slideLoopValue = false;
    }
    if (slideAutoplay == "true") {
      let sliderDuration = parseInt(autoplayDuration);
      autoplay = { delay: autoplayDuration, disableOnInteraction: false };
    }
        
    var swiper = new Swiper(sliderWrapper, {
      slidesPerView: 1,
      autoplay: autoplay,
      loop: slideLoopValue,
      clickable: true,
      speed: 1000,
      spaceBetween: 20,
      pagination: {
        el: sliderPagination,
        clickable: true,
      },
      navigation: {
        nextEl: slideNavNext,
        prevEl: slideNavPrev,
      }
    });
  }
  return announcementModule;
})();

class announmentBar extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onRemoveAnnouncement);
  }
  onRemoveAnnouncement(event) {
    let evtTargetElement = event.target;
    if (evtTargetElement.classList.contains("announcement--timer-close-btn")) {
      evtTargetElement.closest(".announcement-bar").remove();
    }
  }
}
customElements.define("announcement-bar", announmentBar);
