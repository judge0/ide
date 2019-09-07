var apiUrl = localStorageGetItem("api-url") || "https://vlang.api.judge0.com";
var wait = localStorageGetItem("wait") || false;
var pbUrl = "https://pb.judge0.com";
var check_timeout = 200;

var layout;

var sourceEditor;
var stdinEditor;
var stdoutEditor;
var stderrEditor;
var compileOutputEditor;
var sandboxMessageEditor;

var isEditorDirty = false;
var currentLanguageId;

var $selectLanguage;
var $insertTemplateBtn;
var $runBtn;
var $statusLine;

var timeStart;
var timeEnd;

var layoutConfig = {
    settings: {
        showPopoutIcon: false,
        reorderEnabled: false
    },
    dimensions: {
        borderWidth: 3,
        headerHeight: 22
    },
    content: [{
        type: "row",
        content: [{
            type: "component",
            componentName: "source",
            title: "SOURCE",
            isClosable: false,
            componentState: {
                readOnly: false
            }
        }, {
            type: "column",
            content: [{
                type: "stack",
                content: [{
                    type: "component",
                    componentName: "stdin",
                    title: "STDIN",
                    isClosable: false,
                    componentState: {
                        readOnly: false
                    }
                }]
            }, {
                type: "stack",
                content: [{
                        type: "component",
                        componentName: "stdout",
                        title: "STDOUT",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    }, {
                        type: "component",
                        componentName: "stderr",
                        title: "STDERR",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    }, {
                        type: "component",
                        componentName: "compile output",
                        title: "COMPILE OUTPUT",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    }, {
                        type: "component",
                        componentName: "sandbox message",
                        title: "SANDBOX MESSAGE",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    }]
            }]
        }]
    }]
};

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

function localStorageSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (ignorable) {
  }
}

function localStorageGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (ignorable) {
    return null;
  }
}

function showApiUrl() {
    $("#api-url").attr("href", apiUrl);
}

function showError(title, content) {
    $("#site-modal #title").html(title);
    $("#site-modal .content").html(content);
    $("#site-modal").modal("show");
}

function handleError(jqXHR, textStatus, errorThrown) {
    showError(`${jqXHR.statusText} (${jqXHR.status})`, `<pre>${JSON.stringify(jqXHR, null, 4)}</pre>`);
}

function handleRunError(jqXHR, textStatus, errorThrown) {
    handleError(jqXHR, textStatus, errorThrown);
    $runBtn.removeClass("loading");
}

function handleResult(data) {
    timeEnd = performance.now();
    console.log("It took " + (timeEnd - timeStart) + " ms to get submission result.");

    var status = data.status;
    var stdout = decode(data.stdout);
    var stderr = decode(data.stderr);
    var compile_output = decode(data.compile_output);
    var sandbox_message = decode(data.message);
    var time = (data.time === null ? "-" : data.time + "s");
    var memory = (data.memory === null ? "-" : data.memory + "KB");

    $statusLine.html(`${status.description}, ${time}, ${memory}`);

    stdoutEditor.setValue(stdout);
    stderrEditor.setValue(stderr);
    compileOutputEditor.setValue(compile_output);
    sandboxMessageEditor.setValue(sandbox_message);

    $runBtn.removeClass("loading");
}

function getIdFromURI() {
  return location.search.substr(1).trim();
}

function save() {
    var content = JSON.stringify({
        source_code: encode(sourceEditor.getValue()),
        stdin: encode(stdinEditor.getValue()),
        language_id: $selectLanguage.val()
    });
    var filename = "judge0-ide.json";
    var data = {
        content: content,
        filename: filename
    };

    $.ajax({
        url: pbUrl,
        type: "POST",
        async: true,
        headers: {
            "Accept": "application/json"
        },
        data: data,
        success: function (data, textStatus, jqXHR) {
            if (getIdFromURI() != data["long"]) {
                window.history.replaceState(null, null, location.origin + location.pathname + "?" + data["long"]);
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            handleError(jqXHR, textStatus, errorThrown);
        }
    });
}

function loadSavedSource() {
    $.ajax({
        url: pbUrl + "/" + getIdFromURI(),
        type: "GET",
        success: function (data, textStatus, jqXHR) {
            sourceEditor.setValue(decode(data["source_code"]));
            stdinEditor.setValue(decode(data["stdin"]));
            $selectLanguage.dropdown("set selected", data["language_id"]);
            setEditorMode();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            showError("Not Found", "Code not found!");
            window.history.replaceState(null, null, location.origin + location.pathname);
            loadRandomLanguage();
        }
    });
}

function run() {
    if (sourceEditor.getValue().trim() === "") {
        showError("Error", "Source code can't be empty!");
        return;
    } else {
        $runBtn.addClass("loading");
    }

    var sourceValue = encode(sourceEditor.getValue());
    var stdinValue = encode(stdinEditor.getValue());
    var languageId = $selectLanguage.val();
    var data = {
        source_code: sourceValue,
        language_id: languageId,
        stdin: stdinValue
    };

    timeStart = performance.now();
    $.ajax({
        url: apiUrl + `/submissions?base64_encoded=true&wait=${wait}`,
        type: "POST",
        async: true,
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function (data, textStatus, jqXHR) {
            console.log(`Your submission token is: ${data.token}`);
            if (wait == true) {
                handleResult(data);
            } else {
                setTimeout(fetchSubmission.bind(null, data.token), check_timeout);
            }
        },
        error: handleRunError
    });
}

function fetchSubmission(submission_token) {
    $.ajax({
        url: apiUrl + "/submissions/" + submission_token + "?base64_encoded=true",
        type: "GET",
        async: true,
        success: function (data, textStatus, jqXHR) {
            if (data.status.id <= 2) { // In Queue or Processing
                setTimeout(fetchSubmission.bind(null, submission_token), check_timeout);
                return;
            }
            handleResult(data);
        },
        error: handleRunError
    });
}

function changeEditorLanguage() {
    monaco.editor.setModelLanguage(sourceEditor.getModel(), $selectLanguage.find(":selected").attr("mode"));
    $(".lm_title")[0].innerText = fileNames[currentLanguageId];
}

function insertTemplate() {
    sourceEditor.setValue(sources[currentLanguageId]);
    changeEditorLanguage();
}

function loadRandomLanguage() {
    $selectLanguage.dropdown("set selected", $selectLanguage[0].length);
    currentLanguageId = parseInt($selectLanguage.val());
    insertTemplate();
}

$(document).ready(function () {
    console.log("Hey, Judge0 IDE is open-sourced: https://github.com/judge0/ide. Have fun!");

    $selectLanguage = $("#select-language");
    $selectLanguage.change(function (e) {
        currentLanguageId = parseInt($selectLanguage.val());
        if (!isEditorDirty) {
            insertTemplate();
        } else {
            changeEditorLanguage();
        }
    });

    $insertTemplateBtn = $("#insert-template-btn");
    $insertTemplateBtn.click(function (e) {
        if (isEditorDirty && confirm("Are you sure? Your current changes will be lost.")) {
            insertTemplate();
        }
    });

    $runBtn = $("#run-btn");
    $runBtn.click(function (e) {
        run();
    });

    $statusLine = $("#status-line");

    $("body").keydown(function (e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode == 120) { // F9
            e.preventDefault();
            run();
        } else if (keyCode == 119) { // F8
            e.preventDefault();
            var url = prompt("Enter URL of Judge0 API:", apiUrl);
            if (url != null) {
                url = url.trim();
            }
            if (url != null && url != "") {
                apiUrl = url;
                localStorageSetItem("api-url", apiUrl);
                showApiUrl();
            }
        } else if (keyCode == 118) { // F7
            e.preventDefault();
            wait = !wait;
            localStorageSetItem("wait", wait);
            alert(`Submission wait is ${wait ? "ON. Enjoy" : "OFF"}.`);
        } else if (event.ctrlKey && keyCode == 83) { // Ctrl+S
            e.preventDefault();
            save();
        }
    });

    $("select.dropdown").dropdown();
    $(".ui.dropdown").dropdown();
    $(".ui.dropdown.site-links").dropdown({action: "hide", on: "hover"});
    $(".ui.checkbox").checkbox();
    $(".message .close").on("click", function () {
        $(this).closest(".message").transition("fade");
    });

    showApiUrl();

    require(["vs/editor/editor.main"], function () {
        layout = new GoldenLayout(layoutConfig, $("#site-content"));

        layout.registerComponent("source", function (container, state) {
            sourceEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "cpp"
            });

            sourceEditor.getModel().onDidChangeContent(function (e) {
                isEditorDirty = sourceEditor.getValue() != sources[currentLanguageId];
            });
        });

        layout.registerComponent("stdin", function (container, state) {
            stdinEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext"
            });
        });

        layout.registerComponent("stdout", function (container, state) {
            stdoutEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext"
            });
        });

        layout.registerComponent("stderr", function (container, state) {
            stderrEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext"
            });
        });

        layout.registerComponent("compile output", function (container, state) {
            compileOutputEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext"
            });
        });

        layout.registerComponent("sandbox message", function (container, state) {
            sandboxMessageEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext"
            });
        });

        layout.on("initialised", function () {
            if (getIdFromURI()) {
                loadSavedSource();
            } else {
                loadRandomLanguage();
            }
            $("#site-navigation").css("border-bottom", "1px solid black");
        });

        layout.init();
    });
});

// Template Sources
var vSource = "\
fn main() {\n\
    println('hello, world')\n\
}\n\
";

var sources = {
    1: vSource,
    2: vSource,
    3: vSource,
    4: vSource,
    5: vSource,
    6: vSource,
    7: vSource,
    8: vSource,
    9: vSource,
    10: vSource
};

var fileNames = {
    1: "main.v",
    2: "main.v",
    3: "main.v",
    4: "main.v",
    5: "main.v",
    6: "main.v",
    7: "main.v",
    8: "main.v",
    9: "main.v",
    10: "main.v"
};
