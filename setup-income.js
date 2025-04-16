document.addEventListener("DOMContentLoaded", function () {
  const auth = firebase.auth();
  const db = firebase.firestore();

  const form = document.getElementById("income-setup-form");
  const currentBalanceInput = document.getElementById("current-balance");
  const incomeAmountInput = document.getElementById("income-amount");
  const incomeSource = document.getElementById("income-source");
  const otherSourceGroup = document.getElementById("other-source-group");
  const submitBtn = document.getElementById("submit-btn");
  const formAlerts = document.getElementById("form-alerts");

  // Load registration data from sessionStorage
  const name = sessionStorage.getItem("signupName");
  const email = sessionStorage.getItem("signupEmail");
  const password = sessionStorage.getItem("signupPassword");

  // If no data in sessionStorage, redirect to login
  if (!name || !email || !password) {
    window.location.href = "index.html";
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const financialData = getFormData();
    if (!validateForm(financialData)) return;

    try {
      setLoadingState(true);

      // Create Firebase Auth user
      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      // Write user data to Firestore
      await db
        .collection("users")
        .doc(user.uid)
        .set({
          name: name,
          email: email,
          ...financialData,
          setupComplete: true,
          isFirstTime: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      sessionStorage.clear(); // Clear temp data
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Error completing signup:", error);
      showAlert("error", error.message);
      setLoadingState(false);
    }
  });

  function getFormData() {
    return {
      currentBalance: parseFloat(currentBalanceInput.value),
      monthlyIncome: parseFloat(incomeAmountInput.value),
      incomeSource:
        incomeSource.value === "Other"
          ? document.getElementById("other-source").value.trim()
          : incomeSource.value,
      incomeFrequency: document.getElementById("income-frequency").value,
    };
  }

  function validateForm(data) {
    let isValid = true;
    resetValidation();

    if (isNaN(data.currentBalance) || data.currentBalance === "") {
      markInvalid(currentBalanceInput, "Please enter a valid current balance");
      isValid = false;
    }

    if (isNaN(data.monthlyIncome) || data.monthlyIncome <= 0) {
      markInvalid(incomeAmountInput, "Please enter a valid monthly income");
      isValid = false;
    }

    if (!data.incomeSource) {
      markInvalid(incomeSource, "Please select an income source");
      isValid = false;
    }

    if (incomeSource.value === "Other" && !data.incomeSource.trim()) {
      markInvalid(
        document.getElementById("other-source"),
        "Please specify your income source"
      );
      isValid = false;
    }

    if (!isValid) {
      showAlert("error", "Please fix the highlighted fields");
    }

    return isValid;
  }

  function markInvalid(element, message) {
    element.classList.add("error-border");
    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
    errorElement.textContent = message;
    errorElement.style.color = "#e74c3c";
    errorElement.style.fontSize = "0.8rem";
    errorElement.style.marginTop = "0.25rem";
    element.parentNode.appendChild(errorElement);
  }

  function resetValidation() {
    document
      .querySelectorAll(".error-border")
      .forEach((el) => el.classList.remove("error-border"));
    document.querySelectorAll(".error-message").forEach((el) => el.remove());
  }

  function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.innerHTML = isLoading
      ? '<i class="fas fa-spinner fa-spin"></i> Processing...'
      : '<i class="fas fa-save"></i> Save & Continue';
  }

  function showAlert(type, message) {
    formAlerts.innerHTML = `
          <div class="alert alert-${type}">
            ${message}
          </div>
        `;
    setTimeout(() => (formAlerts.innerHTML = ""), 5000);
  }
});
