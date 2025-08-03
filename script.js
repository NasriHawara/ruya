const allImages = document.querySelectorAll(".carousel-image"); // Get all images, including clones
const originalImages = document.querySelectorAll(".carousel-image:not(.clone)"); // Get only original images
const track = document.querySelector(".carousel-track");
const dotsContainer = document.querySelector(".carousel-dots");
const carouselWindow = document.querySelector(".carousel-window");

const originalTotalImages = originalImages.length; // Number of *real* images
const clonesBefore = 2; // Number of clones added to the beginning in HTML
const clonesAfter = 2;  // Number of clones added to the end in HTML

// currentIndex will now refer to the index of the *original* image
let currentIndex = 0; // Starts at the first original image

// --- Dot creation (based on original images) ---
dotsContainer.innerHTML = '';
originalImages.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.classList.add('carousel-dot');
    if (i === currentIndex) dot.classList.add('active'); // Set initial active dot
    dot.addEventListener('click', () => {
        currentIndex = i;
        updateCarousel(); // Call update without instant jump flag for dot clicks
    });
    dotsContainer.appendChild(dot);
});
const dots = document.querySelectorAll('.carousel-dot'); // Re-select after creation


// --- Update Carousel Function ---
function updateCarousel() {
    if (allImages.length === 0) return;

    // Get actual dimensions (crucial for responsiveness and accurate centering)
    const firstImage = allImages[0]; // Use any image to get dimensions
    const computedStyle = getComputedStyle(firstImage);
    const imageWidth = parseFloat(computedStyle.width); // Actual width of an image
    const gapStyle = getComputedStyle(track).getPropertyValue('gap');
    const gap = parseFloat(gapStyle) || 40; // Fallback to 40px if gap not parsed

    const itemWidthWithGap = imageWidth + gap;
    const windowWidth = carouselWindow.offsetWidth; // Actual visible width of the carousel window

    // The 'effective' index considering clones
    // We start at `clonesBefore` to point to the first original image's position on the track
    let effectiveIndex = currentIndex + clonesBefore;

    // Calculate the position to center the *effective* image
    const targetImageCenterPosition = (effectiveIndex * itemWidthWithGap) + (imageWidth / 2);

    // Calculate the offset for the track
    let offset = targetImageCenterPosition - (windowWidth / 2);

    // Apply the transform with animation
    track.style.transition = 'transform 0.5s ease-in-out'; // Ensure transition is enabled
    track.style.transform = `translateX(-${offset}px)`;

    // Update active class on images
    allImages.forEach((img) => {
        img.classList.remove('active'); // Remove from all first
    });
    // Add active to the corresponding original image
    originalImages[currentIndex].classList.add('active');


    // Update active class on dots
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
    });
}

// --- Add Navigation Arrows (Next/Prev) ---
// Add them dynamically to your carousel-window
const prevButton = document.createElement('button');
prevButton.textContent = '←';
prevButton.classList.add('carousel-nav-button', 'prev');
carouselWindow.appendChild(prevButton);

const nextButton = document.createElement('button');
nextButton.textContent = '→';
nextButton.classList.add('carousel-nav-button', 'next');
carouselWindow.appendChild(nextButton);

prevButton.addEventListener('click', () => {
    // If at the first real image, prepare to go to last real image via its clone
    if (currentIndex === 0) {
        currentIndex = originalTotalImages - 1;
        // Temporarily move to the beginning clone of the last image (before transition)
        // This makes the transition appear to loop backwards
        const imageWidth = parseFloat(getComputedStyle(allImages[0]).width);
        const gap = parseFloat(getComputedStyle(track).getPropertyValue('gap')) || 40;
        const itemWidthWithGap = imageWidth + gap;
        const windowWidth = carouselWindow.offsetWidth;

        track.style.transition = 'none'; // Disable transition for instant jump
let tempOffset = ((clonesBefore - 1) * itemWidthWithGap) + (imageWidth / 2) - (windowWidth / 2);        track.style.transform = `translateX(-${tempOffset}px)`;

        // Allow browser to render the instant jump, then enable transition for the next actual move
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                 updateCarousel(); // Call update to transition to the actual last image
            });
        });
    } else {
        currentIndex--;
        updateCarousel();
    }
});

nextButton.addEventListener('click', () => {
    // If at the last real image, prepare to go to first real image via its clone
    if (currentIndex === originalTotalImages - 1) {
        currentIndex = 0;
        // Temporarily move to the end clone of the first image (before transition)
        const imageWidth = parseFloat(getComputedStyle(allImages[0]).width);
        const gap = parseFloat(getComputedStyle(track).getPropertyValue('gap')) || 40;
        const itemWidthWithGap = imageWidth + gap;
        const windowWidth = carouselWindow.offsetWidth;

        track.style.transition = 'none'; // Disable transition for instant jump
let tempOffset = ((originalTotalImages + clonesBefore) * itemWidthWithGap) + (imageWidth / 2) - (windowWidth / 2);        track.style.transform = `translateX(-${tempOffset}px)`;

        // Allow browser to render the instant jump, then enable transition for the next actual move
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                 updateCarousel(); // Call update to transition to the actual first image
            });
        });
    } else {
        currentIndex++;
        updateCarousel();
    }
});


// Handle the "teleport" logic when a transition ends
// This makes the jump back to the "real" track segment seamless
track.addEventListener('transitionend', () => {
    const imageWidth = parseFloat(getComputedStyle(allImages[0]).width);
    const gap = parseFloat(getComputedStyle(track).getPropertyValue('gap')) || 40;
    const itemWidthWithGap = imageWidth + gap;
    const windowWidth = carouselWindow.offsetWidth;

    // Check if we are physically on one of the cloned images
    // If the effectiveIndex is too low (past the first real image's clone)
    if (currentIndex === 0 && parseFloat(getComputedStyle(track).transform.split(',')[4]) > - (clonesBefore * itemWidthWithGap + (imageWidth / 2) - (windowWidth / 2))) {
        track.style.transition = 'none'; // Disable animation
        let newOffset = (clonesBefore * itemWidthWithGap) + (imageWidth / 2) - (windowWidth / 2);
        track.style.transform = `translateX(-${newOffset}px)`;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                track.style.transition = 'transform 0.5s ease-in-out'; // Re-enable animation
            });
        });
    }
    // If the effectiveIndex is too high (past the last real image's clone)
    else if (currentIndex === originalTotalImages - 1 && parseFloat(getComputedStyle(track).transform.split(',')[4]) < - ((originalTotalImages + clonesBefore - 1) * itemWidthWithGap + (imageWidth / 2) - (windowWidth / 2))) {
        track.style.transition = 'none'; // Disable animation
        let newOffset = ((originalTotalImages - 1 + clonesBefore) * itemWidthWithGap) + (imageWidth / 2) - (windowWidth / 2);
        track.style.transform = `translateX(-${newOffset}px)`;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                track.style.transition = 'transform 0.5s ease-in-out'; // Re-enable animation
            });
        });
    }
});


// Initial setup: Position track to show the first original image (after clones)
// This needs to run AFTER the dynamic dimensions are retrieved by updateCarousel initially
// So, we'll ensure it runs with a small delay or as part of a main init function
function initializeCarousel() {
    if (allImages.length === 0) return; // Exit if no images

    const imageWidth = parseFloat(getComputedStyle(allImages[0]).width);
    const gap = parseFloat(getComputedStyle(track).getPropertyValue('gap')) || 40;
    const itemWidthWithGap = imageWidth + gap;
    const windowWidth = carouselWindow.offsetWidth;

    // Initial effective index is `clonesBefore` to show the first original image
    let initialOffset = (clonesBefore * itemWidthWithGap) + (imageWidth / 2) - (windowWidth / 2);
    track.style.transform = `translateX(-${initialOffset}px)`;
    // Set active class immediately for the initial state
    originalImages[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');
}

// Call initialization after DOM is loaded or with a slight delay
document.addEventListener('DOMContentLoaded', initializeCarousel);
// Also call updateCarousel on resize to ensure centering is maintained
window.addEventListener('resize', updateCarousel);
