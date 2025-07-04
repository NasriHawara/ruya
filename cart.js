// JS/cart.js

import { updateCartCount } from './common.js'; // Ensure this path is correct

// --- DOM Elements (Get references to elements with IDs for direct access) ---
const cartTableBody = document.getElementById('cart-items-body');
const cartTotalsSection = document.querySelector('.cart-totals-section');
const cartActionsBottom = document.querySelector('.cart-actions-bottom');

const subtotalElement = document.getElementById('cart-subtotal');
const shippingElement = document.getElementById('cart-shipping');
const orderTotalElement = document.getElementById('cart-total');
const proceedToCheckoutButton = document.getElementById('proceed-to-checkout-button');

// Function to render/re-render the cart items in the table
function renderCartItems() {
    const cart = JSON.parse(localStorage.getItem('cart')) || {};
    let cartItemsArray = Object.values(cart);

    cartTableBody.innerHTML = ''; // Always clear existing rows first to re-render

    if (cartItemsArray.length === 0) {
        // If cart is empty, insert your preferred message directly into the table body
        cartTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Your cart is empty. <a href="shop.html">Go shopping!</a></td></tr>';
        
        // Hide totals, actions, and buttons when cart is empty
        if (cartTotalsSection) cartTotalsSection.style.display = 'none';
        if (cartActionsBottom) cartActionsBottom.style.display = 'none';
        if (proceedToCheckoutButton) proceedToCheckoutButton.style.display = 'none';
        
        return; // Exit the function if cart is empty
    } else {
        // Show totals, actions, and buttons if items exist
        if (cartTotalsSection) cartTotalsSection.style.display = 'block';
        if (cartActionsBottom) cartActionsBottom.style.display = 'flex'; // Use flex as it's a flex container
        if (proceedToCheckoutButton) proceedToCheckoutButton.style.display = 'inline-block'; // Or 'block'
    }

    let subtotal = 0;
    const shippingCost = 10.00; // Flat rate shipping for now

    cartItemsArray.forEach(item => {
        const itemSubtotal = item.price * item.quantity;
        subtotal += itemSubtotal;

        const row = document.createElement('tr');
        row.classList.add('cart-item');
        row.dataset.productId = item.id; // Store product ID on the row for easy access

        row.innerHTML = `
            <td class="product-remove">
                <button class="remove-item-btn" title="Remove this item" data-product-id="${item.id}"><i class="fas fa-times"></i></button>
            </td>
            <td class="product-thumbnail">
                <img src="${item.image}" alt="${item.name}" class="cart-product-img">
            </td>
            <td class="product-name">
                <a href="product-detail.html?id=${item.id}">${item.name}</a>
            </td>
            <td class="product-price">$${item.price.toFixed(2)}</td>
            <td class="product-quantity">
                <div class="quantity-input-wrapper">
                    <button class="quantity-minus-btn" data-product-id="${item.id}">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-product-id="${item.id}">
                    <button class="quantity-plus-btn" data-product-id="${item.id}">+</button>
                </div>
            </td>
            <td class="product-subtotal">$${itemSubtotal.toFixed(2)}</td>
        `;
        cartTableBody.appendChild(row);
    });

    // Update cart totals summary
    if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingElement) shippingElement.textContent = `Flat rate: $${shippingCost.toFixed(2)}`;
    if (orderTotalElement) orderTotalElement.textContent = `$${(subtotal + shippingCost).toFixed(2)}`;

    // Attach event listeners for quantity and remove buttons after rendering
    attachCartItemEventListeners();
}

// Function to handle changes in quantity
function handleQuantityChange(productId, newQuantity) {
    let cart = JSON.parse(localStorage.getItem('cart')) || {};
    if (cart[productId]) {
        cart[productId].quantity = parseInt(newQuantity);
        // If quantity becomes 0 or less, remove the item
        if (cart[productId].quantity <= 0) { 
            delete cart[productId];
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartItems(); // Re-render the cart to update totals and display
        updateCartCount(); // Update navbar count
    }
}

// Function to remove an item from the cart
function removeItemFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || {};
    if (cart[productId]) {
        delete cart[productId]; // Remove the item from the cart object
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartItems(); // Re-render the cart
        updateCartCount(); // Update navbar count
    }
}

// Centralized functions for event listeners to avoid duplicates
function handleQuantityButtonClick(event) {
    const productId = event.target.dataset.productId || event.target.closest('button').dataset.productId;
    const quantityInput = event.target.closest('.quantity-input-wrapper').querySelector('.quantity-input');
    let currentQuantity = parseInt(quantityInput.value);

    if (event.target.classList.contains('quantity-plus-btn')) {
        quantityInput.value = currentQuantity + 1;
        handleQuantityChange(productId, quantityInput.value);
    } else if (event.target.classList.contains('quantity-minus-btn')) {
        if (currentQuantity > 1) {
            quantityInput.value = currentQuantity - 1;
            handleQuantityChange(productId, quantityInput.value);
        } else {
            // If quantity would go to 0 or less, ask for confirmation to remove
            if (confirm('Are you sure you want to remove this item from your cart?')) {
                removeItemFromCart(productId);
            }
        }
    }
}

function handleQuantityInputChange(event) {
    const productId = event.target.dataset.productId;
    let newQuantity = parseInt(event.target.value);
    if (isNaN(newQuantity) || newQuantity < 1) {
        newQuantity = 1; // Default to 1 if invalid input
        event.target.value = 1; // Correct the input field
    }
    handleQuantityChange(productId, newQuantity);
}

function handleRemoveItemClick(event) {
    const productId = event.target.closest('button').dataset.productId;
    if (confirm('Are you sure you want to remove this item from your cart?')) {
        removeItemFromCart(productId);
    }
}


// Attach event listeners to dynamically created cart item buttons
function attachCartItemEventListeners() {
    // Quantity Plus/Minus buttons
    document.querySelectorAll('.quantity-plus-btn, .quantity-minus-btn').forEach(button => {
        button.removeEventListener('click', handleQuantityButtonClick); // Prevent duplicates
        button.addEventListener('click', handleQuantityButtonClick);
    });

    // Quantity Input direct change
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.removeEventListener('change', handleQuantityInputChange); // Prevent duplicates
        input.addEventListener('change', handleQuantityInputChange);
    });

    // Remove Item Button
    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.removeEventListener('click', handleRemoveItemClick); // Prevent duplicates
        button.addEventListener('click', handleRemoveItemClick);
    });

}

// --- On page load ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount(); // Set initial navbar cart count
    renderCartItems(); // Display cart items and setup listeners
});