// JS/common.js

// Function to update the cart count in the navbar
export function updateCartCount() {
    const cartCountSpan = document.getElementById('cart-count');
    if (cartCountSpan) {
        let cart = JSON.parse(localStorage.getItem('cart')) || {};
        let totalItems = 0;
        for (const productId in cart) {
            totalItems += cart[productId].quantity;
        }
        cartCountSpan.textContent = totalItems;
    }
}

// Call updateCartCount when common.js is loaded on any page
document.addEventListener('DOMContentLoaded', updateCartCount);