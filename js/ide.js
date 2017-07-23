var BASE_URL = "https://api.judge0.com";
var SUBMISSION_CHECK_TIMEOUT = 10; // in ms

var sourceEditor, inputEditor, outputEditor;
var $insertTemplateBtn, $selectLanguageBtn, $runBtn;
var $statusLine, $emptyIndicator;

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
  $runBtn.button("reset");
  updateEmptyIndicator();
}

function run() {
  if (sourceEditor.getValue().trim() === "") {
    alert("Source code can't be empty.");
    return;
  } else {
    $runBtn.button("loading");
  }

  var sourceValue = btoa(sourceEditor.getValue());
  var inputValue = btoa(inputEditor.getValue());
  var languageId = $selectLanguageBtn.val();
  var data = {
    source_code: sourceValue,
    language_id: languageId,
    input: inputValue
  };
  
  $.ajax({
    url: BASE_URL + "/submissions?base64_encoded=true",
    type: "POST",
    async: true,
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function(data, textStatus, jqXHR) {
      console.log(`Your submission token is: ${data.token}`);
      setTimeout(fetchSubmission.bind(null, data.token), SUBMISSION_CHECK_TIMEOUT);
    },
    error: handleError
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

      var status = data.status;
      var stdout = atob(data.stdout || "");
      var stderr = atob(data.stderr || "");
      var time = (data.time === null ? "-" : data.time + "s");
      var memory = (data.memory === null ? "-" : data.memory + "KB");

      $statusLine.html(`${status.description}, ${time}, ${memory}`);

      if (status.id !== 3 && stderr !== "") { // If status is not "Accepted", merge stdout and stderr
        stdout += (stdout === "" ? "" : "\n") + stderr;
      }
      outputEditor.setValue(stdout);
      
      updateEmptyIndicator();
      $runBtn.button("reset");
    },
    error: handleError
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
}

$(document).ready(function() {
  console.log("Hey, Judge0 IDE is open-sourced here: https://github.com/judge0/ide. Have fun!");
  if (window.location.protocol === "file:") {
    BASE_URL = "http://localhost:3000"; // If running locally, you probably couldn't use any other API except localhost
  }

  $selectLanguageBtn = $("#selectLanguageBtn");
  $insertTemplateBtn = $("#insertTemplateBtn");
  $runBtn = $("#runBtn");
  $emptyIndicator = $("#emptyIndicator");
  $statusLine = $("#statusLine");

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
  var randomChildIndex = Math.floor(Math.random()*$selectLanguageBtn[0].length);
  $selectLanguageBtn[0][randomChildIndex].selected = true;
  setEditorMode();
  insertTemplate();

  inputEditor = CodeMirror(document.getElementById("inputEditor"), {
    lineNumbers: true,
    mode: "plain"
  });
  outputEditor = CodeMirror(document.getElementById("outputEditor"), {
    readOnly: true,
    mode: "plain"
  });

  
  $selectLanguageBtn.change(function(e) {
    setEditorMode();
  });
  
  $insertTemplateBtn.click(function(e) {
    insertTemplate();
  });

  $("body").keydown(function(e){
    var keyCode = e.keyCode || e.which;
    if (keyCode == 120) { // F9
      e.preventDefault();
      run();
    }
  });

  $runBtn.click(function(e) {
    run();
  });
});

// Template Sources
var bashSource = "echo \"hello, world\"\n";

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

var haskellSource = "main = putStrLn \"hello, world\"\n";

var javaSource = "\
public class Main {\n\
    public static void main(String[] args) {\n\
        System.out.println(\"hello, world\");\n\
    }\n\
}\n";

var octaveSource = "printf(\"hello, world\\n\");\n";

var pascalSource = "\
program Hello;\n\
begin\n\
    writeln ('hello, world')\n\
end.\n";

var pythonSource = "print(\"hello, world\")\n";

var rubySource = "puts \"hello, world\"\n";

var javaScriptSource = "console.log(\"hello, world\");\n";

var sources = {
  1: bashSource,
  2: bashSource,
  3: cSource,
  4: cSource,
  5: cSource,
  6: cSource,
  7: cppSource,
  8: cppSource,
  9: cppSource,
  10: cppSource,
  11: csharpSource,
  12: haskellSource,
  13: javaSource,
  14: javaSource,
  15: octaveSource,
  16: pascalSource,
  17: pythonSource,
  18: pythonSource,
  19: pythonSource,
  20: pythonSource,
  21: rubySource,
  22: rubySource,
  23: rubySource,
  24: rubySource,
  25: javaScriptSource,
  26: javaScriptSource
};
