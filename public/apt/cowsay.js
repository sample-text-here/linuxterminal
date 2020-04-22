function split(text, index) {
  return [text.substr(0, index), text.substr(index, text.length - index)];
}

function bubble(arr, len) {
  let out = "<br> ";
  len += 2;
  for (var i = 0; i < len - 2; i++) {
    out += "_";
  }
  out += "<br>";
  if (arr.length == 1) {
    out += "&lt;" + arr[0] + "&gt;<br>";
  } else {
    for (let i = 0; i < arr.length; i++) {
      if (i == 0) {
        out += "/ " + arr[i] + " \\<br>";
      } else if (i == arr.length - 1) {
        let j;
        for (j = arr[i]; j.length < len - 2; j += " ");
        out += "\\ " + j + " /<br>";
      } else {
        out += "| " + arr[i] + " |<br>";
      }
    }
  }
  out += " ";
  for (var i = 0; i < len - 2; i++) {
    out += "-";
  }
  return out;
}

function addcow(str) {
  let cow = [
    "\\   ^__^",
    " \\  (oo)_______",
    "    (__)       )\\/\\",
    "       ||----w |",
    "       ||     ||"
  ].join("<br>");
  return "<pre>"+str + "<br>" + cow+"</pre>";
}

function cowsay(args, opts) {
  let len = 20;
  if (opts) {
    if (opts["l"]) {
      if (args[0] == Math.floor(args[0])) {
        len = args[0];
        args.unshift();
      } else {
        return { msg: '"-l" flag set, but no length specified', err: false };
      }
    }
  }
  let str = args.join(" ");
  len = str.length < len ? str.length : len;
  let res = [str];
  while (res[res.length - 1].length > 20) {
    let tmp = res.pop();
    res.push(...split(tmp, 20));
  }
  res = bubble(res, len);
  return { msg: addcow(res), err: false };
}

export { cowsay };
