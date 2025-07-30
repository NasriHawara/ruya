// JS/product-detail.js

// Import necessary common utilities (like updateCartCount)
import { updateCartCount } from './common.js';

// Import necessary Firebase modules
import { getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc,
    collection, // Needed for favorites check
    getDocs,    // Needed for favorites check
    setDoc,     // Needed for favorites toggle
    deleteDoc   // Needed for favorites toggle
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


// Get the initialized Firebase app instance
const app = getApp();
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Auth for current user


// --- Function to add a product to the cart (reused logic from shop.js) ---
function addToCart(productId, productData, quantity = 1) {
    let cart = JSON.parse(localStorage.getItem('cart')) || {};

    if (cart[productId]) {
        cart[productId].quantity += quantity;
    } else {
        cart[productId] = {
            id: productId,
            name: productData.name,
            price: productData.price,
            image: productData.imageWebpUrl || productData.imageFallbackUrl, // Use main image for cart
            quantity: quantity
        };
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    alert(`${productData.name} (x${quantity}) added to cart!`);
}

// --- Helper function to update the favorite icon's appearance ---
// This is a direct copy from shop.js for consistency
function updateFavoriteIcon(buttonElement, isFavorited) {
    const icon = buttonElement.querySelector('i');
    if (isFavorited) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        buttonElement.classList.add('favorited');
        buttonElement.title = 'Remove from Favorites';
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        buttonElement.classList.remove('favorited');
        buttonElement.title = 'Add to Favorites';
    }
}

// --- Function to toggle product favorite status (reused logic from shop.js) ---
// This is a direct copy from shop.js for consistency, but now specific to product-detail page's elements
async function toggleFavorite(productId, productData, buttonElement) {
    const user = auth.currentUser;

    if (!user) {
        alert('Please log in to add items to your favorites.');
        // Optionally redirect to login page: window.location.href = '/Html/login.html';
        return;
    }

    const favoriteDocRef = doc(db, "users", user.uid, "favorites", productId);

    try {
        const docSnap = await getDoc(favoriteDocRef);

        if (docSnap.exists()) {
            // Product is already favorited, so remove it
            await deleteDoc(favoriteDocRef);
            updateFavoriteIcon(buttonElement, false);
            console.log(`Product ${productId} removed from favorites.`);
        } else {
            // Product is not favorited, so add it
            // Store essential product data to display in profile later without extra lookups
            await setDoc(favoriteDocRef, {
                id: productId, // Redundant but explicit for clarity in subcollection
                name: productData.name,
                price: productData.price,
                imageWebpUrl: productData.imageWebpUrl || '',
                imageFallbackUrl: productData.imageFallbackUrl || '',
                category: productData.category || 'Eyewear', // Assuming category is available
                addedAt: new Date() // Timestamp when added to favorites
            });
            updateFavoriteIcon(buttonElement, true);
            console.log(`Product ${productId} added to favorites.`);
        }
    } catch (error) {
        console.error("Error toggling favorite status:", error);
        alert("Could not update favorites. Please try again.");
    }
}


// --- Main Product Detail Loading Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    // Get the Product ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    // Get references to the HTML elements to populate
    const productNameElement = document.getElementById('product-name');
    const productPriceElement = document.getElementById('product-price');
    const productDescriptionElement = document.getElementById('product-description');
    const materialDisplayElement = document.getElementById('product-material');
    const stockStatusElement = document.getElementById('stock-status');
    const mainProductImageElement = document.getElementById('main-product-image-src');
    const thumbnailImagesContainer = document.getElementById('thumbnail-images-container');
    const colorSelectorContainer = document.getElementById('color-selector-container'); // New: for dynamic colors
    const pageTitleElement = document.querySelector('title');

    // Get references to the action buttons
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    const quantityInput = document.getElementById('quantity');
    const addToFavoritesBtn = document.getElementById('add-to-favorites-btn'); // New: Favorites button


    if (!productId) {
        console.error("No product ID found in URL.");
        if (productNameElement) productNameElement.textContent = "Product Not Found";
        if (productDescriptionElement) productDescriptionElement.textContent = "Please return to the shop page.";
        if (mainProductImageElement) mainProductImageElement.src = "/images/placeholder.png";
        updateCartCount();
        return;
    }

    let currentProductData = null; // Store product data for cart/favorites functions

    try {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
            const product = productSnap.data();
            currentProductData = product; // Store product data globally for event listeners

            // Populate the HTML elements with product data
            if (pageTitleElement) pageTitleElement.textContent = `${product.name} - Ruءya Eyewear`;
            if (productNameElement) productNameElement.textContent = product.name;
            if (productPriceElement) productPriceElement.textContent = `$${product.price.toFixed(2)}`;
            if (productDescriptionElement) productDescriptionElement.textContent = product.description;

            if (materialDisplayElement) {
                materialDisplayElement.textContent = product.material || 'N/A';
            }

            // Update stock status
            if (stockStatusElement) {
                stockStatusElement.textContent = product.stock > 0 ? `In Stock (${product.stock} left)` : 'Out of Stock';
                if (product.stock <= 0) {
                    stockStatusElement.style.color = 'red';
                    if (addToCartBtn) addToCartBtn.disabled = true;
                    if (addToFavoritesBtn) addToFavoritesBtn.disabled = true; // Disable favorites if out of stock (optional)
                }
            }

            // --- Handle Images (Main and Thumbnails) ---
            if (mainProductImageElement) {
                mainProductImageElement.src = product.imageUrl || product.imageWebpUrl || product.imageFallbackUrl || "/images/placeholder.png";
                mainProductImageElement.alt = product.name;
            }

            if (thumbnailImagesContainer) {
                thumbnailImagesContainer.innerHTML = ''; // Clear existing hardcoded thumbnails

                const allImages = [];
                // Add the main product image as the first thumbnail
                if ( product.imageWebpUrl || product.imageFallbackUrl ) {
                    allImages.push({
                        webp: product.imageWebpUrl,
                        fallback: product.imageFallbackUrl,
                        mainUrl: product.imageUrl 
                    });
                }
                // Add gallery images if they exist
                if (product.galleryImages && Array.isArray(product.galleryImages)) {
                    allImages.push(...product.galleryImages);
                }

                allImages.forEach((img, index) => {
                    const thumbnail = document.createElement('img');
                    thumbnail.src = img.fallback || img.webp || mainImageUrl || "/images/placeholder.png"; // Use fallback as default thumbnail src
                    thumbnail.alt = `${product.name} thumbnail ${index + 1}`;
                    thumbnail.classList.add('thumbnail');
                    if (index === 0) {
                        thumbnail.classList.add('active'); // First image is active by default
                    }

                    // Add click listener to switch main image
                    thumbnail.addEventListener('click', () => {
                        mainProductImageElement.src = img.fallback || img.webp || mainImageUrl || product.imageUrl;
                        // Update active class for thumbnails
                        document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
                        thumbnail.classList.add('active');

                            if (index === 0) {
      mainProductImageElement.src = mainImageUrl;
    }
                    });
                    thumbnailImagesContainer.appendChild(thumbnail);
                });
            }

            // --- Handle Colors ---
            if (colorSelectorContainer && product.colors && Array.isArray(product.colors)) {
                colorSelectorContainer.innerHTML = ''; // Clear existing hardcoded swatches
                product.colors.forEach((color, index) => {
                    const colorSwatch = document.createElement('span');
                    colorSwatch.classList.add('color-swatch');
                    if (index === 0) { // Set first color as active by default
                        colorSwatch.classList.add('active');
                    }
                    colorSwatch.style.backgroundColor = color.hex;
                    colorSwatch.dataset.color = color.name;
                    colorSwatch.title = color.name;

                    colorSwatch.addEventListener('click', () => {
                        // Remove active from all swatches
                        document.querySelectorAll('.color-swatch').forEach(swatch => swatch.classList.remove('active'));
                        // Add active to clicked swatch
                        colorSwatch.classList.add('active');
                        // You could add logic here to update product image based on color if you have color-specific images
                        console.log(`Selected color: ${color.name}`);
                    });
                    colorSelectorContainer.appendChild(colorSwatch);
                });
            }


            // --- Attach Event Listener for "Add to Cart" button ---
            if (addToCartBtn && product.stock > 0) {
                addToCartBtn.addEventListener('click', () => {
                    const quantity = parseInt(quantityInput.value);
                    if (isNaN(quantity) || quantity < 1) {
                        alert('Please enter a valid quantity (at least 1).');
                        return;
                    }
                    addToCart(productId, currentProductData, quantity);
                });
            }
            
            // --- Attach Event Listener for "Add to Favorites" button ---
            // We need to know if it's already favorited to set the initial icon state
            onAuthStateChanged(auth, async (user) => {
                if (addToFavoritesBtn) {
                    if (user) {
                        const favoriteDocRef = doc(db, "users", user.uid, "favorites", productId);
                        const docSnap = await getDoc(favoriteDocRef);
                        updateFavoriteIcon(addToFavoritesBtn, docSnap.exists());
                    } else {
                        // If not logged in, ensure icon is 'far' (empty heart)
                        updateFavoriteIcon(addToFavoritesBtn, false);
                    }

                    addToFavoritesBtn.addEventListener('click', () => {
                        toggleFavorite(productId, currentProductData, addToFavoritesBtn);
                    });
                }
            });


        } else {
            console.error("No such document for ID:", productId);
            if (productNameElement) productNameElement.textContent = "Product Not Found";
            if (productDescriptionElement) productDescriptionElement.textContent = "The product you are looking for does not exist. Please check the URL or return to the shop.";
            if (mainProductImageElement) mainProductImageElement.src = "/images/error-placeholder.png";
            // Hide/disable action buttons if product not found
            if (addToCartBtn) addToCartBtn.style.display = 'none';
            if (addToFavoritesBtn) addToFavoritesBtn.style.display = 'none';
            if (quantityInput) quantityInput.style.display = 'none';
        }

    } catch (error) {
        console.error("Error fetching product details:", error);
        if (productNameElement) productNameElement.textContent = "Error Loading Product";
        if (productDescriptionElement) productDescriptionElement.textContent = "An error occurred while loading product details. Please try again.";
        if (mainProductImageElement) mainProductImageElement.src = "/images/error-placeholder.png";
        // Hide/disable action buttons on error
        if (addToCartBtn) addToCartBtn.style.display = 'none';
        if (addToFavoritesBtn) addToFavoritesBtn.style.display = 'none';
        if (quantityInput) quantityInput.style.display = 'none';
    }
    updateCartCount(); // Update cart count on page load
});
