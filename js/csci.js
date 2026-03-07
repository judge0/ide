
  //--------------------------------------------------
async function showSignInModal() {
  $('#judge0-csci-sign-in-modal')
  .modal({closable: false}).modal('show');
}

// csci.js (frontend, running on port 3000)
async function signIn() {
  alert("Sign in functionality is not implemented yet.");
 const username = document.getElementById("modal_username").value;
  const password = document.getElementById("modal_password").value;

  const response = await fetch("https://localhost:4000/ssh-sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();

  if (result.success) {
    alert("Connected to CSCI server!");
  } else {
    alert("Login failed: " + result.error);
  }
}


async function signOut() {
alert("Sign out functionality is not implemented yet.");
}  


document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("judge0-csci-sign-in-btn").addEventListener("click", showSignInModal);

    document.getElementById("judge0-csci-modal-sign-in-btn").addEventListener("click", signIn);
    document.getElementById("judge0-csci-modal-sign-in-cancel-btn").addEventListener("click", function (event) {
        $('#judge0-csci-sign-in-modal').modal('hide');

    });
    //updateSignInUI();
});

