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
    sortByAmount: document.createElement("button"),
    sortByDate: document.createElement("button"),
  };

  const formatCurrency = (amount) => {
    return "$" + (amount || 0).toFixed(2);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    let date;

    if (timestamp instanceof firebase.firestore.Timestamp) {
      date = timestamp.toDate();
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

    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  let transactions = [];
  let sortOrder = { amount: "none", date: "desc" };

  const loadTransactions = async (userId, filterType = "all") => {
    if (!userId) {
      console.error("User ID is undefined. Cannot load transactions.");
      return;
    }

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

      renderTransactions(transactions, totalIncome, totalExpenses);
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  const renderTransactions = (transactions, totalIncome, totalExpenses) => {
    while (elements.transactionsTable.rows.length > 1) {
      elements.transactionsTable.deleteRow(1);
    }

    transactions.forEach((transaction) => {
      const row = elements.transactionsTable.insertRow();

      const descriptionCell = row.insertCell(0);
      descriptionCell.textContent = transaction.description || "--";

      const amountCell = row.insertCell(1);
      amountCell.textContent = formatCurrency(transaction.amount);
      amountCell.className =
        transaction.type === "expense" ? "expense" : "income";

      const dateCell = row.insertCell(2);
      dateCell.textContent = formatDate(transaction.date);
    });

    const netChange = totalIncome - totalExpenses;
    elements.totalIncome.textContent = formatCurrency(totalIncome);
    elements.totalExpenses.textContent = formatCurrency(totalExpenses);
    elements.netChange.textContent = formatCurrency(netChange);
    elements.netChange.className = netChange < 0 ? "negative" : "positive";
  };

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

    elements.sortByAmount.addEventListener("click", () => {
      if (sortOrder.amount === "none" || sortOrder.amount === "desc") {
        transactions.sort((a, b) => a.amount - b.amount);
        sortOrder.amount = "asc";
      } else {
        transactions.sort((a, b) => b.amount - a.amount);
        sortOrder.amount = "desc";
      }
      renderTransactions(
        transactions,
        parseFloat(elements.totalIncome.textContent.slice(1)),
        parseFloat(elements.totalExpenses.textContent.slice(1))
      );
    });

    elements.sortByDate.addEventListener("click", () => {
      if (sortOrder.date === "none" || sortOrder.date === "desc") {
        transactions.sort((a, b) => a.date.seconds - b.date.seconds);
        sortOrder.date = "asc";
      } else {
        transactions.sort((a, b) => b.date.seconds - a.date.seconds);
        sortOrder.date = "desc";
      }
      renderTransactions(
        transactions,
        parseFloat(elements.totalIncome.textContent.slice(1)),
        parseFloat(elements.totalExpenses.textContent.slice(1))
      );
    });
  };

  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("User authenticated:", user.uid);
      currentUser = user;
      elements.userName.textContent =
        user.displayName || user.email.split("@")[0];

      const tableHeaderRow =
        elements.transactionsTable.querySelector("thead tr");
      const sortHeaderCellAmount = document.createElement("th");
      const sortHeaderCellDate = document.createElement("th");

      elements.sortByAmount.textContent = "Amount";
      elements.sortByDate.textContent = "Date";
      elements.sortByAmount.classList.add("sort-button");
      elements.sortByDate.classList.add("sort-button");

      sortHeaderCellAmount.appendChild(elements.sortByAmount);
      sortHeaderCellDate.appendChild(elements.sortByDate);
      tableHeaderRow.appendChild(sortHeaderCellAmount);
      tableHeaderRow.appendChild(sortHeaderCellDate);

      loadTransactions(user.uid);
      initEventListeners();
    } else {
      console.log("No user signed in, redirecting...");
      window.location.href = "index.html";
    }
  });
});
