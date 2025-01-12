let debug = false;
const path = require("path");
const inlineComment="//"
const notComment=":\"'"
const commentBegin="/*"
const commentEnd ="*/"
let add_helper_vars = false;
const  minimized_lines_check = 500;
let processMinimized = false;
const beginBrace='{'
const endBrace='}'
let counter = 0;
const remove_block_comments=true
const module_define_name_special_char = "ς";
if (process.argv.length > 3 && process.argv[3] === "debug") debug = true;
let filelines = getFileContents(process.argv[2]);
if (debug) console.log("there are " + filelines.length + " lines");

let defines = process_main(filelines, path.parse(process.argv[2]).name);
if (debug) console.log("defines=" + JSON.stringify(defines, " ", 2));

if(defines.length){
 if(1){
  if(!defines.slice(-1)[0].endsWith(",")){
      if(debug){
        console.log("add trailing commma on last line")

      }
      let l = defines.pop()
      l=l+','
      defines.push(l)
    }
  }
}

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
//
// dump out the lines of defaults we have collected
//
// skip empty lines, and lines which contain part of a block comment
//
let comment_running=false
for (let q of defines) {
  let m=q.match(/[^\S]*(.*)/)
  // get the content of the line only non-whitespace
  if(m && m[1]!=''){  // if has some content
    // watch out for block comments
    if(remove_block_comments){
      if(comment_running== false && q.trim().startsWith(commentBegin)){
        if(!q.trim().endsWith(commentEnd))
          // comment started and not ended
          comment_running=true
        // skip this line
        continue
      }
      if(comment_running== true){
        // comment still going
        if(q.trim().endsWith(commentEnd)){
          // its the end
          comment_running=false;
        }
        // skip this line
        continue
      }
    }
    // print content
    console.log(q);
  }
}

function readFile(fn) {
  if (debug) console.log("file=" + fn);
  let lines = [];
  comment_found=false
  let fs = require("fs");
  // if the file exists
  if (fs.existsSync(fn)) {
    // read it in and split it by new lines
    fs.readFileSync(fn, "utf-8")
      .split(/\r?\n/)
      .forEach((line) => {
        //if(debug) console.log("line="+ ++counter +line);
        // and save the lines
        //if (debug) console.log("line length=" + line.length);
        // minified won't have comments
        // watch out for long lines with no useful (computer) info
        let commentLocation = line.indexOf(inlineComment)
        if((commentLocation>-1) && (notComment.includes(line[commentLocation-1])==false && commentLocation === line.lastIndexOf(inlineComment))){
            comment_found= true
            line=line.substring(0,commentLocation)
            if(debug)
              console.log(" new line, comment removed="+line)
        }
        if (line.length) {
          lines.push(line);
          if (line.length > minimized_lines_check) processMinimized = comment_found?false:true;
        }
      });
  }
  return lines;
}
function findDefaults(input){
  const start="defaults"
  for(let xx in input){
    let line=input[xx]
    if(debug)
      console.log("processing line="+line)
    let s = line.indexOf("defaults")
    if(s>0){
      let y = s
      if(debug)
        console.log("found defaults keyword at index "+ s)
      s=line.indexOf(beginBrace,s)
      let count = 1
      if(debug)
        console.log(" found start of defaults at index "+ s)
      for(let i = s+1;  i<line.length; i++){
        if(count == 0) {
          // found match close brace for defaults
          if(debug)
            console.log("found defaults in minified="+line.substring(y,i))
          let x = new Array(line.substring(y,i))

          if(debug)
            console.log("returning data="+JSON.stringify(x))
          return x
        }
        if(line[i]=== beginBrace){
          count++
          if(debug)
            console.log("defaults open brace counting up one")
        }
        if(line[i]=== endBrace){
          count--
          if(debug)
            console.log("defaults open brace counting down one")
        }
      }
    }
  }
}
// we have a minified file, make it readable
function processMinified(lines) {
  let xlines = [];
  // if there are more than a few lines
  let ilines=lines
  if (processMinimized) {
    xlines=findDefaults(lines)
    if(debug)
      console.log("returned from processing minfied="+JSON.stringify(xlines))
    return xlines
    // process it
    let newlines = [];
    // loop thru the lines
    for (let line of ilines) {
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
  let lines = readFile(fn);
  if (processMinimized) {
    //if (lines.length < minimized_lines_check)
    if (debug) console.log("processing minimized lines");
    lines = processMinified(lines);
    if(debug)
    console.log("returned lines ="+JSON.stringify(lines))
  }
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
  let defaultsline=""
  for (let line of lines) {
    // if this is a comment line
    if (line.trim().startsWith(inlineComment))
      // ignore it
      continue;
    // if this is the defaults definition line
    if (!started && line.includes(start_string)) {
      // && !line.trim().startsWith('//')){
      // if the line has a brace, toss it
      if (line.startsWith("{")) line = line.slice(1);
      // make it specific to the module
      line =
        name.replace(/_/g, module_define_name_special_char).replace(/-/g, "_") +
        "_" +
        line.trim();
      if (debug) console.log("start line=" + line);
      if (name.includes(" ")) {
        line = line.replace(
          name + "_" + start_string,
          '"' + name + "_defaults" + '":'
        );
        if (debug) console.log("name includes spaces, start line=" + line);
      }
      defaultsline=line.split(':')[0]
      started = true;
      counter = 0;
      if (debug) console.log("starting");

    }
    let comment = "";
    // if we have started
    if (started) {
      let index = 0;
      // if the line has comment on it, AFTER the important part
      if (((index = line.indexOf(inlineComment)) > -1) && (index>0 && notComment.includes(line[index-1])==false)) {
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
      } else {
        // check for literal with embedded '{' or '}'
        if (line.includes(":")) {
          let info = line.split(":").slice(1).join(':').trim();
          if(debug){
              console.log('parm='+info)
          }
          let literalregex=/^["\'].*["\'](,?)$/
          let mi=info.match(literalregex)
          if(mi){
            if(mi.length==2)
              if(debug){
               console.log('info contains literal string'+info)
              }
            cache.push(line)
            continue
          }
          if (info.includes("{") || info.includes("}")) {
            if(debug){
              console.log('info contains possibly embedded object='+info)
            }
            let r = info.match(/(["'])((?:\\1|(?:(?!\1)).)*)(\1)/);
            if (r) {
              if (debug) {
                console.log("found literal =" + r[0]);
              }
              if (info.replace(r[0], "").trim().startsWith(",")) {
                // consume the whole line
                cache.push(line);
                continue;
              }
            }
          } else if(info.startsWith("config.")){
	      let x = info.slice(0,-1)
	      line=line.replace(x,'"---!'+x+'"')
	      cache.push(line)
	      continue
	  } 
        }
      }
      while ((index = line.indexOf(startChar, index + 1)) >= 0) {
        indent++;
        if (debug) console.log("counting up index=" + indent);
      }
      index = 0;
      if(debug)
        console.log("now check for "+endChar)
      // count any close braces
      while ((index = line.indexOf(endChar, index )) !=-1) {
        index++
        indent--;
        if (debug) console.log("counting down index=" + indent);
        // if we are fully in nested
        if (indent == 0) {
          done = true;
          if (debug) console.log("exiting");
          break;
        }
      }
      if(debug)
        console.log("done checking for "+endChar)
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
