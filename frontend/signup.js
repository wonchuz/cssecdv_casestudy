const form = document.getElementById("signupForm");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm-password");

const rules = {
    length: document.getElementById("length"),
    uppercase: document.getElementById("uppercase"),
    lowercase: document.getElementById("lowercase"),
    number: document.getElementById("number"),
    special: document.getElementById("special"),
};

const matchMessage = document.getElementById("matchMessage");

function showErrors(password) {
    // Show only invalid rules, hide valid ones
    if (password.length >= 8) {
        rules.length.style.display = "none";
    } else {
        rules.length.style.display = "block";
        rules.length.className = "invalid";
    }

    if (/[A-Z]/.test(password)) {
        rules.uppercase.style.display = "none";
    } else {
        rules.uppercase.style.display = "block";
        rules.uppercase.className = "invalid";
    }

    if (/[a-z]/.test(password)) {
        rules.lowercase.style.display = "none";
    } else {
        rules.lowercase.style.display = "block";
        rules.lowercase.className = "invalid";
    }

    if (/\d/.test(password)) {
        rules.number.style.display = "none";
    } else {
        rules.number.style.display = "block";
        rules.number.className = "invalid";
    }

    if (/[@$!%*?&]/.test(password)) {
        rules.special.style.display = "none";
    } else {
        rules.special.style.display = "block";
        rules.special.className = "invalid";
    }
}

function showMatchMessage(password, confirm) {
    if (password && confirm && password !== confirm) {
        matchMessage.style.display = "block";
        matchMessage.className = "invalid";
    } else {
        matchMessage.style.display = "none";
    }
}

form.addEventListener("submit", function (e) {
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    showErrors(password);
    showMatchMessage(password, confirm);

    const allValid = 
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[@$!%*?&]/.test(password) &&
        password === confirm;

    if (!allValid) {
        e.preventDefault(); // prevent form submit if invalid
    }
});
