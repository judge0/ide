import { usePuter } from "./puter.js";
import configuration from "./configuration.js";

// API key and auth are handled server-side by the ssh-bridge proxy — not needed here
const AUTH_HEADERS = {};

const CE = "CE";
const EXTRA_CE = "EXTRA_CE";

// Relative URL: browser calls /judge0/... on port 80, proxy forwards to localhost:2358
const AUTHENTICATED_CE_BASE_URL = "/judge0";
const AUTHENTICATED_EXTRA_CE_BASE_URL = "/judge0";

var AUTHENTICATED_BASE_URL = {};
AUTHENTICATED_BASE_URL[CE] = AUTHENTICATED_CE_BASE_URL;
AUTHENTICATED_BASE_URL[EXTRA_CE] = AUTHENTICATED_EXTRA_CE_BASE_URL;

const UNAUTHENTICATED_CE_BASE_URL = "/judge0";
const UNAUTHENTICATED_EXTRA_CE_BASE_URL = "/judge0";

var UNAUTHENTICATED_BASE_URL = {};
UNAUTHENTICATED_BASE_URL[CE] = UNAUTHENTICATED_CE_BASE_URL;
UNAUTHENTICATED_BASE_URL[EXTRA_CE] = UNAUTHENTICATED_EXTRA_CE_BASE_URL;

const INITIAL_WAIT_TIME_MS = 0;
const WAIT_TIME_FUNCTION = i => 100;
const MAX_PROBE_REQUESTS = 600;

var fontSize = 13;

var layout;

// variables to track the current file name and unsaved changes
var currentFileName = "Main.java";
var hasUnsavedChanges = false;
var isSaving = false;
var sourceContainer = null;
var suppressDirty = true;   // true while we are loading/setting initial content

// For autosave functionality
var autosaveTimer = null;
var AUTOSAVE_MS = 5000; // 2–5 seconds (pick what you want)

export var sourceEditor;
var stdinEditor;
var stdoutEditor;
var compileOutEditor;
var runOutEditor;

var $selectLanguage;
var $compilerOptions;
var $commandLineArguments;
var $runBtn;
var $clearBtn;
var $statusLine;
var $compileBtn;
var lastCompiledCode=null;


var timeStart;

var sqliteAdditionalFiles;
var languages = {};

var layoutConfig = {
    settings: {
        showPopoutIcon: false,
        reorderEnabled: true
    },
    content: [{
        type: configuration.get("appOptions.mainLayout"),
        content: [{
            type: "component",
            width: 15,
            componentName: "fileExplorer",
            id: "fileExplorer",
            title: "Explorer",
            isClosable: false,
            componentState: {
                readOnly: false
            }
        }, {
            type: "component",
            width: 51,
            componentName: "source",
            id: "source",
            title: "Source Code",
            isClosable: false,
            componentState: {
                readOnly: false
            }
        }, {
            type: configuration.get("appOptions.assistantLayout"),
            title: "AI Assistant and I/O",
            content: [configuration.get("appOptions.showAIAssistant") ? {
                type: "component",
                height: 66,
                componentName: "ai",
                id: "ai",
                title: "AI Assistant",
                isClosable: false,
                componentState: {
                    readOnly: false
                }
            } : null, {
                type: configuration.get("appOptions.ioLayout"),
                title: "I/O",
                content: [
                    configuration.get("appOptions.showInput") ? {
                        type: "component",
                        componentName: "stdin",
                        id: "stdin",
                        title: "Input",
                        isClosable: false,
                        componentState: {
                            readOnly: false
                        }
                    } : null, configuration.get("appOptions.showOutput") ? {
                        type: "component",
                        componentName: "compileOut",
                        id: "compileOut",
                        title: "Compile",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    } : null,
                    configuration.get("appOptions.showOutput") ? {
                        type: "component",
                        componentName: "runOut",
                        id: "runOut",
                        title: "Runtime",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    } : null].filter(Boolean)
            }].filter(Boolean)
        }]
    }]
};

var gPuterFile;

function encode(str) {
    return btoa(unescape(encodeURIComponent(str || "")));
}

function decode(bytes) {
    var escaped = escape(atob(bytes || ""));
    try {
        return decodeURIComponent(escaped);
    } catch {
        return unescape(escaped);
    }
}

var gDirectoryHandles = []; // supports multiple open root directories
var gCurrentFileHandle = null;
var isPickerActive = false;
var fileExplorerGLContainer = null;
var fileExplorerVisible = true;

function injectExplorerStyles() {
    if (document.getElementById('judge0-explorer-styles')) return;
    const s = document.createElement('style');
    s.id = 'judge0-explorer-styles';
    s.textContent = `
        #judge0-file-explorer-container {
            color: #cccccc;
            font-size: 13px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-user-select: none; user-select: none;
            padding-bottom: 20px;
        }
        .exp-empty { padding: 20px 14px; color: #666; font-size: 12px; line-height: 1.7; }
        .exp-empty i { font-size: 22px; display: block; margin-bottom: 10px; color: #444; }
        .exp-root { margin-bottom: 2px; }
        .exp-root-header {
            display: flex; align-items: center; gap: 5px;
            padding: 5px 8px; cursor: pointer;
            font-size: 11px; font-weight: 700;
            letter-spacing: 0.05em; text-transform: uppercase;
            color: #888; background: rgba(255,255,255,0.03);
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .exp-root-header:hover { background: rgba(255,255,255,0.07); color: #ccc; }
        .exp-root-chevron { font-size: 10px; opacity: 0.6; flex-shrink: 0; transition: transform 0.1s; }
        .exp-root-chevron.open { transform: rotate(90deg); }
        .exp-root-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .exp-root-close {
            opacity: 0; cursor: pointer; padding: 1px 4px; border-radius: 3px; color: #aaa;
        }
        .exp-root-header:hover .exp-root-close { opacity: 0.6; }
        .exp-root-close:hover { opacity: 1 !important; color: #ff6b6b; background: rgba(255,80,80,0.1); }
        
        .exp-depth-line {
            position: absolute; left: calc(var(--depth-indent) - 8px); 
            top: 0; bottom: 0; width: 1px;
            background: rgba(255,255,255,0.08); pointer-events: none;
        }
        .exp-item { display: flex; align-items: center; min-height: 22px; cursor: pointer; color: #ccc; position: relative; }
        .exp-item:hover { background: rgba(255,255,255,0.06); }
        .exp-item.exp-active { background: #094771 !important; color: #fff; }
        .exp-item-inner { display: flex; align-items: center; gap: 6px; flex: 1; overflow: hidden; padding: 0 8px; }
        .exp-folder-icon { font-size: 13px; color: #dcb67a; flex-shrink: 0; margin-right: 4px; }
        .exp-file-icon { font-size: 12px; flex-shrink: 0; opacity: 0.8; margin-right: 4px; }
        .exp-file-icon.java { color: #f89820; }
        .exp-file-icon.python { color: #3776ab; }
        .exp-file-icon.js { color: #f7df1e; }
        .exp-file-icon.html { color: #e34f26; }
        .exp-file-icon.css { color: #1572b6; }
        .exp-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; font-family: 'Inter', sans-serif; }
        .exp-actions { display: none; gap: 3px; padding-right: 8px; }
        .exp-item:hover .exp-actions { display: flex; }
        .exp-btn { opacity: 0.5; cursor: pointer; font-size: 11px; color: #ccc; }
        .exp-btn:hover { opacity: 1; color: #fff; }
        .exp-children { display: none; position: relative; }
        .exp-children.open { display: block; }
    `;
    document.head.appendChild(s);
}

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const map = { 
        js: 'file code outline yellow', 
        ts: 'file code outline blue', 
        py: 'file code outline python', 
        java: 'file code outline java', 
        html: 'file code outline html', 
        css: 'file code outline css', 
        sql: 'database orange',
        txt: 'file alternate outline grey'
    };
    return map[ext] || 'file outline grey';
}

function markActiveFile(fileHandle) {
    const container = document.getElementById('judge0-file-explorer-container');
    if (!container) return;
    container.querySelectorAll('.exp-item').forEach(el => el.classList.remove('exp-active'));
    if (!fileHandle) return;
    const match = container.querySelector(`.exp-item[data-name="${CSS.escape(fileHandle.name)}"]`);
    if (match) match.classList.add('exp-active');
}

async function buildFileTree(dirHandle, parentEl, depth) {
    try {
        let entries = [];
        for await (const entry of dirHandle.values()) entries.push(entry);
        entries.sort((a,b) => (a.kind === b.kind) ? a.name.localeCompare(b.name) : (a.kind === 'directory' ? -1 : 1));

        for (const entry of entries) {
            const item = document.createElement('div');
            item.className = 'exp-item';
            item.dataset.name = entry.name;
            const inner = document.createElement('div');
            inner.className = 'exp-item-inner';
            inner.style.setProperty('--depth-indent', (depth * 14 + 12) + 'px');
            inner.style.paddingLeft = 'var(--depth-indent)';
            
            const icon = document.createElement('i');
            const nameSpan = document.createElement('span');
            nameSpan.className = 'exp-name';
            nameSpan.innerText = entry.name;
            inner.appendChild(icon);
            inner.appendChild(nameSpan);

            if (depth > 0) {
                const line = document.createElement('div');
                line.className = 'exp-depth-line';
                item.appendChild(line);
            }

            const actions = document.createElement('div');
            actions.className = 'exp-actions';
            const makeBtn = (ic, t, h) => {
                const b = document.createElement('i'); b.className = ic + ' icon exp-btn'; b.title = t;
                b.onclick = e => { e.stopPropagation(); h(); }; return b;
            };

            if (entry.kind === 'directory') {
                icon.className = 'folder icon exp-folder-icon';
                actions.appendChild(makeBtn('plus', 'New File', async () => {
                    const n = prompt('File name:'); if (n) { await entry.getFileHandle(n, {create:true}); renderExplorerRoot(dirHandle, item.closest('.exp-root')); }
                }));
            } else {
                icon.className = getFileIcon(entry.name) + ' exp-file-icon';
                if (gCurrentFileHandle && gCurrentFileHandle.name === entry.name) item.classList.add('exp-active');
            }

            actions.appendChild(makeBtn('trash alternate outline', 'Delete', async () => {
                if (confirm(`Delete ${entry.name}?`)) { await dirHandle.removeEntry(entry.name, {recursive:true}); renderExplorerRoot(dirHandle, item.closest('.exp-root')); }
            }));

            item.appendChild(inner);
            item.appendChild(actions);
            parentEl.appendChild(item);

            if (entry.kind === 'file') {
                item.onclick = async () => {
                    try { const f = await entry.getFile(); openFile(await f.text(), entry.name); gCurrentFileHandle = entry; markActiveFile(entry); }
                    catch(e) { showError('Error', e.message); }
                };
            } else {
                const children = document.createElement('div');
                children.className = 'exp-children';
                parentEl.appendChild(children);
                let loaded = false;
                item.onclick = async () => {
                    const open = children.classList.toggle('open');
                    icon.className = open ? 'folder open icon exp-folder-icon' : 'folder icon exp-folder-icon';
                    if (open && !loaded) { await buildFileTree(entry, children, depth + 1); loaded = true; }
                };
            }
        }
    } catch(e) { console.error(e); }
}

async function renderExplorerRoot(handle, existingEl) {
    const container = document.getElementById('judge0-file-explorer-container');
    if (!container) return;
    if (existingEl) existingEl.remove();
    
    const root = document.createElement('div');
    root.className = 'exp-root';
    const header = document.createElement('div');
    header.className = 'exp-root-header';
    header.innerHTML = `<i class="chevron right icon exp-root-chevron open"></i><span class="exp-root-label">${handle.name}</span><i class="times icon exp-root-close" title="Close Workspace"></i>`;
    
    const body = document.createElement('div');
    body.className = 'exp-children open';
    
    header.onclick = (e) => {
        if (e.target.classList.contains('exp-root-close')) {
            gDirectoryHandles = gDirectoryHandles.filter(h => h !== handle);
            root.remove(); if (!gDirectoryHandles.length) showExplorerEmpty();
            return;
        }
        const open = body.classList.toggle('open');
        header.querySelector('.exp-root-chevron').classList.toggle('open', open);
    };

    root.appendChild(header);
    root.appendChild(body);
    container.appendChild(root);
    await buildFileTree(handle, body, 0);
}

function showExplorerEmpty() {
    const c = document.getElementById('judge0-file-explorer-container');
    if (!c) return; c.innerHTML = `<div class="exp-empty"><i class="folder open outline icon"></i>No folder opened.<br>File → Open Directory...</div>`;
}

async function refreshFileExplorer() {
    injectExplorerStyles();
    const c = document.getElementById('judge0-file-explorer-container');
    if (!c) return; c.innerHTML = '';
    if (!gDirectoryHandles.length) return showExplorerEmpty();
    for (const h of gDirectoryHandles) await renderExplorerRoot(h);
}

async function openDirectoryAction(e) {
    if (e) { e.preventDefault(); e.stopImmediatePropagation(); }
    if (isPickerActive || !window.showDirectoryPicker) return;
    isPickerActive = true;
    try {
        const h = await window.showDirectoryPicker({ mode: 'readwrite' });
        if (!gDirectoryHandles.find(x => x.name === h.name)) {
            gDirectoryHandles.push(h);
            refreshFileExplorer();
        }
    } catch (err) { if (err.name !== 'AbortError') showError('Error', err.message); }
    finally { isPickerActive = false; }
}


function showError(title, content) {
    $("#judge0-site-modal #title").html(title);
    $("#judge0-site-modal .content").html(content);

    let FTitle = encodeURIComponent(`Error on ${window.location.href}`);
    let reportBody = encodeURIComponent(
        `**Error Title**: ${title}\n` +
        `**Error Timestamp**: \`${new Date()}\`\n` +
        `**Origin**: ${window.location.href}\n` +
        `**Description**:\n${content}`
    );

    $("#report-problem-btn").attr("href", `https://github.com/judge0/ide/issues/new?title=${FTitle}&body=${reportBody}`);
    $("#judge0-site-modal").modal("show");
}

function showHttpError(jqXHR) {
    showError(`${jqXHR.statusText} (${jqXHR.status})`, `<pre>${JSON.stringify(jqXHR, null, 4)}</pre>`);
}

function handleRunError(jqXHR) {
    showHttpError(jqXHR);
    $runBtn.removeClass("loading");

    window.top.postMessage(JSON.parse(JSON.stringify({
        event: "runError",
        data: jqXHR
    })), "*");
}

function handleResult(data) {
    const tat = Math.round(performance.now() - timeStart);
    console.log(`It took ${tat}ms to get submission result.`);

    const status = data.status;
    const stdout = decode(data.stdout);
    const stderr = decode(data.stderr);
    const compileOutput = data.compile_output ? decode(data.compile_output) : null;
    const time = (data.time === null ? "-" : data.time + "s");
    const memory = (data.memory === null ? "-" : data.memory + "KB");

    $statusLine.html(`${status.description}, ${time}, ${memory} (TAT: ${tat}ms)`);

    /*const output = [compileOutput, stdout].filter(x => x).join("\n").trimEnd();
    stdoutEditor.setValue(output);*/
    
    const runtimeOutput = [stdout, stderr].filter(x => x).join("\n").trimEnd();
    const compileText = (compileOutput || "").trimEnd();

    // Compile tab: show compiler output or a friendly success message
    if (compileOutEditor) {
        compileOutEditor.setValue(compileText || "Compilation successful.");
        const lastLine = compileOutEditor.getModel()?.getLineCount?.() ?? 1;
        compileOutEditor.revealLine(lastLine);
    }
    // Runtime tab: show stdout + stderr (can be empty if program prints nothing)
    if (runOutEditor) {
        runOutEditor.setValue(runtimeOutput);
        const lastLine = runOutEditor.getModel()?.getLineCount?.() ?? 1;
        runOutEditor.revealLine(lastLine);
    }
    const output = [compileText, runtimeOutput].filter(x => x).join("\n").trimEnd();
    
    $runBtn.removeClass("loading");

    window.top.postMessage(JSON.parse(JSON.stringify({
        event: "postExecution",
        status: data.status,
        time: data.time,
        memory: data.memory,
        output: output
    })), "*");
}

// Clear I/O editors and status line before running new code
function clearIO() {
    // Clear the I/O editors
    if (stdinEditor) stdinEditor.setValue("");
    if (compileOutEditor) compileOutEditor.setValue("");
    if (runOutEditor) runOutEditor.setValue("");

    // Optional: clear old status line
    if ($statusLine) $statusLine.html("");

    // Optional: stop a stuck spinner
    if ($runBtn) $runBtn.removeClass("loading");
}

async function getSelectedLanguage() {
    return getLanguage(getSelectedLanguageFlavor(), getSelectedLanguageId())
}

function getSelectedLanguageId() {
    return parseInt($selectLanguage.val());
}

function getSelectedLanguageFlavor() {
    return $selectLanguage.find(":selected").attr("flavor");
}

function compileOnly() {
    const currentCode = sourceEditor.getValue().trim();

    if (currentCode === "") {
        showError("Error", "Source code can't be empty!");
        lastCompiledCode = null;
        updateRunButtonState();
        return;
    }

    lastCompiledCode = null;
    updateRunButtonState();

    if (compileOutEditor) compileOutEditor.setValue("");
    if (runOutEditor) runOutEditor.setValue("");

    $statusLine.html("Compiling...");
    // Switch to Compile tab when compiling
    const compileTab = layout.root.getItemsById("compileOut")[0];
    if (compileTab && compileTab.parent && compileTab.parent.header && compileTab.parent.header.parent) {
        compileTab.parent.header.parent.setActiveContentItem(compileTab);
    }

    let sourceValue = encode(sourceEditor.getValue());
    let languageId = getSelectedLanguageId();
    let flavor = getSelectedLanguageFlavor();

    let data = {
        source_code: sourceValue,
        language_id: languageId,
        stdin: encode(""),
        redirect_stderr_to_stdout: false
    };

    $.ajax({
        url: `${AUTHENTICATED_BASE_URL[flavor]}/submissions?base64_encoded=true&wait=true`,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
        headers: AUTH_HEADERS,
        success: function (data) {
            const compileOutput = decode(data.compile_output);

            if (compileOutEditor) {
                compileOutEditor.setValue(
                    compileOutput ? compileOutput : "Compilation successful."
                );
            }

            if (runOutEditor) {
                runOutEditor.setValue("");
            }

            $statusLine.html(data.status.description);

            // success only when there is no compile output
            if (!compileOutput) {
                lastCompiledCode = currentCode;
            } else {
                lastCompiledCode = null;
            }

            updateRunButtonState();
        },
        error: function (jqXHR) {
            lastCompiledCode = null;
            updateRunButtonState();
            handleRunError(jqXHR);
        }
    });
}

function updateRunButtonState() {
    if (!$runBtn) return;

    const currentCode = sourceEditor ? sourceEditor.getValue().trim() : "";
    const canRun = !!lastCompiledCode && currentCode === lastCompiledCode;

    $runBtn.prop("disabled", !canRun);

    if (canRun) {
        $runBtn.removeClass("disabled");
        $runBtn.addClass("primary");
    } else {
        $runBtn.addClass("disabled");
        $runBtn.removeClass("primary");
    }
}

function run() {
    const currentCode = sourceEditor.getValue().trim();

    if (!lastCompiledCode || currentCode !== lastCompiledCode) {
        updateRunButtonState();
        return;
    }

    $runBtn.addClass("loading"); 

    //stdoutEditor.setValue("");
    if (compileOutEditor) compileOutEditor.setValue("");
    if (runOutEditor) runOutEditor.setValue("");
    $statusLine.html("");

    /*let x = layout.root.getItemsById("runOut")[0];
    x.parent.header.parent.setActiveContentItem(x);*/

    const runtimeTab = layout.root.getItemsById("runOut")[0];
    if (runtimeTab && runtimeTab.parent && runtimeTab.parent.header && runtimeTab.parent.header.parent) {
        runtimeTab.parent.header.parent.setActiveContentItem(runtimeTab);
    }

    let sourceValue = encode(sourceEditor.getValue());
    let stdinValue = encode(stdinEditor.getValue());
    let languageId = getSelectedLanguageId();
    let compilerOptions = $compilerOptions.val();
    let commandLineArguments = $commandLineArguments.val();

    let flavor = getSelectedLanguageFlavor();

    if (languageId === 44) {
        sourceValue = sourceEditor.getValue();
    }

    let data = {
        source_code: sourceValue,
        language_id: languageId,
        stdin: stdinValue,
        compiler_options: compilerOptions,
        command_line_arguments: commandLineArguments,
        redirect_stderr_to_stdout: true
    };

    let sendRequest = function (data) {
        window.top.postMessage(JSON.parse(JSON.stringify({
            event: "preExecution",
            source_code: sourceEditor.getValue(),
            language_id: languageId,
            flavor: flavor,
            stdin: stdinEditor.getValue(),
            compiler_options: compilerOptions,
            command_line_arguments: commandLineArguments
        })), "*");

        timeStart = performance.now();
        $.ajax({
            url: `${AUTHENTICATED_BASE_URL[flavor]}/submissions?base64_encoded=true&wait=false`,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            headers: AUTH_HEADERS,
            success: function (data, textStatus, request) {
                console.log(`Your submission token is: ${data.token}`);
                let region = request.getResponseHeader('X-Judge0-Region');
                setTimeout(fetchSubmission.bind(null, flavor, region, data.token, 1), INITIAL_WAIT_TIME_MS);
            },
            error: handleRunError
        });
    }

    if (languageId === 82) {
        if (!sqliteAdditionalFiles) {
            $.ajax({
                url: `./data/additional_files_zip_base64.txt`,
                contentType: "text/plain",
                success: function (responseData) {
                    sqliteAdditionalFiles = responseData;
                    data["additional_files"] = sqliteAdditionalFiles;
                    sendRequest(data);
                },
                error: handleRunError
            });
        }
        else {
            data["additional_files"] = sqliteAdditionalFiles;
            sendRequest(data);
        }
    } else {
        sendRequest(data);
    }
}

function fetchSubmission(flavor, region, submission_token, iteration) {
    if (iteration >= MAX_PROBE_REQUESTS) {
        handleRunError({
            statusText: "Maximum number of probe requests reached.",
            status: 504
        }, null, null);
        return;
    }

    $.ajax({
        url: `${UNAUTHENTICATED_BASE_URL[flavor]}/submissions/${submission_token}?base64_encoded=true`,
        headers: {
            "X-Judge0-Region": region
        },
        success: function (data) {
            if (data.status.id <= 2) { // In Queue or Processing
                $statusLine.html(data.status.description);
                setTimeout(fetchSubmission.bind(null, flavor, region, submission_token, iteration + 1), WAIT_TIME_FUNCTION(iteration));
            } else {
                handleResult(data);
            }
        },
        error: handleRunError
    });
}

// Helper function to update the source tab title with unsaved changes indicator and saving status
function updateSourceTabTitle() {
  if (!sourceContainer) return; // source tab not ready yet

  var dot = hasUnsavedChanges ? " •" : "";
  var saving = isSaving ? " — Saving..." : "";
  sourceContainer.setTitle(currentFileName + dot + saving);
}


function setSourceCodeName(name) {
  currentFileName = name;
  updateSourceTabTitle();
}

/*function setSourceCodeName(name) {
    $(".lm_title")[0].innerText = name;
}*/

/*function getSourceCodeName() {
    return $(".lm_title")[0].innerText;
}*/

function openFile(content, filename) {
    clear();

    suppressDirty = true;                 // prevent dirty flag during load
    sourceEditor.setValue(content);
    suppressDirty = false;                // now allow user edits to mark dirty

    selectLanguageForExtension(filename.split(".").pop());
    setSourceCodeName(filename);

    hasUnsavedChanges = false;            // freshly loaded file = clean
    updateSourceTabTitle();               // ensure correct title
}

function saveNow(reason) {
  if (!sourceEditor) return;

  isSaving = true;
  updateSourceTabTitle();

  var content = sourceEditor.getValue();

  // MVP: save to localStorage (silent autosave)
  localStorage.setItem("autosave:" + currentFileName, content);

  isSaving = false;
  hasUnsavedChanges = false;
  updateSourceTabTitle();
}

// Schedules an automatic save after the user stops typing
function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(function () {
    // Only save if there are unsaved changes
    if (!hasUnsavedChanges) return;
    saveNow("idle");
  }, AUTOSAVE_MS);
}

function saveFile(content, filename) {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// When opening a single file, use the File System Access API to keep a writable handle
async function openFilePickerAndHandle() {
    if (isPickerActive) return;
    if (!window.showOpenFilePicker) {
        document.getElementById("open-file-input").click();
        return;
    }
    isPickerActive = true;
    try {
        const [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        const text = await file.text();
        openFile(text, file.name);
        gCurrentFileHandle = fileHandle;
        markActiveFile(fileHandle);
    } catch (err) {
        if (err.name !== "AbortError") console.error(err);
    } finally {
        isPickerActive = false;
    }
}

async function openAction(e) {
    if (e) e.preventDefault();
    if (usePuter()) {
        gPuterFile = await puter.ui.showOpenFilePicker();
        openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
    } else {
        openFilePickerAndHandle();
    }
}

async function saveAction(e) {
    if (e) e.preventDefault();
    if (usePuter()) {
        if (gPuterFile) {
            gPuterFile.write(sourceEditor.getValue());
        } else {
            gPuterFile = await puter.ui.showSaveFilePicker(sourceEditor.getValue(), getSourceCodeName());
            setSourceCodeName(gPuterFile.name);
        }
        hasUnsavedChanges = false;
        updateSourceTabTitle();
    } else {
        if (gCurrentFileHandle && window.showSaveFilePicker) {
            try {
                const writable = await gCurrentFileHandle.createWritable();
                await writable.write(sourceEditor.getValue());
                await writable.close();
                hasUnsavedChanges = false;
                updateSourceTabTitle();
            } catch (err) {
                if (err.name !== "AbortError") showError("Save Error", err.message);
            }
        } else {
             if (window.showSaveFilePicker) {
                 try {
                     const newHandle = await window.showSaveFilePicker({ suggestedName: currentFileName });
                     const writable = await newHandle.createWritable();
                     await writable.write(sourceEditor.getValue());
                     await writable.close();
                     gCurrentFileHandle = newHandle;
                     setSourceCodeName(newHandle.name);
                     hasUnsavedChanges = false;
                     updateSourceTabTitle();
                 } catch (err) {
                     if (err.name !== "AbortError") showError("Save Error", err.message);
                 }
             } else {
                 saveFile(sourceEditor.getValue(), currentFileName);
                 hasUnsavedChanges = false;
                 updateSourceTabTitle();
             }
        }
    }
}

function setFontSizeForAllEditors(fontSize) {
    if (sourceEditor) sourceEditor.updateOptions({ fontSize });
    if (stdinEditor) stdinEditor.updateOptions({ fontSize });
    if (stdoutEditor) stdoutEditor.updateOptions({ fontSize });
    if (compileOutEditor) compileOutEditor.updateOptions({ fontSize });
    if (runOutEditor) runOutEditor.updateOptions({ fontSize });
}

async function loadLangauges() {
    return new Promise((resolve, reject) => {
        let options = [];

        $.ajax({
            url: UNAUTHENTICATED_CE_BASE_URL + "/languages",
            success: function (data) {
                for (let i = 0; i < data.length; i++) {
                    let language = data[i];
                    let option = new Option(language.name, language.id);
                    option.setAttribute("flavor", CE);
                    option.setAttribute("langauge_mode", getEditorLanguageMode(language.name));

                    if (language.id !== 89) {
                        options.push(option);
                    }

                    if (language.id === DEFAULT_LANGUAGE_ID) {
                        option.selected = true;
                    }
                }
            },
            error: reject
        }).always(function () {
            $.ajax({
                url: UNAUTHENTICATED_EXTRA_CE_BASE_URL + "/languages",
                success: function (data) {
                    for (let i = 0; i < data.length; i++) {
                        let language = data[i];
                        let option = new Option(language.name, language.id);
                        option.setAttribute("flavor", EXTRA_CE);
                        option.setAttribute("langauge_mode", getEditorLanguageMode(language.name));

                        if (options.findIndex((t) => (t.text === option.text)) === -1 && language.id !== 89) {
                            options.push(option);
                        }
                    }
                },
                error: reject
            }).always(function () {
                options.sort((a, b) => a.text.localeCompare(b.text));
                $selectLanguage.append(options);
                $selectLanguage.parent(".ui.dropdown").dropdown("refresh");
                resolve();
            });
        });
    });
};

async function loadSelectedLanguage(skipSetDefaultSourceCodeName = false) {
    if (!sourceEditor) {
        console.warn("Editor not initialized yet");
        return;
    }
    monaco.editor.setModelLanguage(sourceEditor.getModel(), $selectLanguage.find(":selected").attr("langauge_mode"));
    if (!skipSetDefaultSourceCodeName) {
        setSourceCodeName((await getSelectedLanguage()).source_file);
    }
}

function selectLanguageByFlavorAndId(languageId, flavor) {
    let option = $selectLanguage.find(`[value=${languageId}][flavor=${flavor}]`);
    if (option.length) {
        option.prop("selected", true);
        $selectLanguage.trigger("change", { skipSetDefaultSourceCodeName: true });
    }
}

function selectLanguageForExtension(extension) {
    let language = getLanguageForExtension(extension);
    selectLanguageByFlavorAndId(language.language_id, language.flavor);
}

async function getLanguage(flavor, languageId) {
    return new Promise((resolve, reject) => {
        if (languages[flavor] && languages[flavor][languageId]) {
            resolve(languages[flavor][languageId]);
            return;
        }

        $.ajax({
            url: `${UNAUTHENTICATED_BASE_URL[flavor]}/languages/${languageId}`,
            success: function (data) {
                if (!languages[flavor]) {
                    languages[flavor] = {};
                }

                languages[flavor][languageId] = data;
                resolve(data);
            },
            error: reject
        });
    });
}

function setDefaults() {
    setFontSizeForAllEditors(fontSize);
    sourceEditor.setValue(DEFAULT_SOURCE);
    stdinEditor.setValue(DEFAULT_STDIN);
    $compilerOptions.val(DEFAULT_COMPILER_OPTIONS);
    $commandLineArguments.val(DEFAULT_CMD_ARGUMENTS);

    $statusLine.html("");

    loadSelectedLanguage();
}

function clear() {
    sourceEditor.setValue("");
    stdinEditor.setValue("");
    $compilerOptions.val("");
    $commandLineArguments.val("");

    $statusLine.html("");
}

function refreshSiteContentHeight() {
    const navigationHeight = document.getElementById("judge0-site-navigation").offsetHeight;

    const siteContent = document.getElementById("judge0-site-content");
    siteContent.style.height = `${window.innerHeight}px`;
    siteContent.style.paddingTop = `${navigationHeight}px`;
}

function refreshLayoutSize() {
    refreshSiteContentHeight();
    layout.updateSize();
}

window.addEventListener("resize", refreshLayoutSize);
document.addEventListener("DOMContentLoaded", async function () {
    $(".ui.selection.dropdown").dropdown();
    $("[data-content]").popup({
        lastResort: "left center"
    });

    refreshSiteContentHeight();

    console.log("Hey, Judge0 IDE is open-sourced: https://github.com/judge0/ide. Have fun!");

    $selectLanguage = $("#select-language");
    $selectLanguage.change(function (event, data) {
        let skipSetDefaultSourceCodeName = (data && data.skipSetDefaultSourceCodeName) || !!gPuterFile;
        loadSelectedLanguage(skipSetDefaultSourceCodeName);
    });

    try {
        await loadLangauges();
    } catch (e) {
        console.warn("Could not load backend APIs. Skipping fetch to render UI...", e);
    }
    // Default editor language for MVP
    const JAVA_ID = "91"; // replace after you confirm
    $selectLanguage.parent(".ui.dropdown").dropdown("set selected", JAVA_ID);
    loadSelectedLanguage(true); // ensure Monaco updates; true avoids filename reset

    $compilerOptions = $("#compiler-options");
    $commandLineArguments = $("#command-line-arguments");

    $runBtn = $("#run-btn");
    updateRunButtonState();

    $clearBtn = $("#clear-btn");
    $compileBtn = $("#compile-btn");
    $runBtn.click(run);
    $clearBtn.click(clearIO);
    $compileBtn.click(compileOnly);

    $("#open-file-input").change(function (e) {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = function (e) {
                openFile(e.target.result, selectedFile.name);
            };

            reader.onerror = function (e) {
                showError("Error", "Error reading file: " + e.target.error);
            };

            reader.readAsText(selectedFile);
        }
    });

    $statusLine = $("#judge0-status-line");

    $(document).on("keydown", "body", function (e) {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case "Enter":
                    e.preventDefault();
                    run();
                    break;
                case "s":
                    e.preventDefault();
                    saveAction();
                    break;
                case "o":
                    e.preventDefault();
                    openAction();
                    break;
                case "+":
                case "=":
                    e.preventDefault();
                    fontSize += 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "-":
                    e.preventDefault();
                    fontSize -= 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "0":
                    e.preventDefault();
                    fontSize = 13;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "`":
                    e.preventDefault();
                    sourceEditor.focus();
                    break;
            }
        }
    });

    require(["vs/editor/editor.main"], function (ignorable) {
        layout = new GoldenLayout(layoutConfig, $("#judge0-site-content"));

        layout.registerComponent("source", function (container, state) {
            sourceContainer = container;
            sourceEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: true,
                readOnly: state.readOnly,
                language: "java",
                minimap: {
                    enabled: true
                },

                // Disable auto-indent
                autoIndent: "none",
                formatOnType: false,
                formatOnPaste: false,

                 //Disable automatic bracket/quote closing
                autoClosingBrackets: "never",
                autoClosingQuotes: "never",
                autoSurround: "never",

                // Disable autocomplete
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                parameterHints: { enabled: false },
                acceptSuggestionOnEnter: "off",
                tabCompletion: "off",
                wordBasedSuggestions: false,
                snippetSuggestions: "none"
            });

            // When the user types in the source editor, mark file as modified
           sourceEditor.onDidChangeModelContent(function () {
                if (suppressDirty) return;   // ignore changes caused by setValue/openFile/init
                hasUnsavedChanges = true;
                updateSourceTabTitle();
                scheduleAutosave();         // schedule an autosave after user stops typing for a bit
            });

             // After initial editor setup/content load finishes, mark file as clean and enable dirty tracking
            setTimeout(function () {
                hasUnsavedChanges = false;
                suppressDirty = false;
                updateSourceTabTitle();
            }, 0);

            sourceEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
                saveNow("manual");
            });

            sourceEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, run);

            sourceEditor.onDidChangeModelContent(() => {
                lastCompiledCode = null;
                updateRunButtonState();
            });
            /*monaco.languages.registerInlineCompletionsProvider('*', {
                provideInlineCompletions: async (model, position) => {
                    if (!puter.auth.isSignedIn() || !document.getElementById("judge0-inline-suggestions").checked || !configuration.get("appOptions.showAIAssistant")) {
                        return;
                    }

                    const textBeforeCursor = model.getValueInRange({
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    });

                    const textAfterCursor = model.getValueInRange({
                        startLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endLineNumber: model.getLineCount(),
                        endColumn: model.getLineMaxColumn(model.getLineCount())
                    });

                    const aiResponse = await puter.ai.chat([{
                        role: "user",
                        content: `You are a code completion assistant. Given the following context, generate the most likely code completion.

                    ### Code Before Cursor:
                    ${textBeforeCursor}

                    ### Code After Cursor:
                    ${textAfterCursor}

                    ### Instructions:
                    - Predict the next logical code segment.
                    - Ensure the suggestion is syntactically and contextually correct.
                    - Keep the completion concise and relevant.
                    - Do not repeat existing code.
                    - Provide only the missing code.
                    - **Respond with only the code, without markdown formatting.**
                    - **Do not include triple backticks (\`\`\`) or additional explanations.**

                    ### Completion:`.trim()
                    }], {
                        model: document.getElementById("judge0-chat-model-select").value,
                    });

                    let aiResponseValue = aiResponse?.toString().trim() || "";

                    if (Array.isArray(aiResponseValue)) {
                        aiResponseValue = aiResponseValue.map(v => v.text).join("\n").trim();
                    }

                    if (!aiResponseValue || aiResponseValue.length === 0) {
                        return;
                    }

                    return {
                        items: [{
                            insertText: aiResponseValue,
                            range: new monaco.Range(
                                position.lineNumber,
                                position.column,
                                position.lineNumber,
                                position.column
                            )
                        }]
                    };
                },
                handleItemDidShow: () => { },
                freeInlineCompletions: () => { }
            });*/
        });

        layout.registerComponent("stdin", function (container, state) {
            stdinEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });
        });

        layout.registerComponent("stdout", function (container, state) {
            stdoutEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });
        });

        layout.registerComponent("compileOut", function (container, state) {
            compileOutEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: true,
                language: "plaintext",
                minimap: { enabled: false 
                }
            });
        });

        layout.registerComponent("runOut", function (container, state) {
            runOutEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: true,
                language: "plaintext",
                minimap: { enabled: false 
                }
            });
        });

        layout.registerComponent("ai", function (container, state) {
            container.getElement()[0].appendChild(document.getElementById("judge0-chat-container"));
        });

        layout.registerComponent("fileExplorer", function (container, state) {
            fileExplorerGLContainer = container;

            let el = document.getElementById("judge0-file-explorer-container");
            if (!el) {
                el = document.createElement("div");
                el.id = "judge0-file-explorer-container";
            }
            el.style.cssText = 'height:100%; overflow-y:auto; font-family: inherit; box-sizing: border-box;';

            // Empty state message
            el.innerHTML = [
                '<div style="padding:16px 12px; opacity:0.5; font-size:0.85em;">',
                '<i class="folder open outline icon"></i>',
                '<div style="margin-top:8px;">No directory opened.</div>',
                '<div style="margin-top:4px; font-size:0.9em;">File → Open Directory...</div>',
                '</div>'
            ].join('');

            container.getElement()[0].style.overflow = 'hidden';
            container.getElement()[0].appendChild(el);
        });

        layout.on("initialised", function () {
            setDefaults();
            refreshLayoutSize();
            window.top.postMessage({ event: "initialised" }, "*");
        });

        layout.init();
    });

    let superKey = "⌘";
    if (!/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
        superKey = "Ctrl";
    }

    [$runBtn].forEach(btn => {
        btn.attr("data-content", `${superKey}${btn.attr("data-content")}`);
    });

    document.querySelectorAll(".description").forEach(e => {
        e.innerText = `${superKey}${e.innerText}`;
    });

    if (usePuter()) {
        puter.ui.onLaunchedWithItems(async function (items) {
            gPuterFile = items[0];
            openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
        });
    }

    $("#judge0-open-file-btn").on("mousedown", openAction);
    $("#judge0-open-dir-btn").on("mousedown", openDirectoryAction);
    $("#judge0-save-btn").on("mousedown", saveAction);
    $("#judge0-save-local-btn").on("mousedown", (e) => {
        saveFile(sourceEditor.getValue(), currentFileName);
    });

    window.onmessage = function (e) {
        if (!e.data) {
            return;
        }

        if (e.data.action === "get") {
            window.top.postMessage(JSON.parse(JSON.stringify({
                event: "getResponse",
                source_code: sourceEditor.getValue(),
                language_id: getSelectedLanguageId(),
                flavor: getSelectedLanguageFlavor(),
                stdin: stdinEditor.getValue(),
                stdout: stdoutEditor.getValue(),
                compiler_options: $compilerOptions.val(),
                command_line_arguments: $commandLineArguments.val()
            })), "*");
        } else if (e.data.action === "set") {
            if (e.data.source_code) {
                sourceEditor.setValue(e.data.source_code);
            }
            if (e.data.language_id && e.data.flavor) {
                selectLanguageByFlavorAndId(e.data.language_id, e.data.flavor);
            }
            if (e.data.stdin) {
                stdinEditor.setValue(e.data.stdin);
            }
            if (e.data.stdout) {
                stdoutEditor.setValue(e.data.stdout);
            }
            if (e.data.compiler_options) {
                $compilerOptions.val(e.data.compiler_options);
            }
            if (e.data.command_line_arguments) {
                $commandLineArguments.val(e.data.command_line_arguments);
            }
            if (e.data.api_key) {
                AUTH_HEADERS["Authorization"] = `Bearer ${e.data.api_key}`;
            }
        } else if (e.data.action === "run") {
            run();
        }
    };
});

const DEFAULT_SOURCE = "\
public class Main {\n\
    public static void main(String[] args) {\n\
        System.out.println(\"Hello, World!\");\n\
    }\n\
}\n\
";

/*const DEFAULT_STDIN = "\
3\n\
3 2\n\
1 2 5\n\
2 3 7\n\
1 3\n\
3 3\n\
1 2 4\n\
1 3 7\n\
2 3 1\n\
1 3\n\
3 1\n\
1 2 4\n\
1 3\n\
";*/
const DEFAULT_STDIN = "";

const DEFAULT_COMPILER_OPTIONS = "";
const DEFAULT_CMD_ARGUMENTS = "";
const DEFAULT_LANGUAGE_ID = 62; // Java (OpenJDK 13.0.1) (https://ce.judge0.com/languages/62)

function getEditorLanguageMode(languageName) {
    const DEFAULT_EDITOR_LANGUAGE_MODE = "plaintext";
    const LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE = {
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
        "Visual Basic": "vb"
    }

    for (let key in LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE) {
        if (languageName.toLowerCase().startsWith(key.toLowerCase())) {
            return LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE[key];
        }
    }
    return DEFAULT_EDITOR_LANGUAGE_MODE;
}

const EXTENSIONS_TABLE = {
    "asm": { "flavor": CE, "language_id": 45 }, // Assembly (NASM 2.14.02)
    "c": { "flavor": CE, "language_id": 103 }, // C (GCC 14.1.0)
    "cpp": { "flavor": CE, "language_id": 105 }, // C++ (GCC 14.1.0)
    "cs": { "flavor": EXTRA_CE, "language_id": 29 }, // C# (.NET Core SDK 7.0.400)
    "go": { "flavor": CE, "language_id": 95 }, // Go (1.18.5)
    "java": { "flavor": CE, "language_id": 91 }, // Java (JDK 17.0.6)
    "js": { "flavor": CE, "language_id": 102 }, // JavaScript (Node.js 22.08.0)
    "lua": { "flavor": CE, "language_id": 64 }, // Lua (5.3.5)
    "pas": { "flavor": CE, "language_id": 67 }, // Pascal (FPC 3.0.4)
    "php": { "flavor": CE, "language_id": 98 }, // PHP (8.3.11)
    "py": { "flavor": EXTRA_CE, "language_id": 25 }, // Python for ML (3.11.2)
    "r": { "flavor": CE, "language_id": 99 }, // R (4.4.1)
    "rb": { "flavor": CE, "language_id": 72 }, // Ruby (2.7.0)
    "rs": { "flavor": CE, "language_id": 73 }, // Rust (1.40.0)
    "scala": { "flavor": CE, "language_id": 81 }, // Scala (2.13.2)
    "sh": { "flavor": CE, "language_id": 46 }, // Bash (5.0.0)
    "swift": { "flavor": CE, "language_id": 83 }, // Swift (5.2.3)
    "ts": { "flavor": CE, "language_id": 101 }, // TypeScript (5.6.2)
    "txt": { "flavor": CE, "language_id": 43 }, // Plain Text
};

function getLanguageForExtension(extension) {
    return EXTENSIONS_TABLE[extension] || { "flavor": CE, "language_id": 43 }; // Plain Text (https://ce.judge0.com/languages/43)
}
