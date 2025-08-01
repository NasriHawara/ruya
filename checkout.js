// JS/checkout.js
import { updateCartCount } from './common.js';
// Firebase Imports for Firestore and Auth
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";


// Initialize Firebase (ensure it's initialized once)
const firebaseConfig = {
    apiKey: "AIzaSyAAo_jXW1bMCjsUlW8wSeT4zoaXyw5JFVU",
    authDomain: "ruya-eyewear-e-commerce.firebaseapp.com",
    projectId: "ruya-eyewear-e-commerce",
    storageBucket: "ruya-eyewear-e-commerce.firebasestorage.app",
    messagingSenderId: "963912557816",
    appId: "1:963912557816:web:81bfb191bc8f2c1e19c70d"
};

if (getApps().length === 0) {
    initializeApp(firebaseConfig);
}

// Get Firebase services instances
const db = getFirestore();
const auth = getAuth();


// Function to render/re-render the order summary
function renderOrderSummary() {
    const orderTableBody = document.querySelector('.order-review-table tbody');
    const orderTableFoot = document.querySelector('.order-review-table tfoot');
    const placeOrderBtn = document.querySelector('.place-order-btn');

    let cart = JSON.parse(localStorage.getItem('cart')) || {};
    let cartItemsArray = Object.values(cart);

    // Clear existing static rows from your HTML
    orderTableBody.innerHTML = '';
    orderTableFoot.innerHTML = '';

    if (cartItemsArray.length === 0) {
        orderTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Your cart is empty. <a href="shop.html">Go shopping!</a></td></tr>';
        placeOrderBtn.disabled = true; // Disable order button if cart is empty
        placeOrderBtn.textContent = 'Cart Empty';
        return; // Stop function if cart is empty
    } else {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place order';
    }

    let subtotal = 0;
    // You can adjust shippingCost here or make it dynamic later if needed
    const shippingCost = 10.00; // Flat rate shipping for Lebanon

    cartItemsArray.forEach(item => {
        const itemSubtotal = item.price * item.quantity;
        subtotal += itemSubtotal;

        const row = document.createElement('tr');
        row.classList.add('order-item');
        row.innerHTML = `
            <td>${item.name} x ${item.quantity}</td>
            <td>$${itemSubtotal.toFixed(2)}</td>
        `;
        orderTableBody.appendChild(row);
    });

    const total = subtotal + shippingCost;

    // Populate the tfoot for totals dynamically
    orderTableFoot.innerHTML = `
        <tr class="order-subtotal">
            <th>Subtotal</th>
            <td>$${subtotal.toFixed(2)}</td>
        </tr>
        <tr class="order-shipping">
            <th>Shipping</th>
            <td>Flat rate: $${shippingCost.toFixed(2)}</td>
        </tr>
        <tr class="order-total">
            <th>Total</th>
            <td>$${total.toFixed(2)}</td>
        </tr>
    `;
}

// Function to handle the "Place order" (WhatsApp) button click
async function handlePlaceOrder(event) {
    // Prevent the default form submission which would reload the page
    event.preventDefault();

    const form = document.querySelector('.billing-form');

    // Trigger browser's native HTML5 validation
    if (!form.checkValidity()) {
        form.reportValidity();
        alert('Please fill in all required fields and correct any errors.');
        return; // Stop if form is not valid
    }

    // Gather contact information
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const streetAddress = document.getElementById('street-address').value.trim();
    const city = document.getElementById('city').value.trim();
    const orderNotes = document.getElementById('order-notes').value.trim();
    const country = document.getElementById('country').value.trim(); // "Lebanon"

    // Get cart items and calculate totals (re-calculate to be safe)
    let cart = JSON.parse(localStorage.getItem('cart')) || {};
    let cartItemsArray = Object.values(cart);

    if (cartItemsArray.length === 0) {
        alert('Your cart is empty. Please add items before placing an order.');
        window.location.href = 'shop.html'; // Redirect to shop page
        return;
    }

    let subtotal = 0;
    // Format items for Firestore storage (only relevant data)
    const orderItemsForFirestore = cartItemsArray.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image, // Include image if you want it in order history
        itemSubtotal: (item.price * item.quantity).toFixed(2) // Calculated subtotal for this item
    }));


    orderItemsForFirestore.forEach(item => {
        subtotal += item.price * item.quantity; // Recalculate subtotal from original cart items
    });
    const shippingCost = 10.00; // Keep consistent with renderOrderSummary
    const totalAmount = subtotal + shippingCost;


    // --- START OF MODIFIED SECTION FOR WHATSAPP RELIABILITY ---

    // 1. Construct the WhatsApp Message
    let message = `*New Order from Ruءya Eyewear!*\n\n`; // Use \n for new line
    message += `*Customer Details:*\n`;
    message += `Name: ${firstName} ${lastName}\n`;
    message += `Phone: ${phone}\n`;
    message += `Email: ${email}\n`;
    message += `Address: ${streetAddress}, ${city}, ${country}\n`;
    if (orderNotes) {
        message += `Notes: ${orderNotes}\n`;
    }
    message += `\n*Order Summary:*\n`;

    cartItemsArray.forEach(item => {
        message += `- ${item.name} x ${item.quantity} ($${(item.price * item.quantity).toFixed(2)})\n`;
    });

    message += `\nSubtotal: $${subtotal.toFixed(2)}\n`;
    message += `Shipping: $${shippingCost.toFixed(2)}\n`;
    message += `*Total: $${totalAmount.toFixed(2)}*\n\n`;
    message += `*Payment Method: Cash on Delivery*\n`;
    // *** IMPORTANT: Order ID is NOT available here yet (Firestore save hasn't happened). ***
    // *** It will be provided to the user in the alert AFTER the save. ***
    message += `Please confirm this order.`;

    const encodedMessage = encodeURIComponent(message);
    const yourWhatsappNumber = '+96176829297'; // Corrected to include '+' for international format
    const whatsappURL = `https://wa.me/${yourWhatsappNumber}?text=${encodedMessage}`;

    // 2. Open WhatsApp in a new tab - THIS IS THE CRITICAL LINE MOVED UP
    // This happens immediately on user gesture, BEFORE any asynchronous Firestore operation.
    const newWindow = window.open(whatsappURL, '_blank');

    // 3. Clear cart immediately after WhatsApp is launched (as the order initiation happened)
    localStorage.removeItem('cart');
    updateCartCount(); // Update navbar count to 0

    // --- END OF MODIFIED SECTION FOR WHATSAPP RELIABILITY ---


    // --- Firestore Order Saving (this now happens AFTER WhatsApp is launched) ---
    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to place an order. Please log in or sign up.');
        // Attempt to close the opened WhatsApp window if the user isn't logged in
        if (newWindow && !newWindow.closed) {
            newWindow.close();
        }
        window.location.href = 'login.html'; // Redirect to login page
        return;
    }

    let orderIdForMessage = 'N/A'; // Placeholder for the Order ID in the final alert
    try {
        const orderData = {
            userId: user.uid,
            orderDate: serverTimestamp(), // Firestore server timestamp
            totalAmount: parseFloat(totalAmount.toFixed(2)), // Ensure number format
            items: orderItemsForFirestore,
            shippingAddress: {
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                email: email,
                streetAddress: streetAddress,
                city: city,
                country: country
            },
            orderNotes: orderNotes,
            paymentMethod: "Cash on Delivery", // Hardcoded as per current checkout flow
            status: "Pending" // Initial status of the order
        };

        const docRef = await addDoc(collection(db, "orders"), orderData);
        orderIdForMessage = docRef.id; // Get the actual Order ID from Firestore
        console.log("Order saved with ID: ", docRef.id);

        // --- Final confirmation and redirect ---
        // The setTimeout is removed as it's no longer necessary with the reordered logic.
        // Alert includes the Order ID generated from Firestore.
        alert(`Your order (Order ID: ${orderIdForMessage}) has been placed and details prepared for WhatsApp! Please send the message to confirm your order. We will contact you shortly.`);

        // Redirect back to shop or a thank you page AFTER the alert
        window.location.href = 'shop.html';

    } catch (error) {
        console.error("Error saving order: ", error);
        alert('There was an error placing your order. Please try again. If the problem persists, contact support.');
    }
}


// --- On page load, initialize everything ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount(); // Set initial navbar cart count
    renderOrderSummary(); // Display order summary based on current cart

    const placeOrderButton = document.querySelector('.place-order-btn');
    if (placeOrderButton) {
        // Attach the event listener to the "Place order" button
        placeOrderButton.addEventListener('click', handlePlaceOrder);
    }
});
