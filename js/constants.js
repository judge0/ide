export const API_BASE_URL = "https://api.apps.skwtr.com/ide/v1";
export const CODE_API_BASE_URL = `${API_BASE_URL}/code`;

export const LANGUAGE_ID = {
    MULTI_FILE: 44,
    SQLITE: 82,
    EXCLUDED: 89,
    DEFAULT: 91,
};

export const POLL = {
    INITIAL_WAIT_MS: 0,
    MAX_REQUESTS: 600,
    BACKOFF_START_MS: 100,
    BACKOFF_MAX_MS: 2000,
    BACKOFF_FACTOR: 1.5,
};

export const DEFAULT_EDITOR_LANGUAGE_MODE = "plaintext";

export const LANGUAGE_NAME_TO_EDITOR_MODE = {
    "Bash": "shell",
    "C": "c",
    "C3": "c",
    "C#": "csharp",
    "C++": "cpp",
    "Clojure": "clojure",
    "F#": "fsharp",
    "Go": "go",
    "Java": "java",
    "JavaScript": "javascript",
    "Kotlin": "kotlin",
    "Objective-C": "objective-c",
    "Pascal": "pascal",
    "Perl": "perl",
    "PHP": "php",
    "Python": "python",
    "R": "r",
    "Ruby": "ruby",
    "SQL": "sql",
    "Swift": "swift",
    "TypeScript": "typescript",
    "Visual Basic": "vb",
};

export function getEditorLanguageMode(languageName) {
    const key = Object.keys(LANGUAGE_NAME_TO_EDITOR_MODE).find((name) =>
        languageName.toLowerCase().startsWith(name.toLowerCase()),
    );
    return key
        ? LANGUAGE_NAME_TO_EDITOR_MODE[key]
        : DEFAULT_EDITOR_LANGUAGE_MODE;
}

export const EXTENSIONS_TABLE = {
    asm: { language_id: 45 },      // Assembly (NASM 2.14.02)
    c: { language_id: 103 },       // C (GCC 14.1.0)
    cpp: { language_id: 105 },     // C++ (GCC 14.1.0)
    cs: { language_id: 29 },       // C# (.NET Core SDK 7.0.400)
    go: { language_id: 95 },       // Go (1.18.5)
    java: { language_id: 91 },     // Java (JDK 17.0.6)
    js: { language_id: 102 },      // JavaScript (Node.js 22.08.0)
    lua: { language_id: 64 },      // Lua (5.3.5)
    pas: { language_id: 67 },      // Pascal (FPC 3.0.4)
    php: { language_id: 98 },      // PHP (8.3.11)
    py: { language_id: 25 },       // Python for ML (3.11.2)
    r: { language_id: 99 },        // R (4.4.1)
    rb: { language_id: 72 },       // Ruby (2.7.0)
    rs: { language_id: 73 },       // Rust (1.40.0)
    scala: { language_id: 81 },    // Scala (2.13.2)
    sh: { language_id: 46 },       // Bash (5.0.0)
    swift: { language_id: 83 },    // Swift (5.2.3)
    ts: { language_id: 101 },      // TypeScript (5.6.2)
    txt: { language_id: 43 },      // Plain Text
};

export const DEFAULT_LANGUAGE_FOR_UNKNOWN_EXTENSION = {
    language_id: 43, // Plain Text
};

export function getLanguageForExtension(extension) {
    return (
        EXTENSIONS_TABLE[extension] || DEFAULT_LANGUAGE_FOR_UNKNOWN_EXTENSION
    );
}

export const DEFAULT_SOURCE =
    'public class Main {\n' +
    '    public static void main(String[] args) {\n' +
    '        System.out.println("Hello, World!");\n' +
    "    }\n" +
    "}\n";

export const DEFAULT_STDIN = "";
export const DEFAULT_COMPILER_OPTIONS = "";
export const DEFAULT_CMD_ARGUMENTS = "";
