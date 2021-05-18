const path = require("path");
let debug = false;
let add_helper_vars = false;
let counter = 0;
if (process.argv.length > 3 && process.argv[3] === "debug") debug = true;
let filelines = getFileContents(process.argv[2]);
if (debug) console.log("there are " + filelines.length + " lines");

let defines = process_main(filelines, path.parse(process.argv[2]).name);
if (debug) console.log("defines=" + JSON.stringify(defines, " ", 2));

if (add_helper_vars) {
  let other_vars = process_helper(defines);
  let t = defines.reverse();
  for (let i in t) {
    let x = t[i];
    if (x.trim().length != 0) {
      if (i > 0) {
        if (debug)
          console.log("removing " + i + " entries of " + defines.length);
        t = t.slice(i);
      }
      break;
    }
  }
  let x = t.shift();
  if (debug) console.log("end of defines list='" + x + "'");
  for (const k of Object.keys(other_vars)) {
    if (debug)
      console.log(
        "used variable not defined=" + k + " default value =" + other_vars[k]
      );
    t.unshift(k + ":" + other_vars[k]);
  }
  t.unshift(x + ",");
  defines = t.reverse();
}

for (let q of defines) {
  console.log(q);
}

function readeFile(fn) {
  if (debug) console.log("file=" + fn);
  let lines = [];
  let fs = require("fs");
  // if the file exists
  if (fs.existsSync(fn)) {
    // read it in and split it by new lines
    fs.readFileSync(fn, "utf-8")
      .split(/\r?\n/)
      .forEach((line) => {
        //if(debug) console.log("line="+ ++counter +line);
        // and save the lines
        lines.push(line);
      });
  }
  return lines;
}
// we have a minified file, make it readable
function processMinified(lines) {
  let xlines = [];
  // if there are more than a few lines
  if (lines.length < 10) {
    // process it
    let newlines = [];
    // loop thru the lines
    for (let line of lines) {
      //while(line.indexOf(';')>=0){
      if (debug)
        console.log(
          "replacing type=" + typeof line + "+ length=" + line.length
        );
      // split the lines at semicolon
      let r = line.split(";");
      for (let l of r) {
        newlines.push(l.toString());
      }
      // watch out for commas that make parsing variable hard
      for (let l of newlines) {
        // split the lines at comma
        // if not a null line
        for (let o of l.split(","))
          if (o.trim().length)
            // add the comma back on
            xlines.push(o.trim() + ",");
      }
      if (debug) console.log("newlines length=" + xlines.length);
    }
  } else return lines;
  return xlines;
}

function getFileContents(fn) {
  let lines = readeFile(fn);

  if (lines.length < 10) lines = processMinified(lines);
  return lines;
}
function process_main(lines, name) {
  let started = false;
  let start_string = "defaults:";
  let indent = 0;
  let startChar = "{";
  let endChar = "}";
  let done = false;
  let first = true;
  let cache = [];
  for (let line of lines) {
    // if this is a comment line
    if (line.trim().startsWith("//"))
      // ignore it
      continue;
    // if this is the defaults definition line
    if (!started && line.includes(start_string)) {
      // && !line.trim().startsWith('//')){
      // if the line as a brace, toss it
      if (line.startsWith("{")) line = line.slice(1);
      // make it specific to the module
      line = name.replace(/-/g, "_") + "_" + line.trim();
      if (debug) console.log("start line=" + line);
      if (name.includes(" ")) {
        line = line.replace(
          name + "_" + start_string,
          '"' + name + "_defaults" + '":'
        );
        if (debug) console.log("name includes spaces, start line=" + line);
      }
      started = true;
      counter = 0;
      if (debug) console.log("starting");
    }
    let comment = "";
    // if we have started
    if (started) {
      let index = 0;
      // if the line has comment on it, AFTER the important part
      if ((index = line.indexOf("//")) > -1) {
        if (debug)
          console.log("found comment line=" + line + " index=" + index);
        // get the comment part
        comment = line.slice(index);
        // and the info part
        line = line.slice(0, index);
        if (debug) console.log(" remaining line=" + line);
        index = -1;
      }
      // count any open braces
      if (debug) console.log(" checking line=" + line);
      // maybe a template line?
      if (line.includes("{{")) {
        let results = line.match(/((?<![\\])['"])((?:.(?!(?<![\\])\1))*.?)\1/);
        if (results) {
          let lr = line.replace(results[0], "");
          if (debug) {
            console.log("match results=" + JSON.stringify(results, "", 2));
            console.log("line without match=" + lr);
          }
          if (!lr.includes("{")) {
            cache.push(line);
            continue;
          }
        }
      }
      while ((index = line.indexOf(startChar, index + 1)) >= 0) {
        indent++;
        if (debug) console.log("counting up index=" + indent);
      }
      index = 0;
      // count any close braces
      while ((index = line.indexOf(endChar, index + 1)) >= 0) {
        indent--;
        if (debug) console.log("counting down index=" + indent);
        // if we are fully in nested
        if (indent == 0) {
          done = true;
          if (debug) console.log("exiting");
          break;
        }
      }
      let prefix = "";
      // if this is a minified line with content
      if (line[0] == line.trim()[0] && line.trim().length > 0 && counter != 0)
        prefix = "\t\t";

      if (debug) {
        console.log("line='" + line + "'");
        console.log("line " + index + "=" + line.replace(/{/g, " {\n"));
      }
      // get the line content with braces turned into newlines
      let x =
        prefix +
        line
          .replace(/{/g, " {\n" + prefix)
          .replace(/}/g, "\n" + prefix + "}\n");
      // add the comment if there was one
      x = x + comment;
      // if there are any newlines now
      if (x.indexOf("\n") > -1) {
        // split
        let r = x.split("\n");
        if (r.slice(-1) == ",") {
          if (debug) console.log("dangling comma");
          r[r.length - 2] = r[r.length - 2] + ",";
          r.pop();
        }
        for (let f of r)
          if (f.trim().length) {
            if (debug)
              console.log(
                "line part after newline split is '" + f.trim() + "'"
              );
            // and save those as separate lines
            if (f.trim().startsWith(endChar)) {
              prefix = "\t\t";
              f = prefix + f;
              if (debug) console.log("line with prefix='" + f + "'");
            }
            cache.push(f);
          }
      }
      // no newlines
      else {
        if (debug) console.log("adding='" + x + "'");
        // just save the line
        cache.push(x);
      }

      counter++;
    }
    if (done) break;
  }
  return cache;
}
function process_helper(defines) {
  let variable_use = ".config.";
  let index = 0;
  let value = "";
  let lines = getFileContents("node_helper.js");
  let located = {};
  if (debug) console.log("testing  node_helper");
  lines.forEach((file_line) => {
    if ((index = file_line.indexOf(variable_use)) > -1) {
      let rest = file_line
        .substring(index + variable_use.length)
        .replace(/[)?.,+&}[\]]/g, "                     ");
      //console.log("variable used ="+rest)
      let variable_name = rest.split(" ")[0];
      //console.log("variable_name="+variable_name)
      value = 1;
      if ((index = file_line.indexOf(variable_name + " =")) > -1) {
        value = file_line.substring(index + (variable_name + " =").length);
        //console.log(value)
      }
      located[variable_name] = value;
    }
  });
  for (let k of Object.keys(located)) {
    //console.log("found this variable used =" +k)
    defines.forEach((define) => {
      if (define.includes(k)) {
        //	console.log("variable already defined")
        delete located[k];
      }
    });
  }
  if (debug)
    for (let k of Object.keys(located)) {
      console.log("variable to add=" + k);
    }
  return located;
}
