var NodeHelper = require("node_helper");
const { spawn, exec } = require("child_process");

const path = require("path");
const os = require("os");
const _ = require("lodash");
const serveIndex = require('serve-index');
const DynamicMiddleware = require('dynamic-middleware');
let dynamicServeIndex = {};
const express = require('express')

let static_debug = false

const diff = require("deep-object-diff").diff;
const detailedDiff = require("deep-object-diff").detailedDiff;
const updatedDiff = require("deep-object-diff").updatedDiff;
const socketIOPath="mConfig"
let BASE_INSTANCE_PORT=9000
const fs = require("fs");

var our_port=0

const default_config_name=path.sep+"config"+path.sep+"config.js"
let oc_prefix = ''

let oc =
  __dirname.split(path.sep).slice(0, -2).join(path.sep) + default_config_name ;

// get the default module positions old way
let module_positions = JSON.parse(
  fs.readFileSync(__dirname + "/templates/module_positions.json", "utf8")
);

// set the modules folder to the environment variable if set
let  modules_folder=process.env.MM_MODULES_DIR?process.env.MM_MODULES_DIR:"modules"
if(static_debug){
  console.log("modules folder set at init to ="+modules_folder)
}

try {

  let mp =
  fs.readFileSync(
    path.join(__dirname, "/../../js/positions.js"),
    "utf8"
  )
  module_positions= JSON.parse(mp.split('=')[1])
  module_positions.push("none")
} catch(error){
}

// get the default modules list from the MM core
const defaultModules = require("../../modules/default/defaultmodules.js");
const module_jsonform_converter = "_converter.js"

const our_name = __dirname.split(path.sep).slice(-1)[0]  // slice returns an array
    // /home/sam/MagicMirror.old/modules/MMM-Config/node_helper.js

const QRCode = require("qrcode");
const checking_diff = false;

var pm2_id = -1;
const InstallerSetup= require(__dirname+"/module_installer/runserver.js")
const closeString =
  ';\n\
\n\
/*************** DO NOT EDIT THE LINE BELOW ***************/\n\
if (typeof module !== "undefined") {module.exports = config;}';


String.prototype.hashCode = function(port) {
  var hash = 0,
    i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString().replace('-','')+port.toString();
}

// add require of other javascripot components here
// var xxx = require('yyy') here

// disable savinging while testing = false
let doSave = true;

module.exports = NodeHelper.create({
  config: {debug:false},
  module_scripts: {},
  imageurl: null,
  
  requiresVersion: "2.28.0",

  buildQR_URI(){
      //console.log("in buildQR_URI");
      this.hostname = //os.hostname();
      this.getIPAddress()
      // we might be running in docker container and can't see the real host name
      // use the environment variable if set
      if(process.env.HOST_HOSTNAME)
         this.hostname=process.env.HOST_HOSTNAME;

      this.config.url =
        "http://" +
        (this.config.address == "0.0.0.0"
          ? this.hostname
          : this.config.address) +
        ":" +
        our_port;

      if (this.config.showQR) {
        let url = this.config.url + "/configure";
        this.imageurl =
          //this.config.url +
          "/"+modules_folder+"/" + this.name + "/qrfile.png";
        QRCode.toFile(this.path + "/qrfile.png", url, (err) => {
          if (!err) {
            if (static_debug) console.log("QRCode build done");
          } else {
            console.log("QR image create failed =" + JSON.stringif(err));
          }
        });
      }
  },
  setconfigpath(){
    //console.log("in setconfigpath");
    // get the environment var for config files
    let cf = process.env.MM_CONFIG_FILE
    if(!cf){
	    cf=default_config_name
    }
    // if set and it does not contain path separator, its only the filename, not the folder
    if(cf && !cf.includes(path.sep)){

      // add the default config folder to the name
      cf = "/config/"+cf;
    }
    if(cf && !cf.startsWith(path.sep)){
      cf=path.sep+cf
    }

    // set the output config file name
    oc=__dirname.split(path.sep).slice(0, -2).join(path.sep) + (cf?cf:default_config_name);

    if(static_debug){
      console.log("config folder set at form start ="+cf);
      console.log("modules folder set at form start="+modules_folder)
    }
  },
  setConfig(){
    //console.log("in setConfig");
    this.setconfigpath()
    // watch out for env variable setting port
    let mm_port = process.env.MM_PORT || 0
  //  console.log("env port=", mm_port)

    this.config.address = config.address;
    our_port = mm_port || config.port;
    this.config.whiteList = config.ipWhitelist
//    console.log("usable port=",our_port)
    for(let m of config.modules){
      if(m.module === this.name){
	    if(m.config){
          static_debug=this.config.debug = m.config.debug || false
          this.config.force_update = m.config.force_update || true
          this.config.restart = m.config.restart || ""
          if(m.config.showQR){
            this.config.showQR=m.config.showQR || false
            this.buildQR_URI()
          }
        if(m.config.AdditionalInstancePort)
          BASE_INSTANCE_PORT = m.config.AdditionalInstancePort
      }
      break;
      }
    }

    this.startit()
  },
  // MM calls start
  start() {
    if(this.config.debug) console.log('Starting module helper:' +this.name);
    //console.log("full config=",config)
    this.setConfig()

  },
  // collect the data in background
  launchit() {
    if (static_debug) console.log("execing " + this.command);
    exec(this.command, { env: {...process.env, MM_identifier: oc.hashCode(our_port)} }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      if (static_debug) console.log(`stdout: ${stdout}`);
      if (stderr) console.error(`stderr 2: ${stderr}`);
    });
  },
  // add express routes to allow invoking the form
  extraRoutes: function () {
    this.expressApp.get("/modules/"+this.name+"/review", (req, res) => {
      // redirect to config form
      res.redirect(
        //this.config.url +
        "/modules/" + this.name + "/config.html"
      );
    });
    this.expressApp.get("/configure", (req, res) => {
      // redirect to config form
      res.redirect(
        //this.config.url +
        "/modules/" + this.name + "/config.html"
      );
    });
    /*this.expressApp.get("/configure", (req, res) => {
      // redirect to config form
      res.redirect(
        //this.config.url +
        "/modules/" + this.name + "/config.html" // ?port=" + socket_io_port+"&date="+(new Date()).getMilliseconds()
      );
    }) */
    this.expressApp.get("/modules/"+this.name+"/browse", (req, res) => {
      // connect to the
      if(static_debug)
        console.log("received browse request=", req.query, req.query.modulename)
      if(req.query.modulename){
        let modulename=req.query.modulename
        if(static_debug){
          console.log("browse module name="+modulename)
        }
        if(modulename){
          try {
            if(static_debug)
              console.log("route path ="+"/modules/"+modulename)
            let op=path.join(__dirname,"/../",modulename)
            dynamicServeIndex[modulename] = DynamicMiddleware.create(serveIndex(op))
            // Use the dynamic middleware handler in your app
            this.expressApp.use("/modules/"+modulename, dynamicServeIndex[modulename].handler());
          }
          catch(error){
            console.log(error.stack)
          }
        }
      } else {
        if(static_debug)
          console.log("modulename not found", req)
      }
      res.send("0")
    })
    this.expressApp.get("/modules/"+this.name+"/unbrowse", (req, res) => {
      // connect to the
      //if(debug)
        console.log("received browse request")
      if(req.query.modulename){
        let modulename=req.query.modulename
        if(modulename){
          if(dynamicServeIndex[modulename]){
            dynamicServeIndex[modulename].disable();
            dynamicServeIndex[modulename]=null;
          }
        }
      }  else {
        //if(debug){
          console.log("modulename not found", req)
        //}
      }
      res.send("0")
    });    
  },
  getIPAddress(){
    const nets = os.networkInterfaces();
    const results = Object.create(null); // Or just '{}', an empty object

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    //console.log(JSON.stringify(results,null,2))
    return results[Object.keys(results)[0]]
  },
  // module startup after receiving MM ready
  startit() {
    //console.log("in startit")
    // if restart is the old pm2: value, fix it
    if (this.config.restart) {
      if (this.config.debug){
	      static_debug=this.config.debug
        console.log("restart property="+this.config.restart)
      }
      if (this.config.restart.toLowerCase().startsWith("pm2:")) {
        const parts = this.config.restart.split(':')
        this.config.restart = parts[0]
        pm2_id = parts[1]
        if (static_debug) {
          console.info(this.name + " pm2 id specified for restart=" + pm2_id)
        }
      }
      if (static_debug)
        console.info(this.name + " restart parm ='" + this.config.restart + "'")
      // handle how we restart, if any
      switch (this.config.restart) {
        case "static":
          // setup the handler
          let ep =
            __dirname.split(path.sep).slice(0, -2).join(path.sep) +
            "/node_modules/.bin/electron" +
            (os.platform() == "win32" ? ".cmd" : "");
          if (static_debug) console.log("electron path=" + ep);
          require("electron-reload")(oc, {
            electron: ep,
            argv: [
              __dirname.split(path.sep).slice(0, -2).join(path.sep) +
              "/js/electron.js"
            ],
            forceHardReset: true,
            hardResetMethod: "exit"
          });
          break;
        case "pm2":
          // if the id was not set from config
          if (pm2_id == -1) {
            // if the pm2 process_env is set
            if (process.env.unique_id !== undefined) {
              // running under pm2
              if (static_debug) console.log("getting pm2 process list");
              exec("pm2 jlist", (error, stdout, stderr) => {
                if (!error) {
                  let o = stdout.toString()
                  // maybe there is a pm2 error message in front of the json
                  if (!o.startsWith('[')) {
                    // remove everything before process list
                    o = o.slice(o.indexOf('['))
                  }
                  if (static_debug) {
                    console.log("json=" + o)
                  }
                  let output = JSON.parse(o);
                  if (static_debug)
                    console.log(
                      "processing pm2 jlist output, " + output.length + " entries"
                    );
                  output.forEach((managed_process) => {
                    if (managed_process.pm2_env.status === 'online') {
                      if (process.env.unique_id === managed_process.pm2_env.env.unique_id) {
                        if (static_debug)
                          console.info(
                            "found our pm2 entry, id=" + managed_process.pm_id
                          );
                        pm2_id = managed_process.pm_id;
                      }
                    }
                  });
                }
              });
            } else {
              if (static_debug)
                console.info(this.name + " MagicMirror not running under pm2")
            }
          }
          else {
            if (static_debug) {
              console.info(this.name + " pm2 restart app id is ", pm2_id)
            }
          }
          break;
        default:
      }
    }

    this.command =
      __dirname +
      (os.platform() == "win32" ? "\\test_convert.cmd" : "/test_convert.sh");
    this.command += this.config.force_update ? " override" : "";
    if(static_debug){
      console.log("command =" + this.command);
      console.log("Starting module helper:" + this.name);
    }
    //console.log("environment vars="+JSON.stringify(process.env,null,2))
    this.launchit();
    this.extraRoutes();
    this.remote_start(this);
    let sort="date"  // default value set in modulename.js
    let debug= false
    for(m of config.modules){
      if (m.module == this.name) {
        if (m.config){
          if( m.config.ModuleSortOrder) {
            if (m.config.ModuleSortOrder) // if it was specified
             sort = m.config.ModuleSortOrder // use it
            }  
            if(m.config.debug){
                    debug=m.config.debug
            }
        }
       break;
      }
    }
    if(debug)
      console.log("starting installer setup")
    InstallerSetup(this.expressApp, this.io, NodeHelper, sort, debug, BASE_INSTANCE_PORT )
  },

  // handle messages from our module// each notification indicates a different messages
  // payload is a data structure that is different per message.. up to you to design this
  socketNotificationReceived(notification, payload) {

    // if config message from module
    if (notification === "CONFIG") {
      // save payload config info
      this.config = payload;

      if(this.imageurl){
        this.sendSocketNotification(
              "qr_url",
              this.imageurl
            );
      }
    }
  },

  // get the module properties from the config.js entry
  getConfigModule: function (m, source, index) {
    // module name is not a direct key
    let i = -1;
    for (let x of source) {
      if (x.module === m) {
        if(static_debug)
          console.log("found module "+m+" in "+oc.split('/').slice(-1)+" search for index="+index+" has index="+x.index-1)
        // if we didn't care which module instance
        // return first
        // else return instance of matching index (if any)
        i++;
        if (
          index === -2 ||
          (x.index !== undefined && x.index-1 === index)
          //||          i === index
        ) {
          /*if(m.index && index != m.index )
          {
            continue
          }*/
          //console.log(" getconf="+ x.module)
          return x;
        }
      }
    }
    return null;
  },
  reformat_array: function (data, self, key) {
    if (Array.isArray(data[key])) {
      if (static_debug)
        console.log(
          "reformat_array data present =" +
            JSON.stringify(data[key], self.tohandler, 2)
        );
      if (static_debug) console.log("reformat_array to object from array");
      let d = [];
      if (static_debug) console.log("reformatting array of strings back to object");
      data[key].forEach((element) => {
        if (typeof element === "string") {
          let tt;
          if (element.startsWith("{") && element.endsWith("}")) {
            if (static_debug)
              console.log(
                "reformat_array, about to parse=" +
                  element.replace(/\r?\n|\r/gm, "")
              );
            tt = JSON.parse(
              element.replace(/\r?\n|\r/gm, ""),
              self.fromhandler
            );
            if (static_debug) console.log("reformat_array, after parse=" + tt);
          } else {
            tt = element;
            if (static_debug) console.log("reformat_array, just copy string=" + tt);
          }
          d.push(tt);
          if (static_debug)
            console.log(
              " item added to object=" + JSON.stringify(d, self.tohandler, 2)
            );
        } else {
          if (!Array.isArray(element)) {
            if (static_debug)
              console.log(
                "reformat_array, just copy object=" +
                  JSON.stringify(element, self.tohandler, 2)
              );
            d.push(element);
          }
        }
      });
      if (static_debug)
        console.log(
          " new data contents=" + JSON.stringify(d, self.tohandler, 2)
        );
      data[key] = d;
      if (static_debug)
        console.log(
          " new data contents=" + JSON.stringify(d, self.tohandler, 2)
        );
    } else if (!Array.isArray(data)) {
      if (static_debug)
        console.log(
          "reformat_array data present =" +
            JSON.stringify(data, self.tohandler, 2)
        );
      if (static_debug) console.log("reformat_array to array from object");
      let d = [];
      Object.keys(data).forEach((a) => {
        if (static_debug) console.log("saving item=" + JSON.stringify(data[a]));
        d.push(data[a]);
      });
      data = d;
    }
  },

  object_from_key: function (object, key, type) {
    if (static_debug) console.log("key = " + key);
    if (key && key.includes(".")) {
      let r = key.split(".");
      if (static_debug)
        console.log(
          "object from key after split(.)=" + JSON.stringify(r, null, 2)
        );
      let left = r.shift().replace(/' '/g, ".");
      let index = -1;
      let li = left.split("[");
      if (static_debug)
        console.log(
          "object from key after left split([)=" + JSON.stringify(li, null, 2)
        );
      left = li[0];
      let obj = object[left];
      if (static_debug)
        console.log(
          "object from key after indexing=" + JSON.stringify(obj, null, 2)
        );
      if (li.length > 1) {
        index = parseInt(li[1]);
        obj = obj[index];
      }
      if (static_debug) console.log("object[" + left + "]=" + JSON.stringify(obj));
      if (type === "array" || r.length > 1 || obj !== undefined) {
        if (obj != undefined) {
          return this.object_from_key(obj, r.join("."), type);
        } else key = left;
      } else key = left;
    }

    if (static_debug)
      console.log(type + " object from key=" + JSON.stringify(object[key]));
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
      if (static_debug)
        console.log(
          "a=" + a + " " + JSON.stringify(Object.keys(object.added), " ", 2)
        );
    let d = Object.keys(object.deleted).length;
    if (d > 0) {
      if (static_debug)
        console.log(
          "d=" + d + " " + JSON.stringify(Object.keys(object.deleted), " ", 2)
        );
      Object.keys(object.deleted).forEach((k) => {
        console.log("d=" + k + " " + JSON.stringify(object.deleted[k], " ", 2));
      });
    }
    let u = Object.keys(object.updated).length;
    if (u > 0)
      if (static_debug)
        console.log(
          "u=" + u + " " + JSON.stringify(Object.keys(object.updated), " ", 2)
        );
    if (static_debug) console.log("a=" + a + " d=" + d + " u=" + u);
    return a + d + u === 0;
  },
  isNumeric: function (n) {
    return !isNaN(parseFloat(n)) && isFinite(parseInt(n));
  },

  // check to see if objects are the same, including sub objects..
  // return a list of flat variables
  // and subobject/variable name
  objectsAreSame: function (x, y) {
    if (static_debug)
      console.log(
        "objectsAreSame x=" + JSON.stringify(x,this.tohandler, 2) + " y=" + JSON.stringify(y, this.tohandler, 2)
      );
    var proplist = [];
    for (var propertyName in y) {
      if (
        x !== null &&
        typeof x[propertyName] === "object" &&
        typeof y[propertyName] === "object"
      ) {
        if (static_debug) console.log("comparing objects=" + propertyName);
        if(Array.isArray(x[propertyName]) && Array.isArray(y[propertyName])){
          if(JSON.stringify(x[propertyName])!==JSON.stringify(y[propertyName])){
            proplist.push(propertyName)
          }
        }
        else // is object, not array
        {
          let t = {};
          let r = this.objectsAreSame(x[propertyName], y[propertyName]);
          if (r.length) {
            t[propertyName] = r;

            if (static_debug) console.log("object list=" + JSON.stringify(t, null, 2));
            proplist = proplist.concat(t);
            if (static_debug)
              console.log(
                "concat object list=" + JSON.stringify(proplist, null, 2)
              );
          }
        }
      } else if (x===null || x[propertyName] !== y[propertyName]) {
        if (static_debug) console.log("comparing prop=" + propertyName);
        proplist.push(propertyName);
      }
    }
    if (static_debug)
      console.log("returning list=" + JSON.stringify(proplist, null, 2));
    return proplist;
  },

  merge_nested: function (output, input, changed_vars) {
    changed_vars.forEach((sub_object) => {
      // loop thru array of objects
      if (static_debug)
        console.log("changed object=" + JSON.stringify(sub_object, null, 2));
      Object.keys(sub_object).forEach((entry) => {
        // e = OS
        if (static_debug)
          console.log(
            "changed object name=" +
              entry +
              " array=" +
              Array.isArray(sub_object[entry])
          );
        if (output[entry] === undefined) output[entry] = {};
        _.assign(output[entry], _.pick(input[entry], sub_object[entry]));
        if (static_debug) console.log(" merged =" + JSON.stringify(output, null, 2));
        let r = sub_object[entry].filter((x) => {
          if (static_debug) console.log("testing item in array=" + typeof x + " " + x);
          if (typeof x === "object") return true;
        });
        if (r.length) {
          if (static_debug) console.log("have more to merge for sub_object");
          this.merge_nested(output[entry], input[entry], r);
        }
      });
    });
  },

  // we need to figure out what changed in the data
  // analogSize in config,  but no config object in config.js
  // so picking the keys for the config doesn't help, not present
  // and then merge those in.. ( clock, defaults, )
  mergeModule: function (module_entry, data, defaults) {
    if (static_debug) console.log("merge data=" + JSON.stringify(data, this.tohandler, 2));
    let keys = _.keys(module_entry);
    if (!keys.includes("disabled")) keys.push("disabled");
    if (!keys.includes("label")) keys.push("label");
    if (!keys.includes("classes")) keys.push("classes");
    if (!keys.includes("hiddenOnStartup")) keys.push("hiddenOnStartup");
    if (!keys.includes("configDeepMerge")) keys.push("configDeepMerge");
    if (!keys.includes("animateIn")) keys.push("animateIn");
    if (!keys.includes("animateOut")) keys.push("animateOut");
    keys = _.without(keys, "config");
    if(static_debug){
      console.log("merge keys for fields="+JSON.stringify(keys))
    }
    _.assign(module_entry, _.pick(data, keys));
    if (static_debug)
      console.log(
        "config after assign=" +
          JSON.stringify(module_entry, null, 2) +
          " keys=" +
          JSON.stringify(keys, null, 2)
      );
    // if the module_entry config section exists
    if (module_entry["config"] !== undefined) {
      // loop thru all the items in the existing config
      if (static_debug) console.log("checking for items in old config data, same as defaults");
      // loop thru the config.js version of the module config
      Object.keys(data.config).forEach((key) => {
        // if that key isn't in the new data
        if(static_debug){
          console.log("comparing module data with defaults for key="+key+ " new="+JSON.stringify(module_entry.config[key])+" default="+JSON.stringify(defaults[key]))
        }
        if (JSON.stringify(module_entry.config[key],this.tohandler) === JSON.stringify(defaults[key],this.tohandler)) {
          if (static_debug)
            console.log("deleting item=" + key + " from old config data");
          delete module_entry.config[key];
        } else{
          if(static_debug)
            console.log("data not equal for key="+key)
        }
      });
    }
    // compare the form data with the info from the defaults..
    let keydiff = this.objectsAreSame(defaults, data.config); // this is deep compare
    if(static_debug)
      console.log("keys different data vs defaults="+JSON.stringify(keydiff))
    if(module_entry.config !== undefined){
      let keydiff2=this.objectsAreSame(data.config,module_entry.config)
      if(static_debug)
        console.log("keys different data vs prior config="+JSON.stringify(keydiff2))
      keydiff2.forEach(k=>{
        if(!keydiff.includes(k))
                keydiff.push(k);
      })
    }
    if (static_debug)
      console.log("keydiff after assign=" + JSON.stringify(keydiff, null, 2));
    if (keydiff.length) {
      if (static_debug)
        console.log("keydiff in merge=" + JSON.stringify(keydiff, null, 2));
      if (module_entry.config === undefined) module_entry.config = {};

      // assign only does flat variables, not subobjects (aka shallow assign)
      _.assign(module_entry.config, _.pick(data.config, keydiff));

      // filter out the flat variables
      // leaving only sub objects
      let nested = keydiff.filter((x) => {
        if (typeof x === "object") return true;
      });
      // of ther were any subobjects
      if (nested.length) {
        // handle nested objects
        this.merge_nested(module_entry.config, data.config, nested);
      }
    }
    return module_entry;
  },

  fixobject_name: function (object, key, newname) {
    if (static_debug) console.log("splitting key=" + key);
    let x = key.split(".");
    if (static_debug)
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
    if (static_debug) console.log("getpair key=" + key);
    let left = key;
    if (key.includes(".")) {
      let v = key.split(".");
      // check for any array notation
      let li=v[0].split('[')
      // if there WAS an arry index, then rest is in the next element
      if(li.length >1){
         // make it numeric
         let index= parseInt(li[1])
         // get the left edge
         datasource= datasource[li[0]]
         // look only at this instance
         left = index
         v.shift()
      } else
        left = v.shift();
      if (v.length) {
        if (datasource[left] === undefined)
          datasource[left] = self.clone({}, self);
        if (static_debug) console.log("getpair remaining key=" + v.join("."));
        return self.getpair(datasource[left], v.join("."), self);
      }
    }
    if(static_debug)
      console.log("left="+left+" datasource="+JSON.stringify(datasource,null,2))
    if (datasource[left] == undefined) datasource[left] = self.clone({}, self);
    return datasource[left];
  },
  setpair: function (datasource, key, self, value) {
    if (static_debug) console.log("setpair key=" + key);
    let left = key;
    if (key.includes(".")) {
      let v = key.split(".");
      // check for any array notation
      let li=v[0].split('[')
      // if there WAS an arry index, then rest is in the next element
      if(li.length >1){
         // make it numeric
         let index= parseInt(li[1])
         // get the left edge
         datasource= datasource[li[0]]
         // look only at this instance
         left = index
         // discard the 1st array element
         v.shift()
      } else
        // use and discard the 1st element
        left = v.shift();
      if (v.length) {
        if (datasource[left] === undefined)
          datasource[left] = self.clone({}, self);
        if (static_debug) console.log("getpair remaining key=" + v.join("."));
        return self.setpair(datasource[left], v.join("."), self, value);
      }
    }
    if (static_debug)
      console.log(
        "setpair setting value=" + JSON.stringify(value, self.tohandler, 2)
      );
    datasource[left] = self.clone(value, self);
    return datasource[left];
  },
  check_for_module_file: function(module_name,type) {
    // get the name of the module schema file
    // check in the module folder
    let fn
    let isDefault = defaultModules.includes(module_name);
    if(type === 'schema'){
      fn = isDefault
        ? path.join(
            __dirname,
            "..",
            "default",
            our_name +
            "."+
            module_jsonform_info_name.slice(1)
          )
        : path.join(__dirname, "..", module_name+"."+module_jsonform_info_name.slice(1));
      if(static_debug)
        console.log("1 checking for module ="+module_name+" in "+fn);
      // if the module doesn't supply a schema file
      if (!fs.existsSync(fn)) {
        fn = path.join(
          __dirname,
          "schemas",
          //"../../MagicMirror/modules",
          module_name + "." + module_jsonform_info_name.slice(1)
        );
        // check to see if we have one
        if (!fs.existsSync(fn)) {
          fn = null;
        }
      }
    } else if(type=='converter'){
      if(static_debug)
        console.log("1 checking for module converter for"+module_name);
    fn = isDefault
      ? path.join(
          __dirname,
          "..",
          "default",
          module_name,
          our_name+"."+module_jsonform_converter.slice(1)
        )
      : path.join(__dirname, "..", module_name,our_name+"."+module_jsonform_converter.slice(1));
      if(static_debug)
        console.log("1 checking for module ="+module_name+" in "+fn);
    // if the module doesn't supply a schema file
    if (!fs.existsSync(fn)) {
      fn = path.join(
        __dirname,
        "schemas",
        //"../../MagicMirror/modules",
        module_name+module_jsonform_converter
      );
      if(static_debug)
        console.log("2 checking for module ="+module_name+" in "+fn);
    //console.log("filename 2="+fn);
      // check to see if we have one
      if (!fs.existsSync(fn)) {
        fn = null;
      }
    }
  }
    return fn;
  },
  //
  // handle form submission from web browser
  //
  process_submit: async function (data, self, socket) {
    let cfg = require(__dirname + "/defaults_"+oc.hashCode(our_port)+".js");
    //if(static_debug) console.log(" loaded module info="+JSON.stringify(cfg,self.tohandler,2))
    // cleanup the arrays


    if (static_debug) console.log("\nstart processing form submit\n");

    if (static_debug)
      console.log("posted data=" + JSON.stringify(data, self.tohandler, 2));
    // waited long enough to have it created by batch script
    try {
        oc_prefix = fs.readFileSync(__dirname +"/workdir/config_prefix"+oc.hashCode(our_port)+".txt")
    }
    catch(error){}

    if (1) {
      if (static_debug)
        console.log(
          "potential empty objects=" +
            JSON.stringify(data.objects, self.tohandler, 2)
        );
      data.objects.forEach((p) => {
        let t = p;
        while (t.includes("..")) t = t.replace("..", ".");
        if (static_debug) console.log("processing for " + p + " cleanup=" + t);

        let v = t.split(".");
        if (static_debug)
          console.log("processing for " + p + " parts=" + JSON.stringify(v));
        //   "MMM-AlexaControl.config.devices.devices",

        let o = self.object_from_key(data, t, "object");
        if (static_debug) console.log("object=" + JSON.stringify(o, " ", 2));
        if (o && _.isEqual(o.object[o.key], { fribble: null })) {
          if (static_debug) console.log("reset missing object");
          o.object[o.key] = {};
        }
        if (static_debug) {
          let rr = data[v[0]];
          console.log(
            "done 3 setting object=" +
              JSON.stringify(rr, self.tohandler, 2) +
              "\n"
          );
        }
      });
      delete data.objects;

      if (static_debug) console.log("restoring converted (obj->array) objects\n");

      data.convertedObjects.forEach((key) => {
        if (static_debug) console.log("converted object found item for key=" + key);
        let obj = self.object_from_key(data, key, "object");
        // if we have data in the form
        // its in the wrong format, array instead of object
        // so make each array element a new object for this module object
        if (obj) {
          // could have been restored by the missing object function above
          //
          if (typeof obj.object === "array") {
            if (static_debug) console.log("found item as array");
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
            if (static_debug)
              console.log(
                " found converted object for key=" + key + " but not an array\n"
              );
            if (_.isEqual(obj.object[obj.key], { fribble: null })) {
              // it was the lookup inserted dummy
              if (static_debug)
                console.log(
                  "converted object reset missing object key=" + key + "\n"
                );
              obj.object[obj.key] = {};
            } else {
              if (static_debug) console.log("converted object already restored");
            }
          }
        }
      });


      if (static_debug)
        console.log(
          "\npotential arrays=" + JSON.stringify(data.arrays, self.tohandler, 2)
        );

      // loop thru the list of potential arrays in the form that might not be returned cause they are empty
      for (const p of data.arrays) {
        let t = p;
        while (t.includes("..")) t = t.replace("..", ".");
        if (static_debug) console.log("processing for " + p + " cleanup=" + t);
        let nested = false;
        if (p.endsWith("[]")) {
          nested = true;
          t = p.slice(0, -2);
        }
        let v = t.split(".");
        if (static_debug)
          console.log("processing for " + p + " parts=" + JSON.stringify(v));
        //  MMM-GooglePhotos.config.albums"
        let rr = data[v[0]];
        let o = self.object_from_key(data, t, "array");
        if (static_debug) console.log("array=" + JSON.stringify(o, self.tohandler, 2));
        // if these was no object found (the function inserted dummy data for us to find )
        // if we find it, the array was not returned from the form handler
        // this is standard web form technology that we have to recover from
        if (_.isEqual(o.object[o.key], ["fribble"])) {
          if (static_debug) console.log("items equal key=" + o.key);
          // check to see if the returned key is the end of the total key
          // if not, a middle part of the key (array embedding array) was also not returned
          if (!t.endsWith(o.key)) {
            // if the key is config
            if (o.key === "config") {
              if (static_debug)
                console.log(
                  "setting array=" + JSON.stringify(o.object) + " key=" + o.key
                );
              o.object[o.key] = {};
              if (static_debug)
                console.log(
                  "done  setting array=" +
                    JSON.stringify(o.object) +
                    " key=" +
                    o.key
                );
              o.object = o.object[o.key];
              if (static_debug)
                console.log(
                  "done 1 setting array=" +
                    JSON.stringify(o.object) +
                    " key=" +
                    o.key
                );
              // get last entry
              o.key = v.slice(-1);
              if (static_debug)
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
          // was this a converted object?
          if(static_debug) console.log("is this item="+p+" a converted to array? "+data.convertedObjects.includes(p))
          if(data.convertedObjects.includes(p)){
            // present but NOT an empty array
            if (static_debug) console.log("reformat_array key=" + o.key);
            self.reformat_array(o.object, self, o.key);
          }
        }
        if (static_debug)
          console.log(
            "done 3 setting array=" +
              JSON.stringify(rr, self.tohandler, 2) +
              "\n"
          );
      }
      delete data.arrays;
      delete data.convertedObjects;
    }
    // cleanup the pairs
    if (1) {
      if (static_debug)
        console.log(
          "potential pairs=\n" + JSON.stringify(data.pairs, self.tohandler, 2)
        );

      // loop thru the variables we treateed as pairs (key/value)
      // and put them back in their expected form { key:value }
      for (const p of Object.keys(data["pairs"])) {
        let modified_value = {};

        let j = self.getpair(data, p, self);
       // if(static_debug)
       //   console.log("found data for key="+p+"="+JSON.stringify(data['calendar'],null,2))
        if (static_debug)
          console.log("data 1=" + JSON.stringify(j, self.tohandler, 2));

        if (j === JSON.stringify({}, self.tohandler)) j = [];

        if (static_debug)
          console.log("  data 2=" + JSON.stringify(j, self.tohandler, 2));
        // convert the array items to object items
        if (j.length) {
          for (const item of j) {
            if(static_debug)
              console.log("processing pair item="+item);
            let property = item.split(":");
            // watch out for pair property that contains ':' like htts://
            // if there are more than 2 items in the post split array, join the second on
            if(property.length>2){
              property[1]=property.slice(1).join(':')
            }
            if (property[1] == "true") property[1] = true;
            if (property[1] == "false") property[1] = false;
            if(static_debug)
              console.log("pair property value="+property[1])
            //if (!Number.isNaN(property[1])){
            //  if(static_debug) 
            //    console.log("property="+property[1]+" is a number");
            //  property[1] = parseFloat(property[1]);
            //}
            modified_value[property[0]] = property[1];
          }
          j = self.setpair(data, p, self, modified_value);
          if (static_debug)
            console.log(
              "pair reset=" + JSON.stringify(j, self.tohandler, 2) + "\n"
            );
        }
      }
      delete data.pairs;
    }
    if (1) {
      Object.keys(data.mangled_names).forEach(n=>{
      //for (let n of Object.keys(data.mangled_names)) {
        self.fixobject_name(data, n, data.mangled_names[n]);
       }
      )
      delete data.mangled_names;
    }

    // process for any script modified objects
    Object.keys(data.scriptConvertedObjects).forEach(module_name => {
      let t1 = this.check_for_module_file(module_name, 'converter')
      if (t1) {
        this.module_scripts[module_name] = require(t1)
        if (static_debug) {
          console.log("functions exported=" + JSON.stringify(Object.keys(this.module_scripts[module_name])))
        }
      }
    })

    delete data.scriptConvertedObjects



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
    let mm_index = {};

    for (let module_name of Object.keys(data)) {
      if(static_debug)
        console.log("processing data for module="+module_name)
      // fix this for multiple instances
      // don't copy config info
      switch (module_name) {
        case "config":
        case "positions":
          continue;
          break;
        default:
          break;
      }
      if (mm_index[module_name] == undefined) {
        if (Array.isArray(data[module_name])) mm_index[module_name] = 0;
        else mm_index[module_name] = -1;
      }
      let merged_module = null;
      let module_form_data;

      while (true) {
        switch (mm_index[module_name]) {
          case -1:
            module_form_data = data[module_name];
            break;
          default:
            // get the data and increment the counter.
            // remember that.. will have to adjust later
            module_form_data = data[module_name][mm_index[module_name]++];
        }

        // if a converter script was loaded for ths module
        if(static_debug)
          console.log("checking for module converter script")
        if(this.module_scripts[module_name] !== undefined){
          // call it
          if(module_form_data && module_form_data.config){
            if(static_debug)
              console.log("module form data for module="+module_name+"="+JSON.stringify(module_form_data,self.tohandler,2))
            if(static_debug)
              console.log("calling converter for module="+module_name)
            module_form_data.config=this.module_scripts[module_name].converter(module_form_data.config,'toConfig')
          }
        }
        // default is what the form has
        merged_module = module_form_data;
        if (static_debug){
          console.log(
            "checking for module=" +
              module_name +
              " in "+oc.split('/').slice(-1)+" , have form data=" +
              JSON.stringify(module_form_data, self.tohandler, 2)
          );
        }
        // find the config.js entry, if present
        if (static_debug){
          console.log(
            "going to get entry for " +
              module_name +
              " from "+oc.split('/').slice(-1)+" with index=" +
              (mm_index[module_name]-1)
          );
        }
        let module_in_config = self.getConfigModule(
          module_name,
          cfg.config.modules,
          (mm_index[module_name] -1) // have to adjust index
        );
        // if present, merge from the form
        if (module_in_config) {
          // don't know how we got here
          // data in value section, so config data present
          // name (data object key is present)
          // but no data..
          if (module_form_data === undefined){
            if(static_debug)
              console.log("no form data found for module="+module_name+" using config info index="+mm_index[module_name] - 1)
            // copy config entry to form entry
            module_form_data = module_in_config;

          }
          if (static_debug)
            console.log(
              "looking for modules=" +
                module_name +" at index="+(mm_index[module_name])+
                " in "+oc.split('/').slice(-1)+" , have config data=" +
                JSON.stringify(module_in_config, self.tohandler, 2)
            );

          if (module_in_config.order === undefined) {
            if (module_form_data.order === undefined)
              module_form_data.order = "*";
            if (static_debug)
              console.log(
                "existing config does NOT have order set, copying from form =" +
                  module_form_data.order
              );
            module_in_config.order = module_form_data.order;
          }
          if (module_in_config.position === undefined) {
            if (static_debug)
              console.log(
                "existing config does NOT have position set, copying from form =" +
                  module_form_data.position
              );
            module_in_config.position = module_form_data.position;
          }

          // don't crash if module not installed
          if(cfg.defined_config[module_name.replace(/-/g, "_") + "_defaults"]){
            merged_module = self.mergeModule(
              module_in_config,
              module_form_data,
              cfg.defined_config[module_name.replace(/-/g, "_") + "_defaults"]
            );
          }
          else {
            merged_module=module_in_config;
          }
          merged_module.inconfig = "1";

          if (static_debug)
            console.log(
              "merged " +
                merged_module.module +
                "=" +
                JSON.stringify(merged_module, self.tohandler, 2)
            );
        } else {
          if (static_debug)
            console.log(
              "module " + module_name + " not in "+oc.split('/').slice(-1)+", might be adding "
            );
        }

        // update the results
        if (merged_module) {
          if (static_debug)
            console.log(
              "might have a module to add to new "+oc.split('/').slice(-1)+" =" +
                merged_module.module
            );
          // if the module WAS in config or is enabled = not disabled
          // save it for keeping in/adding to config
          if (
            merged_module.inconfig === "1" ||
            merged_module.disabled === false
          ) {
            if (static_debug)
              console.log(
                "module was in config=" +
                  merged_module.inconfig +
                  " or is disabled=" +
                  merged_module.disabled
              );
            // if this module is a multiple
            if (mm_index[module_name] != -1) {
              // if the index was not in the merged result
              // 1st or added
              if (merged_module.index == undefined)
                // set it
                merged_module.index = mm_index[module_name];
            }
            let temp = { module: module_name };
            for (let module_property of Object.keys(merged_module)) {
              temp[module_property] = merged_module[module_property];
              if (static_debug) console.log("copied for key=" + module_property+"=",temp[module_property]);
            }

            // don't crash for bad positions
            // add dummy config parm, make bad parm none (same  visual result)
            if (!module_positions.includes(temp.position)) {
              temp.bad_position = temp.position;
              temp.position = "none";
            }

            // set none if not specified
            if (temp.position === undefined) {
              temp.position = "none";
            }

            temp.position = temp.position.replace(" ", "_");
			if(static_debug){
				console.log("position='"+temp.position+"' layout table=",layout_order);
			}
            layout_order[temp.position].push(temp);
            if (static_debug)
              console.log(
                "module=" +
                  merged_module.module +
                  " added for config in position=" +
                  merged_module.position
              );
          } else {
            if (static_debug)
              console.log(
                "module " + module_name + " wasn't in config, skipping "
              );
          }
        }
        if (
          mm_index[module_name] === -1 ||
          mm_index[module_name] > data[module_name].length
        )
          break;
        // otherwise loop back to top
      } // end of while
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
        if (static_debug)
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

    if(static_debug)
      console.log("checking for substituted spread variables= "+JSON.stringify(data.substituted_variables,null,2))
    if(data.substituted_variables){
      data.substituted_variables.forEach(v =>{
        if(static_debug)
          console.log("processing spread for module=",v.module," path=",v.path," variable=",v.variable)
        if(static_debug)
          console.log(" module in form data=",r["config"]["modules"][v.module])
        for(let m of r["config"]["modules"]){
          // found the module
          if(m.module==v.module){
            // and the index, if specified matches
            if(m.index== undefined || (m.index != undefined && m.index==v.index)){
              // start at the module level
              let c=m
              if(static_debug){
                if(m.index != undefined)
                  console.log("found matching index=", v.index, " for module=", m.module_name)
                else
                  console.log("no index for module ", v.module)
              }
              // then walk down the variable path
              for(let i =0; i<v.path.length-1; i++){
                c=c[v.path[i]]
              }
              // reset that variable to the spread operator variable
              c[v.path.slice(-1)]=[ "..."+v.variable ]
	      if(static_debug)
                console.log(" path contents="+JSON.stringify(c,null,2))
              if(static_debug)
                console.log("final after substituted replaced="+JSON.stringify(m,null, 2))
            }
          }
        }
      })
    }
    //	console.log(" config = "+JSON.stringify(cfg,' ',2))
    if (checking_diff) {
      let x = detailedDiff(r["config"], cfg.config);
      let x1 = detailedDiff(cfg.config, r["config"]);
      let x2 = detailedDiff(x, x1);
    }
    // remove any variable with leading . in the name (compliments has one)
    //console.log("data new to old diff ="+JSON.stringify(x,' ',2)+ "\n\n old to new ="+JSON.stringify(x1,' ',2)+ "\n\n delta to original ="+JSON.stringify(x2,' ',2))
    // convert the data object toa string, so we can edit it
    // make it look more like what is normally present
    let xx = JSON.stringify(r, self.tohandler, 2)
      // make a couple special strings harder to find
      // first two are ipWhitelist
      .replace(/::/g, "=:=")
      // so we can restore them later
      .replace(/f:/g, "~~")
      // MMM-FlipClock with 'seperator: ":"'
      .replace(/: ":"/g, "^::^");

    // get the line that has a quoted keyword on the left of colon
    // old = (.*[^:])\:.*
    xx.match(/(.*?)":/gm).forEach((match) => {
      if (static_debug) console.log(" quote around leading symbol test=" + match);
      // split and get the quoted keyword
      let t = match.split(":");
      // remove any leading spaces
      t[0] = t[0].trimStart();
      //console.log("match="+match + " keyword="+t[0])
      // don't remove quotes around keyword if it contains or starts with specific characters
      if (
        // includes a space
        !t[0].includes(" ") &&
        // starts with a number
        !t[0].slice(1).match(/^\d/) &&
        // starts with .
        !t[0].startsWith('".') &&
        // or dash
        !t[0].startsWith('"-') &&
        // or has a dash
        !t[0].includes("-") &&
        // or has the special dot replacement character
        !t[0].includes("^")
      ) {
        //console.log("match 2="+match + " keyword="+t[0])
        // remove the JSON double quotes around the keyword
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
      .replace(/~~/g, "f:")
      .replace(/\^::\^/g, ': ":"')
      .replace(/\\"/g, '"');  // put back unescaped quote
    // find any function invocations (parms)=> ...
    // loop thru them to take out embedded text return/nl, and escaped quotes
    // old (: "\(|: "function\().*$
    let matches = xx.match(
      /(:\s[\[]\s*"\(|:\s*"\(|:\s[\[]\s*"function\(|:\s*"function\().*$/gm
    );
    if (matches) {
      matches.forEach((expression) => {
        // we have lost context of the 'line' this is on, so we can only update the text in place
        // remove the leading ': ' or ': [' found by the regex
        let saved = (expression = expression.slice(
          expression.startsWith(": [") ? 3 : 2
        ));
        //        if(saved.startsWith('[')){
        //        let index=saved.indexOf('"')
        //      saved = saved.slice(index)
        saved = saved.trimStart();
        if (saved.endsWith(",")) {
          saved = saved.slice(0, -1);
        }
        expression = saved;
        //}
        //  if (expression.startsWith('"') && expression.endsWith('"')) {
        //    expression = expression.slice(1, -1);
        //  }

        if (static_debug)
          console.log("expression found =" + expression + " \nsaved=" + saved);
        expression = expression
          // and the escaped quote
          .replace(/\\"/g, '"')
          // get rid of tabs
          .replace(/\\t/g, "")
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
        if (static_debug)
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
            if (static_debug)
              console.log(
                "spacing =" +
                  xy[i - 2].length +
                  " - " +
                  xy[i - 2].trimStart().length +
                  " = " +
                  spacing
              );

            let f = xy[i - 2].slice(0, spacing) + "}";
            if (static_debug)
              console.log("adding line back in at " + (i - 2) + " = " + f);
            ne.push(f);
            xy.splice(i - 1, 1, exp_line.slice(1));
            i--;
            if (static_debug)
              console.log(" after insert =" + JSON.stringify(xy, "", 2));
            x = xy.length;
            continue;
          }
          if (exp_line !== undefined) {
            while (exp_line.includes('\\\\"')) {
              exp_line = exp_line.replace('\\\\"', '\\"');
            }
          }
          //save the new line
          if (static_debug) console.log("saving line=" + exp_line);
          if (exp_line !== "undefined") ne.push(exp_line);
        }
        if (static_debug)
          console.log(" expression post fixup=" + JSON.stringify(ne, "", 2));
        if (ne.slice(-1)[0].trim().endsWith('"')) {
          let e = ne.pop().trim().slice(0, -1);
          if (static_debug) console.log(" ending expression item ='" + e + "'");
          if (e.length) {
            if (static_debug)
              console.log(" ending expression item added ='" + e + "',");
            ne.push(e);
          }
        }
        expression = ne.join("\n");

        if (static_debug) console.log("expression saved =" + expression);
        // replace the original with the updated text
        xx = xx.replace(saved, expression);
      });
    }
    if(data.substituted_variables){
      if(static_debug)
        console.log("have some substituted variables=",data.substituted_variables)
      data.substituted_variables.forEach(v=>{
        if(static_debug){
          console.log("replacing ",'"...'+v.variable+'"', " with ",'...'+v.variable)
        }
        // should only occur once, but user may have used same set of variables in multiple places
        while(xx.includes('"...'+v.variable+'"')){
          if(static_debug)
            console.log("found variable in data")
          xx=xx.replace('"...'+v.variable+'"', '...'+v.variable)
        }
      })
    }
    //
    // lets construct the config.html to include extension files from module authors
    //
    // get the ones from this module distro folder (js and css files both)
    var files = fs.readdirSync(__dirname+'/schemas').filter(fn => fn.includes('_extension.'));
    var mfiles= []
    // loop thru the modules list
    r.config.modules.forEach(m =>{
      if(static_debug){
        console.log("checking "+m.module+" for extensions="+this.name+'_extension.')
      }
      // if not disabled
  	  // default folder present
  	  let default_folder=""
        if((m.disabled==false && !defaultModules.includes(m.module)) || defaultModules.includes(m.module)) {
  		    if(defaultModules.includes(m.module))
  			   default_folder="default/"
          // get a list of any extension files in the module folder
          mfiles = mfiles.concat(fs.readdirSync(__dirname+"/../"+default_folder+m.module).filter(fn => fn.startsWith(this.name+'_extension.')));
          if(static_debug){
            console.log("found ",mfiles," extensions")
          }
          // if we found some
          if(mfiles.length)
            // add them to the global list
            files.concat(mfiles)
        }
      }
    )

    let htmlfile_lines=fs.readFileSync(__dirname+"/templates/config.html").toString().split("\n");
    files.forEach(f=>{
      if(f.endsWith('.css')){
        if(static_debug)
          console.log("splicing if for file ="+f+" at index="+htmlfile_lines.indexOf('</head>'))
        htmlfile_lines.splice(htmlfile_lines.indexOf('</head>'),0,'  <link rel="stylesheet" type="text/css" href="'+'schemas/'+f+'" />')
      }
      if(f.endsWith('.js')){
        if(static_debug)
          console.log("splicing if for file ="+f+" at index="+htmlfile_lines.indexOf('</body>'))
         htmlfile_lines.splice(htmlfile_lines.indexOf('</body>'),0,'  <iframe id="viewer" class="ourframe hidden"></iframe>')
      }
    })
    //htmlfile_lines.splice(htmlfile_lines.indexOf('</body>'),0,'  <script type="text/javascript" src="'+'schemas/'+f+'"></script>')
    fs.writeFileSync(__dirname+'/config.html',htmlfile_lines.join("\n"))

    // get the last mod date of the current config.js
    let d = JSON.stringify(fs.statSync(oc).mtime)
      .slice(1, -6)
      .replace(/:/g, ".");
    // if we are doing the actual save
    // false for testing data handling
    if (doSave) {
	    const logname=oc.split(path.sep).slice(-1)
      if(static_debug)
        console.log("saving to new "+logname)
      // rename curent using ist last mod date as part of the extension name
      fs.copyFileSync(oc, oc + "." + d);
      // write out the new config.js
      fs.writeFile(oc, oc_prefix+ xx.slice(1, -1) + closeString, "utf8", (err) => {
        if (err) {
          console.error(err);
        } else {
          // inform the form all went well
          socket.emit("saved", logname+ " created successfully");
          // and restart with pm2. then
          setTimeout(() => {
            if(static_debug)
              console.log("self.config=",self.config)
            if (self.config.restart.startsWith("pm2") && pm2_id != -1) {
              socket.emit("openurl", "http://localhost:" + our_port + "/" + modules_folder + "/" + this.name + "/" + "restarting.html")
              if (static_debug) console.log("restarting using pm2, id=" + pm2_id);
              // exec pm2 restart with the name of the app
              exec("pm2 restart " + pm2_id);
            } else {
              socket.emit("openurl", "http://localhost:" + our_port + "/" + modules_folder + "/" + this.name + "/" + "notrestarting.html")
            }
          },1500)
        }
      });
      xx=null
    }
  },
  // end of form post handling

  // setup remote handling

  remote_start: function (self) {

    let config = "";
    let configDefault = "";
    let configJSON = "";

    function getFiles(self) {
      let configPath = __dirname + path.sep+"schema3_"+oc.hashCode(our_port)+".json";

      if (static_debug) console.log("path=" + configPath);

      try {
        if (fs.existsSync(configPath)) {
          try {
            // read in the text file
            self.config.data = fs.readFileSync(configPath, "utf8");

          } catch (e) {
            console.log("config parse error=" + e);
          }
        }
      }
      catch(e){}
    }

    function handleConnection(self, socket, type) {
      if (static_debug) console.log("connection started = " + type);
      //console.log("socket connected")
      socket.emit("connected");

      socket.on("saveConfig", (data) => {
        // used to save the form JSON

        self.process_submit(data, self, socket);
      });

      socket.on("cancel", () => {
        if(static_debug)
          console.log("cancel requested")
        //console.log("cancel received, closing config page")
        fs.writeFileSync(__dirname+'/canceled', '1')
        socket.emit("close")
      });

      socket.on("getForm", () => {
        getFiles(self);
        //console.log("sending config to client "+JSON.stringify(this.config))
        //if(static_debug) console.log("sending "+JSON.stringify(self.config.data))
        socket.emit("json", "'" + self.config.data + "'");
      });
    }
    /**
     * When the connection begins
     */
    var self = this;
    this.io.of(socketIOPath).on("hello",function(){
      console.log("heard hello from client")
    })
    this.io.of(socketIOPath).on("connection", (socket) => {
      if(static_debug)
      console.log("connected")
      handleConnection(self, socket, "connect");
    }); // end - connection
    this.io.of(socketIOPath).on("reconnect", (socket) => {
      if(static_debug)
      console.log("reconnected")
      handleConnection(self, socketm, "reconnect");
    });
    /**
     * When a remote disconnects
     */
    this.io.of(socketIOPath).on("disconnect", () => {
      if(static_debug)
      console.log("socket disconnected");
      //remote.emit("disconnected");
    }); // end - disconnect
  } // end - start,
});
