// JS/profile.js

// Firebase SDK Imports
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    deleteDoc // Import deleteDoc for removing favorites
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"; // Needed to get the initialized app

// Initialize Firebase services
const app = getApp(); // Get the already initialized Firebase app
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Elements ---
const profileFirstNameSpan = document.getElementById('profile-first-name');
const profileLastNameSpan = document.getElementById('profile-last-name');
const profileEmailSpan = document.getElementById('profile-email');
const profilePhoneSpan = document.getElementById('profile-phone');
const profileStreetAddressSpan = document.getElementById('profile-street-address');
const profileCitySpan = document.getElementById('profile-city');
const profileCountrySpan = document.getElementById('profile-country');
const logoutButton = document.getElementById('logout-button');

// Order History DOM element
const ordersListDiv = document.getElementById('orders-list');

// NEW: Favorites DOM element
const favoritesListDiv = document.getElementById('favorites-list');


// --- Helper Functions ---
function formatOrderDate(timestamp) {
    if (!timestamp || !timestamp.toDate) {
        return 'N/A';
    }
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Renders a single product card for the favorites list.
 * @param {object} product - The product data from the favorite document.
 * @param {string} userId - The ID of the current user.
 */
function renderFavoriteProductCard(product, userId) {
    const productCard = document.createElement('div');
    productCard.classList.add('favorite-product-card'); // Use a specific class for favorites styling

    productCard.innerHTML = `
        <div class="favorite-product-image-wrapper">
            <picture>
                <source srcset="${product.imageWebpUrl}" type="image/webp">
                <img src="${product.imageUrl}" alt="${product.name}" class="favorite-product-image">
            </picture>
        </div>
        <div class="favorite-product-info">
            <h3 class="favorite-product-name">${product.name}</h3>
            <p class="favorite-product-category">${product.category || 'Eyewear'}</p>
            <p class="favorite-product-price">$${product.price.toFixed(2)}</p>
            <button class="remove-favorite-btn" data-product-id="${product.id}">
                <i class="fas fa-trash"></i> Remove
            </button>
        </div>
    `;

    const removeButton = productCard.querySelector('.remove-favorite-btn');
    removeButton.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to remove "${product.name}" from your favorites?`)) {
            await removeFavorite(product.id, userId);
        }
    });

    return productCard;
}

/**
 * Removes a product from the user's favorites in Firestore.
 * @param {string} productId - The ID of the product to remove.
 * @param {string} userId - The ID of the current user.
 */
async function removeFavorite(productId, userId) {
    try {
        const favoriteDocRef = doc(db, "users", userId, "favorites", productId);
        await deleteDoc(favoriteDocRef);
        console.log(`Product ${productId} removed from favorites.`);
        // Re-fetch and re-render the list to update the UI
        await fetchAndDisplayFavorites(userId);
    } catch (error) {
        console.error("Error removing favorite:", error);
        alert("Failed to remove product from favorites. Please try again.");
    }
}


// --- Order History Functionality ---
async function fetchAndRenderOrders(userId) {
    if (!ordersListDiv) return;

    ordersListDiv.innerHTML = '<p style="text-align: center; padding: 20px;">Loading your orders...</p>';

    try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("userId", "==", userId), orderBy("orderDate", "desc"));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            ordersListDiv.innerHTML = '<p style="text-align: center; padding: 20px;">You have no past orders.</p>';
            return;
        }

        ordersListDiv.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const order = doc.data();
            const orderId = doc.id;

            const orderDiv = document.createElement('div');
            orderDiv.classList.add('past-order-item');

            let itemsHtml = order.items.map(item => `
                <li>${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>
            `).join('');

            orderDiv.innerHTML = `
                <h4>Order ID: ${orderId}</h4>
                <p><strong>Date:</strong> ${formatOrderDate(order.orderDate)}</p>
                <p><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Items:</strong></p>
                <ul>${itemsHtml}</ul>
                <p><strong>Shipping To:</strong> ${order.shippingAddress.streetAddress}, ${order.shippingAddress.city}, ${order.shippingAddress.country}</p>
                <p><strong>Payment:</strong> ${order.paymentMethod}</p>
                ${order.orderNotes ? `<p><strong>Notes:</strong> ${order.orderNotes}</p>` : ''}
                <hr>
            `;
            ordersListDiv.appendChild(orderDiv);
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        ordersListDiv.innerHTML = '<p style="text-align: center; padding: 20px; color: red;">Error loading orders. Please try again later.</p>';
    }
}

// NEW: Favorites Functionality
async function fetchAndDisplayFavorites(userId) {
    if (!favoritesListDiv) return;

    favoritesListDiv.innerHTML = '<p style="text-align: center; padding: 20px; grid-column: 1 / -1;">Loading your favorite products...</p>';

    try {
        const favoritesRef = collection(db, "users", userId, "favorites");
        // Optionally order favorites, e.g., by when they were added
        const q = query(favoritesRef, orderBy("addedAt", "desc"));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            favoritesListDiv.innerHTML = '<p style="text-align: center; padding: 20px; grid-column: 1 / -1;">You have no favorite products yet. Go to the <a href="shop.html">shop page</a> to add some!</p>';
            return;
        }

        favoritesListDiv.innerHTML = ''; // Clear loading message

        querySnapshot.forEach((docSnap) => {
            const productData = docSnap.data();
            const productCard = renderFavoriteProductCard(productData, userId);
            favoritesListDiv.appendChild(productCard);
        });

    } catch (error) {
        console.error("Error fetching favorites:", error);
        favoritesListDiv.innerHTML = '<p style="text-align: center; padding: 20px; grid-column: 1 / -1; color: red;">Error loading favorites. Please try again later.</p>';
    }
}


// --- User Session and Data Loading ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in, fetch and display their profile data
        console.log('User is signed in on profile page:', user.email, user.uid);

        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                console.log('User data from Firestore:', userData);

                profileFirstNameSpan.textContent = userData.firstName || 'N/A';
                profileLastNameSpan.textContent = userData.lastName || 'N/A';
                profileEmailSpan.textContent = userData.email || 'N/A';
                profilePhoneSpan.textContent = userData.phone || 'N/A';
                profileStreetAddressSpan.textContent = userData.address?.street || 'N/A';
                profileCitySpan.textContent = userData.address?.city || 'N/A';
                profileCountrySpan.textContent = userData.address?.country || 'N/A';
            } else {
                console.warn("No user profile found in Firestore for UID:", user.uid);
                profileFirstNameSpan.textContent = user.email; // Fallback to email
                alert('Your profile data is incomplete. Please update it.');
            }

            // Fetch and render user's orders
            await fetchAndRenderOrders(user.uid);

            // NEW: Fetch and render user's favorites
            await fetchAndDisplayFavorites(user.uid);


        } catch (error) {
            console.error('Error fetching user profile or data:', error);
            alert('Failed to load profile data, orders, or favorites. Please try again.');
        }

        // Set up Logout Button
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    await signOut(auth);
                    console.log('User logged out successfully.');
                    window.location.href = 'login.html'; // Redirect to login page after logout
                } catch (error) {
                    console.error('Error logging out:', error.message);
                    alert('Failed to log out. Please try again.');
                }
            });
        }

    } else {
        // User is signed out, redirect to login page
        console.log('No user signed in. Redirecting to login page.');
        window.location.href = 'login.html';
    }
});

