var BASE_URL = "https://api.judge0.com";
var SUBMISSION_CHECK_TIMEOUT = 10; // in ms
var WAIT=false;

var sourceEditor, inputEditor, outputEditor;
var $insertTemplateBtn, $selectLanguageBtn, $runBtn, $saveBtn;
var $statusLine, $emptyIndicator;

function getIdFromURI() {
  return location.search.substr(1).trim();
}

function updateEmptyIndicator() {
  if (outputEditor.getValue() === "") {
    $emptyIndicator.html("empty");
  } else {
    $emptyIndicator.html("");
  }
}

function handleError(jqXHR, textStatus, errorThrown) {
  outputEditor.setValue(JSON.stringify(jqXHR, null, 4));
  $statusLine.html(`${jqXHR.statusText} (${jqXHR.status})`);
}

function handleRunError(jqXHR, textStatus, errorThrown) {
  handleError(jqXHR, textStatus, errorThrown);
  $runBtn.button("reset");
  updateEmptyIndicator();
}

function handleResult(data) {
  var status = data.status;
  var stdout = decodeURIComponent(escape(atob(data.stdout || "")));
  var stderr = decodeURIComponent(escape(atob(data.stderr || "")));
  var compile_output = decodeURIComponent(escape(atob(data.compile_output || "")));
  var message = decodeURIComponent(escape(atob(data.message || "")));
  var time = (data.time === null ? "-" : data.time + "s");
  var memory = (data.memory === null ? "-" : data.memory + "KB");

  $statusLine.html(`${status.description}, ${time}, ${memory}`);

  if (status.id == 6) {
    stdout = compile_output;
  } else if (status.id == 13) {
    stdout = message;
  } else if (status.id !== 3 && stderr !== "") { // If status is not "Accepted", merge stdout and stderr
    stdout += (stdout === "" ? "" : "\n") + stderr;
  }

  outputEditor.setValue(stdout);

  updateEmptyIndicator();
  $runBtn.button("reset");
};

function run() {
  if (sourceEditor.getValue().trim() === "") {
    alert("Source code can't be empty.");
    return;
  } else {
    $runBtn.button("loading");
  }

  var sourceValue = btoa(unescape(encodeURIComponent(sourceEditor.getValue())));
  var inputValue = btoa(unescape(encodeURIComponent(inputEditor.getValue())));
  var languageId = $selectLanguageBtn.val();
  var data = {
    source_code: sourceValue,
    language_id: languageId,
    stdin: inputValue
  };
  
  $.ajax({
    url: BASE_URL + `/submissions?base64_encoded=true&wait=${WAIT}`,
    type: "POST",
    async: true,
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function(data, textStatus, jqXHR) {
      console.log(`Your submission token is: ${data.token}`);
      if (WAIT == true) {
        handleResult(data);
      } else {
        setTimeout(fetchSubmission.bind(null, data.token), SUBMISSION_CHECK_TIMEOUT);
      }
    },
    error: handleRunError
  });
};

function fetchSubmission(submission_token) {
  $.ajax({
    url: BASE_URL + "/submissions/" + submission_token + "?base64_encoded=true",
    type: "GET",
    async: true,
    success: function(data, textStatus, jqXHR) {
      if (data.status.id <= 2) { // In Queue or Processing
        setTimeout(fetchSubmission.bind(null, submission_token), SUBMISSION_CHECK_TIMEOUT);
        return;
      }
      handleResult(data);
    },
    error: handleRunError
  });
}

function save() {
  var content = JSON.stringify({
    source_code: btoa(unescape(encodeURIComponent(sourceEditor.getValue()))),
    stdin: btoa(unescape(encodeURIComponent(inputEditor.getValue()))),
    language_id: $selectLanguageBtn.val()
  });
  var filename = "judge0-ide.json";
  var data = {
    content: content,
    filename: filename
  };

  $saveBtn.button("loading");
  $.ajax({
    url: "https://ptpb.pw",
    type: "POST",
    async: true,
    headers: {
      "Accept": "application/json"
    },
    data: data,
    success: function(data, textStatus, jqXHR) {
      $saveBtn.button("reset");
      if (getIdFromURI() != data["long"]) {
        window.history.replaceState(null, null, location.origin + location.pathname + "?" + data["long"]);
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      handleError(jqXHR, textStatus, errorThrown);
      $saveBtn.button("reset");
    }
  });
}

function loadSavedSource() {
  $.ajax({
    url: "https://ptpb.pw/" + getIdFromURI(),
    type: "GET",
    success: function(data, textStatus, jqXHR) {
      sourceEditor.setValue(decodeURIComponent(escape(atob(data["source_code"] || ""))));
      inputEditor.setValue(decodeURIComponent(escape(atob(data["stdin"] || ""))));
      $selectLanguageBtn[0].value = data["language_id"];
      setEditorMode();
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert("Code not found!");
      window.history.replaceState(null, null, location.origin + location.pathname);
      loadRandomLanguage();
    }
  });
}

function setEditorMode() {
  sourceEditor.setOption("mode", $selectLanguageBtn.find(":selected").attr("mode"));
}

function insertTemplate() {
  var value = parseInt($selectLanguageBtn.val());
  sourceEditor.setValue(sources[value]);
  sourceEditor.focus();
  sourceEditor.setCursor(sourceEditor.lineCount(), 0);
  sourceEditor.markClean();
}

function loadRandomLanguage() {
  var randomChildIndex = Math.floor(Math.random()*$selectLanguageBtn[0].length);
  $selectLanguageBtn[0][randomChildIndex].selected = true;
  setEditorMode();
  insertTemplate();
}

function initializeElements() {
  $selectLanguageBtn = $("#selectLanguageBtn");
  $insertTemplateBtn = $("#insertTemplateBtn");
  $runBtn = $("#runBtn");
  $saveBtn = $("#saveBtn");
  $emptyIndicator = $("#emptyIndicator");
  $statusLine = $("#statusLine");
}

$(document).ready(function() {
  console.log("Hey, Judge0 IDE is open-sourced: https://github.com/judge0/ide. Have fun!");

  initializeElements();

  sourceEditor = CodeMirror(document.getElementById("sourceEditor"), {
    lineNumbers: true,
    indentUnit: 4,
    indentWithTabs: true,
    extraKeys: {
      "Tab": function(cm) {
        var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
        cm.replaceSelection(spaces);
      }
    }
  });

  if (getIdFromURI()) {
    loadSavedSource();
  } else {
    loadRandomLanguage();
  }

  inputEditor = CodeMirror(document.getElementById("inputEditor"), {
    lineNumbers: true,
    mode: "plain"
  });
  outputEditor = CodeMirror(document.getElementById("outputEditor"), {
    readOnly: true,
    mode: "plain"
  });

  
  $selectLanguageBtn.change(function(e) {
    if (sourceEditor.isClean()) {
      insertTemplate();
    }
    setEditorMode();
  });
  
  $insertTemplateBtn.click(function(e) {
    if (!sourceEditor.isClean() && confirm("Are you sure? Your current changes will be lost.")) {
      setEditorMode();
      insertTemplate();
    }
  });

  $("body").keydown(function(e){
    var keyCode = e.keyCode || e.which;
    if (keyCode == 120) { // F9
      e.preventDefault();
      run();
    } else if (keyCode == 119) { // F8
      e.preventDefault();
      var url = prompt("Enter URL of Judge0 API:", BASE_URL).trim();
      if (url != "") {
        BASE_URL = url;
      }
    } else if (keyCode == 118) { // F7
      e.preventDefault();
      WAIT=!WAIT;
      alert(`Submission wait is ${WAIT ? "ON. Enjoy" : "OFF"}.`);
    } else if (event.ctrlKey && keyCode == 83) { // Ctrl+S
      e.preventDefault();
      save();
    }
  });

  $runBtn.click(function(e) {
    run();
  });

  $saveBtn.click(function(e) {
    save();
  });

  $("#downloadSourceBtn").click(function(e) {
    var value = parseInt($selectLanguageBtn.val());
    download(sourceEditor.getValue(), fileNames[value], "text/plain");
  });
  $("#downloadInputBtn").click(function(e) {
    download(inputEditor.getValue(), "input.txt", "text/plain");
  });
  $("#downloadOutputBtn").click(function(e) {
    download(outputEditor.getValue(), "output.txt", "text/plain");
  });
});

// Template Sources
var bashSource = "echo \"hello, world\"\n";

var basicSource = "PRINT \"hello, world\"\n";

var cSource = "\
#include <stdio.h>\n\
\n\
int main(void) {\n\
    printf(\"hello, world\\n\");\n\
    return 0;\n\
}\n";

var cppSource = "\
#include <iostream>\n\
\n\
int main() {\n\
    std::cout << \"hello, world\" << std::endl;\n\
    return 0;\n\
}\n";

var csharpSource = "\
public class Hello {\n\
    public static void Main() {\n\
        System.Console.WriteLine(\"hello, world\");\n\
    }\n\
}\n";

var clojureSource = "(println \"hello, world\")\n";

var crystalSource = "puts \"hello, world\"\n";

var elixirSource = "IO.puts \"hello, world\"\n";

var erlangSource = "\
main(_) ->\n\
    io:fwrite(\"hello, world\\n\").\n";

var goSource ="\
package main\n\
\n\
import \"fmt\"\n\
\n\
func main() {\n\
    fmt.Println(\"hello, world\")\n\
}\n";

var haskellSource = "main = putStrLn \"hello, world\"\n";

var insectSource ="\
2 min + 30 s\n\
40 kg * 9.8 m/s^2 * 150 cm\n\
sin(30°)\n";

var javaSource = "\
public class Main {\n\
    public static void main(String[] args) {\n\
        System.out.println(\"hello, world\");\n\
    }\n\
}\n";

var javaScriptSource = "console.log(\"hello, world\");\n";

var ocamlSource = "print_endline \"hello, world\";;\n";

var octaveSource = "printf(\"hello, world\\n\");\n";

var pascalSource = "\
program Hello;\n\
begin\n\
    writeln ('hello, world')\n\
end.\n";

var pythonSource = "print(\"hello, world\")\n";

var rubySource = "puts \"hello, world\"\n";

var rustSource = "\
fn main() {\n\
    println!(\"hello, world\");\n\
}\n"

var textSource = "hello, world\n";

var sources = {
  1: bashSource,
  2: bashSource,
  3: basicSource,
  4: cSource,
  5: cSource,
  6: cSource,
  7: cSource,
  8: cSource,
  9: cSource,
 10: cppSource,
 11: cppSource,
 12: cppSource,
 13: cppSource,
 14: cppSource,
 15: cppSource,
 16: csharpSource,
 17: csharpSource,
 18: clojureSource,
 19: crystalSource,
 20: elixirSource,
 21: erlangSource,
 22: goSource,
 23: haskellSource,
 24: haskellSource,
 25: insectSource,
 26: javaSource,
 27: javaSource,
 28: javaSource,
 29: javaScriptSource,
 30: javaScriptSource,
 31: ocamlSource,
 32: octaveSource,
 33: pascalSource,
 34: pythonSource,
 35: pythonSource,
 36: pythonSource,
 37: pythonSource,
 38: rubySource,
 39: rubySource,
 40: rubySource,
 41: rubySource,
 42: rustSource,
 43: textSource
};

var fileNames = {
  1: "script.sh",
  2: "script.sh",
  3: "main.bas",
  4: "main.c",
  5: "main.c",
  6: "main.c",
  7: "main.c",
  8: "main.c",
  9: "main.c",
 10: "main.cpp",
 11: "main.cpp",
 12: "main.cpp",
 13: "main.cpp",
 14: "main.cpp",
 15: "main.cpp",
 16: "Main.cs",
 17: "Main.cs",
 18: "main.clj",
 19: "main.cr",
 20: "main.exs",
 21: "main.erl",
 22: "main.go",
 23: "main.hs",
 24: "main.hs",
 25: "main.ins",
 26: "Main.java",
 27: "Main.java",
 28: "Main.java",
 29: "main.js",
 30: "main.js",
 31: "main.ml",
 32: "file.m",
 33: "main.pas",
 34: "main.py",
 35: "main.py",
 36: "main.py",
 37: "main.py",
 38: "main.rb",
 39: "main.rb",
 40: "main.rb",
 41: "main.rb",
 42: "main.rs",
 43: "source.txt"
};
