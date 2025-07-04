// JS/shop.js

import { updateCartCount } from './common.js'; // Ensure this path is correct

// 1. Import necessary Firebase modules
import {
    getApp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    endBefore,
    getDocs,
    getCountFromServer, // To get total count for pagination
    doc,        // Needed for favorite document reference
    getDoc,     // Needed to check if favorite exists
    setDoc,     // Needed to add to favorites
    deleteDoc   // Needed to remove from favorites
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// Import Auth for current user information
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


// Get the initialized Firebase app instance
const app = getApp();
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Auth


// Get a reference to the 'products' collection in your Firestore database
const productsCollectionRef = collection(db, "products");

// --- DOM Element References ---
const productsContainer = document.getElementById("products-container");
const categoryCheckboxes = document.querySelectorAll('.shop-sidebar input[type="checkbox"]');
const applyFiltersBtn = document.querySelector('.apply-filters-btn');
const sortBySelect = document.getElementById('sort-by');
const resultsCountSpan = document.querySelector('.results-count');
const paginationNav = document.querySelector('.pagination');
// prevPageLink and nextPageLink will be re-assigned dynamically within renderPagination


// --- State Variables for Filters, Sort, and Pagination ---
const productsPerPage = 9; // Display 9 products per page in the grid
let currentCategoryFilter = null; // Can be 'men', 'women', 'kids', or null for all
let currentSortOption = 'default'; // 'default', 'newness', 'price-asc', 'price-desc'
let lastVisible = null; // Last document from the current page's query for 'next' pagination
let firstVisible = null; // First document from the current page's query for 'prev' pagination
let currentPage = 1;
let totalProductsCount = 0; // To store the total number of products matching current filters

// Global variable to store current user's favorite product IDs
// This will be populated once on auth state change and passed to renderProductCard
let globalCurrentUserFavorites = new Set();


// --- Helper function to add a product to the cart ---
function addToCart(productId, productData, quantity = 1) {
    let cart = JSON.parse(localStorage.getItem('cart')) || {};

    if (cart[productId]) {
        cart[productId].quantity += quantity;
    } else {
        cart[productId] = {
            id: productId,
            name: productData.name,
            price: productData.price,
            image: productData.imageWebpUrl || productData.imageFallbackUrl,
            quantity: quantity
        };
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    alert(`${productData.name} (x${quantity}) added to cart!`);
}

// --- Helper function to update the favorite icon's appearance ---
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

// --- Function to toggle product favorite status ---
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
            globalCurrentUserFavorites.delete(productId); // Update global state
            console.log(`Product ${productId} removed from favorites.`);
        } else {
            // Product is not favorited, so add it
            await setDoc(favoriteDocRef, {
                id: productId, // Redundant but explicit for clarity in subcollection
                name: productData.name,
                price: productData.price,
                imageWebpUrl: productData.imageWebpUrl || '',
                imageFallbackUrl: productData.imageFallbackUrl || '',
                category: productData.category || 'Eyewear',
                addedAt: new Date()
            });
            updateFavoriteIcon(buttonElement, true);
            globalCurrentUserFavorites.add(productId); // Update global state
            console.log(`Product ${productId} added to favorites.`);
        }
    } catch (error) {
        console.error("Error toggling favorite status:", error);
        alert("Could not update favorites. Please try again.");
    }
}


// --- Function to render a single product card ---
function renderProductCard(product, productId) {
    // Check globalCurrentUserFavorites to determine initial state
    const isFavorited = globalCurrentUserFavorites.has(productId);

    const productCard = document.createElement('div');
    productCard.classList.add('product-card');

    productCard.innerHTML = `
        <div class="product-image-wrapper">
            <picture>
                <source srcset="${product.imageWebpUrl}" type="image/webp">
                <img src="${product.imageFallbackUrl}" alt="${product.name}" class="product-image">
            </picture>
            <div class="product-actions">
                <a href="product-detail.html?id=${productId}" class="action-btn quick-view" title="Quick View"><i class="fas fa-eye"></i></a>
                <button class="action-btn add-to-cart-btn" title="Add to Cart" data-product-id="${productId}"><i class="fas fa-shopping-cart"></i></button>
                <button class="action-btn add-to-favorites-btn" title="${isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}" data-product-id="${productId}">
                    <i class="${isFavorited ? 'fas fa-heart' : 'far fa-heart'}"></i>
                </button>
            </div>
        </div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-category">${product.category || 'Eyewear'}</p>
            <p class="product-price">$${product.price.toFixed(2)}</p>
        </div>
    `;

    // Add event listener for the Add to Cart button
    const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
    addToCartBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent the productCard's click event from firing
        addToCart(productId, product, 1);
    });

    // Add event listener for the Add to Favorites button
    const addToFavoritesBtn = productCard.querySelector('.add-to-favorites-btn');
    addToFavoritesBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent the productCard's click event from firing
        toggleFavorite(productId, product, addToFavoritesBtn); // Call the new toggleFavorite function
    });


    // Make the entire product card clickable to go to product detail page
    productCard.addEventListener('click', (event) => {
        // Only navigate if click wasn't on an action button inside product-actions
        if (!event.target.closest('.product-actions')) {
            window.location.href = `product-detail.html?id=${productId}`;
        }
    });

    return productCard;
}

// --- Function to render pagination controls ---
function renderPagination() {
    // Clear existing pagination links first
    paginationNav.innerHTML = '';

    const totalPages = Math.ceil(totalProductsCount / productsPerPage);

    // Add Prev button
    const prevButton = document.createElement('a');
    prevButton.href = "#";
    prevButton.classList.add('page-link', 'prev-page');
    if (currentPage === 1) {
        prevButton.classList.add('disabled'); // Add disabled class if on first page
    }
    prevButton.innerHTML = `<i class="fas fa-angle-left"></i>`;
    paginationNav.appendChild(prevButton);

    // Add page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = "#";
        pageLink.classList.add('page-link');
        pageLink.textContent = i;
        if (i === currentPage) {
            pageLink.classList.add('active');
        }
        pageLink.addEventListener('click', (event) => {
            event.preventDefault();
            if (i !== currentPage) {
                currentPage = i;
                lastVisible = null; // Reset pagination pointers for a fresh query for specific page
                firstVisible = null;
                fetchAndDisplayProducts('filterSortChange'); // Treat as a fresh query
            }
        });
        paginationNav.appendChild(pageLink);
    }

    // Add Next button
    const nextButton = document.createElement('a');
    nextButton.href = "#";
    nextButton.classList.add('page-link', 'next-page');
    if (currentPage === totalPages || totalPages === 0) {
        nextButton.classList.add('disabled'); // Add disabled class if on last page or no products
    }
    nextButton.innerHTML = `<i class="fas fa-angle-right"></i>`;
    paginationNav.appendChild(nextButton);

    // Re-attach event listeners for prev/next after re-rendering
    prevButton.addEventListener('click', (event) => {
        event.preventDefault();
        if (currentPage > 1 && !prevButton.classList.contains('disabled')) {
            currentPage--;
            fetchAndDisplayProducts('prev');
        }
    });

    nextButton.addEventListener('click', (event) => {
        event.preventDefault();
        if (currentPage < totalPages && !nextButton.classList.contains('disabled')) {
            currentPage++;
            fetchAndDisplayProducts('next');
        }
    });
}

// --- Asynchronous function to fetch and display products with filters, sort, and pagination ---
async function fetchAndDisplayProducts(direction = 'initial') {
    productsContainer.innerHTML = '<p style="text-align: center; padding: 20px; grid-column: 1 / -1;">Loading products...</p>'; // Show loading message

    let q = productsCollectionRef;

    // 1. Apply Filters (Category)
    if (currentCategoryFilter) {
        q = query(q, where("category", "==", currentCategoryFilter));
    }

    // 2. Apply Sorting
    if (currentSortOption === 'price-asc') {
        q = query(q, orderBy("price", "asc"));
    } else if (currentSortOption === 'price-desc') {
        q = query(q, orderBy("price", "desc"));
    } else if (currentSortOption === 'newness') {
        q = query(q, orderBy("createdAt", "desc"));
    } else {
        q = query(q, orderBy("name", "asc"));
    }

    // First, get the total count of products matching the current filters (for pagination numbers)
    let countQuery = q;
    try {
        const snapshot = await getCountFromServer(countQuery);
        totalProductsCount = snapshot.data().count;
        const startIdx = Math.min(totalProductsCount, productsPerPage * (currentPage - 1) + 1);
        const endIdx = Math.min(totalProductsCount, productsPerPage * currentPage);
        
        if (totalProductsCount > 0) {
            resultsCountSpan.textContent = `Showing ${startIdx}-${endIdx} of ${totalProductsCount} results`;
        } else {
            resultsCountSpan.textContent = 'No results found';
        }
    } catch (countError) {
        console.error("Error fetching product count:", countError);
        resultsCountSpan.textContent = 'Error getting total count.';
        totalProductsCount = 0;
    }

    // 3. Apply Pagination (limit, startAfter/endBefore)
    if (direction === 'next' && lastVisible) {
        q = query(q, startAfter(lastVisible), limit(productsPerPage));
    } else if (direction === 'prev' && firstVisible) {
        // For 'prev' pagination, reverse the order for the query, then reverse results later
        let prevQ = productsCollectionRef; // Start fresh for prev query

        // Re-apply filters and reverse sort for prev page
        if (currentCategoryFilter) {
            prevQ = query(prevQ, where("category", "==", currentCategoryFilter));
        }
        if (currentSortOption === 'price-asc') {
            prevQ = query(prevQ, orderBy("price", "desc")); // Reverse sort for prev
        } else if (currentSortOption === 'price-desc') {
            prevQ = query(prevQ, orderBy("price", "asc")); // Reverse sort for prev
        } else if (currentSortOption === 'newness') {
            prevQ = query(prevQ, orderBy("createdAt", "asc")); // Reverse sort for prev
        } else {
            prevQ = query(prevQ, orderBy("name", "desc")); // Reverse sort for prev
        }

        q = query(prevQ, startAfter(firstVisible), limit(productsPerPage)); // Use startAfter with reversed order
    } else { // 'initial' or 'filterSortChange'
        q = query(q, limit(productsPerPage));
    }

    try {
        const querySnapshot = await getDocs(q);
        productsContainer.innerHTML = ''; // Clear existing content

        if (querySnapshot.empty) {
            productsContainer.innerHTML = '<p style="text-align: center; padding: 20px; grid-column: 1 / -1;">No products found matching your criteria.</p>';
            lastVisible = null;
            firstVisible = null;
            renderPagination();
            return;
        }

        let productsToRender = [];
        querySnapshot.forEach((doc) => {
            productsToRender.push({ id: doc.id, data: doc.data(), docRef: doc });
        });

        // If we fetched the previous page, reverse the results to get correct order
        if (direction === 'prev') {
            productsToRender.reverse();
        }

        // Update firstVisible and lastVisible for the *next* pagination call
        firstVisible = productsToRender[0].docRef;
        lastVisible = productsToRender[productsToRender.length - 1].docRef;

        productsToRender.forEach(item => {
            const productCard = renderProductCard(item.data, item.id); // renderProductCard checks globalCurrentUserFavorites
            productsContainer.appendChild(productCard);
        });

        renderPagination(); // Update pagination UI after rendering products

    } catch (error) {
        console.error("Error fetching products:", error);
        productsContainer.innerHTML = '<p style="text-align: center; padding: 20px; grid-column: 1 / -1; color: red;">Error loading products. Please try again later.</p>';
    }
}


// --- Event Listeners ---

// 1. Apply Filters Button
applyFiltersBtn.addEventListener('click', () => {
    const selectedCategories = Array.from(categoryCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    // Use the first selected category, or null if none are selected
    currentCategoryFilter = selectedCategories.length > 0 ? selectedCategories[0] : null;

    currentPage = 1; // Reset to first page on filter change
    lastVisible = null;
    firstVisible = null;
    fetchAndDisplayProducts('filterSortChange');
});

// 2. Sort By Dropdown
sortBySelect.addEventListener('change', () => {
    currentSortOption = sortBySelect.value;
    currentPage = 1; // Reset to first page on sort change
    lastVisible = null;
    firstVisible = null;
    fetchAndDisplayProducts('filterSortChange');
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount(); // Update cart count in navbar immediately

    // NEW: Check for category parameter in URL on page load
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');

    if (categoryParam) {
        currentCategoryFilter = categoryParam.toLowerCase(); // Set filter from URL
        // Also check the corresponding checkbox in the sidebar
        categoryCheckboxes.forEach(checkbox => {
            if (checkbox.value.toLowerCase() === currentCategoryFilter) {
                checkbox.checked = true;
            } else {
                checkbox.checked = false; // Uncheck others if only one category filter is active
            }
        });
    }

    // CRITICAL: Wait for Firebase Auth state to be resolved before fetching products
    // This ensures `auth.currentUser` is correctly set (or null) when products are rendered,
    // allowing accurate initial favorite icon states.
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Populate globalCurrentUserFavorites based on logged-in user's data
                const userFavsCollectionRef = collection(db, "users", user.uid, "favorites");
                const favSnapshot = await getDocs(userFavsCollectionRef);
                globalCurrentUserFavorites.clear(); // Clear previous favorites if any
                favSnapshot.forEach(doc => globalCurrentUserFavorites.add(doc.id));
            } catch (error) {
                console.error("Error fetching user favorites on auth state change:", error);
            }
        } else {
            globalCurrentUserFavorites.clear(); // Clear favorites if user logs out or is not logged in
        }
        // Now that globalCurrentUserFavorites is updated (or cleared), fetch and display products
        fetchAndDisplayProducts('initial');
    });
});

// Export functions that might be needed elsewhere (optional for now but good practice)
export { updateCartCount, addToCart };
