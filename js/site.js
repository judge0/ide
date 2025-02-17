"use strict";

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("judge0-year").innerText = new Date().getFullYear();
});

/**
 * Dropdown component consists of the following elements:
 * 1. An element with class "judge0-dropdown".
 * 2. An element with class "judge0-dropdown-btn".
 * 3. An element class "judge0-dropdown-value".
 * 4. An element class "judge0-dropdown-menu" that contains the dropdown options.
 * 5. An element with class "judge0-dropdown-options".
 * 6. A list of elements with class "judge0-dropdown-option".
 *
 * If the dropdown is not select dropdown then classes (3), (5), and (6) are not required.
 */
document.body.addEventListener("click", function (event) {
    const dropdown = event.target.closest(".judge0-dropdown");
    const dropdownBtn = event.target.closest(".judge0-dropdown-btn");

    if (event.target && dropdownBtn && dropdownBtn.contains(event.target)) {
        if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
            return;
        }
        const dropdownMenu = dropdown.querySelector(".judge0-dropdown-menu");
        dropdownMenu.setAttribute("data-judge0-action", "click");
        dropdownMenu.classList.toggle("judge0-hidden");
    } else if (event.target && event.target.classList.contains("judge0-dropdown-option")) {
        const value = dropdown.querySelector(".judge0-dropdown-value");
        value.innerText = event.target.innerText;

        for (const dataAttribute of event.target.getAttributeNames()) {
            if (dataAttribute.startsWith("data-judge0-")) {
                value.setAttribute(dataAttribute, event.target.getAttribute(dataAttribute));
            }
        }

        const dropdownMenu = dropdown.querySelector(".judge0-dropdown-menu");
        dropdownMenu.querySelectorAll(".judge0-dropdown-option").forEach(function (option) {
            option.classList.remove("font-semibold");
        });

        dropdownMenu.classList.toggle("judge0-hidden");
        event.target.classList.add("font-semibold");
    }

    /**
     * For each dropdown menu check if it needs to be hidden.
     * Hide the dropdown menu if all applies:
     * 1. The click is outside of the dropdown menu.
     * 2. The dropdown menu is not the dropdown menu of the just clicked dropdown button.
     */
    document.querySelectorAll(".judge0-dropdown-menu").forEach(function (dropdownMenu) {
        if (!dropdownMenu.contains(event.target) && dropdown !== dropdownMenu.closest(".judge0-dropdown")) {
            dropdownMenu.classList.add("judge0-hidden");
            dropdownMenu.setAttribute("data-judge0-action", "");
        }
    });
});

document.body.addEventListener("mouseover", function (event) {
    const dropdown = event.target.closest(".judge0-dropdown");

    if (event.target && dropdown && dropdown.contains(event.target)) {
        const dropdownMenu = dropdown.querySelector(".judge0-dropdown-menu");
        if (dropdownMenu.getAttribute("data-judge0-action") === "click") {
            return;
        }
        dropdownMenu.classList.remove("judge0-hidden");

        document.querySelectorAll(".judge0-dropdown-menu").forEach(function (dropdownMenu) {
            if (!dropdownMenu.contains(event.target) && dropdown !== dropdownMenu.closest(".judge0-dropdown")) {
                dropdownMenu.classList.add("judge0-hidden");
                dropdownMenu.setAttribute("data-judge0-action", "");
            }
        });
    } else {
        document.querySelectorAll(".judge0-dropdown-menu").forEach(function (dropdownMenu) {
            if (!event.target.contains(dropdownMenu)) {
                dropdownMenu.classList.add("judge0-hidden");
                dropdownMenu.setAttribute("data-judge0-action", "");
            }
        });
    }
});

document.body.addEventListener("touchend", function (event) {
    const dropdown = event.target.closest(".judge0-dropdown");
    const dropdownBtn = event.target.closest(".judge0-dropdown-btn");

    if (event.target && dropdownBtn && dropdownBtn.contains(event.target)) {
        const dropdownMenu = dropdown.querySelector(".judge0-dropdown-menu");
        dropdownMenu.setAttribute("data-judge0-action", "click");
        dropdownMenu.classList.toggle("judge0-hidden");
    }

    document.querySelectorAll(".judge0-dropdown-menu").forEach(function (dropdownMenu) {
        if (!dropdownMenu.contains(event.target) && dropdown !== dropdownMenu.closest(".judge0-dropdown")) {
            dropdownMenu.classList.add("judge0-hidden");
            dropdownMenu.setAttribute("data-judge0-action", "");
        }
    });
});

window.addEventListener("load", function () {
    document.body.removeAttribute("style");
});
