/**
 * Reservation Form - Interactive functionality
 * Handles date picker, time selection, and guest counter
 */

class ReservationForm {
  constructor(container) {
    this.container = container;
    this.form = container.querySelector('.reservation-form');

    if (!this.form) return;

    this.initGuestCounter();
    this.initTimeSelection();
    this.initDateField();
  }

  /**
   * Initialize guest counter (+/- buttons)
   */
  initGuestCounter() {
    const guestsWrapper = this.container.querySelector('.reservation-form__guests-wrapper');
    if (!guestsWrapper) return;

    const minusBtn = guestsWrapper.querySelector('.reservation-guests__btn--minus');
    const plusBtn = guestsWrapper.querySelector('.reservation-guests__btn--plus');
    const input = guestsWrapper.querySelector('.reservation-form__guests-input');

    if (!minusBtn || !plusBtn || !input) return;

    const min = parseInt(input.getAttribute('min')) || 1;
    const max = parseInt(input.getAttribute('max')) || 20;

    minusBtn.addEventListener('click', () => {
      let value = parseInt(input.value) || min;
      if (value > min) {
        input.value = value - 1;
        this.triggerInputEvent(input);
      }
    });

    plusBtn.addEventListener('click', () => {
      let value = parseInt(input.value) || min;
      if (value < max) {
        input.value = value + 1;
        this.triggerInputEvent(input);
      }
    });
  }

  /**
   * Initialize time slot selection
   */
  initTimeSelection() {
    const timeButtons = this.container.querySelectorAll('.reservation-time__btn');
    const hiddenInput = this.container.querySelector('.reservation-time__hidden-input');

    if (!timeButtons.length || !hiddenInput) return;

    timeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        timeButtons.forEach(b => b.classList.remove('active'));

        // Add active class to clicked button
        btn.classList.add('active');

        // Update hidden input value
        hiddenInput.value = btn.dataset.time;
        this.triggerInputEvent(hiddenInput);
      });
    });
  }

  /**
   * Initialize date field with native date picker
   */
  initDateField() {
    const dateInput = this.container.querySelector('.reservation-form__date-input');
    if (!dateInput) return;

    // Set minimum date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.setAttribute('min', `${yyyy}-${mm}-${dd}`);

    // Format date display on change
    dateInput.addEventListener('change', () => {
      if (dateInput.value) {
        // The native date input handles the calendar display
        // Value is automatically set in YYYY-MM-DD format
        this.triggerInputEvent(dateInput);
      }
    });
  }

  /**
   * Trigger input event for form validation
   */
  triggerInputEvent(input) {
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
  }
}

/**
 * Initialize all reservation forms on the page
 */
function initReservationForms() {
  const sections = document.querySelectorAll('.reservation-form-section');
  sections.forEach(section => {
    if (!section.dataset.reservationInitialized) {
      section.dataset.reservationInitialized = 'true';
      new ReservationForm(section);
    }
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReservationForms);
} else {
  initReservationForms();
}

// Also initialize on load for dynamically loaded content
window.addEventListener('load', initReservationForms);
