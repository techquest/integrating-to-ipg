var timestampString = new Date().getTime().toString();

var configuration = {
  paymentParameters: {
    amount: 150000,
    currencyCode: "566",
    dateOfPayment: "2020-03-08T00:00:00",
    payableCode: "Default_Payable_MX19329",
    merchantCustomerName: "CIROMA CHUKUMA ADEKUNLE",
    merchantCode: "MX19329",
    transactionReference: "isw_hosted_field_test:" + timestampString
  },
  fields: {
    cardNumber: {
      selector: "#cardNumber-container",
      placeholder: "Card Number",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        backgroundColor: "white",
        fontFamily: "monospace"
      }
    },
    expirationDate: {
      selector: "#expirationDate-container",
      placeholder: "MM / YY",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        backgroundColor: "white",
        fontFamily: "monospace"
      }
    },
    cvv: {
      selector: "#cvv-container",
      placeholder: "CVV",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        backgroundColor: "white",
        fontFamily: "monospace"
      }
    },
    pin: {
      selector: "#pin-container",
      placeholder: "PIN",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        backgroundColor: "white",
        fontFamily: "monospace",
        textAlign: "center"
      }
    },
    otp: {
      selector: "#otp-container",
      placeholder: "OTP",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        backgroundColor: "white",
        textAlign: "center",
        fontFamily: "monospace"
      }
    }
  },
  cardinal: {
    containerSelector: ".cardinal-container",
    activeClass: "show"
  }
};

var instance, showFormErrors = false,focusedField;

  // Buttons and loader
var payButton = document.getElementById("pay-button");
var continueButton = document.getElementById("continue-button");
var validateButton = document.getElementById("validate-button");
var pinBackButton = document.getElementById("pin-back-button");
var otpBackButton = document.getElementById("otp-back-button");
var paymentLoading = document.getElementById("payment-loading");
var continueLoading = document.getElementById("continue-loading");
var validateLoading = document.getElementById("validate-loading");

function showPaymentPage() {
  isw.hostedFields.create(configuration, createHandler);
}

pinBackButton.addEventListener("click", function() {
  setActivePage("card-details");
  instance.clearField("pin");
});

otpBackButton.addEventListener("click", function() {
  setActivePage("pin");
  instance.clearField("otp");
});

//Create hosted field instance callback
function createHandler(createError, hostedFieldsInstance) {
  //handle create error
  if (createError != null) {
    var errorName = createError.name;
    var errorMessage = createError.message;

    alert(errorName + "\n" + errorMessage);
    return;
  }

  // set payment placeholder in payment form
  var selectedAmount = parseInt(configuration.paymentParameters.amount);
  var amountInMajor = selectedAmount / 100;
  document.querySelector("#amount-placeholder").innerHTML =
    "&#8358; " + amountInMajor;

  document.querySelector(".payment-form-container").style.display = "block";

  //expose instance to outer scope
  instance = hostedFieldsInstance;

  //Register focus handler to process event when a field gains focus
  instance.on("focus", function(event) {
    var fieldContainerEl = document.querySelector(event.selector);
    fieldContainerEl.style.borderBottomColor = "#a0c8e2";

    focusedField = event.fieldType;

    if (!showFormErrors) {
      return;
    }

    var validationState = instance.getFieldsState();

    checkFieldsValidation(
      ["cardNumber", "expirationDate", "cvv", "pin", "otp"],
      validationState
    );
  });

  //Register blur handler to process event when a field loses focus
  instance.on("blur", function(event) {
    var fieldName = event.fieldType;

    var fieldContainerEl = document.querySelector(event.selector);
    fieldContainerEl.style.borderBottomColor = "#e4e4e4";

    if (showFormErrors) {
      var validationState = instance.getFieldsState();

      if (!validationState[fieldName].valid) {
        fieldContainerEl.style.borderBottomColor = "red";
      }
    }
  });

  //Register validation handler to run some code when validation state updates
  instance.on("validation", function(validationState) {
    if (!showFormErrors) {
      return;
    }

    checkFieldsValidation(
      ["cardNumber", "expirationDate", "cvv", "pin", "otp"],
      validationState
    );
  });

  //Register cardinal-response handler to execute some code when cardinal paymnet completes
  instance.on("cardinal-response", handleCardinalValidateResponse);

  payButton.addEventListener("click", function() {
    paymentLoading.style.display = "inline";

    showFormErrors = true;

    var validationState = instance.getFieldsState();

    var fieldsValid = checkFieldsValidation(
      ["cardNumber", "expirationDate", "cvv"],
      validationState
    );

    if (!fieldsValid) {
      return;
    }

    instance.getBinConfiguration(handleBinConfigResponse);
  });

  continueButton.addEventListener("click", function() {
    continueLoading.style.display = "inline";

    var validationState = instance.getFieldsState();

    var fieldsValid = checkFieldsValidation(["pin"], validationState);

    if (!fieldsValid) {
      return;
    }

    instance.makePayment(handlePayResponse);
  });

  validateButton.addEventListener("click", function() {
    validateLoading.style.display = "inline";
    console.log("CLICKED VALIDATE");
    instance.validatePayment(handleValidateResponse);
  });
}

function handleBinConfigResponse(err, response) {
  paymentLoading.style.display = "none";

  if (err != null && err.validationError === true) {
    showNotification("Validation Error", true);
    return;
  }

  if (err != null && err.networkError === true) {
    showNotification("Network Error", true);
    return;
  }

  if (err !== null) {
    showNotification(
      "Could not process the request. " + err.responseCode,
      true
    );
    return;
  }

  if (response.supportsPin) {
    setActivePage("pin");
    return;
  }

  instance.makePayment(handlePayResponse);
}

function handlePayResponse(err, response) {
  continueLoading.style.display = "none";

  if (err != null && err.validationError === true) {
    showNotification("Validation Error", true);
    return;
  }

  if (err != null && err.networkError === true) {
    showNotification("Network Error", true);
    return;
  }

  if (err != null) {
    showNotification("Payment failed. " + err.responseCode, true);
    return;
  }

  if (response.responseCode === "00") {
    showNotification("Transaction successful", false);
    setActivePage("card-details");
    return;
  }

  if (
    response.responseCode === "T0" &&
    response.requiresCentinelAuthorization === true
  ) {
    setActivePage("cardinal");
    return;
  }

  if (response.responseCode === "T0") {
    setActivePage("otp");
    return;
  }

  showNotification("Payment failed. " + response.responseCode, true);
}

function handleValidateResponse(err, response) {
  console.log("VALIDATION RESPONSE: ", response);
  validateLoading.style.display = "none";

  if (err != null && err.validationError === true) {
    showNotification("Validation Error", true);
    return;
  }

  if (err != null && err.networkError === true) {
    showNotification("Network Error", true);
    return;
  }

  if (err != null) {
    showNotification("Payment validation failed. " + err.responseCode, true);
    return;
  }

  if (response.responseCode === "00") {
    showNotification("Transaction successful", false);
    setActivePage("card-details");
    return;
  }

  showNotification("Payment validation failed. " + response.responseCode, true);
}

function handleCardinalValidateResponse(err, response) {
  setActivePage("card-details");

  if (err != null && err.validationError === true) {
  }

  if (err != null) {
    showNotification("Something went wrong", true);
    return;
  }

  if (response.responseCode === "00") {
    showNotification("Transaction successful", false);
    return;
  }

  showNotification(
    "Cardinal payment validation failed. " + response.responseCode,
    true
  );
}

function setActivePage(pageName) {
  var pages = document.querySelectorAll(".form-page");

  for (var i = 0; i < pages.length; i++) {
    var page = pages[i];
    page.classList.remove("show");
  }

  var activePage = document.querySelector(".form-page." + pageName);
  activePage.classList.add("show");
}

function showNotification(message, isError) {
  var notificationBoxEl = document.querySelector(".notification-box");
  notificationBoxEl.classList.add("show");

  var contentEl = notificationBoxEl.querySelector(".content");
  contentEl.innerHTML = message;

  contentEl.classList.remove("error");
  contentEl.classList.remove("success");

  contentEl.classList.add(isError ? "error" : "success");

  setTimeout(function() {
    notificationBoxEl.classList.remove("show");
  }, 3000);
}

function checkFieldsValidation(fieldNames, validationState) {
  var formFieldsValid = true;

  for (var i = 0; i < fieldNames.length; i++) {
    var fieldName = fieldNames[i];
    var fieldValidationState = validationState[fieldName];

    var fieldSelector = fieldValidationState.selector;
    var fieldContainerEl = document.querySelector(fieldSelector);

    if (fieldValidationState.valid === false) {
      formFieldsValid = false;

      fieldContainerEl.style.borderBottomColor = "red";
      continue;
    }

    if (focusedField === fieldName) {
      fieldContainerEl.style.borderBottomColor = "#a0c8e2";
    } else {
      fieldContainerEl.style.borderBottomColor = "#e4e4e4";
    }
  }

  return formFieldsValid;
}
