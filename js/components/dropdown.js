"use strict";

function toggleDropdown(dropdown) {
    const dropdownMenu = dropdown.querySelector(".judge0-dropdown-menu");
    dropdownMenu.classList.toggle("judge0-invisible");
}

function hideDropdown(dropdown) {
    const dropdownMenu = dropdown.querySelector(".judge0-dropdown-menu");
    dropdownMenu.classList.add("judge0-invisible");
}

function hideOtherDropdowns(dropdown) {
    document.querySelectorAll(".judge0-dropdown").forEach(function (d) {
        if (d != dropdown) {
            hideDropdown(d);
        }
    });
}

function handleEvent(event) {
    const dropdown = event.target.closest(".judge0-dropdown");

    if (event.target.classList.contains("judge0-dropdown-option")) {
        if (event.type === "click") { // Only handle click events for dropdown options.
            const selectedValue = dropdown.querySelector(".judge0-dropdown-value");
            selectedValue.textContent = event.target.textContent;
            for (const dataAttribute of event.target.getAttributeNames()) {
                if (dataAttribute.startsWith("data-judge0-")) {
                    selectedValue.setAttribute(dataAttribute, event.target.getAttribute(dataAttribute));
                }
            }

            const dropdownMenu = dropdown.querySelector(".judge0-dropdown-menu");
            dropdownMenu.querySelectorAll(".judge0-dropdown-option").forEach(function (option) {
                option.removeAttribute("aria-checked");
            });

            hideDropdown(dropdown);

            event.target.setAttribute("aria-checked", "true");
            event.target.scrollIntoView({ block: "center" });
        }
    } else if (dropdown) {
        // If touch is supported then only handle touch events for dropdowns, otherwise handle click events.
        if (event.type !== "click" || !("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
            toggleDropdown(dropdown);
        }
    }

    hideOtherDropdowns(dropdown);
}

document.body.addEventListener("click", handleEvent);
document.body.addEventListener("touchend", handleEvent);
