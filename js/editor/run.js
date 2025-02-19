"use strict";
import editor from "./editor.js";

var gRunButton;

function disableRunButton() {
    gRunButton.disabled = true;

    const icon = gRunButton.querySelector("i");
    icon.classList.remove("fa-solid", "fa-play");
    icon.classList.add("fa-solid", "fa-spinner", "animate-spin");
}

function enableRunButton() {
    gRunButton.disabled = false;

    const icon = gRunButton.querySelector("i");
    icon.classList.remove("fa-solid", "fa-spinner", "animate-spin");
    icon.classList.add("fa-solid", "fa-play");
}

function run() {
};

document.addEventListener("DOMContentLoaded", () => {
    gRunButton = document.getElementById("judge0-run-btn");
    gRunButton.addEventListener("click", run);
});
