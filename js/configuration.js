"use strict";
import query from "./query.js";
import ls from "./local_storage.js";

const DEFAULT_CONFIGURATIONS = {
    default: {
        theme: "system",
        style: "default",
        styleOptions: {
            showLogo: true,
            showFileMenu: true,
            showHelpMenu: true,
            showSelectLanguage: true,
            showCompilerOptions: true,
            showCommandLineArguments: true,
            showRunButton: true,
            showThemeButton: true,
            showPuterSignInOutButton: true,
            showStatusLine: true,
            showCopyright: true,
            showNavigation: true
        },
        appOptions: {
            showAIAssistant: false,
            ioLayout: "stack",
            assistantLayout: "column",
            mainLayout: "row",
            showInput: true,
            showOutput: true
        }
    },
    minimal: {
        theme: "system",
        style: "minimal",
        styleOptions: {
            showLogo: false,
            showFileMenu: false,
            showHelpMenu: false,
            showSelectLanguage: true,
            showCompilerOptions: false,
            showCommandLineArguments: false,
            showRunButton: true,
            showThemeButton: false,
            showPuterSignInOutButton: false,
            showStatusLine: false,
            showCopyright: false,
            showNavigation: true
        },
        appOptions: {
            showAIAssistant: false,
            ioLayout: "column",
            assistantLayout: "column",
            mainLayout: "row",
            showInput: true,
            showOutput: true
        }
    },
    standalone: {
        theme: "system",
        style: "standalone",
        styleOptions: {
            showLogo: false,
            showFileMenu: true,
            showHelpMenu: true,
            showSelectLanguage: true,
            showCompilerOptions: true,
            showCommandLineArguments: true,
            showRunButton: true,
            showThemeButton: true,
            showPuterSignInOutButton: true,
            showStatusLine: true,
            showCopyright: false,
            showNavigation: true
        },
        appOptions: {
            showAIAssistant: false,
            ioLayout: "stack",
            assistantLayout: "column",
            mainLayout: "row",
            showInput: true,
            showOutput: true
        }
    },
    electron: {
        theme: "system",
        style: "electron",
        styleOptions: {
            showLogo: false,
            showFileMenu: true,
            showHelpMenu: true,
            showSelectLanguage: true,
            showCompilerOptions: true,
            showCommandLineArguments: true,
            showRunButton: true,
            showThemeButton: true,
            showPuterSignInOutButton: true,
            showStatusLine: true,
            showCopyright: false,
            showNavigation: true
        },
        appOptions: {
            showAIAssistant: false,
            ioLayout: "stack",
            assistantLayout: "column",
            mainLayout: "row",
            showInput: true,
            showOutput: true
        }
    },
    puter: {
        theme: "system",
        style: "puter",
        styleOptions: {
            showLogo: false,
            showFileMenu: true,
            showHelpMenu: true,
            showSelectLanguage: true,
            showCompilerOptions: true,
            showCommandLineArguments: true,
            showRunButton: true,
            showThemeButton: true,
            showPuterSignInOutButton: false,
            showStatusLine: true,
            showCopyright: true,
            showNavigation: true
        },
        appOptions: {
            showAIAssistant: false,
            ioLayout: "stack",
            assistantLayout: "column",
            mainLayout: "row",
            showInput: true,
            showOutput: true
        }
    }
};

const PROXY_GET = function(obj, key) {
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
};

const PROXT_SET = function(obj, key, val) {
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
};

const PROXY_HANDLER = {
    get: PROXY_GET,
    set: PROXT_SET
};

const LEGAL_VALUES = new Proxy({
    theme: ["system", "reverse-system", "light", "dark"],
    style: Object.keys(DEFAULT_CONFIGURATIONS),
    appOptions: {
        ioLayout: ["stack", "row", "column"],
        assistantLayout: ["stack", "row", "column"]
    }
}, PROXY_HANDLER);

const configuration = {
    CONFIGURATION: null,
    LOADED_CONFIGURATION: null,
    load() {
        configuration.getConfig();
    },
    getConfig() {
        if (!configuration.CONFIGURATION) {
            configuration.CONFIGURATION = new Proxy(JSON.parse(JSON.stringify(DEFAULT_CONFIGURATIONS.default)), {
                get: PROXY_GET,
                set: function(obj, key, val) {
                    if (LEGAL_VALUES[key] && !LEGAL_VALUES[key].includes(val)) {
                        return true;
                    }

                    if (PROXY_GET(obj, key) === val) {
                        return true;
                    }

                    PROXT_SET(obj, key, val);

                    if (key === "style") {
                        obj.styleOptions = DEFAULT_CONFIGURATIONS[val].styleOptions;
                        obj.appOptions = DEFAULT_CONFIGURATIONS[val].appOptions;
                        configuration.merge(configuration.getConfig(), configuration.getLoadedConfig());
                    }

                    return true;
                }
            });
            configuration.merge(configuration.CONFIGURATION, configuration.getLoadedConfig());
        }
        return configuration.CONFIGURATION;
    },
    getLoadedConfig() {
        if (!configuration.LOADED_CONFIGURATION) {
            configuration.LOADED_CONFIGURATION = new Proxy({}, PROXY_HANDLER);
            for (const key of configuration.getKeys(DEFAULT_CONFIGURATIONS.default)) {
                const val = query.get(`${ls.PREFIX}${key}`) || ls.get(key);
                if (val) {
                    configuration.LOADED_CONFIGURATION[key] = val;
                }
            }
        }
        return configuration.LOADED_CONFIGURATION;
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
