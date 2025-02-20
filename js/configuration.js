"use strict";
import query from "./query.js";
import ls from "./local_storage.js";
import { IS_ELECTRON } from "./electron.js";
import { IS_PUTER } from "./puter.js";
import { IS_STANDALONE } from "./standalone.js";

function setAllBooleans(obj, val) {
    const copy = JSON.parse(JSON.stringify(obj));
    for (const key of Object.keys(obj)) {
        if (typeof copy[key] === "boolean") {
            copy[key] = val;
        }
    }
    return copy;
}

const SCREEN_SM = window.innerWidth >= 640;
const SCREEN_MD = window.innerWidth >= 768;
const SCREEN_LG = window.innerWidth >= 1024;
const SCREEN_XL = window.innerWidth >= 1280;
const SCREEN_2XL = window.innerWidth >= 1536;

const FULL_STYLE_OPTIONS = {
    showCommandLineArguments: true,
    showCompilerOptions: true,
    showCopyright: true,
    showFileMenu: true,
    showHelpMenu: true,
    showLogo: true,
    showNavigation: true,
    showPuterSignInOutButton: true,
    showRunButton: true,
    showSelectLanguage: true,
    showStatusLine: true,
    showThemeButton: true,
};

const FULL_APP_OPTIONS = {
    apiKey: "",
    assistantLayout: "column",
    ioLayout: "stack",
    mainLayout: "row",
    showAIAssistant: true,
    showInput: true,
    showOutput: true,
    showMinimap: true,
};

const FULL_CONFIGURATION = {
    theme: "system",
    style: "full",
    styleOptions: FULL_STYLE_OPTIONS,
    appOptions: FULL_APP_OPTIONS,
};

const DEFAULT_CONFIGURATIONS = {
    default: {
        ...FULL_STYLE_OPTIONS,
        style: "default",
        styleOptions: {
            ...FULL_STYLE_OPTIONS,
            showCommandLineArguments: SCREEN_SM,
            showCompilerOptions: SCREEN_SM,
            showCopyright: SCREEN_SM,
            showFileMenu: SCREEN_SM,
            showHelpMenu: SCREEN_SM,
            showPuterSignInOutButton: SCREEN_SM,
        },
        appOptions: {
            ...FULL_APP_OPTIONS,
            assistantLayout: SCREEN_SM ? "column" : "row",
            mainLayout: SCREEN_SM ? "row" : "column",
            showAIAssistant: SCREEN_SM,
        }
    },
    none: {
        ...FULL_CONFIGURATION,
        style: "none",
        styleOptions: setAllBooleans(FULL_STYLE_OPTIONS, false),
        appOptions: setAllBooleans(FULL_APP_OPTIONS, false),
    },
    minimal: {
        ...FULL_CONFIGURATION,
        style: "minimal",
        styleOptions: {
            ...FULL_STYLE_OPTIONS,
            showCommandLineArguments: false,
            showCompilerOptions: false,
            showFileMenu: false,
            showHelpMenu: false,
            showLogo: false,
            showPuterSignInOutButton: false,
            showStatusLine: false,
            showThemeButton: false,
        },
        appOptions: {
            ...FULL_APP_OPTIONS,
            ioLayout: "column",
            showAIAssistant: false,
        }
    },
    clean: {
        ...FULL_CONFIGURATION,
        style: "clean",
        styleOptions: {
            ...FULL_STYLE_OPTIONS,
            showFileMenu: false,
            showHelpMenu: false,
            showLogo: false,
            showPuterSignInOutButton: false,
        },
        appOptions: {
            ...FULL_APP_OPTIONS,
            showAIAssistant: false,
        }
    },
    simple: {
        ...FULL_CONFIGURATION,
        style: "simple",
        styleOptions: {
            ...FULL_STYLE_OPTIONS,
            showFileMenu: false,
            showHelpMenu: false,
            showPuterSignInOutButton: false,
        },
        appOptions: {
            ...FULL_APP_OPTIONS,
            showAIAssistant: false,
        }
    },
    standalone: {
        ...FULL_CONFIGURATION,
        style: "standalone",
        styleOptions: {
            ...FULL_STYLE_OPTIONS,
            showCopyright: false,
            showLogo: false,
        }
    },
    electron: {
        ...FULL_CONFIGURATION,
        style: "electron",
        styleOptions: {
            ...FULL_STYLE_OPTIONS,
            showCopyright: false,
            showLogo: false,
        }
    },
    puter: {
        ...FULL_CONFIGURATION,
        style: "puter",
        styleOptions: {
            ...FULL_STYLE_OPTIONS,
            showCopyright: false,
            showLogo: false,
            showPuterSignInOutButton: false,
        }
    },
    full: FULL_CONFIGURATION,
};

const PROXY_HANDLER = {
    get: (obj, key) => {
        if (!key) {
            return null;
        }

        for (const k of key.split(".")) {
            obj = obj[k];
            if (!obj) {
                break;
            }
        }

        return obj;
    },
    set: (obj, key, val) => {
        if (!key) {
            return false;
        }

        const keys = key.split(".");
        const lastKey = keys[keys.length - 1];

        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) {
                obj[keys[i]] = {};
            }
            obj = obj[keys[i]];
        }

        obj[lastKey] = val;

        return true;
    }
};

const LEGAL_VALUES = new Proxy({
    theme: ["system", "reverse-system", "light", "dark"],
    style: Object.keys(DEFAULT_CONFIGURATIONS),
    appOptions: {
        ioLayout: ["stack", "row", "column"],
        assistantLayout: ["stack", "row", "column"],
        mainLayout: ["stack", "row", "column"],
    }
}, PROXY_HANDLER);

var CONFIGURATION = null;
var LOADED_CONFIGURATION = null;

const configuration = {
    load() {
        configuration.getConfig();
    },
    getConfig() {
        if (!CONFIGURATION) {
            let initialConfig = DEFAULT_CONFIGURATIONS.default;
            if (IS_ELECTRON) {
                initialConfig = DEFAULT_CONFIGURATIONS.electron;
            } else if (IS_PUTER) {
                initialConfig = DEFAULT_CONFIGURATIONS.puter;
            } else if (IS_STANDALONE) {
                initialConfig = DEFAULT_CONFIGURATIONS.standalone;
            }

            CONFIGURATION = new Proxy(JSON.parse(JSON.stringify(initialConfig)), {
                get: PROXY_HANDLER.get,
                set: (obj, key, val) => {
                    if (LEGAL_VALUES[key] && !LEGAL_VALUES[key].includes(val)) {
                        return true;
                    }

                    if (PROXY_HANDLER.get(obj, key) === val) {
                        return true;
                    }

                    PROXY_HANDLER.set(obj, key, val);

                    if (key === "style") {
                        obj.styleOptions = DEFAULT_CONFIGURATIONS[val].styleOptions;
                        obj.appOptions = DEFAULT_CONFIGURATIONS[val].appOptions;
                        configuration.merge(configuration.getConfig(), configuration.getLoadedConfig());
                    }

                    return true;
                }
            });
            configuration.merge(CONFIGURATION, configuration.getLoadedConfig());
        }
        return CONFIGURATION;
    },
    getLoadedConfig() {
        if (!LOADED_CONFIGURATION) {
            LOADED_CONFIGURATION = new Proxy({}, PROXY_HANDLER);
            for (const key of configuration.getKeys(DEFAULT_CONFIGURATIONS.default)) {
                const val = query.get(`${ls.PREFIX}${key}`) || ls.get(key);
                if (val) {
                    LOADED_CONFIGURATION[key] = val;
                }
            }
        }
        return LOADED_CONFIGURATION;
    },
    get(key) {
        const config = configuration.getConfig();
        return config[key] || ls.get(key);
    },
    set(key, val, save = false) {
        const config = configuration.getConfig();
        config[key] = val;
        if (save) {
            ls.set(key, config[key]);
        }
        return config[key];
    },
    getKeys(obj = configuration.getConfig(), prefix = "") {
        return Object.keys(obj).flatMap(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === "object" && obj[key]) {
                return configuration.getKeys(obj[key], fullKey);
            }
            return fullKey;
        });
    },
    merge(dest, src) {
        for (const key of configuration.getKeys(src)) {
            const val = src[key];
            const valStr = String(val || "").toLowerCase();
            if (["true", "on", "yes"].includes(valStr)) {
                dest[key] = true;
            } else if (["false", "off", "no"].includes(valStr)) {
                dest[key] = false;
            } else {
                dest[key] = val;
            }
        }
    }
};

configuration.load();

export default configuration;
