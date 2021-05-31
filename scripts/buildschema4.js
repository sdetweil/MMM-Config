const path = require("path");
const defines = require(process.argv[2]);
const merge = require("lodash").merge;
const interfaces = require("os").networkInterfaces();
var save_jsonform_info = false;
const fs = require("fs");
var debug = false;
if (process.argv.length > 3 && process.argv[3] === "debug") debug = true;
if (process.argv.length > 3 && process.argv[3] === "saveform")
  save_jsonform_info = true;

let multi_modules = [];
let schema_present = {};
let moduleIndex = {};
const networkInterfaces = [];
const languages = [];
const sort = false;
const special_variable_name_char = "^";
const module_define_name_special_char = "ς";
const module_jsonform_info_name = "schema.json";
var schema = {};
var form = [
  {
    title: "Settings",
    type: "fieldset",
    expandable: false,
    order: 0,
    items: [
      {
        type: "fieldset",
        title: "Base",
        expandable: true,
        items: [
          // per base settings
        ]
      },
      {
        type: "fieldset",
        title: "Modules",
        expandable: true,
        items: [
          // per module
        ]
      }
    ]
  }
];

const processTable = {
  object: processObject,
  array: processArray,
  number: processNumber,
  boolean: processBoolean,
  string: processString,
  textarea: processTextarea,
  integer: processInteger,
  function: processFunction,
  objectPair: processPairObject,
  pair: processPair
};

const form_code_block = {
  type: "ace",
  aceMode: "json",
  aceTheme: "twilight",
  width: "100%",
  height: "100px"
};
let v4_active = false;
if (fs.existsSync(path.join(__dirname, "../modules_list.txt"))) {
  v4_active = true;
  multi_modules = fs
    .readFileSync(path.join(__dirname, "../modules_list.txt"))
    .toString()
    .split("\n");
  for (let i in multi_modules) {
    multi_modules[i] = multi_modules[i].trim();
  }
  // if the last entry is empty string
  let x = multi_modules.slice(-1).toString().trim();
  if (x === "")
    // delete it
    multi_modules.splice(-1, 1);
  if (debug)
    console.log(
      "modules supporting multiple instances are " +
        JSON.stringify(multi_modules, " ", 2)
    );
} else {
  if (debug)
    console.log(
      "modules supporting multiple instances filename missing=" + __dirname,
      "../modules_list.txt"
    );
}
//
//  lets auto detect multiple instances of the same module
//  being used
//
let module_instance_counter = {};
defines.config.modules.forEach((module_instance) => {
  if (module_instance_counter[module_instance.module] === undefined)
    module_instance_counter[module_instance.module] = 0;
  module_instance_counter[module_instance.module]++;
});
Object.keys(module_instance_counter).forEach((m) => {
  if (module_instance_counter[m] > 1) {
    if (!multi_modules.includes(m)) multi_modules.push(m);
  }
});

if (fs.existsSync(path.join(__dirname, "editorinfo.json"))) {
  let editor_setup = require(path.join(__dirname, "editorinfo.json"));
  Object.keys(editor_setup).forEach((key) => {
    switch (key) {
      case "mode":
        form_code_block["aceMode"] = editor_setup[key];
        break;
      case "theme":
        form_code_block["aceTheme"] = editor_setup[key];
        break;
      default:
        form_code_block[key] = editor_setup[key];
    }
  });
}
//
//	get the network interfaces for the address box dropdown
//
for (let interface of Object.keys(interfaces)) {
  for (let info in interfaces[interface]) {
    if (interfaces[interface][info].family === "IPv4") {
      let address = interfaces[interface][info].address;
      if (address === "127.0.0.1") address = "localhost";
      if (debug) console.log(" interface = " + address);
      networkInterfaces.push(address);
      break;
    }
  }
}
// add in all
networkInterfaces.splice(1, 0, "0.0.0.0");

if (debug)
  console.log("networkInterfaces=" + JSON.stringify(networkInterfaces));

//
//  get the langauages for the lamguage dropdown
//
// code for use in debugger in another path
let fp;
if (!__dirname.includes("MagicMirror"))
  fp = path.join(
    __dirname.split(path.sep).slice(0, -2).join(path.sep),
    "/MagicMirror",
    "translations",
    path.sep
  );
else
  fp = path.join(
    __dirname.split(path.sep).slice(0, -3).join(path.sep),
    "translations"
  );
if (debug) console.log("listing languages from " + fp);
// get the language list
fs.readdirSync(fp).forEach((file) => {
  //console.log(file);
  languages.push(file.split(".")[0]);
});

const module_position_schema = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "../templates" +
        (v4_active ? "/v4" : "") +
        "/module_positions_schema.json"
    ),
    "utf8"
  )
);
const module_position_form = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "../templates" + (v4_active ? "/v4" : "") + "/module_positions_form.json"
    ),
    "utf8"
  )
);
const module_positions = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../templates/module_positions.json"),
    "utf8"
  )
);
//
//  find the color to be used for enabled/disabled and save for the onclick handler
//
const cssfile = fs
  .readFileSync(path.join(__dirname, "../webform.css"), "utf8")
  .split("\n");
let module_enabled_color = getColor(cssfile, "module_enabled");
let module_disabled_color = getColor(cssfile, "module_disabled");

//
//	form templates
//
const module_form_template = {
  type: "fieldset",
  title: "modulename",
  //"htmlClass":"module_name_class",
  expandable: true,
  items: []
};

var array_template = { type: "array", title: "name" };
var object_template = {
  type: "array",
  title: "foo",
  items: [{ type: "fieldset", items: [] }]
}; /**/

var array_item_template = {
  description: "Name",
  key: "field"
};

//
//	end of form templates
//

// variables used to store content

var data = {};
var pairVariables = {};
var temp_value = {};
var value = {};
// items used for data restoration
var convertedObjects = [];
let empty_objects = [];
let empty_arrays = [];
let mangled_names = {};
let form_object_correction = [];
if (process.argv.length > 3 && process.argv[3] === "debug") debug = true;

let results = [];

// processing starts here
// loop thru the defines and build a schema and form
// and a prototype data item in teh value section that looks like the define

//
//	copy the info from config.js before the modules list
//
copyConfig(defines, schema, form);

//
//	loop thru the modules in the defaults collection list
//  and process as 'modules', build what they 'look like'
//  what they ARE in config.js added later
//
Object.keys(defines.defined_config).forEach((module_definition) => {
  let r = "";
  let stack = [];
  if (debug) console.log("processing for module " + module_definition);

  let module_name = module_definition
    .slice(0, module_definition.lastIndexOf("_"))
    .replace(/_/g, "-")
    .replace(new RegExp("\\" + module_define_name_special_char, "g"), "_");

  if (debug)
    console.log(
      "properties=" +
        JSON.stringify(defines.defined_config[module_definition], tohandler) +
        "\n"
    );
  // set the data output area structure, many or one
  if (checkMulti(module_name))
    // many
    value[module_name] = [];
  // one
  else value[module_name] = {};
  schema_present[module_name] = false;
  // get the name of the module schema file
  let fn = path.join(
    __dirname,
    //"../../MagicMirror/modules",
    "../..",
    module_name,
    module_jsonform_info_name
  );
  if (debug) console.log("looking for module's schema file=" + fn);
  // if it exists
  if (true && fs.existsSync(fn)) {
    moduleIndex[module_name] = 0;

    if (debug) console.log("processing using the schema file");

    // lets use it
    let jsonform_info = require(fn);
    schema_present[module_name] = true;
    // if this module supports multi-instance
    if (checkMulti(module_name)) {
      // add the label field
      jsonform_info.schema[module_name].properties["label"] = {
        type: "string",
        title: "label",
        default: module_name + " instance {{idx}}"
      };
      // put the info in the right place
      schema[module_name] = {
        type: "array",
        items: jsonform_info.schema[module_name]
      };

      temp_value[module_name] = fixVariableNames(jsonform_info.value);

      let mform = clone(module_form_template);
      mform.title = module_name;

      parents_parent = "parent=parent.parent().closest('fieldset')";
      // if this is the disabled element in the form
      if (jsonform_info.form[0].key === module_name + "." + "disabled") {
        // update the onchange handler for the array
        jsonform_info.form[0].onChange =
          "(evt,node)=>{function setc(p,s){p.find('legend').first().css('color',s?'" +
          module_disabled_color +
          "':'" +
          module_enabled_color +
          "')};var selection=$(evt.target).prop('checked');var parent =$(evt.target).closest('fieldset');setc(parent,selection);" +
          parents_parent +
          ";var allchecked=parent.find(\"input[name$='disabled']:checked\").length;var count=parent.find(\"input[name$='disabled']\").length;if(selection===true && allchecked!==count){selection=false};setc(parent,selection);}";
      }
      jsonform_info.form.splice(3, 0, {
        key: module_name + "[]." + "label",
        valueInLegend: true,
        onKeyUp:
          "(evt,node)=>{var value=$(evt.target).val();var parent =$(evt.target).closest('fieldset');parent.find('legend').first().text(value)}",
        onChange:
          "(evt,node)=>{let value=$(evt.target).val();let p=$(evt.target).attr('name').split('[');let n=p[0];let i=parseInt(p[1]);$(\"[value*='\"+n+\"']\").closest('.tab-pane').find('.nav-tabs').find(\"[data-idx='\"+i+\"'] >a \").text(value)}"
      });

      mform.items.push({
        type: "array",
        draggable: false,
        minItems: 1,
        items: [
          {
            type: "fieldset",
            legend: "{{value}}",
            expandable: true,
            items: jsonform_info.form
          }
        ]
      });
      mform.items = JSON.parse(
        JSON.stringify(mform.items, tohandler).replace(
          new RegExp(module_name + "\\.", "g"),
          module_name + "[]."
        ),
        fromhandler
      );

      form[0].items[1].items.push(mform);
      checkObjects(
        module_name,
        schema[module_name].items.properties.config,
        defines.defined_config[module_definition]
      );
    } else {
      // put the info in the right place
      schema[module_name] = clone(jsonform_info.schema[module_name]);
      let mform = clone(module_form_template);
      mform.title = module_name;
      parents_parent = "";
      // if this is the disabled element in the form
      if (jsonform_info.form[0].key === module_name + "." + "disabled") {
        // update the onchange handler for the array
        jsonform_info.form[0].onChange =
          "(evt,node)=>{function setc(p,s){p.find('legend').first().css('color',s?'" +
          module_disabled_color +
          "':'" +
          module_enabled_color +
          "')};var selection=$(evt.target).prop('checked');var parent =$(evt.target).closest('fieldset');setc(parent,selection);" +
          parents_parent +
          ";var allchecked=parent.find(\"input[name$='disabled']:checked\").length;var count=parent.find(\"input[name$='disabled']\").length;if(selection===true && allchecked!==count){selection=false};setc(parent,selection);}";
      }
      mform.items = jsonform_info.form;

      form[0].items[1].items.push(mform);
      temp_value[module_name] = fixVariableNames(jsonform_info.value);
      checkObjects(
        module_name,
        schema[module_name].properties.config,
        defines.defined_config[module_definition]
      );
    }
  } else {
    if (debug) console.log("processing by construction");
    // process for this module
    processModule(
      schema,
      form,
      value,
      defines.defined_config[module_definition],
      module_name
    );
  }
});

//
// then reorganize list in the config.js order
//
if (!sort) {
  let xy = [];

  let temp = form[0].items[1].items;
  // get the same form layout as in config.js
  defines.config.modules.forEach((m) => {
    let name = m.module;
    // find the module in the constructed form )in defines.js order)
    for (let i in temp) {
      if (temp[i].title === name) {
        // watch out, splice returns an array
        // we want the element of the array
        // take this out of the form list
        let t = temp.splice(i, 1)[0];
        // and add it to the end of the new form list
        xy.push(t);
        break;
      }
    }
  });

  // save the rest of the items to end of the new array
  // add everything left in old list to end of new list
  // none of these were used, altho 'installed', could be temporary
  xy.push.apply(xy, temp);
  // reset the form to the new order
  form[0].items[1].items = xy;
  xy = null;
}

// add the positions form
form.push(module_position_form);
// add a push button to submit the form
if (true) {
  form.push({
    type: "submit",
    title: "Save, Create config",
    id: "submit_button"
  });
}

// form built now, cleanup data and set additional info
// positions
// pairs
// validate arrays, and objects
// handling the data after the submit means dealing with odd things the browser does
// like discard empty arrays and objects

// first thing, create the data for the positioning section of the form
// add all the exact position name strings to the schema enum field
module_positions.forEach((position) => {
  if (v4_active)
    module_position_schema.items.properties.instance_info.items.properties.position.enum.push(
      position
    );
  else module_position_schema.items.properties.position.enum.push(position);
});
// add to the schema as well
schema["positions"] = module_position_schema;

//
// loop thru the active config.js
// merge with defaults
// overlay position info with other
//
// get a copy of what we built from define info
//
let installed_modules = clone(temp_value);
// loop thru the config.js modules list
for (let m of defines.config.modules) {
  if (value[m.module] === undefined) {
    if (checkMulti(m.module)) value[m.module] = [];
    else value[m.module] = {};
  }
  // if we have data in the value section
  if (installed_modules[m.module] !== undefined) {
    if (debug)
      console.log(
        " have module info =" +
          m.module +
          "=" +
          JSON.stringify(value[m.module], tohandler, 2)
      );
    // remove any variable with leading . in the name (compliments has one)
    //  temp_value[m.module] = JSON.parse(
    //    JSON.stringify(installed_modules[m.module], tohandler).replace(/"\.*/g, '"'),
    //    fromhandler
    //  );
    let x = m;
    // if disabled is not set on the module in config.js
    // set it to false (default if not supplied)
    if (x.disabled === undefined)
      // it defaults to false
      x.disabled = false;
    if (debug)
      console.log(
        " have module info in config.js =" +
          x.module +
          "=" +
          JSON.stringify(x, tohandler, 2)
      );
    // merge the values from defaults and actual
    let tt = merge(clone(temp_value[m.module]), x);
    // delete the defined version, this will help us know what is not used
    //delete temp_value[m.module];
    // mark it as in config if not already
    tt.inconfig = "1";
    if (debug) console.log(" tt=" + JSON.stringify(tt, tohandler, 2));
    // if the module didn't specify disabled,
    // if the merged results dropped the disabled, add it back
    if (tt.disabled === undefined)
      // it defaults to false
      tt.disabled = false;
    // if the merged result doesn't have order,
    if (tt.order === undefined) {
      // set it to anywhere
      tt.order = "*";
    }
    // if no position set
    if (tt.position === undefined) {
      // force to a known value, none isn't used
      tt.position = "none";
    }
    // watch out for spaces in position names
    // old habits
    tt.position = tt.position.replace(" ", "_");
    tt = fixVariableNames(tt);
    // if this is a module that supports multi instance
    if (checkMulti(m.module)) {
      // if no index field set
      if (tt.index === undefined)
        // set it to the known index for this module
        tt.index = moduleIndex[m.module]++;
      // if no user label for this instance
      if (tt.label === undefined)
        // set it
        tt.label = "instance " + (tt.index + 1);
      // add it to the arra for this module
      value[m.module].push(clone(tt));
    }
    // set its singular value
    else value[m.module] = clone(tt);
  } else {
    // shouldn't be able to get here
    // as all modules installed  were processed
    // somehow config references one not installed???
    if (debug) console.log("DO NOT have module info =" + m.module);
    //value[m.module]=m
    if (m.position === undefined) {
      m.position = "none";
    }
    m.position = m.position.replace(" ", "_");
    if (m.order === undefined) {
      m.order = "*";
    }
    m.inconfig = "1";
    if (checkMulti(m.module)) value[m.module].push(fixVariableNames(clone(m)));
    else value[m.module] = fixVariableNames(clone(m));
  }
}
// free memory
installed_modules = null;
//
//
// copy any remaining installed but unused modules to the value section for the form
//
//
Object.keys(temp_value).forEach((unused_module) => {
  if (debug)
    console.log(
      "copying unused module=" +
        unused_module +
        " to value section =" +
        JSON.stringify(temp_value[unused_module], tohandler, 2)
    );
  let c = Object.keys(value[unused_module]).length;
  if (c === 0) {
    if (checkMulti(unused_module))
      value[unused_module].push(
        fixVariableNames(clone(temp_value[unused_module]))
      );
    else
      value[unused_module] = fixVariableNames(clone(temp_value[unused_module]));
  }
});

Object.keys(value).forEach((item) => {
  // if this is an array of modules
  if (Array.isArray(value[item])) {
    value[item].sort(function (a, b) {
      // compare titles, function for clarity
      function sortit(x, y) {
        if (a.index < b.index) {
          return -1;
        }
        if (b.index > a.index) {
          return 1;
        }
        return 0;
      }
      // get the difference
      let r = sortit(a, b);
      // return results to sort
      return r;
    });
  }
});

//
//
//  now lets get the matching position info setup
//
//

let positions = [];
let position_hash = {};

// loop thru the value data, combo of config.js and defined modules
// save position info for all modules
Object.keys(value).forEach((module_name) => {
  // watch out config and position stuff was added
  switch (module_name) {
    case "config":
    case "positions":
      break;
    default:
      // set the hash for this module, in case not setup yet
      if (position_hash[module_name] === undefined) {
        position_hash[module_name] = {
          name: module_name,
          instance_info: []
        };
      }
      // if this modules data is an array
      // it supports multiple instances
      if (Array.isArray(value[module_name])) {
        // loop thru the instances found in config.js
        for (let i = 0; i < value[module_name].length; i++) {
          // get the data for this instance
          // makes the remaining code more clear
          let instance = value[module_name][i];
          // update the hash with instance info
          position_hash[module_name]["instance_info"].push({
            // three fields,
            // user defined label (to help keep the list straight), or a default
            label: instance.label || "instance " + (i + 1),
            // the mpodules position field
            position: instance.position,
            // and the order we might have created
            order: instance.order
          });
        }
      } else {
        // if not already set
        if (position_hash[module_name]["instance_info"].length === 0) {
          position_hash[module_name]["instance_info"].push({
            label: value[module_name].label,
            position: value[module_name].position,
            order: value[module_name].order
          });
        }
      }
  }
});

//
//  save the position info in an array for the form to use
//

Object.keys(position_hash).forEach((p) => {
  positions.push(position_hash[p]);
});

//
// sort modules in order by position
//

positions.sort(function (a, b) {
  // compare titles, function for clarity
  function testit(x, y) {
    if (a.name.toLowerCase() < b.name.toLowerCase()) {
      return -1;
    }
    if (a.name.toLowerCase() > b.name.toLowerCase()) {
      return 1;
    }
    return 0;
  }
  // get the difference
  let r = testit(a, b);
  // return results to sort
  return r;
});

//
// save the info for the form presentation
//
value["positions"] = positions;

//
// loop thru all the module values
// find their array variables that might end up empty on form submit
// this could create entries in the object_form list processed next
//

Object.keys(value).forEach((module_name) => {
  switch (module_name) {
    // config is not a module but in the value structure
    case "config":
    case "positions":
      break;
    // all the module entries should come here
    default:
      let module_arrays = [];
      // if this module entry is an array
      // means supports multi-module
      if (Array.isArray(value[module_name])) {
        // loop thru the instances
        for (let i in value[module_name]) {
          let instance = value[module_name][i];
          module_arrays = find_empty_arrays(
            instance,
            [module_name + "[" + i + "]"],
            []
          );
          empty_arrays.push.apply(empty_arrays, module_arrays);
        }
      } else {
        module_arrays = find_empty_arrays(
          value[module_name],
          [module_name],
          []
        );
        // add these on to the end
        empty_arrays.push.apply(empty_arrays, module_arrays);
      }
  }
});

//
//
// get the list of existing pair keys
// we only recorded the names of those found via the defines setup
// make sure there are more for each instance
//

let keys = Object.keys(pairVariables);
multi_modules.forEach((module_name) => {
  keys.forEach((item) => {
    let m = item.split("[");
    if (m[0] === module_name) {
      for (let i = 1; i < value[m[0]].length; i++) {
        let item_name =
          module_name + "[" + i + "]." + m[1].split(".").slice(1).join(".");
        pairVariables[item_name] = 3;
      }
    }
  });
});

//
//
// now we have to actually change the form definitions, and data
// to make these items work as we want
// author said [].. what the heck goes there?   many times an array of objects {....},{....},
// we don't know what that looks like, or we would make the form
// so, create an editor window
//
//

form_object_correction.forEach((key) => {
  let temp_key = key.replace(".config", "");
  let t = temp_key.split(".");
  let module_define_name = "";
  let i = t[0].indexOf("[");
  if (i > 0) {
    module_define_name =
      t[0]
        .slice(0, i)
        .replace(/_/g, module_define_name_special_char)
        .replace(/-/g, "_") + "_defaults";
  } else
    module_define_name =
      t[0].replace(/_/g, module_define_name_special_char).replace(/-/g, "_") +
      "_defaults";
  if (debug)
    console.log(
      "looking for define info for module=" + module_define_name + " key=" + key
    );
  // if a module snuck into conig.js but is noyt installed in modules  folder,
  // skip fiddling with it
  if (defines.defined_config[module_define_name] !== undefined) {
    // module info used
    t.shift();
    let variable_definition = get_define_info(
      defines.defined_config[module_define_name],
      t.join(".")
    );
    if (Array.isArray(variable_definition)) {
      // if it has NOTHING inside
      if (!variable_definition.length) {
        // then we can fixup the form to add the editor capabilities
        if (debug) console.log("found empty array item, key=" + key);
        if (!schema_present[key.split(".")[0].split("[")[0]]) {
          updateFormElement(form[0].items[1].items, key, form_code_block);
          updateValueElement(value, key);
        } else {
          if (debug)
            console.log(
              "schema file present for module=" +
                key.split(".")[0].split("[")[0]
            );
        }
      } else {
        if (debug) console.log("array not empty key=" + key);
      }
    }
  }
});

let base = {};
// get the non module parameters from active config.js
for (let k of Object.keys(defines.config)) {
  if (k !== "modules") {
    base[k] = clone(defines.config[k]);
  }
}
//let x = value
value["config"] = base;

//
// fixup the pair variables so they are proper objects for jsonform
//

Object.keys(pairVariables).forEach((m) => {
  if (debug) console.log("addressing pairs =" + m);
  let mi = m.split(".");
  let varname = mi[1];
  if (debug) console.log(" varname=" + varname);
  // loop the module properties
  let module_properties;
  if (mi[0] === "config") module_properties = "config";
  else {
    let tt = value;
    if (mi[0].includes("[")) {
      let index = 0;
      let name = mi[0].split("[");
      if (name.length > 1) index = parseInt(name[1]);
      tt = value[name[0]][index];
      // we are already pointing at the module data
      // take off the module name prefix
      m = mi.slice(1).join(".");
    }
    module_properties = getValueObject(m, tt);
  }
  // data might not be present in values, don't crash
  if (module_properties) {
    var t = [];
    for (let x of Object.keys(
      module_properties === "config"
        ? defines.config[varname]
        : module_properties
    )) {
      let existing_value;
      existing_value =
        module_properties === "config"
          ? defines.config[varname][x]
          : module_properties[x];
      //x = x.replace(/\./g, "");

      let r = {};
      r[x] = existing_value;
      t.push(r);
    }
    let tt = value;
    if (mi[0].includes("[")) {
      let index = 0;
      let name = mi[0].split("[");
      if (name.length > 1) index = parseInt(name[1]);
      tt = value[name[0]][index];
      // we are already pointing at the module data
      // take off the module name prefix
      m = mi.slice(1).join(".");
    }
    setValueObject(m, tt, t);
  }
});

//
//  save the two arrays from the base definition
//  as they didn't go thru the whole build process
//

empty_arrays.push("config.ipWhitelist");
empty_arrays.push("config.logLevel");

//
// set the enabled style for the modules
// loop thru all the modules to get their enabled status
// watch out for arrays of modules
//

Object.keys(value).forEach((mv) => {
  let extra = " module_entry";
  if (Array.isArray(value[mv])) {
    let disabled = 0;
    let mheader;
    value[mv].forEach((mvi) => {
      if (mvi.disabled !== undefined && mvi.disabled === true) disabled++;
      form[0].items[1].items.forEach((m) => {
        if (m.title === mv) {
          mheader = m;
          m.items[0].items[0].items.forEach((formitem) => {
            if (
              formitem.key !== undefined &&
              formitem.key.endsWith("disabled")
            ) {
              if (mvi.disabled !== undefined && mvi.disabled === true) {
                formitem.htmlClass = "module_disabled ";
              } else {
                formitem.htmlClass = "module_enabled ";
              }
            }
          });
        }
      });
    });
    if (mheader) {
      mheader.htmlClass =
        disabled === value[mv].length
          ? "module_disabled" + extra
          : "module_enabled" + extra;
    }
  } else {
    form[0].items[1].items.forEach((m) => {
      if (m.title === mv) {
        m.htmlClass =
          value[mv].disabled !== undefined && value[mv].disabled === true
            ? "module_disabled" + extra
            : "module_enabled" + extra;
      }
    });
  }
});

//
// find and replace any fields with leading or embedded . )
//

// get the value section as a string
let str = JSON.stringify(value, tohandler);
let index = -1;
let start = 0;
// loop thru looking for leading dot (after ")
while ((index = str.indexOf('".', start)) !== -1) {
  // found one
  if (debug) console.log("leading dot match=" + str.slice(index, index + 4));
  // find the closing quote (all json items)
  let endstr = str.indexOf('"', index + 1);
  // get the string quote to quote
  let workstring = str.slice(index, endstr + 1);
  // and its data length
  let l = workstring.length - 2; // (length without quotes)
  if (l !== 1) {
    // if its not a single character
    // and it doesn't include a path char
    if (!workstring.includes("/")) {
      if (debug) console.log("work string is '" + workstring + "'");
      // replace the . with the special character
      workstring = workstring.replace(
        new RegExp("\\.", "g"),
        special_variable_name_char
      );
      if (debug) console.log("replacement string is '" + workstring + "'");
      // put the variable back in the value section string
      str = str.slice(0, index) + workstring + str.slice(endstr + 1);
    }
  }
  // look for more, after this one
  start = endstr + 1;
}
// restore the value section with modifications
value = JSON.parse(str, fromhandler);

//
// OK, now done building
// create the big object that we will emit
//

let combined = {
  schema: schema,
  form: form,
  validate: false,
  value: value,
  pairs: pairVariables,
  arrays: empty_arrays,
  objects: empty_objects,
  mangled_names: mangled_names,
  convertedObjects: convertedObjects
};
// get the string value of the object
let cc = JSON.stringify(combined, tohandler, 2).slice(1, -1);
// emit the string
console.log("{" + cc + "}");
//
// functions after here
//

//
// module info loaded via schema file
// check to see if schema matches definition
// empty objects (we don't know what is in here) converted to arrays for web handling
//
function checkObjects(module_name, schema, define) {
  function findVar(name, schema) {
    if (schema[name]) {
      return schema[name].type;
    }
  }

  Object.keys(define).forEach((property_name) => {
    let dtype = getType(define[property_name], property_name, false);
    let stype = findVar(property_name, schema.properties);

    //if(stype !==dtype){
    if (!module_name.includes(".config")) module_name = module_name + ".config";
    switch (dtype) {
      case "object":
        switch (stype) {
          case "array":
            if (debug)
              console.log(
                " schema and define object types don't match " +
                  stype +
                  " <> " +
                  dtype +
                  " for " +
                  module_name +
                  ".config." +
                  property_name
              );
            convertedObjects.push(module_name + "." + property_name);
            // if we haven't already pushed the parent
            if (!empty_objects.includes(module_name + "." + property_name))
              // do it now
              empty_objects.push(module_name + "." + property_name);
            break;
          case "object":
            checkObjects(
              module_name + ".config." + property_name,
              schema.properties[property_name],
              define[property_name]
            );
        }
        break;
    }
    // }
  });
}

//
//  fixVariableName(value_section)
//
function fixVariableNames(value_section) {
  let str = JSON.stringify(value_section, tohandler);
  let index = 0;
  while ((index = str.indexOf('":', index)) > -1) {
    let eos = index; // str.lastIndexOf('"', index)
    let x = str.slice(eos, eos + 1);
    if (x === '"') {
      let sos = str.lastIndexOf('"', eos - 1);
      let savestring = (workstring = str.slice(sos, eos + 1));
      index = eos + 2;
      if (!workstring.includes("/") && workstring.includes(".")) {
        workstring = trimit(workstring);
        str = str.replace(savestring, workstring);
      }
    } else index = eos + 2;
  }
  return JSON.parse(str, fromhandler);
}

//
// check if this module is in the list that supports multiple concurrent instances
//
function checkMulti(module_name) {
  let result = false;
  for (let m of multi_modules)
    if (module_name.startsWith(m)) {
      result = true;
      break;
    }
  return result;
}
function updateValueElement(data, key) {
  let t = key.split(".");
  let left = t.shift();
  if (t.length) {
    let keys = left.split("[");
    data = data[keys[0]];
    if (keys.length > 1) {
      let index = parseInt(keys[1]);
      data = data[index];
    }
    updateValueElement(data, t.join("."));
    return;
  }
  let temparray = [];
  data[left].forEach((item) => {
    let temp_string = JSON.stringify(item, tohandler, 2);
    temp_string = temp_string.replace(/\n/g, "");
    temparray.push(temp_string);
  });
  data[left] = temparray;
}
function updateFormElement(data, key, new_attributes) {
  let t = key.split(".");
  let left = t.shift().split("[");
  if (debug)
    console.log(
      " trying to update field=" + key + " with editor form definition"
    );
  for (let form_entry of data) {
    //
    if (form_entry.title === left[0]) {
      if (debug) console.log(" found the item we are looking for =" + left[0]);
      if (t.length) {
        let form_pointer = form_entry.items;

        if (checkMulti(left[0])) {
          form_pointer = form_entry.items[0].items[0].items;
        }
        updateFormElement(form_pointer, t.join("."), new_attributes);
        return;
      }
      if (debug)
        console.log(" updating the item we are looking for =" + left[0]);
      form_entry["draggable"] = false;
      Object.keys(new_attributes).forEach((key) => {
        form_entry.items[0][key] = new_attributes[key];
      });
      break;
    }
  }
}
// get the item in an array
function get_define_info(data, key) {
  // get the key parts
  let t = key.split(".");
  let left = t.shift().split("[");
  // if there is more key
  if (t.length) {
    // iterate
    let tt = data[left[0]];
    if (Array.isArray(tt)) tt = tt[0];
    return get_define_info(tt, t.join("."));
  }
  // last key part now
  return data[left];
}
/* // get the module properties from the config.js entry
function getConfigModule(m, source) {
  //console.log("looking for "+m.module)
  for (let x of source) {
    if (x.module === m.module) {
      //console.log(" getconf="+ x.module)
      return x;
    }
  }
  return null;
} */
function find_empty_arrays(obj, stack, hash) {
  if (typeof obj == "object") {
    if (Array.isArray(obj)) {
      if (debug) console.log(" object is an array, length=" + obj.length);
      for (const o of obj) {
        if (typeof o === "object" && !Array.isArray(o)) {
          for (let i in stack) {
            if (stack[i].includes(".")) stack[i] = trimit(stack[i]);
          }
          let t = stack.join(".");
          if (!form_object_correction.includes(t)) {
            if (t.includes(".[]")) t = t.replace(".[]", "[]");
            form_object_correction.push(t);
          }
        }
        stack.push("[]");
        hash = find_empty_arrays(o, stack, hash);
        stack.pop();
      }
      //console.log("adding "+stack.join('.'))
      let last = stack.slice(-1).toString();
      if (last.includes(".")) {
        if (debug) console.log("last=" + last + " includes .");
        stack.pop();
        last = last.replace(new RegExp("\\.", "g"), special_variable_name_char);
        stack.push(last);
      }
      let t = stack.join(".");
      if (debug) console.log(" array name=" + t);
      if (t.endsWith(".[]")) t = t.replace(".[]", "[]");
      if (t.includes(".[]")) t = t.replace(".[]", "");
      if (!form_object_correction.includes(t)) {
        form_object_correction.push(t);
        if (debug) console.log("saving key for editor conversion =" + t);
      }
      for (let i in hash) {
        if (hash[i].startsWith(t)) {
          if (!hash.includes(t)) hash.splice(i, 0, t);
          break;
        }
      }

      if (!hash.includes(t)) hash.push(t);
      //	}
    } else {
      if (obj) {
        if (debug)
          console.log(
            " object is an object, length=" + Object.keys(obj).length
          );
        for (const x of Object.keys(obj)) {
          //console.log("item ="+x)
          if (typeof obj[x] == "object") {
            stack.push(x);
            hash = find_empty_arrays(obj[x], stack, hash);
            stack.pop();
          }
        }
      }
    }
  }
  return hash;
}
function copyConfig(defines, schema, form) {
  schema["config"] = {
    type: "object",
    title: "properties for MagicMirror base",
    properties: {}
  };
  schema["config"]["properties"] = {};
  // copy the current non modules stuff from config.js
  for (const setting of Object.keys(defines.config)) {
    if (setting === "modules") break;
    let dtype;
    let t = typeof defines.config[setting];
    if (t === "object") {
      if (Array.isArray(defines.config[setting])) {
        if (setting === "logLevel") {
          t = "string";
          schema["config"]["properties"][setting] = {
            type: "array",
            title: setting,
            items: {
              type: "string",
              enum: ["INFO", "LOG", "WARN", "ERROR", "DEBUG"]
            }
          };
        } else {
          t = "array";
          dtype = "string";
          if (defines.config[setting].length) {
            dtype = typeof defines.config[setting][0];
            if (Array.isArray(defines.config[setting][0])) dtype = "array";
          }
          schema["config"]["properties"][setting] = {
            type: t,
            title: setting,
            items: { type: dtype }
          };
        }
      } else {
        dtype = typeof Object.keys(defines.config[setting])[0];
        if (dtype === "string") {
          pairVariables["config" + "." + setting] = 1;
          t = "array";
          dtype = "pair";
        }
        schema["config"]["properties"][setting] = {
          type: t,
          title: setting,
          items: { type: dtype }
        };
      }
    } else {
      let as = { type: t, title: setting };
      switch (setting) {
        case "address":
          as = { type: "string", title: setting, enum: networkInterfaces };
          break;
        case "language":
          as = { type: "string", title: setting, enum: languages };
          break;
        case "timeFormat":
          as = { type: "string", title: setting, enum: [12, 24] };
          break;
        case "units":
          as = { type: "string", title: setting, enum: ["imperial", "metric"] };
          break;
        case "serverOnly":
          as = {
            type: "string",
            title: setting,
            enum: ["false", "true", "local"]
          };
          break;
        case "logLevel":
          as = {
            type: "array",
            title: setting,
            items: {
              type: "string",
              enum: ["INFO", "LOG", "WARN", "ERROR", "DEBUG"]
            }
          };
          break;
        default:
      }
      schema["config"]["properties"][setting] = as;
    }
    switch (t) {
      case "array":
        form[0].items[0].items.push({
          type: "array",
          title: setting,
          items: [
            {
              key: "config." + setting + "[]",
              title: setting + " {{idx}}"
            }
          ]
        });

        break;
      case "object":
        form[0].items[0].items.push({
          type: "array",
          title: setting,
          items: [
            {
              key: "config." + setting + "[]",
              title: setting + " {{idx}}"
            }
          ]
        });
        break;
      default:
        if (setting === "address") {
          let tm = {};
          networkInterfaces.forEach((interface) => {
            switch (interface) {
              case "0.0.0.0":
                tm[interface] =
                  interface +
                  " - application access from any machine that can access network";
                break;
              case "localhost":
                tm[interface] =
                  interface + " - application access only from same machine";
                break;
              default:
                tm[interface] =
                  interface +
                  " - application access only from machine on same network";
            }
          });
          form[0].items[0].items.push({
            key: "config." + setting,
            titleMap: tm
          });
        } else if (setting === "logLevel") {
          form[0].items[0].items.push({
            key: "config." + setting,
            type: "checkboxes"
          });
        } else {
          form[0].items[0].items.push("config." + setting);
        }
    }
  }
}

function clone(obj) {
  let str = JSON.stringify(obj, tohandler);
  let o = JSON.parse(str, fromhandler);
  return o;
}

function getType(value, property, wasObject) {
  //console.log("processing gettype for v="+value+" and p="+property+" and wo="+wasObject)
  let type = "string";
  if (value !== undefined) {
    type = typeof value;
    //if(debug) console.log("type = "+type+" for property="+property)
    switch (type) {
      case "number":
        if (!value.toString().includes(".")) type = "integer";
        break;
      case "object":
        if (value === null) {
          type = "string";
        } else if (Array.isArray(value)) {
          type = "array";
          //	} else if("{}" === JSON.stringify(value)){
          //		type ='pair'
        }
        break;

      default:
    }
  } else {
    if (typeof property === "string" && wasObject) type = "function";
    else type = "string";
  }
  //console.log("processing gettype for v="+value+" and p="+property+" and wo="+wasObject+" returning="+type)
  return type;
}

//
//	process a module
//
function processModule(schema, form, value, defines, module_name) {
  let stack = [];

  // set its default form values
  temp_value[module_name] = {
    disabled: true,

    module: module_name,
    position: "none",
    order: "*",
    inconfig: "0",
    // from the defaults: collector
    config: defines
  };

  let mform = "";
  if (debug)
    console.log(
      "name=" +
        module_name +
        " properties=" +
        JSON.stringify(defines, tohandler) +
        "\n"
    );

  // setup the form data (schema/layout)

  let prefix = {
    type: "object",
    title: "properties for " + module_name,
    properties: {
      module: {
        type: "string",
        title: "module",
        default: module_name,
        readonly: true
      },
      disabled: { type: "boolean", title: "disabled", default: false },
      position: { type: "string", title: "module position", readonly: "true" },
      classes: { type: "string", title: "classes", default: "" },
      order: { type: "string", title: "order", default: "*" },
      inconfig: { type: "string", title: "inconfig", default: "0" },
      index: { type: "integer" },
      config: { type: "object", title: "config", properties: {} }
    }
  };

  //
  // create the module FORM entries (that allow access to the data)
  //

  let module_form_items = [];
  let parents_parent = "";
  if (checkMulti(module_name))
    parents_parent = "parent=parent.parent().closest('fieldset')";

  module_form_items.push({
    key: module_name + "." + "disabled",
    onChange:
      "(evt,node)=>{function setc(p,s){p.find('legend').first().css('color',s?'" +
      module_disabled_color +
      "':'" +
      module_enabled_color +
      "')};var selection=$(evt.target).prop('checked');var parent =$(evt.target).closest('fieldset');setc(parent,selection);" +
      parents_parent +
      ";var allchecked=parent.find(\"input[name$='disabled']:checked\").length;var count=parent.find(\"input[name$='disabled']\").length;if(selection===true && allchecked!==count){selection=false};setc(parent,selection);}",
    htmlClass: "disabled_checkbox"
  });
  module_form_items.push({
    key: module_name + "." + "position",
    description: "use Module Positions section below to set or change"
  });
  module_form_items.push({ key: module_name + "." + "classes" });
  module_form_items.push({ key: module_name + "." + "order", type: "hidden" });
  module_form_items.push({
    key: module_name + "." + "inconfig",
    type: "hidden"
  });
  module_form_items.push({ key: module_name + "." + "index", type: "hidden" });
  if (checkMulti(module_name)) {
    module_form_items.push({
      key: module_name + "[]." + "label",
      valueInLegend: true,
      onKeyUp:
        "(evt,node)=>{var value=$(evt.target).val();var parent =$(evt.target).closest('fieldset');parent.find('legend').first().text(value)}",
      onChange:
        "(evt,node)=>{let value=$(evt.target).val();let p=$(evt.target).attr('name').split('[');let n=p[0];let i=parseInt(p[1]);$(\"[value*='\"+n+\"']\").closest('.tab-pane').find('.tab-content').find(\"[data-idx='\"+i+\"'] >div >input \").val(value).trigger('change')}"
    });
  }
  module_form_items.push({ type: "section", title: "config", items: [] });
  let ptr = -1;
  for (let i in module_form_items) {
    if (Object.keys(module_form_items[i]).includes("title")) {
      if (module_form_items[i]["title"] === "config") {
        if (debug)
          console.log(
            "config items=" + JSON.stringify(module_form_items[i], tohandler, 2)
          );
        ptr = i;
        break;
      }
    }
  }

  //
  //	loop thru each property from the defaults
  //
  Object.keys(defines).forEach((propertyName) => {
    if (debug) console.log("processing for each property " + propertyName);
    let property_value = defines[propertyName];
    let type = getType(property_value, propertyName, false);
    //
    // process the property by type to fill in the schema and the form
    //
    let r = processTable[type](
      module_name + ".config",
      propertyName,
      property_value,
      [],
      true,
      false,
      false
    );
    // get the constructed schema for this property
    let schema_value = r.results;
    if (
      schema_value.startsWith('"' + propertyName + '":{') ||
      containsSpecialCharacters(propertyName) ||
      isNumeric(propertyName)
    )
      // save it
      stack.push(schema_value);
    else stack.push('"' + propertyName + '":{' + schema_value + "}");
    //
    //	if a form element was returned
    //
    if (r.mform) {
      if (debug)
        console.log(
          "m mform=" +
            (typeof r.mform === "string" ? r.mform : JSON.stringify(r.mform))
        );
      // if this is a list of elements (object with properties)
      if (Array.isArray(r.mform)) {
        //  mform.items.push(f)
        // add them to the form definition for this module
        for (let f of r.mform) module_form_items[ptr]["items"].push(f);
      }
      // not array, so single type
      else module_form_items[ptr]["items"].push(r.mform);
      if (debug)
        console.log(
          "module_form_items after push = " +
            JSON.stringify(module_form_items, tohandler, 2)
        );
    }
  });
  // get the collected schema
  let r = "{" + stack.join(",") + "}";
  if (debug) console.log("module info =" + r + "\n\n");
  // add it to the module config schema
  prefix.properties.config.properties = JSON.parse(r, fromhandler);

  mform = clone(module_form_template);
  mform.title = module_name;

  if (debug)
    console.log(
      "checking for " +
        module_name +
        " in " +
        JSON.stringify(multi_modules, tohandler, 2)
    );

  //
  //  save the constructed form definition for the properties
  //
  writeJsonFormInfoFile(module_name, prefix, module_form_items, temp_value);

  if (debug) console.log("checking multi");
  if (checkMulti(module_name)) {
    moduleIndex[module_name] = 0;
    prefix.properties["label"] = {
      type: "string",
      title: "label",
      default: module_name + " instance {{idx}}"
    };
    schema[module_name] = { type: "array", items: prefix };

    mform.items.push({
      type: "array",
      draggable: false,
      minItems: 1,
      items: [
        {
          type: "fieldset",
          legend: "{{value}}",
          expandable: true,
          items: module_form_items
        }
      ]
    });
    mform.items = JSON.parse(
      JSON.stringify(mform.items, tohandler).replace(
        new RegExp(module_name + "\\.", "g"),
        module_name + "[]."
      ),
      fromhandler
    );
  } else {
    schema[module_name] = prefix;
    // make a copy of the template
    mform.items = module_form_items;

    if (debug)
      console.log("module form items=" + JSON.stringify(mform, tohandler, 2));
  }

  form[0].items[1].items.push(mform);
}

//
//
//  writeJsonFormInfoFile
//
//
function writeJsonFormInfoFile(
  module_name,
  schema_info,
  form_info,
  value_info
) {
  // if we should save the constructed files?
  if (save_jsonform_info) {
    let module_folder = path.join(__dirname, "../..", module_name);
    // check to make sure the module folder exists
    if (fs.existsSync(module_folder)) {
      // remove the label item if present
      // only important for the arrayed layout, not the module data
      let form_info_clone = clone(form_info);
      for (let i in form_info_clone) {
        let item = form_info_clone[i];
        if (item.key !== undefined && item.key.endsWith(".disabled")) {
          delete item.onChange;
        }
        if (item.key !== undefined && item.key.endsWith(".label")) {
          form_info_clone.splice(i, 1);
          break;
        }
      }
      // it does
      let x = {};
      x[module_name] = schema_info;
      // build the file structure
      let jsonform_info = {
        schema: x,
        form: form_info_clone,
        value: value_info[module_name]
      };
      // get the file path
      let fn = path.join(module_folder, module_jsonform_info_name);
      // if it doesn't exist
      // don't write over existing
      if (!fs.existsSync(fn)) {
        // write out the formatted text
        fs.writeFileSync(fn, JSON.stringify(jsonform_info, tohandler, 2));
      }
    }
  }
}

//
// process an Object from the defaults
// object contains other properties
//
function processObject(m, p, v, mform, checkPair, recursive, wasObject) {
  if (debug)
    console.log(
      "processing object " +
        p +
        " for module " +
        m +
        " value=" +
        JSON.stringify(v, tohandler)
    );
  let pair_object = false;
  let results = "";
  let stack = [];
  let formtitle = p.endsWith("[]") ? p.slice(0, -2) : p;
  let vform = clone(object_template);
  vform["type"] = "fieldset";
  vform["items"] = [];
  vform["title"] = formtitle;
  let isPair = false;
  if (checkPair) isPair = checkForPair(v);
  if (isPair) {
    //v=v[Object.keys(v)[0]]
    type = "objectPair";
    let x = m.split(".");
    if (checkMulti(x[0])) {
      x[0] = x[0] + "[0]";
    }
    x = x.join(".");
    if (debug)
      console.log(
        "object recording pair variable =" + x + "." + p + " module=" + m
      );
    pairVariables[x + "." + p] = 1;
    return processTable[type](m, p, v, [], false, true, false);
  }
  if (Object.keys(v).length) {
    for (let p1 of Object.keys(v)) {
      if (debug)
        console.log(
          "processing object item for module " +
            m +
            " for property " +
            p1 +
            " and value " +
            v[p1]
        );
      let type = getType(v[p1], p, wasObject);

      if (debug)
        console.log(
          "object element type=" +
            type +
            " for " +
            JSON.stringify(v, tohandler, 2) +
            " and " +
            p1
        );
      type = type == null ? "textarea" : type;
      if (debug)
        console.log(
          "object element type=" +
            type +
            " vv=" +
            type +
            " variable=" +
            m +
            "." +
            p +
            "." +
            p1
        );

      let r = processTable[type](
        m + "." + p,
        p1,
        v[p1],
        [],
        isPair,
        true,
        wasObject
      );
      let schema_value = r.results;
      let kk = '"' + p1 + '":{';
      if (
        schema_value.startsWith(kk) ||
        containsSpecialCharacters(p1) ||
        isNumeric(p1)
      )
        stack.push(schema_value);
      else stack.push('"' + p1 + '":{' + schema_value + "}");
      if (r.mform) {
        if (debug)
          console.log(
            "o mform=" +
              (typeof r.mform === "string" ? r.mform : JSON.stringify(r.mform))
          );
        if (Array.isArray(r.mform)) {
          if (r.mform[0].type !== undefined && r.mform[0].type === "ace")
            r.mform["draggable"] = false;
          for (let f of r.mform) vform.items.push(f);
        } else vform.items.push(r.mform);
      }
    }
  } else {
    type = "array";
    if (debug)
      console.log("processing for variable " + p + " empty object now array ");
    convertedObjects.push(m + "." + p);
    // if we haven't already pushed the parent
    if (!empty_objects.includes(m))
      // do it now
      empty_objects.push(m);
    // save the child object
    //empty_objects.push(m+'.'+p)
    return processTable[type](m, p, v, [], false, true, true);
  }

  results = stack.join(",");
  if (debug) console.log("object results=" + results);
  if (recursive)
    return {
      mform: vform,
      results: '"type": "object","properties": {' + results + "}"
    };
  else
    return {
      mform: vform,
      results:
        '"' +
        p +
        '":{"type": "object","title": "' +
        p +
        '","properties": {' +
        results +
        "}}"
    };
}

//
//	process array object []
//  contains a list of some type properties, string, int, Object!
//
function processArray(m, p, v, mform, checkPair, recursive, wasObject) {
  let results = "";
  if (debug)
    console.log(
      "processing array " +
        p +
        " for module " +
        m +
        " value=" +
        JSON.stringify(v, tohandler)
    );
  let type;
  let p1 = "";
  let t = trimit(p);
  let addedTitle = "";
  let formtitle = p; // p.endsWith("[]")?p.slice(0,-2):p
  let vform = {
    type: "array",
    title: formtitle,
    items: [
      {
        key: m + "." + trimit(formtitle),
        title:
          (formtitle.endsWith("s") ? formtitle.slice(0, -1) : formtitle) +
          (isNumeric(formtitle.slice(-1)) ? " - " : "") +
          " {{idx}}"
      }
    ]
  };
  p1 = v[0];
  if (debug)
    console.log(
      "processing array item for module " +
        m +
        " for property " +
        JSON.stringify(p1, tohandler, 2)
    );
  let isPair = checkPair ? checkForPair(v) : checkPair;
  if (isPair) {
    // drop the other array objects, we only need 1
    //v=v.slice(0,1)
    type = "pair";
    let r = processTable[type](m, trimit(p), p1, [], false, true, wasObject);
    results = r.results;
    let x = "";
    if (checkMulti(m)) x = "[0]";
    if (debug) console.log("array recording par variable =" + m + x + "." + p);
    pairVariables[m + x + "." + p] = 2;
    return {
      mform: vform,
      results:
        '"' + trimit(p) + '":{"type": "array","items": {' + results + "}}"
    };
  }

  // get the first item in array
  let temp = JSON.stringify(v);
  if (debug) console.log("checking array item contents=" + v);
  // also used below on 'else'
  if (v !== "[[]]" && v !== "[]") {
    // get its type
    type = getType(p1, p, wasObject);

    let r = processTable[type](
      m,
      trimit(p) + "[]",
      p1,
      [],
      isPair,
      true,
      wasObject
    );
    let schema_value = r.results;
    if (t !== p) {
      // need to add a title string if not present
      addedTitle = '"title":"' + p + '",';
      mangled_names[m + "." + t] = p;
      let data = JSON.stringify(value[m.split(".")[0]], tohandler);
      data = data.replace(new RegExp(p, "g"), t);
      value[m.split(".")[0]] = JSON.parse(data, fromhandler);
    }
    let variable = p1;
    if (p1 === undefined) variable = p;
    if (debug)
      console.log(
        "immediate array results=" + schema_value + " property name=" + p
      );
    if (schema_value.startsWith('"' + p + '[]":{')) {
      if (debug) console.log("fixing array info =" + schema_value);
      schema_value = schema_value.slice(schema_value.indexOf("{") + 1, -1);
      if (debug) console.log("post fixing array info =" + schema_value);
      addedTitle = "";
    }
    results += schema_value;
    if (r.mform) {
      if (debug)
        console.log(
          "a mform=" +
            (typeof r.mform === "string" ? r.mform : JSON.stringify(r.mform))
        );
      if (Array.isArray(r.mform)) {
        vform.items = [];
        for (let n of r.mform) {
          if (n.title.endsWith("[]")) {
            //empty_arrays.push(m+'.'+p[])
            addedTitle = "";

            n.title = n.title.slice(0, -2) + " {{idx}}";
            if (t !== p) {
              if (n.title.startsWith(t)) n.title = n.title.replace(t, p);
            }
          }
          vform.items.push(n);
        }
      } else {
        if (JSON.stringify(variable) === "[]" && r.mform.title.endsWith("[]"))
          delete r.mform.title;
        if (JSON.stringify(r.mform, tohandler).includes("aceMode"))
          vform["draggable"] = false;
        vform.items = JSON.parse(JSON.stringify(r.mform, tohandler));
      }
    }
  } else {
    if (debug)
      console.log(
        "processing for empty array at " + m + "." + p + " value=" + temp
      );
    empty_objects.push(m + "." + p);

    if ("[[]]" === JSON.stringify(v))
      vform = { title: p, type: "section", items: [m + "." + p] };
    else vform = { type: "section", items: [m + "." + p] };
    results = '"type":"array","items":{"type":"string"}';
  }
  if (debug)
    console.log("array results=" + results + " = " + JSON.stringify(results));

  if (recursive && (type === "object" || type === "array"))
    return {
      mform: vform,
      results: '"type": "array","items": {' + results + "}"
    };
  else
    return {
      mform: vform,
      results:
        '"' +
        trimit(p) +
        '":{"type": "array",' +
        addedTitle +
        '"items": {' +
        results +
        "}}"
    };
}
function processNumber(m, p, v, mform, checkPair, recursive, wasObject) {
  if (debug)
    console.log("processing number " + p + " for module " + m + " value=" + v);
  mform.push({ title: p, key: m + "." + trimit(p) });
  return { mform: mform, results: '"type": "integer"' };
}
function processBoolean(m, p, v, mform, checkPair, recursive, wasObject) {
  if (debug)
    console.log("processing boolean " + p + " for module " + m + " value=" + v);
  mform.push({ title: p, key: m + "." + trimit(p) });
  return { mform: mform, results: '"type": "boolean"' };
}
function processString(m, p, v, mform, checkPair, recursive, wasObject) {
  if (debug) console.log("processing string " + p + " for module " + m);
  mform.push({ title: p, key: m + "." + trimit(p) });
  return { mform: mform, results: '"type": "string"' };
}
function processTextarea(m, p, v, mform, checkPair, recursive, wasObject) {
  if (debug) console.log("processing string " + p + " for module " + m);
  mform.push({ title: p, key: m + "." + trimit(p), type: "textarea" });
  return { mform: mform, results: '"type": "string"' };
}
function processPair(m, p, v, mform, checkPair, recursive, wasObject) {
  if (debug) console.log("processing string " + p + " for module " + m);
  mform.push({ title: p, key: m + "." + trimit(p) });
  return { mform: mform, results: '"type": "pair"' };
}
function processInteger(m, p, v, mform, checkPair, recursive, wasObject) {
  if (debug)
    console.log("processing integer " + p + " for module " + m + " value=" + v);
  mform.push({ title: p, key: m + "." + trimit(p) });
  return { mform: mform, results: '"type": "integer"' };
}
function processPairObject(m, p, v, mform, checkPair, recursive, wasObject) {
  let results = "";
  if (debug)
    console.log(
      "processing pair " +
        p +
        " for module " +
        m +
        " value=" +
        JSON.stringify(v, tohandler)
    );
  let type;
  let p1 = "";
  let t = trimit(p);
  let vform = {
    type: "array",
    title: p,
    items: [
      {
        key: m + "." + trimit(p) + "[]",
        title: (p.endsWith("s") ? p.slice(0, -1) : p) + " {{idx}}"
      }
    ]
  };
  type = "pair";
  let r = processTable[type](m, trimit(p), p1, [], checkPair, true, wasObject);
  results += r.results;
  if (r.mform) {
    if (debug)
      console.log(
        "p mform=" +
          (typeof r.mform === "string" ? r.mform : JSON.stringify(r.mform))
      );
    if (Array.isArray(r.mform)) {
    } else vform.items.push(r.mform);
  }
  if (debug)
    console.log("pair results=" + results + " = " + JSON.stringify(results));

  if (t !== p) mangled_names[m + "." + t] = p;
  return {
    mform: vform,
    results: '"' + trimit(p) + '":{"type": "array","items": {"type":"pair"}}'
  };
}
function processFunction(m, p, v, mform, checkPair, recursive, wasObject) {
  if (debug)
    console.log(
      "processing function " + p + " for module " + m + " value=" + v
    );
  let t =
    '{"title":"' +
    p +
    '","key":"' +
    m +
    "." +
    trimit(p) +
    '",' +
    JSON.stringify(form_code_block).slice(1, -1) +
    "}";
  if (debug) console.log("adding code block definition=" + t);
  mform.push(JSON.parse(t));
  return { mform: mform, results: '"type": "string"' };
}
function getColor(cssfile, name) {
  for (let line = 0; line < cssfile.length; line++) {
    //console.log(name+" found on line="+line+" = "+cssfile[line])
    if (cssfile[line].includes(name)) {
      //console.log(name+" found on line="+cssfile[r])
      return cssfile[line + 1].split(":")[1].replace(";", "").trim();
    }
  }
  return "";
}

function containsSpecialCharacters(str) {
  if (str) {
    var regex = /[ !@#$%^&*()+=\[\]{};':"\\|,.<>\/?]/g;
    return regex.test(str);
  } else return false;
}
function isNumeric(n) {
  if (n) return !isNaN(parseFloat(n)) && isFinite(n);
  else return false;
}

//
// used by JSON.stringify
//
function tohandler(key, value) {
  if (typeof value === "function") {
    return value + ""; // implicitly `toString` it
  }
  return value;
}
//
// used by JSON.parse
//
function fromhandler(key, value) {
  if (
    value &&
    typeof value == "string" &&
    (value.startsWith("(") || value.startsWith("function(")) &&
    value.endsWith("}")
  ) {
    return eval("(" + value + ")");
  }
  return value;
}

function trimit(str1, c = ".") {
  if (c === undefined) c = ".";
  let str = str1.replace(new RegExp("\\" + c, "g"), special_variable_name_char);
  if (debug) console.log("replacing " + str1 + " with " + str);
  //while (str.charAt(0) === c) str = str.slice(1);
  return str;
}
//
// get the pointer to the object in the value section
// careful, javascript passes by value, so u get a copy..oops
// so point to object
//
function getValueObject(key, data) {
  if (key.includes(".")) {
    let keys = key.split(".");
    key = keys.shift();
    return getValueObject(keys.join("."), data[key]);
  }

  return data[key];
}

//
// set value of an object in the value section
// careful, javascript passes by value, so u get a copy..oops
// so point to object
//
function setValueObject(key, data, v) {
  if (key.includes(".")) {
    let keys = key.split(".");
    key = keys.shift();
    setValueObject(keys.join("."), data[key], v);
    return;
  }
  data[key] = clone(v);
}

//
//  check data item to see if we should make this our custom pair variable
//

function checkForPair(data) {
  result = false;
  let keys = {};
  // if this is an array
  if (Array.isArray(data)) {
    // loop thru the elements
    if (data.length) {
      for (let i in data) {
        // if the item is an object
        if (typeof data[i] === "object") {
          keys[i] = Object.keys(data[i]);
        } // can't be a pair
        else return false;
      }
      let first_element = keys[0];
      if (Object.keys(keys).length === 1 && first_element.length === 1)
        return true;
      if (Object.keys(keys).length > 1) {
        for (let i = 1; i < Object.keys(keys).length; i++) {
          // if same number of keys in each array element
          if (keys[i].length === keys[i - 1].length) {
            if (keys[i].join("|") !== keys[i - 1].join("|")) return true;
          } else return false;
        }
      }
      // empty array, guess...
    } else result = false;
  } else if (typeof data === "object") {
    let c = Object.keys(data);
    // if more keys than 1
    result = true;
    if (c.length !== 1) {
      for (let k of Object.keys(data)) {
        if (typeof data[k] !== "string") {
          result = false;
          break;
        }
      }
    }
  }
  return result;
}
