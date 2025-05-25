document.addEventListener("DOMContentLoaded", function () {
  console.log("Transaction Log loaded");

  if (!firebase.apps.length) {
    console.error("Firebase not initialized - check firebase-config.js");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  let currentUser;

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
    exportPdfBtn: document.getElementById("export-pdf-btn"), // Single PDF button
    exportDateModal: document.getElementById("export-date-modal"), // Modal
    pdfStartDateInput: document.getElementById("pdf-start-date"), // Start date in modal
    pdfEndDateInput: document.getElementById("pdf-end-date"), // End date in modal
    exportPdfWithDateBtn: document.getElementById("export-pdf-with-date-btn"), // Export button in modal
    cancelPdfExportBtn: document.getElementById("cancel-pdf-export-btn"), // Cancel button in modal
    closeModalBtn: document.querySelector(".close-modal-btn"), // Close button in modal
  };

  const formatCurrency = (amount) => {
    return "$" + (amount || 0).toFixed(2);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    let date;

    if (timestamp instanceof firebase.firestore.Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === "number") {
      date = new Date(timestamp * 1000);
    } else if (typeof timestamp === "object" && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      try {
        date = new Date(timestamp);
      } catch (e) {
        console.error("Error converting timestamp:", timestamp, e);
        return "Invalid Date";
      }
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dateOnly = new Date(year, month, day);

    return dateOnly.toLocaleDateString();
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  let transactions = [];
  let sortOrder = {
    amount: "none",
    date: "desc",
  };
  let currentFilter = "all";

  const loadTransactions = async (userId, filterType = "all") => {
    if (!userId) {
      console.error("User ID is undefined. Cannot load transactions.");
      return;
    }

    try {
      let query = db.collection("users").doc(userId).collection("transactions");

      if (filterType !== "all") {
        query = query.where("type", "==", filterType);
      }
      query = query.orderBy("date", "desc");

      const querySnapshot = await query.get();
      transactions = [];
      let totalIncome = 0;
      let totalExpenses = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push(data);
        if (data.type === "income") {
          totalIncome += data.amount;
        } else if (data.type === "expense") {
          totalExpenses += Math.abs(data.amount);
        }
      });
      renderTransactions(transactions, totalIncome, totalExpenses, filterType);
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  const renderTransactions = (
    transactions,
    totalIncome,
    totalExpenses,
    filterType
  ) => {
    const transactionsTableBody =
      elements.transactionsTable.querySelector("tbody");
    transactionsTableBody.innerHTML = "";

    transactions.forEach((transaction) => {
      if (filterType === "all" || transaction.type === filterType) {
        const row = transactionsTableBody.insertRow();
        const dateCell = row.insertCell();
        const typeCell = row.insertCell();
        const descriptionCell = row.insertCell();
        const amountCell = row.insertCell();

        dateCell.textContent = formatDate(transaction.date);
        typeCell.textContent = transaction.type;
        descriptionCell.textContent = transaction.description || "--";
        amountCell.textContent = formatCurrency(transaction.amount);
        amountCell.className =
          transaction.type === "expense" ? "expense" : "income";
      }
    });

    const netChange = totalIncome - totalExpenses;
    elements.totalIncome.textContent = formatCurrency(totalIncome);
    elements.totalExpenses.textContent = formatCurrency(totalExpenses);
    elements.netChange.textContent = formatCurrency(netChange);
    elements.netChange.className = netChange < 0 ? "negative" : "positive";
  };

  const filterTransactionsByDate = (startDate, endDate) => {
    return transactions.filter((transaction) => {
      const transactionDate =
        transaction.date instanceof firebase.firestore.Timestamp
          ? transaction.date.toDate()
          : new Date(transaction.date); // Handle different date formats

      return transactionDate >= startDate && transactionDate <= endDate;
    });
  };

  const exportToPDF = (
    exportTransactions,
    startDate = null,
    endDate = null
  ) => {
    if (!exportTransactions || exportTransactions.length === 0) {
      alert("No transactions to export for the selected criteria.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const columns = ["Date", "Type", "Description", "Amount"];
    const data = exportTransactions.map((transaction) => [
      formatDate(transaction.date),
      transaction.type,
      transaction.description || "--",
      formatCurrency(transaction.amount),
    ]);

    const title = "Transaction Log";
    const dateRangeText =
      startDate && endDate
        ? ` (From: ${formatDate(startDate)} To: ${formatDate(endDate)})`
        : " (Current Filter)";

    pdf.autoTable({
      head: [columns],
      body: data,
      startY: 20,
      columnStyles: { 3: { halign: "right" } },
      didDrawPage: function (data) {
        pdf.text(title + dateRangeText, data.settings.margin.left, 10);
      },
    });

    const filename = `transactions_${currentFilter}_${
      startDate ? formatDate(startDate) + "_" : ""
    }${endDate ? formatDate(endDate) : ""}.pdf`;
    pdf.save(filename);
  };

  const showExportDateModal = () => {
    console.log("showExportDateModal called");
    console.log("Modal Element:", elements.exportDateModal); // Verify the element
    elements.exportDateModal.style.display = "block";
  };

  const hideExportDateModal = () => {
    elements.exportDateModal.style.display = "none"; // Hide the modal
  };

  const handleExportPDFWithDate = () => {
    const startDateInput = elements.pdfStartDateInput.value;
    const endDateInput = elements.pdfEndDateInput.value;

    let startDate = null;
    let endDate = null;

    if (startDateInput) {
      startDate = new Date(startDateInput);
      if (isNaN(startDate.getTime())) {
        alert("Invalid start date format.");
        return;
      }
    }

    if (endDateInput) {
      endDate = new Date(endDateInput);
      if (isNaN(endDate.getTime())) {
        alert("Invalid end date format.");
        return;
      }
      endDate.setDate(endDate.getDate() + 1); // Include the end date
    }

    let filteredTransactions = transactions.filter(
      (transaction) =>
        currentFilter === "all" || transaction.type === currentFilter
    );

    if (startDate || endDate) {
      filteredTransactions = filterTransactionsByDate(startDate, endDate);
    }

    exportToPDF(filteredTransactions, startDate, endDate);
    hideExportDateModal();
  };

  const initEventListeners = () => {
    elements.filterAll.addEventListener("click", () => {
      currentFilter = "all";
      elements.filterAll.classList.add("active");
      elements.filterIncome.classList.remove("active");
      elements.filterExpense.classList.remove("active");
      loadTransactions(currentUser.uid, "all");
    });

    elements.filterIncome.addEventListener("click", () => {
      currentFilter = "income";
      elements.filterAll.classList.remove("active");
      elements.filterIncome.classList.add("active");
      elements.filterExpense.classList.remove("active");
      loadTransactions(currentUser.uid, "income");
    });

    elements.filterExpense.addEventListener("click", () => {
      currentFilter = "expense";
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

    elements.exportPdfBtn.addEventListener("click", showExportDateModal); // Call the function to show the modal
    elements.closeModalBtn.addEventListener("click", hideExportDateModal); // Close modal
    elements.cancelPdfExportBtn.addEventListener("click", hideExportDateModal); // Cancel export
    elements.exportPdfWithDateBtn.addEventListener(
      "click",
      handleExportPDFWithDate
    ); // Export with date range
  };

  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("User authenticated:", user.uid);
      currentUser = user;
      elements.userName.textContent =
        user.displayName || user.email.split("@")[0];
      loadTransactions(user.uid, currentFilter);
      initEventListeners(); // ENSURE THIS IS UNCOMMENTED
    } else {
      console.log("No user signed in, redirecting...");
      window.location.href = "index.html";
    }
  });
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
