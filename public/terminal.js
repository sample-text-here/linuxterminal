/**
 * pseudo-terminal adapted from https://github.com/avgp/terminal.js
 */
var Terminal = (function() {
  var history = localStorage.getItem("history")
    ? localStorage.getItem("history").split(",")
    : [];
  var historyIndex = history.length;
  var self = {};

  var KEY_UP = 38;
  var KEY_DOWN = 40;
  var KEY_TAB = 9;

  // Auxiliary functions

  var resetPrompt = function(terminal, prompt) {
    var newPrompt = prompt.parentNode.cloneNode(true);

    prompt.setAttribute("contenteditable", false);
    newPrompt.querySelector(".terminal-prompt").textContent = getPrompt(
      self.options.prompt
    );
    terminal.appendChild(newPrompt);
    newPrompt.querySelector(".terminal-input").innerHTML = " ";
    newPrompt.querySelector(".terminal-input").focus();
  };
  var doCommands = async function(terminal, input, sudo) {
    input = input.join(" ").split("|");
    var last = { output: "" };
    for (let i of input) {
      last = last.output;
      i = i.trim();
      i = i.split(" ");
      i.splice(1, 0, last);
      i = i.filter(i => i);
      last = await tryCommand(terminal, i[0], i, sudo);
    }
    printCommand(terminal, (last||{output:{msg:""}}).output.msg, (last||{opts:""}).opts);
  };

  var tryCommand = async function(terminal, cmd, args, sudo) {
    if (cmd == "clear") {
      self.output.innerHTML = "";
      return;
    }

    if (cmd == "sudo") {
      if (getData("password")) {
        self.output.innerHTML += "[sudo] password for " + self.user + ":<br>";
        args.shift();
        self.sudo.queue = args.join(" ");
        self.sudo.sudo = true;
        return;
      } else {
        sudo = true;
      }
    }

    if (cmd in self.commands) {
      return await parseCommand(terminal, cmd, args, sudo);
    } else {
      return commandNotFound(terminal, cmd);
    }
  };

  var parseCommand = async function(terminal, cmd, args, sudo = false) {
    var options = { ".sudo": sudo };
    for (let i = 0; i < args.length; i++) {
      if (i >= args.length) break;
      if (args[i][0] == "-") {
        let x = args[i].substr(1);
        if (x != ".sudo" || x != ".output") {
          options[x] = true;
        }
        args.splice(i, 1);
        i--;
      }

      //redirect
      if (args[i][0] == ">") {
        options[".output"] = {};
        if (args[i].length == 1) {
          //> file
          if (!args[i + 1]) {
            redirectError(terminal);
            return;
          }
          options[".output"].fname = args[i + 1];
          options[".output"].type = "set";
          args.splice(i, 2);
        } else if (args[i][1] == ">") {
          if (args[i].length > 2) {
            //>>file
            options[".output"].fname = args[i].substr(2);
            options[".output"].type = "append";
            args.splice(i, 1);
          } else {
            //>> file
            if (!args[i + 1]) {
              redirectError(terminal);
              return;
            }
            options[".output"].fname = args[i + 1];
            options[".output"].type = "append";
            args.splice(i, 2);
          }
        } else {
          //>file
          options[".output"].fname = args[i].substr(1);
          options[".output"].type = "set";
          args.splice(i, 1);
        }
      }
    }
    return {
      output: await runCommand(terminal, cmd, args, options),
      opts: options
    };
  };

  var runCommand = async function(terminal, cmd, args, opts) {
    return await self.commands[cmd](args, opts);
  };

  var printCommand = async function(terminal, text, opts = {}) {
    if (!opts[".output"]) {
      terminal.innerHTML += text;
      return;
    }

    if (opts[".output"].type == "set") {
      self.commands["lin set"](text, opts[".output"].fname);
    } else {
      self.commands["lin append"](text, opts[".output"].fname);
    }
  };

  var commandNotFound = function(terminal, cmd) {
    terminal.innerHTML +=
      '<span class="err">' + cmd + ": command not found</span>";
  };

  var redirectError = function(terminal) {
    terminal.innerHTML += '<span class="err">Output redirect error</span>';
  };

  var updateHistory = function(cmd) {
    history.push(cmd);
    localStorage.setItem("history", history);
    historyIndex = history.length;
  };

  var browseHistory = function(prompt, direction) {
    var changedPrompt = false;

    if (direction === KEY_UP && historyIndex > 0) {
      prompt.textContent = history[--historyIndex];
      changedPrompt = true;
    } else if (direction === KEY_DOWN) {
      if (historyIndex < history.length) ++historyIndex;
      if (historyIndex < history.length)
        prompt.textContent = history[historyIndex];
      else prompt.textContent = " ";
      changedPrompt = true;
    }

    if (changedPrompt) {
      var range = document.createRange();
      var sel = window.getSelection();
      range.setStart(prompt.childNodes[0], prompt.textContent.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  var autoCompleteInput = function(input) {
    var cmds = self.commands;
    var re = new RegExp("^" + input, "ig");
    var suggestions = [];
    for (var cmd in cmds) {
      if (cmds.hasOwnProperty(cmd) && cmd.match(re)) {
        suggestions.push(cmd);
      }
    }
    return suggestions;
  };

  var getPrompt = function(str, opts) {
    return str
      .replace("\\u", self.user)
      .replace("\\H", window.location.hostname)
      .replace("\\h", window.location.hostname.split(".")[0]);
  };

  var createElements = function(opts) {
    var container = document.createElement("div");
    container.classList.add("terminal");

    var fragment = document.createDocumentFragment();
    var elem = document.createElement("div");
    elem.className = "terminal-output";
    elem.setAttribute("spellcheck", false);

    var intro = document.createElement("div");
    intro.innerHTML = opts.intro;
    elem.appendChild(intro);

    var line = document.createElement("p");
    var prompt = document.createElement("span");
    prompt.className = "terminal-prompt";
    prompt.innerHTML = getPrompt(opts.prompt, opts);
    line.appendChild(prompt);
    var input = document.createElement("span");
    input.className = "terminal-input";
    input.setAttribute("contenteditable", true);
    line.appendChild(input);
    elem.appendChild(line);

    fragment.appendChild(elem);
    container.appendChild(fragment);

    self.output = elem;
    return container;
  };

  var mountTerminalElement = function(mount, el) {
    if (mount instanceof window.HTMLElement) {
      mount.appendChild(el);
    } else if (typeof mount === "string") {
      var existing = document.getElementById(mount);
      if (!existing) return;
      existing.appendChild(el);
    }

    return self;
  };

  function getData(item) {
    let storage = localStorage.getItem("u-" + self.user) || "{}";
    storage = JSON.parse(storage);
    return storage[item] || "";
  }

  function setData(item, value) {
    let storage = localStorage.getItem("u-" + self.user) || "{}";
    storage = JSON.parse(storage);
    storage[item] = value;
    storage = JSON.stringify(storage);
    localStorage.setItem("u-" + self.user, storage);
    return;
  }
  
  /*function load() {
    let storage = localStorage.getItem("data") || "{}";
    files = JSON.parse(storage);
  }

  function save() {
    localStorage.setItem("data", JSON.stringify(files););
  }*/

  function encrypt(string, key) {
    var out = "";
    [...string].forEach((i, index) => {
      out += String.fromCharCode(
        string.charCodeAt(index) ^ key[index % key.length]
      );
    });
    return window.btoa(out);
  }

  function decrypt(string, key) {
    string = window.atob(string);
    var out = "";
    [...string].forEach((i, index) => {
      out += String.fromCharCode(
        string.charCodeAt(index) ^ key[index % key.length]
      );
    });
    return out;
  }

  // Terminal functions

  self.init = function(containerId, opts) {
    self.options = opts;
    self.user = opts.user || "user";
    self.commands = opts.commands;
    self.container = createElements(opts);

    mountTerminalElement(containerId, self.container);

    self.output.addEventListener("keydown", function(event) {
      if (event.keyCode === KEY_TAB) {
        var prompt = event.target;
        var suggestions = autoCompleteInput(
          prompt.textContent.replace(/\s+/g, "")
        );

        if (suggestions.length === 1) {
          prompt.textContent = suggestions[0];
          var range = document.createRange();
          var sel = window.getSelection();
          range.setStart(prompt.childNodes[0], suggestions[0].length);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }

        event.preventDefault(true);
        return false;
      }
    });

    self.output.addEventListener("keyup", function(event) {
      if (historyIndex < 0) return;
      browseHistory(event.target, event.keyCode);
    });

    self.output.addEventListener("keypress", async function(event) {
      var prompt = event.target;
      if (event.keyCode !== 13) return false;

      updateHistory(prompt.textContent);

      var input = prompt.textContent.trim().split(" ");

      if (self.sudo.sudo == true) {
        if (encrypt(input.join(" "), getData("key")) == getData("password")) {
          input = self.sudo.queue.split(" ");
          if (input[0]) await doCommands(self.output, input, true);
          self.sudo.sudo = false;
          resetPrompt(self.output, prompt);
          event.preventDefault();
          return;
        } else {
          self.output.innerHTML += "Incorrect password<br>";
          self.sudo.sudo = false;
          self.sudo.queue = "";
          resetPrompt(self.output, prompt);
          event.preventDefault();
          return;
        }
      }

      switch (self.setpwd.prompting) {
        case 1:
          switch (input[0][0].toLowerCase()) {
            case "y":
              self.setpwd.prompting = 2;
              self.output.innerHTML += "Enter a password:<br>";
              break;
            case "n":
              self.setpwd.prompting = 0;
              break;
            default:
              self.output.innerHTML += "Unknown response<br>";
              break;
          }
          break;
        case 2:
          self.output.innerHTML += "Confirm password:<br>";
          self.setpwd.tmp = input.join(" ");
          self.setpwd.prompting = 3;
          break;
        case 3:
          if (input.join(" ") == self.setpwd.tmp) {
            self.setpwd.set(self.setpwd.tmp);
            self.setpwd.tmp = "";
            self.setpwd.prompting = 0;
            self.output.innerHTML = "Success! You can now use the terminal<br>";
          } else {
            self.setpwd.prompting = 1;
            self.output.innerHTML +=
              "Passwords don't match. Try again? (Y/n)<br>";
          }
          break;
        default:
          if (input[0]) await doCommands(self.output, input);
          break;
      }

      resetPrompt(self.output, prompt);
      event.preventDefault();
    });

    /**
     * Clicking anywhere on terminal should put cursor on the command line
     * Do not focus on command line if action creates a text selection range
     */
    self.output.addEventListener(
      "click",
      function(event) {
        // Sometimes there is more than one editable input, force it to be the last one
        // TODO: fix the bug where there is more than one contenteditable element
        var temp = self.output.querySelectorAll(
          ".terminal-input[contenteditable=true]"
        );
        var el = temp[temp.length - 1];
        var selection = window.getSelection();
        if (selection.isCollapsed === true && selection.rangeCount <= 1 && el) {
          el.focus();
        }
      },
      false
    );

    self.output.querySelector(".terminal-input").focus();
    return self;
  };

  self.sudo = {
    queue: "",
    sudo: 0
  };

  self.setpwd = {
    check: function() {
      return !getData("password") || !getData("key");
    },
    prompt: function(noprompt = false) {
      this.prompting = 1;
      if (noprompt) return;
      let x = document.createElement("span");
      x.innerHTML = "Password not set. set now? (Y/n)<br>";
      self.output.lastChild.before(x);
    },
    set: function(pwd) {
      let key = (Math.random() + "").substr(2);
      setData("password", encrypt(pwd, key));
      setData("key", key);
    },
    prompting: 0
  };

  self.exit = function() {
    var removeThis = self.container.parentNode.removeChild(self.container);
    removeThis = null;
  };

  return self;
})();
