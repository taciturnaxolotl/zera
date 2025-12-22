let currentLightboxImages = [];
let currentLightboxIndex = 0;

function openLightbox(src) {
  currentLightboxImages = [src];
  currentLightboxIndex = 0;
  showLightbox();
}

function openLightboxGroup(element) {
  const group = element.closest('.img-group');
  const images = Array.from(group.querySelectorAll('img')).map(img => img.src);
  const clickedImg = element.querySelector('img');
  
  currentLightboxImages = images;
  currentLightboxIndex = images.indexOf(clickedImg.src);
  showLightbox();
}

function showLightbox() {
  let lightbox = document.getElementById('lightbox');
  
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        <img id="lightbox-img" src="" alt="">
        <div class="lightbox-controls">
          <button class="lightbox-prev" onclick="prevImage()">←</button>
          <button class="lightbox-next" onclick="nextImage()">→</button>
        </div>
      </div>
    `;
    document.body.appendChild(lightbox);
    
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    
    document.addEventListener('keydown', handleKeyPress);
  }
  
  updateLightboxImage();
  lightbox.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function updateLightboxImage() {
  const img = document.getElementById('lightbox-img');
  const controls = document.querySelector('.lightbox-controls');
  
  img.src = currentLightboxImages[currentLightboxIndex];
  
  if (currentLightboxImages.length === 1) {
    controls.style.display = 'none';
  } else {
    controls.style.display = 'flex';
  }
}

function prevImage() {
  currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
  updateLightboxImage();
}

function nextImage() {
  currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
  updateLightboxImage();
}

function handleKeyPress(e) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox || lightbox.style.display !== 'flex') return;
  
  if (e.key === 'Escape') {
    closeLightbox();
  } else if (e.key === 'ArrowLeft') {
    prevImage();
  } else if (e.key === 'ArrowRight') {
    nextImage();
  }
}
