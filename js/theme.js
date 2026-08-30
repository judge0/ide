"use strict";
import configuration from "./configuration.js";

const theme = {
    set(name, save = true) {
        const resolvedName = configuration.set("theme", name, save);
        const resolvedTheme = resolvedName === "system" ? theme.getSystemTheme() : (resolvedName === "reverse-system" ? theme.getReverseSystemTheme() : resolvedName);
        const isLight = resolvedTheme === "light";

        document.body.style.background = `url("./images/logo_${isLight ? "white" : "black"}.svg") center center / 33% no-repeat ${isLight ? "#e0e1e2" : "#1b1c1d"} `;

        if (isLight) {
            document.body.classList.remove("judge0-dark-mode");
        } else {
            document.body.classList.add("judge0-dark-mode");
        }

        document.getElementById("judge0-golden-layout-dark-theme-stylesheet").disabled = isLight;
        document.getElementById("judge0-golden-layout-light-theme-stylesheet").disabled = !isLight;

        monaco.editor.setTheme(isLight ? "vs-light" : "vs-dark");

        [".ui.menu", ".ui.input", ".ui.basic.button", ".ui.segment", ".ui.message"].forEach(s => document.querySelectorAll(s).forEach(e => {
            if (isLight) {
                e.classList.remove("inverted");
            } else {
                e.classList.add("inverted");
            }
        }));

        document.querySelectorAll(".label").forEach(e => {
            if (isLight) {
                e.classList.remove("black");
            } else {
                e.classList.add("black");
            }
        });

        document.getElementById("judge0-theme-toggle-btn").setAttribute("data-content", `Switch between dark, light, and system theme (currently ${resolvedName} theme)`);
        const themeToggleBtnIcon = document.getElementById("judge0-theme-toggle-btn-icon");
        if (resolvedName === "dark") {
            themeToggleBtnIcon.classList = "moon icon";
        } else if (resolvedName === "light") {
            themeToggleBtnIcon.classList = "sun icon";
        } else {
            themeToggleBtnIcon.classList = "adjust icon";
        }

        document.querySelectorAll("[data-content]").forEach(e => {
            if (isLight) {
                e.setAttribute("data-variation", "very wide");
            } else {
                e.setAttribute("data-variation", "inverted very wide");
            }
        });

        document.head.querySelectorAll("meta[name='theme-color'], meta[name='msapplication-TileColor']").forEach(e => {
            e.setAttribute("content", isLight ? "#ffffff" : "#1b1c1d");
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
    require(["vs/editor/editor.main"], function () {
        theme.set(configuration.get("theme"), false);
    });
    document.getElementById("judge0-theme-toggle-btn").addEventListener("click", theme.toggle);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    ["system", "reverse-system"].forEach(t => {
        if (configuration.get("theme") === t) {
            theme.set(t, false);
        }
    });
});
