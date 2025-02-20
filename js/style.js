"use strict";
import configuration from "./configuration.js";

const style = {
    apply(name = configuration.getConfig().style) {
        configuration.getConfig().style = name;
        const config = configuration.getConfig();
        Object.keys(config.styleOptions).forEach(styleOption => {
            const showOption = config.styleOptions[styleOption];
            if (showOption) {
                document.querySelectorAll(`.judge0-${styleOption}`).forEach(e => {
                    e.classList.remove("judge0-hidden");
                });
            } else {
                document.querySelectorAll(`.judge0-${styleOption}`).forEach(e => {
                    e.classList.add("judge0-hidden");
                });
            }
        });

        const queue = [...document.getElementsByClassName("judge0-hidden")];
        while (queue.length) {
            const element = queue.shift();
            const parent = element.closest(".judge0-styleOptionParent");

            if (!parent || parent.classList.contains("judge0-hidden")) {
                continue;
            }

            if (Array.from(parent.children).every(c => c.classList.contains("judge0-hidden"))) {
                parent.classList.add("judge0-hidden");
                queue.push(parent);
            }
        }
    }
};

export default style;

document.addEventListener("DOMContentLoaded", () => {
    style.apply();
});
