"use strict";
import configuration from "./configuration.js";
import ide from "./layout.js";

const theme = {
    set(name, save = true) {
        const resolvedName = configuration.set("theme", name, save);
        const resolvedTheme = resolvedName === "system" ? theme.getSystemTheme() : (resolvedName === "reverse-system" ? theme.getReverseSystemTheme() : resolvedName);
        const isLight = resolvedTheme === "light";

        if (isLight) {
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.add("dark");
        }

        document.getElementById("judge0-golden-layout-dark-theme-stylesheet").disabled = isLight;
        document.getElementById("judge0-golden-layout-light-theme-stylesheet").disabled = !isLight;

        ide.onMonacoReady(function() {
            monaco.editor.setTheme(isLight ? "vs-light" : "vs-dark");
        });

        // document.getElementById("judge0-theme-toggle-btn").setAttribute("data-content", `Switch between dark, light, and system theme (currently ${resolvedName} theme)`);
        const themeBtnIcon = document.getElementById("judge0-theme-btn").querySelector("i");
        if (resolvedName === "dark") {
            themeBtnIcon.classList = "fa-solid fa-moon";
        } else if (resolvedName === "light") {
            themeBtnIcon.classList = "fa-solid fa-sun";
        } else {
            themeBtnIcon.classList = "fa-solid fa-display";
        }

        document.head.querySelectorAll("meta[name='theme-color'], meta[name='msapplication-TileColor']").forEach(e => {
            e.setAttribute("content", isLight ? "#ffffff" : "#000000");
        });
    },
    toggle() {
        const current = configuration.get("theme");
        if (current === "system") {
            if (theme.getSystemTheme() === "dark") {
                theme.set("light");
            } else {
                theme.set("dark");
            }
        } else if (current === "reverse-system") {
            if (theme.getReverseSystemTheme() === "dark") {
                theme.set("light");
            } else {
                theme.set("dark");
            }
        } else if (current === "dark") {
            if (theme.getSystemTheme() === "dark") {
                theme.set("system");
            } else {
                theme.set("light");
            }
        } else if (current === "light") {
            if (theme.getSystemTheme() === "light") {
                theme.set("system");
            } else {
                theme.set("dark");
            }
        }
    },
    getSystemTheme() {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    },
    getReverseSystemTheme() {
        return theme.getSystemTheme() === "dark" ? "light" : "dark";
    },
    isLight() {
        const currentTheme = configuration.get("theme");
        const resolvedTheme = currentTheme === "system" ? theme.getSystemTheme() : (currentTheme === "reverse-system" ? theme.getReverseSystemTheme() : currentTheme);
        return resolvedTheme === "light";
    }
};

export default theme;

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("judge0-theme-btn").addEventListener("click", theme.toggle);
    theme.set(configuration.get("theme"), false);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    ["system", "reverse-system"].forEach(t => {
        if (configuration.get("theme") === t) {
            theme.set(t, false);
        }
    });
});
