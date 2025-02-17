"use strict";
import configuration from "./configuration.js";

export const CE = "CE";
export const EXTRA_CE = "EXTRA_CE";

export const FLAVORS = [CE, EXTRA_CE];

export const AUTHENTICATED_BASE_URL = {
    CE: "https://judge0-ce.p.sulu.sh",
    EXTRA_CE: "https://judge0-extra-ce.p.sulu.sh"
};
export const UNAUTHENTICATED_BASE_URL = {
    CE: "https://ce.judge0.com",
    EXTRA_CE: "https://extra-ce.judge0.com"
};

export const LANGUAGE_IDS_TO_SKIP = {
    CE: [89],
    EXTRA_CE: [89]
};

export const DEFAULT_LANGUAGE = {
    CE: 105
};

export function getAuthHeaders() {
    return configuration.getConfig().apiKey ? {
        "Authorization": `Bearer ${configuration.getConfig().apiKey}`
    } : {};
}
