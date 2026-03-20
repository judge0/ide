
//--------------------------------------------------

// Show a brief slide-in notification in the top-right corner
function showNotification(message, type) {
  // type is "success", "error", or "warning" — maps to Semantic UI message colors
  const colorClass = type === "success" ? "green" : type === "error" ? "red" : "yellow";

  const note = document.createElement("div");
  note.className = `ui ${colorClass} message`;
  note.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    z-index: 9999;
    min-width: 250px;
    max-width: 360px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    transition: opacity 0.4s ease;
  `;
  note.innerText = message;
  document.body.appendChild(note);

  // Fade out and remove after 3 seconds
  setTimeout(() => {
    note.style.opacity = "0";
    setTimeout(() => note.remove(), 400);
  }, 3000);
}

async function showSignInModal() {
  $('#judge0-csci-sign-in-modal')
    .modal({ closable: false }).modal('show');
}

async function hideSignInModal() {
  $('#judge0-csci-sign-in-modal').modal('hide');
}

async function signIn() {
  const username = document.getElementById("modal_username").value;
  const password = document.getElementById("modal_password").value;

  try {
    const response = await fetch("/ssh-sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    console.log("Server response:", result);

    if (result.success) {
      $('#judge0-csci-sign-in-modal').modal('hide');
      showNotification(`Connected to CSCI server as ${username}`, "success");
    } else {
      showNotification("Login failed: " + result.error, "error");
    }
  } catch (err) {
    console.error("Fetch error:", err);
    showNotification("Error connecting to server. See console for details.", "error");
  }
}

async function signOut() {
  const usernameInput = document.getElementById("modal_username");
  const passwordInput = document.getElementById("modal_password");

  try {
    const response = await fetch("/ssh-sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "exit" })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();
    console.log("Server response:", result);

    showNotification("Disconnected from CSCI server.", "warning");

  } catch (err) {
    console.error("Error signing out:", err);
    showNotification("Error signing out. See console for details.", "error");
  } finally {
    if (usernameInput) usernameInput.value = "";
    if (passwordInput) passwordInput.value = "";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("judge0-csci-sign-in-btn").addEventListener("click", showSignInModal);
  document.getElementById("judge0-csci-modal-sign-in-btn").addEventListener("click", signIn);
  document.getElementById("judge0-csci-modal-sign-in-cancel-btn").addEventListener("click", hideSignInModal);
  document.getElementById("judge0-csci-sign-out-btn").addEventListener("click", signOut);
});
