var NodeHelper = require("node_helper");
const { spawn, exec } = require("child_process");
const express = require("express");
const path = require("path");
const os = require("os");
const stream = require("stream");
const _ = require("lodash");
const remote = new stream.Writable();

const diff = require("deep-object-diff").diff;
const detailedDiff = require("deep-object-diff").detailedDiff;
const updatedDiff = require("deep-object-diff").updatedDiff;
const fs = require("fs");
const oc =
  __dirname.split(path.sep).slice(0, -2).join(path.sep) + "/config/config.js";
const configPath = __dirname + "/schema3.json";
const module_positions = JSON.parse(
  fs.readFileSync(__dirname + "/templates/module_positions.json", "utf8")
);
const checking_diff = false;
var socket_io_port = 8200;
const getPort = require("get-port");
const closeString =
  ';\n\
\n\
/*************** DO NOT EDIT THE LINE BELOW ***************/\n\
if (typeof module !== "undefined") {module.exports = config;}';

// add require of other javascripot components here
// var xxx = require('yyy') here
let debug = false;
// disable savinging while testing = false
let doSave = true;

module.exports = NodeHelper.create({
  config: {},

  // collect the data in background
  launchit() {
    console.log("execing " + this.command);
    exec(this.command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      if (stderr) console.error(`stderr 2: ${stderr}`);
    });
  },
  // add express routes to allow invoking the form
  extraRoutes: function () {
    this.expressApp.get("/modules/MMM-Config/review", (req, res) => {
      // redirect to config form
      res.redirect(
        this.config.url +
          "/modules/" +
          this.name +
          "/config.html?port=" +
          socket_io_port
      );
    });
  },
  // module startup after receiving MM ready
  startit() {
    // if restart is enabled, for npm start invoked MM
    if (
      this.config.restart.length &&
      this.config.restart.toLowerCase() === "static"
    ) {
      // setup the handler
      let ep =
        __dirname.split(path.sep).slice(0, -2).join(path.sep) +
        "/node_modules/.bin/electron" +
        (os.platform() == "win32" ? ".cmd" : "");
      console.log("electron path=" + ep);
      require("electron-reload")(oc, {
        electron: ep,
        argv: [
          __dirname.split(path.sep).slice(0, -2).join(path.sep) +
            "/js/electron.js"
        ],
        forceHardReset: true,
        hardResetMethod: "exit"
      });
    }
    this.command =
      __dirname +
      (os.platform() == "win32" ? "\\test_convert.cmd" : "/test_convert.sh");
    this.command += this.config.force_update ? " override" : "";
    console.log("command =" + this.command);
    console.log("Starting module helper:" + this.name);
    this.launchit();
    this.extraRoutes();
    this.remote_start(this);
  },

  // handle messages from our module// each notification indicates a different messages
  // payload is a data structure that is different per message.. up to you to design this
  socketNotificationReceived(notification, payload) {
    console.log(
      this.name +
        " received a socket notification: " +
        notification +
        " - Payload: " +
        payload
    );
    // if config message from module
    if (notification === "CONFIG") {
      // save payload config info
      this.config = payload;

      debug = this.config.debug;
      this.startit();

      this.hostname = os.hostname();

      this.config.url =
        "http://" +
        (this.config.address == "0.0.0.0"
          ? this.hostname
          : this.config.address) +
        ":" +
        this.config.port;

      if (this.config.showQR) {
        this.sendSocketNotification(
          "qr_url",
          this.config.url + "/modules/" + this.name + "/review"
        );
      }
    }
  },

  // get the module properties from the config.js entry
  getConfigModule: function (m, source) {
    // module name is not a direct key
    for (let x of source) {
      if (x.module === m) {
        //console.log(" getconf="+ x.module)
        return x;
      }
    }
    return null;
  },
  reformat_array: function (data, self, key) {
    if (Array.isArray(data[key])) {
      if (debug)
        console.log(
          "reformat_array data present =" +
            JSON.stringify(data[key], self.tohandler, 2)
        );
      if (debug) console.log("reformat_array to object from array");
      let d = [];
      if (debug) console.log("reformatting array of strings back to object");
      data[key].forEach((element) => {
        if (typeof element === "string") {
          let tt;
          if (element.startsWith("{") && element.endsWith("}")) {
            if (debug)
              console.log(
                "reformat_array, about to parse=" +
                  element.replace(/\r?\n|\r/gm, "")
              );
            tt = JSON.parse(
              element.replace(/\r?\n|\r/gm, ""),
              self.fromhandler
            );
            if (debug) console.log("reformat_array, after parse=" + tt);
          } else {
            tt = element;
            if (debug) console.log("reformat_array, just copy string=" + tt);
          }
          d.push(tt);
          if (debug)
            console.log(
              " item added to object=" + JSON.stringify(d, self.tohandler, 2)
            );
        } else {
          if (!Array.isArray(element)) {
            if (debug)
              console.log(
                "reformat_array, just copy object=" +
                  JSON.stringify(element, self.tohandler, 2)
              );
            d.push(element);
          }
        }
      });
      if (debug)
        console.log(
          " new data contents=" + JSON.stringify(d, self.tohandler, 2)
        );
      data[key] = d;
      if (debug)
        console.log(
          " new data contents=" + JSON.stringify(d, self.tohandler, 2)
        );
    } else if (!Array.isArray(data)) {
      if (debug)
        console.log(
          "reformat_array data present =" +
            JSON.stringify(data, self.tohandler, 2)
        );
      if (debug) console.log("reformat_array to array from object");
      let d = [];
      Object.keys(data).forEach((a) => {
        if (debug) console.log("saving item=" + JSON.stringify(data[a]));
        d.push(data[a]);
      });
      data = d;
    }
  },

  object_from_key: function (object, key, type) {
    if (debug) console.log("key = " + key);
    if (key && key.includes(".")) {
      let r = key.split(".");
      let left = r.shift().replace(/' '/g, ".");
      if (debug)
        console.log("object[" + left + "]=" + JSON.stringify(object[left]));
      if (type === "array" || r.length > 1 || object[left] !== undefined) {
        if (object[left] != undefined) {
          return this.object_from_key(object[left], r.join("."), type);
        } else key = left;
      } else key = left;
    }
    if (debug) console.log(type + " object from key=" + JSON.stringify(object));
    //console.log("checking item "+key+" in "+JSON.stringify(object, ' ',2))
    if (object[key] === undefined)
      //----------mykle
      object[key] = JSON.parse(
        type === "array"
          ? JSON.stringify(["fribble"])
          : JSON.stringify({ fribble: null })
      );
    return { object: object, key: key };
  },

  clean_diff: function (diff) {
    let object = diff; // JSON.parse(JSON.stringify(diff))

    let a = Object.keys(object.added).length;
    if (a > 0)
      if (debug)
        console.log(
          "a=" + a + " " + JSON.stringify(Object.keys(object.added), " ", 2)
        );
    let d = Object.keys(object.deleted).length;
    if (d > 0) {
      if (debug)
        console.log(
          "d=" + d + " " + JSON.stringify(Object.keys(object.deleted), " ", 2)
        );
      Object.keys(object.deleted).forEach((k) => {
        console.log("d=" + k + " " + JSON.stringify(object.deleted[k], " ", 2));
      });
    }
    let u = Object.keys(object.updated).length;
    if (u > 0)
      if (debug)
        console.log(
          "u=" + u + " " + JSON.stringify(Object.keys(object.updated), " ", 2)
        );
    if (debug) console.log("a=" + a + " d=" + d + " u=" + u);
    return a + d + u === 0;
  },
  isNumeric: function (n) {
    return !isNaN(parseFloat(n)) && isFinite(parseInt(n));
  },
  mergeModule(config, data) {
    return _.assign(config, _.pick(data, _.keys(config)));
  },

  fixobject_name: function (object, key, newname) {
    if (debug) console.log("splitting key=" + key);
    let x = key.split(".");
    if (debug)
      console.log("processing mangled_names, part=" + JSON.stringify(x));
    if (x.length == 1) {
      object[newname] = object[x[0]];
      delete object[x[0]];
    } else {
      let l = x.shift();
      this.fixobject_name(object[l], x.join("."), newname);
    }
  },
  tohandler: function (key, value) {
    if (typeof value === "function") {
      return value + ""; // implicitly `toString` it
    }
    return value;
  },

  fromhandler: function (key, value) {
    if (
      value &&
      typeof value == "string" &&
      (value.startsWith("(") || value.startsWith("function(")) &&
      value.endsWith("}")
    ) {
      return eval("(" + value + ")");
    }
    return value;
  },
  clone: function (input, self) {
    return JSON.parse(JSON.stringify(input, self.tohandler), self.fromhandler);
  },
  getpair: function (datasource, key, self) {
    if (debug) console.log("getpair key=" + key);
    let left = key;
    if (key.includes(".")) {
      let v = key.split(".");
      left = v.shift();
      if (v.length) {
        if (datasource[left] === undefined)
          datasource[left] = self.clone({}, self);
        if (debug) console.log("getpair remaining key=" + v.join("."));
        return self.getpair(datasource[left], v.join("."), self);
      }
    }
    if (datasource[left] == undefined) datasource[left] = self.clone({}, self);
    return datasource[left];
  },
  setpair: function (datasource, key, self, value) {
    if (debug) console.log("setpair key=" + key);
    let left = key;
    if (key.includes(".")) {
      let v = key.split(".");
      left = v.shift();
      if (v.length) {
        if (datasource[left] === undefined)
          datasource[left] = self.clone({}, self);
        if (debug) console.log("getpair remaining key=" + v.join("."));
        return self.setpair(datasource[left], v.join("."), self, value);
      }
    }
    if (debug)
      console.log(
        "setpair setting value=" + JSON.stringify(value, self.tohandler, 2)
      );
    datasource[left] = self.clone(value, self);
    return datasource[left];
  },

  // handle form submission from web browser
  process_submit: async function (data, self, socket) {
    let cfg = require(__dirname + "/defaults.js");
    //if(debug) console.log(" loaded module info="+JSON.stringify(cfg,self.tohandler,2))
    // cleanup the arrays

    if (debug) console.log("\nstart processing form submit\n");

    if (1) {
      if (debug)
        console.log(
          "potential empty objects=" +
            JSON.stringify(data.objects, self.tohandler, 2)
        );
      data.objects.forEach((p) => {
        let t = p;
        while (t.includes("..")) t = t.replace("..", ".");
        if (debug) console.log("processing for " + p + " cleanup=" + t);

        let v = t.split(".");
        if (debug)
          console.log("processing for " + p + " parts=" + JSON.stringify(v));
        //   "MMM-AlexaControl.config.devices.devices",
        let rr = data[v[0]];
        let o = self.object_from_key(data, t, "object");
        if (debug) console.log("object=" + JSON.stringify(o, " ", 2));
        if (_.isEqual(o.object[o.key], { fribble: null })) {
          if (debug) console.log("reset missing object");
          o.object[o.key] = {};
        }
        if (debug)
          console.log(
            "done 3 setting object=" +
              JSON.stringify(rr, self.tohandler, 2) +
              "\n"
          );
      });
      delete data.objects;

      if (debug) console.log("restoring converted (obj->array) objects\n");

      data.convertedObjects.forEach((key) => {
        if (debug) console.log("converted object found item for key=" + key);
        let obj = self.object_from_key(data, key, "object");
        // if we have data in the form
        // its in the wrong format, array instead of object
        // so make each array element a new object for this module object
        if (obj) {
          // could have been restored by the missing object function above
          //
          if (typeof obj.object === "array") {
            if (debug) console.log("found item as array");
            let result = {};
            // loop thru the elements of the array
            for (let i in obj.object) {
              // save in has
              // supposedly these are going to be 'objects' themselves
              // but the editor was a textarea.. so no validation
              result[i] = obj.object[i];
            }
            // overlay the object with the new results
            obj.object = self.clone(result, self);
          }
          // didn't find any form data
          else {
            //  wasn't an array, so...
            if (debug)
              console.log(
                " found converted object for key=" + key + " but not an array\n"
              );
            if (_.isEqual(obj.object[obj.key], { fribble: null })) {
              // it was the lookup inserted dummy
              if (debug)
                console.log(
                  "converted object reset missing object key=" + key + "\n"
                );
              obj.object[obj.key] = {};
            } else {
              if (debug) console.log("converted object already restored");
            }
          }
        }
      });
      delete data.converted_objects;

      if (debug)
        console.log(
          "\npotential arrays=" + JSON.stringify(data.arrays, self.tohandler, 2)
        );

      // loop thru the list of potential arrays in the form that might not be returned cause they are empty
      for (const p of data.arrays) {
        let t = p;
        while (t.includes("..")) t = t.replace("..", ".");
        if (debug) console.log("processing for " + p + " cleanup=" + t);
        let nested = false;
        if (p.endsWith("[]")) {
          nested = true;
          t = p.slice(0, -2);
        }
        let v = t.split(".");
        if (debug)
          console.log("processing for " + p + " parts=" + JSON.stringify(v));
        //  MMM-GooglePhotos.config.albums"
        let rr = data[v[0]];
        let o = self.object_from_key(data, t, "array");
        if (debug) console.log("array=" + JSON.stringify(o, self.tohandler, 2));
        // if these was no object found (the function inserted dummy data for us to find )
        // if we find it, the array was not returned from the form handler
        // this is standard web form technology that we have to recover from
        if (_.isEqual(o.object[o.key], ["fribble"])) {
          if (debug) console.log("items equal key=" + o.key);
          // check to see if the returned key is the end of the total key
          // if not, a middle part of the key (array embedding array) was also not returned
          if (!t.endsWith(o.key)) {
            // if the key is config
            if (o.key === "config") {
              if (debug)
                console.log(
                  "setting array=" + JSON.stringify(o.object) + " key=" + o.key
                );
              o.object[o.key] = {};
              if (debug)
                console.log(
                  "done  setting array=" +
                    JSON.stringify(o.object) +
                    " key=" +
                    o.key
                );
              o.object = o.object[o.key];
              if (debug)
                console.log(
                  "done 1 setting array=" +
                    JSON.stringify(o.object) +
                    " key=" +
                    o.key
                );
              // get last entry
              o.key = v.slice(-1);
              if (debug)
                console.log(
                  "done 2 setting array=" +
                    JSON.stringify(o.object) +
                    " key=" +
                    o.key
                );
            }
          }
          if (nested) {
            o.object[o.key] = [[]];
            //console.log("set nested")
          } else {
            o.object[o.key] = [];
            //console.log("set NOT nested")
          }
        } else {
          // present but NOT an empty array
          if (debug) console.log("reformat_array key=" + o.key);
          self.reformat_array(o.object, self, o.key);
        }
        if (debug)
          console.log(
            "done 3 setting array=" +
              JSON.stringify(rr, self.tohandler, 2) +
              "\n"
          );
      }
      delete data.arrays;
    }
    // cleanup the pairs
    if (1) {
      if (debug)
        console.log(
          "potential pairs=\n" + JSON.stringify(data.pairs, self.tohandler, 2)
        );

      // loop thru the variables we treateed as pairs (key/value)
      // and put them back in their expected form { key:value }
      for (const p of Object.keys(data["pairs"])) {
        let modified_value = {};

        let j = self.getpair(data, p, self);

        if (debug)
          console.log("data 1=" + JSON.stringify(j, self.tohandler, 2));

        if (j === JSON.stringify({}, self.tohandler)) j = [];

        if (debug)
          console.log("  data 2=" + JSON.stringify(j, self.tohandler, 2));
        // convert the array items to object items
        if (j.length) {
          for (const item of j) {
            let property = item.split(":");
            if (property[1] == "true") property[1] = true;
            if (property[1] == "false") property[1] = false;
            if (self.isNumeric(property[1]))
              property[1] = parseFloat(property[1]);
            modified_value[property[0]] = property[1];
          }
          j = self.setpair(data, p, self, modified_value);
          if (debug)
            console.log(
              "pair reset=" + JSON.stringify(j, self.tohandler, 2) + "\n"
            );
        }
      }
      delete data.pairs;
    }
    if (1) {
      for (let n of Object.keys(data.mangled_names)) {
        self.fixobject_name(data, n, data.mangled_names[n]);
      }
      delete data.mangled_names;
    }
    if (0) {
      // calculate diff   form input with form output
      // loop thru the defines
      Object.keys(cfg.defined_config).forEach((module_define) => {
        // take off the 'defines' suffix
        let module_name = module_define
          .slice(0, module_define.lastIndexOf("_"))
          .replace(/_/g, "-");

        let diff = detailedDiff(
          cfg.defined_config[module_define],
          data[module_name].config
        );

        /*if(this.clean_diff(diff))
							console.log("object equal for module="+module_name)
						else
							console.log("define compare for module="+module_name+"="+JSON.stringify(diff,' ',2)) */
      });

      // compare returned and cleaned up data with the module defines
      for (const m of Object.keys(self.config.data.value)) {
        let cfgmodule = self.getConfigModule(m, cfg.config.modules);
        //console.log (m !== 'config' && "module "+m+" disabled a="+self.config.data.value[m]['disabled']+" b="+this.getConfigModule(m, cfg.modules)['disabled']+" c="+data[m]['disabled'])
        if (
          m !== "config" &&
          cfgmodule &&
          self.config.data.value[m]["disabled"] != cfgmodule["disabled"] &&
          data[m]["disabled"] == false
        ) {
          //console.log("comparing "+data[m]+" to "+self.config.data.value[m])

          // comparing submitted values again returned
          let x = detailedDiff(self.config.data.value[m], data[m]);
          //if(Object.keys(x).length!=1)
          //	console.log("diff for module="+m+" = "+JSON.stringify(x))
        }
      }
    }

    // setup the final data to write out
    let r = {};
    // save the config info
    r["config"] = data["config"];
    // move invididual modules entries into modules array for config.js
    r["config"]["modules"] = [];

    // iniitialize the hash for the layout positions

    let layout_order = {};
    for (let m of module_positions) {
      layout_order[m] = [];
    }

    // loop thru the form data (has all modules)
    // copy the modules into their position sections
    for (let module_name of Object.keys(data)) {
      // don't copy config info
      if (module_name !== "config") {
        let merged_module = null;
        // default is what the form has
        let module_form_data = (merged_module = data[module_name]);
        if (debug)
          console.log(
            "checking for modules=" +
              module_name +
              " in config.js , have form data=" +
              JSON.stringify(module_form_data, self.tohandler, 2)
          );
        // find the config.js entry, if present
        let module_in_config = self.getConfigModule(
          module_name,
          cfg.config.modules
        );
        if (debug)
          console.log(
            "looking for modules=" +
              module_name +
              " in config.js , have config data=" +
              JSON.stringify(module_in_config, self.tohandler, 2)
          );

        // if present, merge from the form
        if (module_in_config) {
          if (module_in_config.order === undefined) {
            if (debug)
              console.log(
                "existing config does NOT have order set, copying from form =" +
                  module_form_data.order
              );
            module_in_config.order = module_form_data.order;
          }
          if (module_in_config.position === undefined) {
            if (debug)
              console.log(
                "existing config does NOT have position set, copying from form =" +
                  module_form_data.position
              );
            module_in_config.position = module_form_data.position;
          }

          merged_module = self.mergeModule(module_in_config, module_form_data);
          merged_module.inconfig = "1";

          if (debug)
            console.log(
              "merged " +
                merged_module.module +
                "=" +
                JSON.stringify(merged_module, self.tohandler, 2)
            );
        } else {
          if (debug)
            console.log("module " + module_name + " not in config.js, adding ");
        }

        // update the results
        if (merged_module) {
          if (debug)
            console.log(
              "have a module to add to new config.js =" + merged_module.module
            );
          // if the module WAS in config or is enabled = not disabled
          // save it for keeping in/adding to config
          if (
            merged_module.inconfig === "1" ||
            merged_module.disabled === false
          ) {
            if (debug)
              console.log(
                "module was in config=" +
                  merged_module.inconfig +
                  " or is disabled=" +
                  merged_module.disabled
              );
            let temp = { module: module_name };
            for (let module_property of Object.keys(merged_module)) {
              temp[module_property] = merged_module[module_property];
              if (debug) console.log("copied for key=" + module_property);
            }
            if (temp.position === undefined) temp.position = "none";

            temp.position = temp.position.replace(" ", "_");
            layout_order[temp.position].push(temp);
            if (debug)
              console.log(
                "module=" +
                  merged_module.module +
                  " added for config in position=" +
                  merged_module.position
              );
          }
        }
      } else {
        if (module_name !== config) {
          if (debug) console.log(" module disabled=" + module_name);
        }
      }
    }

    // sort the modules in position by order
    module_positions.forEach((position) => {
      // sort the form alphabetically, vs as found
      //console.log("pre  sort for position="+position+" there are "+layout_order[position].length+" entries")
      layout_order[position].sort((a, b) => {
        // compare titles, function for clarity
        function testit(x, y) {
          if (self.isNumeric(a.order) && self.isNumeric(b.order)) {
            if (a.order < b.order) {
              return -1;
            }
            if (a.order > b.order) {
              return 1;
            }
          } else {
            if (self.isNumeric(a.order) && !self.isNumeric(b.order)) {
              return -1;
            }
            if (!self.isNumeric(a.order) && self.isNumeric(b.order)) {
              return 1;
            }
          }
          return 0;
        }
        // get the difference
        let r = testit(a, b);
        // return results to sort
        return r;
      });
      // now that modules are sorted
      // loop thru the positions
      layout_order[position].forEach((module) => {
        // remove position:none as it doesn't exist,
        // position not present is the same as none specified
        if (module.position === "none") delete module.position;
        // add module to config.js modules list
        if (debug)
          console.log(
            "adding module " +
              module.module +
              " into list in position= " +
              module.position +
              " for config write"
          );
        // don't need the inconfig flag going into config.js
        if (module.inconfig !== undefined) delete module.inconfig;
        // order yes, cause we want to rememeber where we found them
        // save the module info into the output module list
        r["config"]["modules"].push(module);
      });
    });

    //	console.log(" config = "+JSON.stringify(cfg,' ',2))
    if (checking_diff) {
      let x = detailedDiff(r["config"], cfg.config);
      let x1 = detailedDiff(cfg.config, r["config"]);
      let x2 = detailedDiff(x, x1);
    }
    //console.log("data new to old diff ="+JSON.stringify(x,' ',2)+ "\n\n old to new ="+JSON.stringify(x1,' ',2)+ "\n\n delta to original ="+JSON.stringify(x2,' ',2))
    // convert the data object toa string, so we can edit it
    // make it look more like what is normally present
    let xx = JSON.stringify(r, self.tohandler, 2)
      // make a couple special strings harder to find
      .replace(/::/g, "=:=")
      // so we can restore them later
      .replace(/f:/g, "~~");

    // get the line that has a quoted keyword on the left of colon
    // old = (.*[^:])\:.*
    xx.match(/(.*?)":/gm).forEach((match) => {
      if (debug) console.log(" quote around leading symbol test=" + match);
      // split and get the quoted keyword
      let t = match.split(":");
      // remove andy leading spaces
      t[0] = t[0].trimStart();
      //console.log("match="+match + " keyword="+t[0])
      if (
        !t[0].includes(" ") &&
        !t[0].slice(1).match(/^\d/) &&
        !t[0].startsWith('".') &&
        !t[0].startsWith('"-') &&
        !t[0].includes('"-')
      ) {
        //console.log("match 2="+match + " keyword="+t[0])
        xx = xx.replace(
          // old "keyword":
          new RegExp(t[0] + ":", "g"),
          // with keyword:
          t[0].replace(/\"/g, "") + ":"
        );
      }
    });
    xx = xx
      .replace(new RegExp("config:"), "var config =")
      .replace(/=:=/g, "::")
      .replace(/~~/g, "f:");
    // find any function invocations (parms)=> ...
    // loop thru them to take out embedded text return/nl, and escaped quotes
    let matches = xx.match(/(: "\(|: "function\().*$/gm);
    if (matches) {
      matches.forEach((expression) => {
        // we have lost context of the 'line' this is on, so we can only update the text in place
        // remove the leading ': ' found by the regex
        let saved = (expression = expression.slice(2));
        if (debug)
          console.log("expression found =" + expression + " \nsaved=" + saved);
        expression = expression
          // and the escaped quote
          .replace(/\\"/g, '"')
          // and the  retrun/nl's
          .replace(/\\r\\n/g, "\n")
          // remove the leading/trailing json quotes
          .slice(1, -1)
          // add newline after {
          .replace(/{ /gm, "{\n")
          // add newline before }
          .replace(/}/gm, "\n}");

        //expression = JSON.stringify(eval((expression)), self.tohandler,2)

        let ne = [];
        let xy = expression.split("\n");
        if (debug)
          console.log(" expression pre fixup=" + JSON.stringify(xy, "", 2));
        let x = xy.length;
        for (let i = 0; i < x; ) {
          // get a line
          let exp_line = xy[i++];
          // if this is a blank line
          if (exp_line.trim() === "")
            // add the next line on
            exp_line += xy[i++];
          // if the line starts with } then we need to fix it to the previous line spacing at least
          if (exp_line.startsWith("}")) {
            // get the spacing of the previous line (current length - trimmed length)
            let spacing = xy[i - 2].length - xy[i - 2].trimStart().length;
            if (debug)
              console.log(
                "spacing =" +
                  xy[i - 2].length +
                  " - " +
                  xy[i - 2].trimStart().length +
                  " = " +
                  spacing
              );

            let f = xy[i - 2].slice(0, spacing) + "}";
            if (debug)
              console.log("adding line back in at " + (i - 2) + " = " + f);
            ne.push(f);
            xy.splice(i - 1, 1, exp_line.slice(1));
            i--;
            if (debug)
              console.log(" after insert =" + JSON.stringify(xy, "", 2));
            x = xy.length;
            continue;
          }
          //save the new line
          if (debug) console.log("saving line=" + exp_line);
          if (exp_line !== "undefined") ne.push(exp_line);
        }
        if (debug)
          console.log(" expression post fixup=" + JSON.stringify(ne, "", 2));
        expression = ne.join("\n");

        if (debug) console.log("expression found =" + expression);
        // replace the original with the updated text
        xx = xx.replace(saved, expression);
      });
    }

    // get the last mod date of the current config.js
    let d = JSON.stringify(fs.statSync(oc).mtime)
      .slice(1, -6)
      .replace(/:/g, ".");
    // if we are doing the actual save
    // false for testing data handling
    if (doSave) {
      // rename curent using ist last mod date as part of the extension name
      fs.renameSync(oc, oc + "." + d);
      // write out the new config.js
      fs.writeFile(oc, xx.slice(1, -1) + closeString, "utf8", (err) => {
        if (err) {
          console.error(err);
        } else {
          // inform the form all went well
          socket.emit("saved", "config.js created successfully");
          // if ther restart  value is not the default null string
          if (self.config.restart.length) {
            // and starts with pm2. then
            if (self.config.restart.toLowerCase().startsWith("pm2:")) {
              // exec pm2 restart with the name of the app
              exec("pm2 restart " + self.config.restart.split(":")[1]);
            }
          }
        }
      });
    }
  },

  remote_start: function (self) {
    const app = express();
    let config = "";
    let configDefault = "";
    let configJSON = "";

    function getFiles(self) {
      if (debug) console.log("path=" + configPath);

      if (fs.existsSync(configPath)) {
        try {
          // read in the text file
          self.config.data = fs.readFileSync(configPath, "utf8");
        } catch (e) {
          console.log("config parse error=" + e);
        }
      }
    }

    function handleConnection(self, socket, type) {
      if (debug) console.log("connection started = " + type);
      //console.log("socket connected")
      socket.emit("connected");
      if (type === "connect") getFiles(self);

      socket.on("saveConfig", (data) => {
        // used to save the form JSON

        self.process_submit(data, self, socket);
      });

      socket.on("getForm", () => {
        //console.log("sending config to client "+JSON.stringify(this.config))
        //if(debug) console.log("sending "+JSON.stringify(self.config.data))
        socket.emit("json", "'" + self.config.data + "'");
      });
    }

    const server = require("http").createServer(app);

    // Use the remote directory and initilize socket connection
    //this.expressApp.use(express.static( '/review'))
    remote.io = require("socket.io")(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    getPort({ port: getPort.makeRange(8300, 9500) }).then((port) => {
      // Start the server
      console.log(" got port=" + port);
      socket_io_port = port;
      server.listen(socket_io_port);
    });
    /**
     * When the connection begins
     */
    var self = this;
    remote.io.on("connection", (socket) => {
      handleConnection(self, socket, "connect");
    }); // end - connection
    remote.io.on("reconnect", (socket) => {
      handleConnection(self, socketm, "reconnect");
    });
    /**
     * When a remote disconnects
     */
    remote.io.on("disconnect", () => {
      console.log("socket disconnected");
      remote.emit("disconnected");
    }); // end - disconnect
  } // end - start,
});
