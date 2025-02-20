"use strict";
import { FLAVORS, UNAUTHENTICATED_BASE_URL, DEFAULT_LANGUAGE, LANGUAGE_IDS_TO_SKIP } from "../clients.js";

const LANGUAGES = [];
const INITIALIZE_CALLBACK_QUEUE = [];

const language = {
    isInitialized: false,
    fetchAll: async () => {
        if (!LANGUAGES.length) {
            for (const flavor of FLAVORS) {
                const response = await fetch(`${UNAUTHENTICATED_BASE_URL[flavor]}/languages`);
                const data = await response.json();
                if (data && data.length) {
                    LANGUAGES.push(...data.map(language => {
                        return {
                            ...language,
                            flavor: flavor,
                            default: language.id === DEFAULT_LANGUAGE[flavor]
                        };
                    }).filter(language => {
                        return !LANGUAGE_IDS_TO_SKIP[flavor].includes(language.id);
                    }));
                }
            };
            LANGUAGES.sort((a, b) => {
                const nameComparison = a.name.localeCompare(b.name);
                if (nameComparison !== 0) {
                    return nameComparison;
                }
                return FLAVORS.indexOf(a.flavor) - FLAVORS.indexOf(b.flavor);
            });
        }
        return new Promise(resolve => {
            resolve(LANGUAGES);
        });
    },
    getAll: async () => {
        return language.fetchAll();
    },
    onInitialized: callback => {
        if (language.isInitialized) {
            callback();
        } else {
            INITIALIZE_CALLBACK_QUEUE.push(callback);
        }
    },
};

export default language;

document.addEventListener("DOMContentLoaded", () => {
    language.getAll().then(languages => {
        const isAdded = [];
        const selectLanguageDropdown = document.getElementById("judge0-select-language");
        const options = selectLanguageDropdown.querySelector(".judge0-dropdown-options");

        const template = selectLanguageDropdown.querySelector(".judge0-dropdown-option").cloneNode(false);
        template.classList.remove("judge0-hidden");

        languages.forEach(language => {
            if (isAdded.includes(language.name)) {
                return;
            }

            isAdded.push(language.name);

            const option = template.cloneNode(false);
            option.textContent = language.name;
            option.setAttribute("data-judge0-flavor", language.flavor);
            option.setAttribute("data-judge0-language-id", language.id);

            options.appendChild(option);
        });

        language.isInitialized = true;

        while (INITIALIZE_CALLBACK_QUEUE.length) {
            INITIALIZE_CALLBACK_QUEUE.shift()();
        }
    });
});
