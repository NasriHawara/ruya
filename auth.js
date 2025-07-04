// JS/auth.js

// Firebase SDK Imports
import { getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Import common functions
import { updateCartCount } from './common.js';

// Initialize Firebase services
const app = getApp(); // Assumes Firebase app is initialized in HTML
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Elements ---
// Login Form Elements
const loginForm = document.getElementById('loginForm');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorMessage = document.getElementById('login-error-message');
const forgotPasswordLink = document.getElementById('forgot-password-link');

// Signup Form Elements
const signupForm = document.getElementById('signupForm');
const signupFirstNameInput = document.getElementById('signup-first-name');
const signupLastNameInput = document.getElementById('signup-last-name');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
const signupPhoneInput = document.getElementById('signup-phone');
const signupStreetAddressInput = document.getElementById('signup-street-address');
const signupCityInput = document.getElementById('signup-city');
const signupCountryInput = document.getElementById('signup-country');
const signupErrorMessage = document.getElementById('signup-error-message');

// Navbar Elements (to update login/logout state)
const authLink = document.getElementById('auth-link'); // Targeting the link that becomes Login/Profile
const userDisplayNameSpan = document.getElementById('user-display-name'); // For "Hello, [Name]"

// --- User Authentication Functions ---

// Handle Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        loginErrorMessage.textContent = ''; // Clear previous errors

        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log('User logged in successfully!');
            window.location.href = 'index.html'; // Redirect to home page
        } catch (error) {
            console.error('Login error:', error.message);
            let errorMessage = 'Login failed. Please check your email and password.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'Invalid email or password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many login attempts. Please try again later.';
            }
            loginErrorMessage.textContent = errorMessage;
        }
    });
}

// Handle Signup
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = signupFirstNameInput.value.trim();
        const lastName = signupLastNameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value;
        const confirmPassword = signupConfirmPasswordInput.value;
        const phone = signupPhoneInput.value.trim();
        const streetAddress = signupStreetAddressInput.value.trim();
        const city = signupCityInput.value.trim();
        const country = signupCountryInput.value.trim();

        signupErrorMessage.textContent = ''; // Clear previous errors

        if (password !== confirmPassword) {
            signupErrorMessage.textContent = 'Passwords do not match.';
            return;
        }
        if (password.length < 6) {
            signupErrorMessage.textContent = 'Password must be at least 6 characters long.';
            return;
        }

        try {
            // 1. Create User in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('User created in Auth:', user.uid);

            // 2. Save User Profile Data to Firestore
            await setDoc(doc(db, "users", user.uid), {
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                address: {
                    street: streetAddress,
                    city: city,
                    country: country
                },
                createdAt: new Date()
            });
            console.log('User profile saved to Firestore!');

            alert('Account created successfully! You are now logged in.');
            window.location.href = 'index.html'; // Redirect to home
        } catch (error) {
            console.error('Signup error:', error.message);
            let errorMessage = 'Account creation failed.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email address is already in use.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please choose a stronger one.';
            } else if (error.code === 'permission-denied') { // Specific check for Firestore rule errors
                errorMessage = 'Permission denied. Check Firestore security rules.';
            }
            signupErrorMessage.textContent = errorMessage;
        }
    });
}

// Handle Forgot Password
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = prompt("Please enter your email address to reset your password:");
        if (email) {
            try {
                await sendPasswordResetEmail(auth, email);
                alert("Password reset email sent! Please check your inbox (and spam folder).");
            } catch (error) {
                console.error("Password reset error:", error.message);
                alert(`Failed to send password reset email: ${error.message}`);
            }
        }
    });
}

// --- User Session Management (onAuthStateChanged) ---
// This runs whenever the user's login state changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        console.log('User is signed in:', user.email, user.uid);

        // Fetch user's profile from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let displayName = user.email; // Default to email

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            displayName = userData.firstName || user.email; // Use first name if available
            
            // If on checkout page, pre-fill form
            if (window.location.pathname.includes('checkout.html')) {
                const firstNameInput = document.getElementById('first-name');
                const lastNameInput = document.getElementById('last-name');
                const emailInput = document.getElementById('email');
                const phoneInput = document.getElementById('phone');
                const streetAddressInput = document.getElementById('street-address');
                const cityInput = document.getElementById('city');
                const countryInput = document.getElementById('country');

                if (firstNameInput) firstNameInput.value = userData.firstName || '';
                if (lastNameInput) lastNameInput.value = userData.lastName || '';
                if (emailInput) emailInput.value = userData.email || '';
                if (phoneInput) phoneInput.value = userData.phone || '';
                if (streetAddressInput) streetAddressInput.value = userData.address?.street || '';
                if (cityInput) cityInput.value = userData.address?.city || '';
                if (countryInput) countryInput.value = userData.address?.country || '';

                // Make form fields read-only
                if (firstNameInput) firstNameInput.readOnly = true;
                if (lastNameInput) lastNameInput.readOnly = true;
                if (emailInput) emailInput.readOnly = true;
                if (phoneInput) phoneInput.readOnly = true;
                if (streetAddressInput) streetAddressInput.readOnly = true;
                if (cityInput) cityInput.readOnly = true;
                if (countryInput) countryInput.readOnly = true;
            }

        } else {
            console.log("No user profile found in Firestore for UID:", user.uid);
        }

        // Update navbar for logged-in state (Profile link)
        if (authLink) {
            authLink.href = 'profile.html'; // Link to the new profile page
            authLink.textContent = 'Profile'; // Change text to "Profile"
            authLink.onclick = null; // No direct logout from this link
        }

    } else {
        // User is signed out
        console.log('User is signed out.');

        // Update navbar for logged-out state (Login link)
        if (authLink) {
            authLink.href = 'login.html'; // Link back to the login page
            authLink.textContent = 'Login'; // Change text back to "Login"
            authLink.onclick = null; // No click listener
        }

        // If on checkout page, ensure fields are editable if not logged in
        if (window.location.pathname.includes('checkout.html')) {
            const checkoutForm = document.getElementById('checkout-form'); // Assuming you have a form ID
            if (checkoutForm) {
                const inputs = checkoutForm.querySelectorAll('input');
                inputs.forEach(input => {
                    input.readOnly = false; // Make them editable
                });
            }
        }
    }
    updateCartCount(); // Always update cart count on auth state change
});
