class ImageLightbox extends HTMLElement {
  constructor() {
    super();
    this.currentImages = [];
    this.currentIndex = 0;
    this.handleImageClick = this.handleImageClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  render() {
    this.id = 'lightbox';
    this.style.display = 'none';
    this.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" aria-label="Close lightbox">&times;</button>
        <img id="lightbox-img" src="" alt="" />
        <div class="lightbox-controls">
          <button class="lightbox-prev" aria-label="Previous image">←</button>
          <button class="lightbox-next" aria-label="Next image">→</button>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Delegate clicks on images with data-lightbox attribute
    document.addEventListener('click', this.handleImageClick);

    // Lightbox controls
    this.querySelector('.lightbox-close').addEventListener('click', () => this.close());
    this.querySelector('.lightbox-prev').addEventListener('click', () => this.prev());
    this.querySelector('.lightbox-next').addEventListener('click', () => this.next());

    // Click backdrop to close
    this.addEventListener('click', (e) => {
      if (e.target === this) this.close();
    });

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyPress);
  }

  handleImageClick(e) {
    // Check if clicked element or its parent has data-lightbox
    const target = e.target.closest('[data-lightbox]');
    if (!target) return;

    e.preventDefault();

    const group = target.dataset.lightboxGroup;

    if (group) {
      // Find all images in the same group
      const groupElements = Array.from(
        document.querySelectorAll(`[data-lightbox-group="${group}"]`)
      );

      // Extract image sources
      this.currentImages = groupElements.map(el => {
        const img = el.tagName === 'IMG' ? el : el.querySelector('img');
        return img ? img.src : null;
      }).filter(Boolean);

      // Find the index of the clicked image
      this.currentIndex = groupElements.indexOf(target);
    } else {
      // Single image
      const img = target.tagName === 'IMG' ? target : target.querySelector('img');
      this.currentImages = img ? [img.src] : [];
      this.currentIndex = 0;
    }

    if (this.currentImages.length > 0) {
      this.open();
    }
  }

  handleKeyPress(e) {
    if (this.style.display !== 'flex') return;

    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowLeft') {
      this.prev();
    } else if (e.key === 'ArrowRight') {
      this.next();
    }
  }

  open() {
    this.style.display = 'flex';
    const controls = this.querySelector('.lightbox-controls');
    if (this.currentImages.length > 1) {
      controls.style.display = 'flex';
    } else {
      controls.style.display = 'none';
    }
    document.body.style.overflow = 'hidden';
    this.updateImage();
  }

  close() {
    this.style.display = 'none';
    document.body.style.overflow = '';
  }

  updateImage() {
    const img = this.querySelector('#lightbox-img');
    img.src = this.currentImages[this.currentIndex];
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.currentImages.length) % this.currentImages.length;
    this.updateImage();
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.currentImages.length;
    this.updateImage();
  }

  cleanup() {
    document.removeEventListener('click', this.handleImageClick);
    document.removeEventListener('keydown', this.handleKeyPress);
    document.body.style.overflow = '';
  }
}

customElements.define('image-lightbox', ImageLightbox);

// Auto-initialize: add lightbox to page if not already present
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLightbox);
} else {
  initLightbox();
}

function initLightbox() {
  if (!document.querySelector('image-lightbox')) {
    const lightbox = document.createElement('image-lightbox');
    document.body.appendChild(lightbox);
  }
}
