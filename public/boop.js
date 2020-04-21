/* global Terminal */
/**
 * Instance of Terminal
 */
var commands = {};
var state = {};
var terminal;
var files = [
    {
      type: "folder",
      name: "~",
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
  path = [0];

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
        'Display one or more files. Using the "-space" and "-newline" flags will concatinate multiple files with spaces and new lines, respectively'
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
    }
  ];
  if (args[1]) {
    var man = help.filter(i => i.command == args[1]);
    man = man[0];
    if (!man) return "No help page for this command";
    var output = args[1] + " " + man.params + "\n";
    output += man.long;
    return '<span class="important">' + args[1] + "</span><br> " + output;
  } else {
    var output = "Here are the currently available commands:<br><br>";
    for (let i of help) {
      output += i.command + " ";
      output += i.params + " - ";
      output += i.short + "<br>";
    }
    return output;
  }
};

commands.echo = function(args) {
  args.shift();
  return args.join(" ");
};

/**
 * Doom emulator
 */
commands.iddqd = function() {
  if (!state.iddqd) {
    state.iddqd = true;
    return "Degreelessness mode on";
  } else {
    state.iddqd = false;
    return "Degreelessness mode off";
  }
};

/**
 * Zork emulator
 */
commands.look = function(args) {
  if (args.length <= 1) {
    return "You are standing in an open field west of a white house, with a boarded front door. There is a small mailbox here.<br><br>";
  } else {
    return "I don't know the word \"" + args[1] + '".<br><br>';
  }
};

commands.passwd = function(args, opts) {
  opts = opts || {};
  if (!opts.sudo) {
    return '<span class="err">You do not have the necesary privileges</span>';
  }
  setTimeout(_ => {
    terminal.setpwd.prompt(true);
  }, 0);
  return "Are you rure you would like to reset your password? (Y/n)";
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
    if (opts.sudo) {
      Terminal.user = "root";
    } else {
      return '<span class="err">You do not have the necesary privileges</span>';
    }
  }
  return "";
};

commands.pwd = function(args) {
  var out = "",
    tmp = files;
  for (var i = 0; i < path.length; i++) {
    out += tmp[path[i]].name + "/";
    tmp = tmp[path[i]].files;
  }
  return out;
};

commands.ls = function(args) {
  var out = "",
    tmp = getplace(path) || [];
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
  return out;
};

commands.cd = function(args) {
  path = strToPath(args[1]);
  if (path[0] == "<") {
    path = [0];
    return '<span class="err">Directory does not exist</span>';
  }
  return "";
};


commands.touch = function(args) {
  let tmp = strToPath(args[1]);
  let fname = args[1].split("/")[args[1].split("/").length - 1];
  if (tmp[0] == "<") {
    return '<span class="err">Directory does not exist</span>';
  }
  tmp = getplace(tmp);
  if (!tmp.filter(i => i.type == "file" && i.name == fname)[0]) {
    tmp.push({
      type: "file",
      name: fname,
      content: ""
    });
  }
  return "";
};

commands.mkdir = function(args) {
  let tmp = strToPath(args[1], true);
  let fname = args[1].split("/")[args[1].split("/").length - 1];
  if (tmp[0] == "<") {
    return '<span class="err">Directory does not exist</span>';
  }
  tmp = getplace(tmp);
  if (!tmp.filter(i => i.type == "folder" && i.name == fname)[0]) {
    tmp.push({
      type: "folder",
      name: fname,
      content: ""
    });
  }
  return "";
};

commands.rm = function(args) {
  let tmp = strToPath(args[1]);
  let fname = args[1].split("/")[args[1].split("/").length - 1];
  if (tmp[0] == "<") {
    return '<span class="err">Directory does not exist</span>';
  }
  tmp = getplace(tmp);
  let index = tmp.findIndex(i => i.type == "file" && i.name == fname);
  if (tmp < 0) {
    return '<span class="err">Directory does not exist</span>';
  }
  tmp.splice(index,1);
  return "";
};

commands.rmdir = function(args) {
  let tmp = strToPath(args[1], true);
  let fname = args[1].split("/")[args[1].split("/").length - 1];
  if (tmp[0] == "<") {
    return '<span class="err">Directory does not exist</span>';
  }
  tmp = getplace(tmp);
  let index = tmp.findIndex(i => i.type == "folder" && i.name == fname);
  if (tmp < 0) {
    return '<span class="err">Directory does not exist</span>';
  }
  tmp.splice(index,1);
  return "";
};

commands.cat = function(args, opts) {
  opts = opts || {};
  args.shift();
  var out = "";
  args.forEach(item => {
    var fname = item.split("/")[item.split("/").length - 1];

    var dir = strToPath(item);
    if (dir[0] == "<") {
      return dir;
    }

    dir = getplace(dir);

    for (var i = 0; i < dir.length + 1; i++) {
      if (i > dir.length - 1) {
        return '<span class="err">File does not exist</span>';
      }
      if (dir[i].name == fname) {
        if (dir[i].type == "file") {
          out += cleanStr(dir[i].content);
          switch (true) {
            case opts["space"]:
              out += " ";
              break;
            case opts["newline"]:
              out += "<br>";
              break;
          }
          break;
        } else {
          return '<span class="err">Attempted to cat folder</span>';
        }
      }
    }
  });
  return out || '<span class="err">File not found</span>';
};

commands.curl = async function(args) {
  let req;
  try {
    req = await fetch(args[1]);
    req = await req.text();
  } catch {
    return '<span class="err">Failed to get resource</span>';
  }
  // return req;
  return cleanStr(req);
};

commands.exit = function(args) {
  Terminal.exit();
  console.log("[Process completed]");
  window.close();
};

function getplace(path) {
  var tmp = files;
  for (var i = 0; i < path.length; i++) {
    tmp = tmp[path[i]].files;
  }
  return tmp;
}

function strToPath(str, allowfolders) {
  var xpath = path.slice(0),
    str = str.split("/");
  if (str[0] == "") {
    xpath = [0];
  }
  if (str[str.length - 1].search(/\./) != -1 || allowfolders) {
    str.pop();
  }
  if (str.length <= 0) {
    return path;
  }

  var out = "",
    tmp;
  for (var i = 0; i < str.length; i++) {
    if (str[i] == "") {
    } else if (str[i] == "~") {
      xpath = [0];
    } else if (str[i] == ".") {
    } else if (str[i] == "..") {
      xpath.pop();
    } else {
      tmp = getplace(xpath);
      for (var j = 0; j < tmp.length + 1; j++) {
        if (j == tmp.length) {
          return '<span class="err">Directory does not exist</span>';
          break;
        }
        if (tmp[j].type == "folder") {
          if (tmp[j].name == str[i]) {
            xpath.push(j);
            break;
          }
        }
      }
    }
    i++;
  }
  return xpath;
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
/*
// takes a text field and an array of strings for autocompletion
function autocomplete(input, data) {
    var candidates = []
    // filter data to find only strings that start with existing value
    for (var i=0; i < data.length; i++) {
    if (data[i].indexOf(input.innerText) == 0 && data[i].length > input.innerText.length)
        candidates.push(data[i])
    }

    if (candidates.length > 0) {
      // some candidates for autocompletion are found
      if (candidates.length == 1) input.innerText = candidates[0]
      else input.innerText = longestInCommon(candidates, input.innerText.length)
      return true
    }
  
  return false
}

// finds the longest common substring in the given data set.
// takes an array of strings and a starting index
function longestInCommon(candidates, index) {
  var i, ch, memo
  do {
    memo = null
    for (i=0; i < candidates.length; i++) {
      ch = candidates[i].charAt(index)
      if (!ch) break
      if (!memo) memo = ch
      else if (ch != memo) break
    }
  } while (i == candidates.length && ++index)

  return candidates[0].slice(0, index)
}*/

/*
if(!localStorage.getItem('name').pwd||!localStorage.getItem('name').key) {
    let tmp = localStorage.getItem('name');
    if(ui.alert("You do not have a password. Set one?", ui.ButtonSet.YES_NO)==ui.Button.YES){
      tmp.pwd=ui.prompt('Enter a password').getResponseText();
      if(tmp.pwd==ui.prompt('Confirm password').getResponseText()) {
        tmp.key=(Math.random()+"").substr(2);
        tmp.pwd=encrypt(tmp.pwd,tmp.key);
        setData('name',tmp);
      } else {
        ui.alert('Password set failed!');
        return;
      }
    }
  }
*/
