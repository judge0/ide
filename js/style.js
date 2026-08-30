"use strict";
import configuration from "./configuration.js";

const style = {
    apply(name) {
        configuration.set("style", name);
        const config = configuration.getConfig();
        Object.keys(config.styleOptions).forEach(styleOption => {
            const showOption = config.styleOptions[styleOption];
            if (showOption) {
                document.querySelectorAll(`.judge0-${styleOption}`).forEach(e => {
                    e.classList.remove("judge0-style-hidden");
                });
            } else {
                document.querySelectorAll(`.judge0-${styleOption}`).forEach(e => {
                    e.classList.add("judge0-style-hidden");
                });
            }
        });
    }
};

export default style;

document.addEventListener("DOMContentLoaded", function () {
        style.apply(configuration.get("style"));
});
