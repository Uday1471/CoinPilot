document.addEventListener("DOMContentLoaded", function () {
  // Initialize Firebase
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Clean URL if it has hash fragment
  if (window.location.hash) {
    history.replaceState(null, null, " ");
  }

  // DOM Elements
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");
  const resetForm = document.getElementById("reset-password");
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const forgotPassword = document.getElementById("forgot-password");
  const backToLogin = document.getElementById("back-to-login");
  const loginFormDiv = document.getElementById("login-form");
  const registerFormDiv = document.getElementById("register-form");
  const forgotFormDiv = document.getElementById("forgot-form");

  // Form switching
  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    switchForm(loginFormDiv, registerFormDiv);
  });

  showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    switchForm(registerFormDiv, loginFormDiv);
  });

  forgotPassword.addEventListener("click", (e) => {
    e.preventDefault();
    switchForm(loginFormDiv, forgotFormDiv);
  });

  backToLogin.addEventListener("click", (e) => {
    e.preventDefault();
    switchForm(forgotFormDiv, loginFormDiv);
  });

  // Login Handler
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;
      checkUserSetup(user.uid); // Check if setup is complete
    } catch (error) {
      console.error("Error during login:", error);
    }
  });

  // Check if the user setup is complete or not
  async function checkUserSetup(userId) {
    const doc = await db.collection("users").doc(userId).get();
    if (doc.exists && doc.data().setupComplete) {
      window.location.href = "dashboard.html"; // Redirect to the dashboard if setup is complete
    } else {
      window.location.href = "setup-income.html"; // Redirect to the setup page if setup is not complete
    }
  }

  // Registration Handler (New User)
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = registerForm["register-name"].value;
    const email = registerForm["register-email"].value;
    const password = registerForm["register-password"].value;
    const confirmPassword = registerForm["register-confirm"].value;

    if (password !== confirmPassword) {
      showError(registerForm, "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      showError(registerForm, "Password must be at least 6 characters");
      return;
    }

    // Store signup info temporarily
    sessionStorage.setItem("signupName", name);
    sessionStorage.setItem("signupEmail", email);
    sessionStorage.setItem("signupPassword", password);

    window.location.href = "setup-income.html";
  });

  // Password Reset Handler
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = resetForm["reset-email"].value;

    try {
      showLoading(resetForm);
      await auth.sendPasswordResetEmail(email);
      hideLoading(resetForm);
      showSuccess(resetForm, "Password reset email sent! Check your inbox.");
      resetForm.reset();

      setTimeout(() => {
        switchForm(forgotFormDiv, loginFormDiv);
      }, 3000);
    } catch (error) {
      hideLoading(resetForm);
      handleAuthError(resetForm, error);
    }
  });

  // Centralized Auth State Management
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      // No user, redirect to login if not on login page
      if (!onLoginPage()) {
        window.location.href = "index.html"; // Redirect to login page
      }
      return;
    }

    // Check user setup completion for existing user
    if (user) {
      try {
        const doc = await db.collection("users").doc(user.uid).get();

        if (!doc.exists) {
          window.location.href = "setup-income.html"; // If no user setup, redirect to setup page
        } else if (doc.data().setupComplete) {
          // If setup complete, redirect to dashboard
          if (!onDashboard()) window.location.href = "dashboard.html";
        } else {
          // If setup not complete, redirect to setup page
          window.location.href = "setup-income.html";
        }
      } catch (error) {
        console.error("Auth state error:", error);
        window.location.href = "index.html"; // Redirect to login page on error
      }
    }
  });

  // Helper Functions to check page context
  function onLoginPage() {
    return (
      window.location.pathname.endsWith("index.html") ||
      window.location.pathname === "/"
    );
  }

  function onSetupPage() {
    return window.location.pathname.includes("setup-income.html");
  }

  function onDashboard() {
    return window.location.pathname.includes("dashboard.html");
  }

  function switchForm(hideForm, showForm) {
    hideForm.classList.remove("active");
    showForm.classList.add("active");
    clearMessages(hideForm);
    clearMessages(showForm);
  }

  function showLoading(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span> Processing...';
  }

  function hideLoading(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    submitButton.textContent =
      form.id === "login"
        ? "Login"
        : form.id === "register"
        ? "Sign Up"
        : "Send Reset Link";
  }

  function handleAuthError(form, error) {
    const errorMap = {
      "auth/email-already-in-use": "This email is already registered",
      "auth/invalid-email": "Please enter a valid email address",
      "auth/weak-password": "Password must be at least 6 characters",
      "auth/user-not-found": "No account found with this email",
      "auth/wrong-password": "Incorrect password",
    };
    showError(form, errorMap[error.code] || error.message);
  }

  function showError(form, message) {
    clearMessages(form);
    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
    errorElement.textContent = message;
    form.insertBefore(
      errorElement,
      form.querySelector('button[type="submit"]')
    );
    setTimeout(() => errorElement.remove(), 5000);
  }

  function showSuccess(form, message) {
    clearMessages(form);
    const successElement = document.createElement("div");
    successElement.className = "success-message";
    successElement.textContent = message;
    form.appendChild(successElement);
    setTimeout(() => successElement.remove(), 5000);
  }

  function clearMessages(form) {
    form
      .querySelectorAll(".error-message, .success-message")
      .forEach((el) => el.remove());
  }
});
// Theme Toggle Functionality - Simplified version without system preference detection
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('theme-toggle');
  const icon = themeToggle.querySelector('i');
  
  // Default to light theme if no preference is saved
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateIcon(savedTheme);
  
  themeToggle.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateIcon(newTheme);
  });
  
  function updateIcon(theme) {
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
});
