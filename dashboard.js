document.addEventListener("DOMContentLoaded", function () {
  console.log("Dashboard loaded");

  if (!firebase.apps.length) {
    console.error("Firebase not initialized - check firebase-config.js");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // Currency settings
  let currentCurrency = 'INR';
  let exchangeRate = 83; // Default exchange rate USD to INR

  // Fetch current exchange rate
  async function fetchExchangeRate() {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      exchangeRate = data.rates.INR;
      updateExchangeRateDisplay();
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  }

  // Update exchange rate display
  function updateExchangeRateDisplay() {
    const rateDisplay = document.getElementById('exchange-rate');
    if (rateDisplay) {
      rateDisplay.textContent = `1 USD = ₹${exchangeRate.toFixed(2)}`;
    }
  }

  // Format currency based on selected currency
  const formatCurrency = (amount) => {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currentCurrency,
      maximumFractionDigits: 2
    }).format(amount);
    return formattedAmount;
  };

  // Validate amount against 999 crores limit
  function validateAmount(amount) {
    const maxLimit = 9990000000; // 999 crores in INR
    const amountInINR = currentCurrency === 'USD' ? amount * exchangeRate : amount;
    
    if (amountInINR > maxLimit) {
      return {
        isValid: false,
        message: `Amount cannot exceed ${formatCurrency(maxLimit)}`
      };
    }
    return { isValid: true };
  }

  // DOM elements
  const elements = {
    userName: document.getElementById("user-name"),
    editIncomeBtn: document.getElementById("edit-income-btn"),
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
    incomeModal: document.getElementById("income-modal"),
    closeModal: document.querySelector(".close-modal"),
    newMonthlyIncomeInput: document.getElementById("new-monthly-income"),
    saveIncomeBtn: document.getElementById("save-income-btn"),
    latestAmount: document.getElementById("latest-amount"),
    latestDescription: document.getElementById("latest-description"),
    latestDate: document.getElementById("latest-date"),
    balanceChart: document.getElementById("balance-chart"),
    lowBalanceAlert: document.getElementById("low-balance-alert"),
    currencySelect: document.getElementById("currency-select"),
  };

  // Initialize currency selector
  if (elements.currencySelect) {
    elements.currencySelect.addEventListener('change', (e) => {
      currentCurrency = e.target.value;
      loadUserData(currentUser.uid);
      updateBalanceChart(currentUser.uid);
    });
  }

  // Fetch exchange rate on load
  fetchExchangeRate();

  let currentUser = null;
  let userData = {
    currentBalance: 0,
    monthlyIncome: 0,
  };

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

  const updateBalanceChart = async (userId) => {
    try {
      const transactionsRef = db
        .collection("users")
        .doc(userId)
        .collection("transactions");
      const snapshot = await transactionsRef.orderBy("date", "asc").get();
      let balance = 0;
      const labels = [];
      const data = [];

      snapshot.forEach((doc) => {
        const tx = doc.data();
        balance += tx.type === "income" ? tx.amount : -tx.amount;
        labels.push(formatDate(tx.date));
        data.push(balance);
      });

      const ctx = elements.balanceChart.getContext("2d");
      new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Balance Over Time",
              data: data,
              borderColor: "#4f46e5",
              backgroundColor: "rgba(79, 70, 229, 0.1)",
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (value) => `$${value}` },
            },
          },
        },
      });
    } catch (error) {
      console.error("Failed to load balance chart:", error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date =
      timestamp instanceof firebase.firestore.Timestamp
        ? timestamp.toDate()
        : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString();
  };

  const loadLatestTransaction = async (userId) => {
    try {
      const transactionsRef = db
        .collection("users")
        .doc(userId)
        .collection("transactions");
      const snapshot = await transactionsRef
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      const latestTransaction = snapshot.docs.map((doc) => doc.data())[0];

      if (latestTransaction) {
        elements.latestAmount.textContent = formatCurrency(
          latestTransaction.amount
        );
        elements.latestDescription.textContent =
          latestTransaction.description || "N/A";
        elements.latestDate.textContent = formatDate(latestTransaction.date);
      } else {
        elements.latestAmount.textContent = formatCurrency(0);
        elements.latestDescription.textContent = "N/A";
        elements.latestDate.textContent = "--/--/----";
      }
    } catch (error) {
      console.error("Error loading latest transaction:", error);
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
        elements.lowBalanceAlert.classList.toggle(
          "hidden",
          userData.currentBalance >= 1000
        );
      } else {
        await db
          .collection("users")
          .doc(userId)
          .set({ currentBalance: 0, monthlyIncome: 0 });
        elements.currentBalance.textContent = "$0.00";
        elements.monthlyIncome.textContent = "$0.00";
        elements.lowBalanceAlert.classList.add("hidden");
      }
      loadLatestTransaction(userId);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    const type = elements.formTitle.textContent.includes("Income")
      ? "income"
      : "expense";
    const amount = parseFloat(elements.amountInput.value);
    const description = elements.descInput.value.trim();
    const dateValue = elements.dateInput.value;

    if (!amount || amount <= 0 || !dateValue) {
      alert("Please enter a valid amount and date.");
      return;
    }

    // Validate amount against limit
    const validation = validateAmount(amount);
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    try {
      const userId = currentUser.uid;
      const userRef = db.collection("users").doc(userId);
      const transactionRef = userRef.collection("transactions").doc();
      const transactionId = transactionRef.id;

      const transactionDate = new Date(dateValue);
      await transactionRef.set({
        transactionId: transactionId,
        amount: amount,
        description: description,
        date: firebase.firestore.Timestamp.fromDate(transactionDate),
        type: type,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        currency: currentCurrency
      });

      const newBalance =
        type === "income"
          ? userData.currentBalance + amount
          : userData.currentBalance - amount;
      await userRef.update({ currentBalance: newBalance });

      userData.currentBalance = newBalance;
      elements.currentBalance.textContent = formatCurrency(newBalance);
      elements.lowBalanceAlert.classList.toggle("hidden", newBalance >= 1000);

      resetTransactionForm();
      loadLatestTransaction(userId);
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Transaction failed. Please try again.");
    }
  };

  const resetTransactionForm = () => {
    elements.transactionForm.classList.add("hidden");
    elements.amountInput.value = "";
    elements.descInput.value = "";
    elements.dateInput.value = new Date().toISOString().split("T")[0];
  };

  const quickAddSalary = async () => {
    if (!currentUser || !userData.monthlyIncome) {
      alert("Invalid user or monthly income.");
      return;
    }

    if (
      confirm(
        `Add monthly salary of ${formatCurrency(userData.monthlyIncome)}?`
      )
    ) {
      elements.quickAddSalaryBtn.disabled = true;
      elements.quickAddSalaryBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Processing...';

      try {
        const userId = currentUser.uid;
        const userRef = db.collection("users").doc(userId);

        const newBalance = userData.currentBalance + userData.monthlyIncome;
        await userRef.update({ currentBalance: newBalance });

        const transactionRef = userRef.collection("transactions").doc();
        const today = new Date();
        await transactionRef.set({
          transactionId: transactionRef.id,
          amount: userData.monthlyIncome,
          description: "Monthly Salary",
          date: firebase.firestore.Timestamp.fromDate(today),
          type: "income",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        userData.currentBalance = newBalance;
        elements.currentBalance.textContent = formatCurrency(newBalance);
        elements.lowBalanceAlert.classList.toggle("hidden", newBalance >= 1000);

        elements.quickAddSalaryBtn.disabled = false;
        elements.quickAddSalaryBtn.innerHTML = "Quick Add Salary";
      } catch (error) {
        console.error("Error during quick salary add:", error);
        alert("Failed to add salary.");
        elements.quickAddSalaryBtn.disabled = false;
        elements.quickAddSalaryBtn.innerHTML = "Quick Add Salary";
      }
    }
  };

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      elements.userName.textContent = `Welcome, ${
        user.displayName || user.email
      }`;
      loadUserData(user.uid);
      updateBalanceChart(user.uid);
    } else {
      window.location.replace("index.html");
    }
  });

  // Event listeners
  elements.editIncomeBtn.addEventListener("click", showIncomeModal);
  elements.saveIncomeBtn.addEventListener("click", updateMonthlyIncome);
  elements.cancelBtn.addEventListener("click", resetTransactionForm);
  elements.addIncomeBtn.addEventListener("click", () => {
    elements.formTitle.textContent = "Add Income";
    elements.transactionForm.classList.remove("hidden");
  });
  elements.addExpenseBtn.addEventListener("click", () => {
    elements.formTitle.textContent = "Add Expense";
    elements.transactionForm.classList.remove("hidden");
  });
  elements.logoutBtn.addEventListener("click", () => auth.signOut());
  elements.closeModal.addEventListener("click", hideIncomeModal);
  elements.viewLogBtn.addEventListener(
    "click",
    () => (window.location.href = "log.html")
  );
  elements.quickAddSalaryBtn.addEventListener("click", quickAddSalary);
  elements.submitBtn.addEventListener("click", handleTransactionSubmit);
});
// Theme Toggle Functionality
document.addEventListener("DOMContentLoaded", function () {
  const themeToggle = document.getElementById("theme-toggle");

  // Check for saved theme preference, default to light if none exists
  const savedTheme = localStorage.getItem("theme") || "light";

  // Apply the saved theme
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateIcon(savedTheme);

  // Toggle theme on button click
  themeToggle.addEventListener("click", function () {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateIcon(newTheme);
  });

  // Update the icon based on theme
  function updateIcon(theme) {
    const icon = themeToggle.querySelector("i");
    if (theme === "dark") {
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
    } else {
      icon.classList.remove("fa-sun");
      icon.classList.add("fa-moon");
    }
  }
});
