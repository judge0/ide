
//--------------------------------------------------
async function showSignInModal() {
  $('#judge0-csci-sign-in-modal')
    .modal({ closable: false }).modal('show');
}
async function hideSignInModal()
{
$('#judge0-csci-sign-in-modal').modal('hide');
}

// csci.js (frontend, running on port 4000)
async function signIn() {
 // alert("Sign in functionality is not implemented yet.");
  const username = document.getElementById("modal_email").value;
  const password = document.getElementById("modal_password").value;
try{
const response = await fetch("/ssh-sign-in", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password })
});
  const result = await response.json();
 console.log("Server response:", result);

    if (result.success) {
      alert("Connected to CSCI server!");
      $('#judge0-csci-sign-in-modal').modal('hide'); // hide modal
    } else {
      alert("Login failed: " + result.error);
    }
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Error connecting to server. See console for details.");
  }
 
}

async function signOut() {
 const usernameInput = document.getElementById("modal_email");
const passwordInput = document.getElementById("modal_password");

try {
  // Send a request to the backend to terminate the SSH session
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

  alert("Disconnected from CSCI server (SSH session closed).");

} catch (err) {
  console.error("Error signing out:", err);
  alert("Error signing out. See console for details.");
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
  //updateSignInUI();


