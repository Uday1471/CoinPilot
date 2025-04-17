document.addEventListener("DOMContentLoaded", function () {
  console.log("Transaction Log loaded");

  // Firebase should be initialized in firebase-config.js
  if (!firebase.apps.length) {
    console.error("Firebase not initialized - check firebase-config.js");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // DOM Elements
  const elements = {
    userName: document.getElementById("log-user-name"),
    logoutBtn: document.getElementById("logout-btn"),
    transactionsTable: document.getElementById("transactions-table"),
    totalIncome: document.getElementById("total-income"),
    totalExpenses: document.getElementById("total-expenses"),
    netChange: document.getElementById("net-change"),
    filterAll: document.getElementById("filter-all"),
    filterIncome: document.getElementById("filter-income"),
    filterExpense: document.getElementById("filter-expense"),
  };

  // Format currency
  const formatCurrency = (amount) => {
    return "$" + (amount || 0).toFixed(2);
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Load and render transactions with filtering
  const loadTransactions = async (userId, filterType = "all") => {
    try {
      let query = db
        .collection("users")
        .doc(userId)
        .collection("transactions")
        .orderBy("date", "desc");

      if (filterType !== "all") {
        query = query.where("type", "==", filterType);
      }

      const querySnapshot = await query.get();

      const transactions = [];
      let totalIncome = 0;
      let totalExpenses = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push(data);

        // Summing based on the transaction type (positive for income, negative for expenses)
        if (data.amount > 0) {
          totalIncome += data.amount;
        } else {
          totalExpenses += Math.abs(data.amount); // Subtracting for expenses
        }
      });

      renderTransactions(transactions, totalIncome, totalExpenses);
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  // Render transactions to table
  const renderTransactions = (transactions, totalIncome, totalExpenses) => {
    // Clear existing rows (except header)
    while (elements.transactionsTable.rows.length > 1) {
      elements.transactionsTable.deleteRow(1);
    }

    // Add transaction rows
    transactions.forEach((transaction) => {
      const row = elements.transactionsTable.insertRow();

      const dateCell = row.insertCell(0);
      dateCell.textContent = formatDate(transaction.date);

      const typeCell = row.insertCell(1);
      typeCell.textContent =
        transaction.type === "expense" ? "Expense" : "Income";
      typeCell.className =
        transaction.type === "expense" ? "expense" : "income";

      const descCell = row.insertCell(2);
      descCell.textContent = transaction.description || "--";

      const amountCell = row.insertCell(3);
      amountCell.textContent = formatCurrency(transaction.amount);
      amountCell.className = transaction.amount < 0 ? "negative" : "positive";
    });

    // Update summary (Total income, expenses, and net change)
    const netChange = totalIncome - totalExpenses;
    elements.totalIncome.textContent = formatCurrency(totalIncome);
    elements.totalExpenses.textContent = formatCurrency(totalExpenses);
    elements.netChange.textContent = formatCurrency(netChange);
    elements.netChange.className = netChange < 0 ? "negative" : "positive";
  };

  // Initialize event listeners
  const initEventListeners = () => {
    elements.filterAll.addEventListener("click", () => {
      elements.filterAll.classList.add("active");
      elements.filterIncome.classList.remove("active");
      elements.filterExpense.classList.remove("active");
      loadTransactions(currentUser.uid, "all");
    });

    elements.filterIncome.addEventListener("click", () => {
      elements.filterAll.classList.remove("active");
      elements.filterIncome.classList.add("active");
      elements.filterExpense.classList.remove("active");
      loadTransactions(currentUser.uid, "income");
    });

    elements.filterExpense.addEventListener("click", () => {
      elements.filterAll.classList.remove("active");
      elements.filterIncome.classList.remove("active");
      elements.filterExpense.classList.add("active");
      loadTransactions(currentUser.uid, "expense");
    });

    elements.logoutBtn.addEventListener("click", () => {
      auth.signOut().then(() => {
        window.location.href = "index.html";
      });
    });
  };

  // Auth state listener
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("User authenticated:", user.uid);
      currentUser = user;
      elements.userName.textContent =
        user.displayName || user.email.split("@")[0];
      loadTransactions(user.uid);
      initEventListeners();
    } else {
      console.log("No user signed in, redirecting...");
      window.location.href = "index.html";
    }
  });
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
