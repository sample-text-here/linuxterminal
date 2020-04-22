/* global Terminal */
/**
 * Instance of Terminal
 */
import { Terminal } from "./terminal.js";

var apt = {
  packages: ["cowsay"],
  installed: []
};

var home = [0];
var commands = {};
var state = {};
var terminal;
var fs = {
  load: function() {
    let storage =
      localStorage.getItem("data") || JSON.stringify(this.defaultfiles);
    this.files = JSON.parse(storage);
    storage = localStorage.getItem("apt") || JSON.stringify(apt);
    apt = JSON.parse(storage);
    apt.installed.forEach(async i => {
      let pack = await import("./apt/" + i + ".js");
      commands[i] = pack[i];
    });
  },

  save: function() {
    localStorage.setItem("data", JSON.stringify(this.files));
    localStorage.setItem("apt", JSON.stringify(apt));
  },

  reset: function() {
    localStorage.setItem("data", JSON.stringify(this.defaultfiles));
    this.files = JSON.parse(JSON.stringify(this.defaultfiles));
    apt.installed = [];
    localStorage.setItem("apt", JSON.stringify(apt));
  },
  files: [],
  defaultfiles: [
    {
      type: "folder",
      name: "root",
      files: [
        {
          type: "folder",
          name: "dir",
          files: [
            {
              type: "file",
              name: "dirfile.txt",
              content: "file in directory"
            }
          ]
        },
        {
          type: "file",
          name: "hello.txt",
          content: "Hello, world!"
        }
      ]
    }
  ],
  path: [0]
};

fs.load();

commands.help = function(args) {
  var help = [
    {
      command: "help",
      params: "&lt;command&gt; (optional)",
      short: "Display this help",
      long: "Shows detailed help about a command"
    },
    {
      command: "echo",
      params: "&lt;string&gt;",
      short: "Write arguments to the standard output",
      long: "Write arguments to the standard output"
    },
    {
      command: "su",
      params: "&lt;username&gt;",
      short: "Substitute user identity",
      long:
        'Substitute user identity. To change to root, use "-" (but it requires sudo)'
    },
    {
      command: "cat",
      params: "&lt;file&gt;",
      short: "Display file(s)",
      long:
        'Display one or more files. Using the "-s" and "-n" flags will concatinate multiple files with spaces and new lines, respectively'
    },
    {
      command: "cd",
      params: "&lt;dir&gt;",
      short: "Change current directory",
      long: "Changes the current directory"
    },
    {
      command: "pwd",
      params: "",
      short: "Print working directory",
      long: "Prints the current working directory"
    },
    {
      command: "touch",
      params: "&lt;filename&gt;",
      short: "Make new file",
      long: "Make new blank file"
    },
    {
      command: "mkdir",
      params: "&lt;folder&gt;",
      short: "Make new folder",
      long: "Make new blank folder"
    },
    {
      command: "rm",
      params: "&lt;filename&gt;",
      short: "Remove file",
      long: "Removes file - be careful, there's no warning!"
    },
    {
      command: "rmdir",
      params: "&lt;folder&gt;",
      short: "Remove folder",
      long: "Removes folder - be careful, there's no warning!"
    },
    {
      command: "passwd",
      params: "",
      short: "Changes your password",
      long: "Changes your password, but it requires sudo"
    },
    {
      command: "sudo",
      params: "&lt;command&gt;",
      short: "Runs commands with elevated privlages",
      long: "Runs commands with elevated privlages. Requires password."
    },
    {
      command: "grep",
      params: "&lt;text&gt; &lt;search&gt;",
      short: "Searches text",
      long: "Searches text and returns the lines where the text appears."
    }
  ];
  help = help.sort(function(x, y) {
    if (x.command < y.command) {
      return -1;
    }
    if (x.command > y.command) {
      return 1;
    }
    return 0;
  });
  if (args[1]) {
    var man = help.filter(i => i.command == args[1]);
    man = man[0];
    if (!man) return { msg: "No help page for this command", err: true };
    var output = args[1] + " " + man.params + "\n";
    output += man.long;
    return {
      msg: '<span class="important">' + args[1] + "</span><br> " + output,
      err: false
    };
  } else {
    var output = "Here are the currently available commands:<br><br>";
    for (let i of help) {
      output += i.command + " ";
      output += i.params + " - ";
      output += i.short + "<br>";
    }
    return { msg: output, err: false };
  }
};

commands.echo = function(args) {
  args.shift();
  return { msg: cleanStr(args.join(" ")), err: false };
};

/**
 * Doom emulator
 */
commands.iddqd = function() {
  if (!state.iddqd) {
    state.iddqd = true;
    return { msg: "Degreelessness mode on", err: false };
  } else {
    state.iddqd = false;
    return { msg: "Degreelessness mode off", err: false };
  }
};

/**
 * Zork emulator
 */
commands.look = function(args) {
  if (args.length <= 1) {
    return {
      msg:
        "You are standing in an open field west of a white house, with a boarded front door. There is a small mailbox here.<br><br>",
      err: false
    };
  } else {
    return {
      msg: "I don't know the word \"" + args[1] + '".<br><br>',
      err: true
    };
  }
};

commands.passwd = function(args, opts) {
  opts = opts || {};
  if (!opts[".sudo"]) {
    return {
      msg: '<span class="err">You do not have the necesary privileges</span>',
      err: true
    };
  }
  setTimeout(_ => {
    terminal.setpwd.prompt(true);
  }, 0);
  return {
    msg: "Are you sure you would like to reset your password? (Y/n)",
    err: false
  };
};

commands.su = function(args, opts) {
  opts = opts || {};
  if (args.length > 1) {
    args.shift();
    Terminal.user = args.join("_");
    setTimeout(_ => {
      if (Terminal.setpwd.check()) {
        Terminal.setpwd.prompt();
      }
    }, 0);
  } else if (opts[""]) {
    if (opts[".sudo"]) {
      Terminal.user = "root";
    } else {
      return {
        msg: '<span class="err">You do not have the necesary privileges</span>',
        err: true
      };
    }
  }
  return { msg: "", err: false };
};

commands.pwd = function(args) {
  var out = "",
    tmp = fs.files;
  for (var i = 0; i < fs.path.length; i++) {
    out += tmp[fs.path[i]].name + "/";
    tmp = tmp[fs.path[i]].files;
  }
  return { msg: "/" + out, err: false };
};

commands.ls = function(args) {
  var out = "",
    tmp = getplace(fs.path) || [];
  for (var i = 0; i < tmp.length; i++) {
    if (tmp[i].type == "folder") {
      out +=
        '<span style="color:blue;text-shadow:0 0 2px blue">' +
        tmp[i].name +
        "</span> ";
    } else {
      out += "<span>" + tmp[i].name + "</span> ";
    }
  }
  return { msg: out, err: false };
};

commands.cd = function(args) {
  fs.path = strToPath(args[1]);
  if (fs.path[0] == "<") {
    fs.path = [0];
    return {
      msg: '<span class="err">Directory does not exist</span>',
      err: true
    };
  }
  return { msg: "", err: false };
};

commands.touch = function(args) {
  if (!args[1]) return;
  let tmp = strToPath(args[1], true);
  let fname = args[1].split("/")[args[1].split("/").length - 1];
  if (tmp[0] == "<") {
    return { msg: tmp, err: true };
  }
  tmp = getplace(tmp);
  if (!tmp.filter(i => i.type == "file" && i.name == fname)[0]) {
    tmp.push({
      type: "file",
      name: fname,
      content: ""
    });
  }
  refresh(fs.path);
  return { msg: "", err: false };
};

commands.mkdir = function(args) {
  let tmp = strToPath(args[1], true);
  let fname = args[1].split("/")[args[1].split("/").length - 1];
  if (tmp[0] == "<") {
    return {
      msg: '<span class="err">Directory does not exist</span>',
      err: true
    };
  }
  tmp = getplace(tmp);
  if (!tmp.filter(i => i.type == "folder" && i.name == fname)[0]) {
    tmp.push({
      type: "folder",
      name: fname,
      files: []
    });
  }
  refresh(fs.path);
  return { msg: "", err: false };
};

commands.rm = function(args) {
  let tmp = strToPath(args[1]);
  let fname = args[1].split("/")[args[1].split("/").length - 1];
  if (tmp[0] == "<") {
    return { msg: '<span class="err">File does not exist</span>', err: true };
  }
  tmp = getplace(tmp);
  let index = tmp.findIndex(i => i.type == "file" && i.name == fname);
  if (tmp < 0) {
    return { msg: '<span class="err">File does not exist</span>', err: false };
  }
  tmp.splice(index, 1);
  return { msg: "", err: false };
};

commands.rmdir = function(args) {
  let tmp = strToPath(args[1], true);
  let fname = args[1].split("/")[args[1].split("/").length - 1];
  if (tmp[0] == "<") {
    return {
      msg: '<span class="err">Directory does not exist</span>',
      err: true
    };
  }
  tmp = getplace(tmp);
  let index = tmp.findIndex(i => i.type == "folder" && i.name == fname);
  if (tmp < 0) {
    return {
      msg: '<span class="err">Directory does not exist</span>',
      err: true
    };
  }
  tmp.splice(index, 1);
  return { msg: "", err: false };
};

commands.cat = function(args, opts) {
  opts = opts || {};
  args.shift();
  var out = "";
  args.forEach(item => {
    var fname = item.split("/")[item.split("/").length - 1];

    var dir = strToPath(item);
    if (dir[0] == "<") {
      return { msg: dir, err: true };
    }

    dir = getplace(dir);

    for (var i = 0; i < dir.length + 1; i++) {
      if (i > dir.length - 1) {
        return {
          msg: '<span class="err">File does not exist</span>',
          err: true
        };
      }
      if (dir[i].name == fname) {
        if (dir[i].type == "file") {
          out += cleanStr(dir[i].content)
            .split("\n")
            .join("<br />");
          switch (true) {
            case opts["s"]:
              out += " ";
              break;
            case opts["n"]:
              out += "<br>";
              break;
          }
          break;
        } else {
          return {
            msg: '<span class="err">Attempted to cat folder</span>',
            err: true
          };
        }
      }
    }
  });
  return { msg: out || '<span class="err">File not found</span>', err: true };
};

commands.grep = async function(args) {
  var out = "";
  if (!args[1]) return { msg: '<span class="err">No input</span>', err: true };
  if (!args[2])
    return { msg: '<span class="err">No search term</span>', err: true };
  args[1] = args[1].split("\n");
  args[1].forEach(i => {
    if (i.includes(args[2])) {
      out +=
        cleanStr(i).replace(
          args[2],
          `<span class="important">${cleanStr(args[2])}</span>`
        ) + "<br>";
    }
  });
  return { msg: out, err: false };
};

commands.whoami = function() {
  return { msg: terminal.user, err: false };
};

commands.apt = async function(args) {
  switch (args[1]) {
    case "install":
      if (!apt.packages.includes(args[2]))
        return {
          msg: '<span class="err">package not found</span>',
          err: true
        };
      if (apt.installed.includes(args[2]))
        return {
          msg: '<span class="err">package already installed</span>',
          err: true
        };
      let pack = await import("./apt/" + args[2] + ".js");
      commands[args[2]] = pack[args[2]];
      apt.installed.push(args[2]);
      break;
    case "remove":
      if (!apt.packages.includes(args[2]))
        return {
          msg: '<span class="err">package not found</span>',
          err: true
        };
      if (!apt.installed.includes(args[2]))
        return {
          msg: '<span class="err">package not installed</span>',
          err: true
        };
      delete commands[args[2]];
      apt.installed = apt.installed.splice(apt.installed.indexOf(args[2]), 0);
      break;
    case "list":
      return { msg: apt.packages.join("<br />"), err: false };
      break;
    default:
      return {
        msg: '<span class="err">apt must have "install"</span>',
        err: true
      };
      break;
  }
  return { msg: "Done!", err: false };
};

commands.curl = async function(args) {
  let req;
  try {
    req = await fetch(args[1]);
    req = await req.text();
  } catch {
    return {
      msg: '<span class="err">Failed to get resource</span>',
      err: false
    };
  }
  return cleanStr(req);
};

commands.exit = function(args) {
  Terminal.exit();
  console.log("[Process completed]");
  window.close();
};

commands.fs = function(args, opts) {
  switch (args[1]) {
    case "save":
      fs.save();
      return { msg: "Succesfully saved", err: false };
      break;
    case "load":
      fs.load();
      return { msg: "Succesfully loaded", err: false };
      break;
    case "reset":
      if (opts[".sudo"]) {
        fs.reset();
        return { msg: "Succesfully reset", err: false };
      } else {
        return {
          msg:
            '<span class="err">You do not have the necesary privileges</span>',
          err: true
        };
      }
      break;
    default:
      break;
  }
};

commands["lin file"] = function(path, make) {
  var fname = path.split("/")[path.split("/").length - 1];

  let folder = strToPath(fname, true);

  if (folder[0] == "<") {
    return folder;
  }

  folder = getplace(folder);
  if (make) {
    commands.touch(["touch", path]);
  }

  return folder.filter(i => i.type == "file" && i.name == fname)[0];
};

commands["lin append"] = function(output, pathout) {
  let cleaned = document.createElement("div");
  cleaned.innerHTML = output;
  output = cleaned.innerText;

  let file = commands["lin file"](pathout, true);

  file.content += output + "\n";
};

commands["lin set"] = function(output, pathout) {
  let cleaned = document.createElement("pre");

  cleaned.style.whiteSpace = "pre";
  cleaned.innerHTML = output;
  cleaned.innerHTML = cleaned.innerHTML.replace("<br>", "\\n");
  output = cleaned.innerText;
  let file = commands["lin file"](pathout, true);
  file.content = output;
};

function getplace(path) {
  var tmp = fs.files;
  for (var i = 0; i < path.length; i++) {
    tmp = tmp[path[i]].files;
  }
  return tmp;
}

function strToPath(str, empty = false) {
  var xpath = fs.path.slice(0),
    str = str.split("/");
  if (str[0] == "") {
    xpath = [];
  }
  if (str.length < 0) {
    return fs.path;
  }

  var tmp;

  for (var i = 0; i < str.length; i++) {
    if (i == str.length - 1 && empty) {
      break;
    }
    if (str[i] == "") {
    } else if (str[i] == "~") {
      xpath = [0];
    } else if (str[i] == ".") {
    } else if (str[i] == "..") {
      xpath.pop();
    } else {
      tmp = getplace(xpath) || { length: 0 };
      for (var j = 0; j <= tmp.length; j++) {
        if (j == tmp.length) {
          return '<span class="err">Directory does not exist</span>';
        }
        if (tmp[j].name == str[i]) {
          if (tmp[j].type == "folder") {
            xpath.push(j);
            break;
          } else if (tmp[j].type == "file" && i == str.length - 1) {
            break;
          }
        }
      }
    }
  }

  return xpath;
}

function createReference(context, prop) {
  return function() {
    return context[prop];
  };
}

function refresh(path) {
  var newf = getplace(path);

  var tmp = newf.filter(item => item.type == "folder");
  newf.forEach((i, index) => {
    if (i.type == "folder") {
      newf.splice(index, 1);
    }
  });

  for (let i of tmp) {
    newf.unshift(i);
  }
}

function initTerminal() {
  console.log("Terminal access granted.");

  terminal = Terminal.init(document.body, {
    commands: commands,
    prompt: "\\u@\\H: $ ",
    intro:
      "<p>Welcome to Fake Terminal. Type 'help' to get started.</p><p>&nbsp;</p>"
  });

  if (terminal.setpwd.check()) {
    terminal.setpwd.prompt();
  }

  console.log(terminal);
}

function cleanStr(str) {
  return str
    .replace(/\&/g, "&amp")
    .replace(/\</g, "&lt;")
    .replace(/\>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/\'/g, "&#39;");
}

// todo autocomplete files

window.addEventListener("DOMContentLoaded", _ => {
  initTerminal();
});
