document.addEventListener("DOMContentLoaded", function () {
  console.log("Dashboard loaded");

  // Firebase should be initialized in firebase-config.js
  if (!firebase.apps.length) {
    console.error("Firebase not initialized - check firebase-config.js");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  const elements = {
    userName: document.getElementById("user-name"),
    logoutBtn: document.getElementById("logout-btn"),
    currentBalance: document.getElementById("current-balance"),
    monthlyIncome: document.getElementById("monthly-income"),
    addExpenseBtn: document.getElementById("add-expense-btn"),
    addIncomeBtn: document.getElementById("add-income-btn"),
    quickAddSalaryBtn: document.getElementById("quick-add-salary"),
    viewLogBtn: document.getElementById("view-log-btn"),
    transactionForm: document.getElementById("transaction-form"),
    formTitle: document.getElementById("form-title"),
    submitBtn: document.getElementById("submit-transaction"),
    cancelBtn: document.getElementById("cancel-transaction"),
    amountInput: document.getElementById("transaction-amount"),
    descInput: document.getElementById("transaction-description"),
    dateInput: document.getElementById("transaction-date"),
    editIncomeBtn: document.getElementById("edit-income-btn"),
    incomeModal: document.getElementById("income-modal"),
    closeModal: document.querySelector(".close-modal"),
    newMonthlyIncomeInput: document.getElementById("new-monthly-income"),
    saveIncomeBtn: document.getElementById("save-income-btn"),
  };

  let currentUser = null;
  let userData = {
    currentBalance: 0,
    monthlyIncome: 0,
  };
  let currentTransactionType = null;

  const formatCurrency = (amount) => "$" + (amount || 0).toFixed(2);

  const showIncomeModal = () => {
    elements.newMonthlyIncomeInput.value = userData.monthlyIncome || "";
    elements.incomeModal.classList.remove("hidden");
  };

  const hideIncomeModal = () => {
    elements.incomeModal.classList.add("hidden");
  };

  const updateMonthlyIncome = async () => {
    const newIncome = parseFloat(elements.newMonthlyIncomeInput.value);
    if (isNaN(newIncome) || newIncome < 0) {
      alert("Please enter a valid income.");
      return;
    }

    try {
      await db.collection("users").doc(currentUser.uid).update({
        monthlyIncome: newIncome,
      });
      userData.monthlyIncome = newIncome;
      elements.monthlyIncome.textContent = formatCurrency(newIncome);
      hideIncomeModal();
    } catch (error) {
      console.error("Failed to update income:", error);
      alert("Could not update income.");
    }
  };

  const loadUserData = async (userId) => {
    try {
      const doc = await db.collection("users").doc(userId).get();
      if (doc.exists) {
        userData = doc.data();
        elements.currentBalance.textContent = formatCurrency(
          userData.currentBalance || 0
        );
        elements.monthlyIncome.textContent = formatCurrency(
          userData.monthlyIncome || 0
        );
      } else {
        await db.collection("users").doc(userId).set({
          currentBalance: 0,
          monthlyIncome: 0,
        });
        elements.currentBalance.textContent = "$0.00";
        elements.monthlyIncome.textContent = "$0.00";
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    console.log("handleTransactionSubmit called");
    const type = elements.formTitle.textContent.includes("Income")
      ? "income"
      : "expense";
    const amount = parseFloat(elements.amountInput.value);
    const description = elements.descInput.value.trim();
    const date = elements.dateInput.value;

    console.log("Type:", type, "Amount:", amount, "Date:", date);

    if (!amount || amount <= 0 || !date) {
      alert("Please enter a valid amount and date.");
      return;
    }

    try {
      const userId = currentUser.uid;
      const userRef = db.collection("users").doc(userId);
      const transactionRef = userRef.collection("transactions").doc();
      const transactionId = transactionRef.id;

      console.log("Transaction ID:", transactionId);
      await transactionRef.set({
        transactionId: transactionId,
        amount: amount,
        description: description,
        date: firebase.firestore.Timestamp.fromDate(new Date(date)),
        type: type,
      });
      console.log("Transaction written to Firestore");

      // Update currentBalance
      let newBalance;
      if (type === "income") {
        newBalance = (userData.currentBalance || 0) + amount;
      } else {
        newBalance = (userData.currentBalance || 0) - amount;
      }

      await userRef.update({
        currentBalance: newBalance,
      });

      userData.currentBalance = newBalance;
      elements.currentBalance.textContent = formatCurrency(newBalance);
      resetTransactionForm();
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Transaction failed. Please try again.");
    }
  };

  const quickAddSalary = async () => {
    if (!currentUser || !currentUser.uid) {
      alert("User session not found. Please reload and try again.");
      return;
    }

    if (userData.monthlyIncome <= 0) {
      alert("Monthly income not set or invalid");
      return;
    }

    if (
      confirm(
        `Add monthly salary of ${formatCurrency(
          userData.monthlyIncome
        )} to your balance?`
      )
    ) {
      elements.quickAddSalaryBtn.disabled = true;
      elements.quickAddSalaryBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Processing...';

      try {
        const userId = currentUser.uid;
        const userRef = db.collection("users").doc(userId);

        const newBalance =
          (userData.currentBalance || 0) + (userData.monthlyIncome || 0);

        await userRef.update({
          currentBalance: newBalance,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // Add salary transaction to the transactions sub-collection
        const transactionRef = userRef.collection("transactions").doc();
        const transactionId = transactionRef.id;
        await transactionRef.set({
          transactionId: transactionId,
          amount: userData.monthlyIncome,
          description: "Monthly Salary",
          date: firebase.firestore.Timestamp.fromDate(new Date()),
          type: "income",
        });
        console.log("Salary transaction added with ID: ", transactionId);

        userData.currentBalance = newBalance;

        elements.currentBalance.textContent = formatCurrency(newBalance);
        elements.quickAddSalaryBtn.disabled = false;
        elements.quickAddSalaryBtn.innerHTML =
          '<i class="fas fa-bolt"></i> Quick Add Salary';

        console.log("Quick salary added successfully");
      } catch (error) {
        console.error("Error adding salary:", error);
        alert("Failed to add salary. Please try again.");
        elements.quickAddSalaryBtn.disabled = false;
        elements.quickAddSalaryBtn.innerHTML =
          '<i class="fas fa-bolt"></i> Quick Add Salary';
      }
    }
  };

  const resetTransactionForm = () => {
    elements.transactionForm.classList.add("hidden");
    elements.amountInput.value = "";
    elements.descInput.value = "";
    elements.dateInput.value = new Date().toISOString().split("T")[0];
  };

  const initEventListeners = () => {
    elements.addExpenseBtn.addEventListener("click", () => {
      currentTransactionType = "expense";
      elements.formTitle.textContent = "Add Expense";
      elements.transactionForm.classList.remove("hidden");
    });

    elements.addIncomeBtn.addEventListener("click", () => {
      currentTransactionType = "income";
      elements.formTitle.textContent = "Add Income";
      elements.transactionForm.classList.remove("hidden");
    });

    elements.submitBtn.addEventListener("click", handleTransactionSubmit);
    elements.cancelBtn.addEventListener("click", resetTransactionForm);
    elements.quickAddSalaryBtn.addEventListener("click", quickAddSalary);
    elements.viewLogBtn.addEventListener("click", () => {
      window.location.href = "log.html";
    });

    elements.logoutBtn.addEventListener("click", () => {
      auth.signOut().then(() => {
        window.location.href = "index.html";
      });
    });

    elements.editIncomeBtn.addEventListener("click", showIncomeModal);
    elements.closeModal.addEventListener("click", hideIncomeModal);
    elements.saveIncomeBtn.addEventListener("click", updateMonthlyIncome);
    elements.incomeModal.addEventListener("click", (e) => {
      if (e.target === elements.incomeModal) hideIncomeModal();
    });
  };

  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      elements.userName.textContent =
        user.displayName || user.email.split("@")[0];
      loadUserData(user.uid);
      initEventListeners();
    } else {
      window.location.href = "index.html";
    }
  });

  // Set today's date as default
  elements.dateInput.value = new Date().toISOString().split("T")[0];
});
// Theme Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('theme-toggle');
  
  // Check for saved theme preference, default to light if none exists
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  // Apply the saved theme
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateIcon(savedTheme);
  
  // Toggle theme on button click
  themeToggle.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateIcon(newTheme);
  });
  
  // Update the icon based on theme
  function updateIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
  }
});
