var NodeHelper = require("node_helper");
const { spawn, exec } = require('child_process');
const express = require('express')
const path = require ('path')
const os = require('os')
const stream = require('stream')
const _ = require('lodash')
const remote = new stream.Writable()
const { inspect } = require('util')
const transform = require('lodash.transform')
const isEqual = require('lodash.isequal')
const isArray = require('lodash.isarray')
const isObject = require('lodash.isobject')
//const isDate = require('lodash.isdate')
const diff = require("deep-object-diff").diff;
const detailedDiff = require("deep-object-diff").detailedDiff;
const updatedDiff = require("deep-object-diff").updatedDiff;
const fs = require('fs')
const configPath = __dirname + '/schema3.json'
const closeString = ";\n\
\n\
/*************** DO NOT EDIT THE LINE BELOW ***************/\n\
if (typeof module !== \"undefined\") {module.exports = config;}"

// add require of other javascripot components here
// var xxx = require('yyy') here

module.exports = NodeHelper.create({
config:{},
	launchit(){

		console.log("execing "+this.command)
		exec(this.command, (error, stdout, stderr) => {
		  if (error) {
		    console.error(`exec error: ${error}`);
		    return;
		  }
		  console.log(`stdout: ${stdout}`);
		  if(stderr)
		  	console.error(`stderr 2: ${stderr}`);
		});
	},
	extraRoutes: function() {
		var self = this;
		this.expressApp.get("/modules/MMM-Config/review", function(req, res) {
			self.getConfig(req, res);
		});

		//this.expressApp.use(express.static("/MMM-Config/review"));
	},

	startit() {
		this.command = __dirname+((os.platform()=='win32')?'\\test_convert.cmd':'/test_convert.sh')
		console.log("command ="+this.command);
		console.log('Starting module helper:' +this.name);
		this.launchit()
		this.extraRoutes()
		this.remote_start(this)
	},

	getConfig: function(req,res){
		console.log("returning url="+this.config.url+"/modules/"+this.name+"/config.html")
		res.redirect(this.config.url+"/modules/"+this.name+"/config.html")
	},

	// handle messages from our module// each notification indicates a different messages
	// payload is a data structure that is different per message.. up to you to design this
	socketNotificationReceived(notification, payload) {
		console.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
		// if config message from module
		if (notification === "CONFIG") {
			// save payload config info
			this.config=payload
			this.startit()

			this.hostname = os.hostname()

			this.config.url ='http://'+
			(this.config.address=="0.0.0.0"?this.hostname:"localhost")+":"+this.config.port

			if(this.config.showQR){
				this.sendSocketNotification("qr_url", this.config.url+"/modules/"+this.name+"/review")
			}
		}
	},

	// get the module properties from the config.js entry
	getConfigModule: 	function(m, source){

		//console.log("source="+ JSON.stringify(source))

		for (let x of source){

			if(x.module == m){
				//console.log(" getconf="+ x.module)
				return x
			}
		}
		return null
	},
reformat_array:function (data){
		//console.log(" array present ="+JSON.stringify(data,' ',2))
		if(!Array.isArray(data)){
			let d = []
			Object.keys(data).forEach((a)=>{
				  //console.log("saving item="+JSON.stringify(data[a]))
					d.push(data[a])
			})
			data=d
		}
},
object_from_key: function (object, key){
	if(key.includes('.')){
		let r = key.split('.')
		let left = r.shift()
		return this.object_from_key(object[left],r.join('.'))
	}
	//console.log("checking item "+key+" in "+JSON.stringify(object, ' ',2))
	if(object[key] === undefined)
		object[key]= JSON.parse(JSON.stringify([ "fribble" ]))
	return {object: object, key:key }
},
clean_diff: function(diff){
	let object = diff // JSON.parse(JSON.stringify(diff))

	let a = Object.keys(object.added).length
	  if(a >0)
	  	console.log("a="+a+" "+JSON.stringify(Object.keys(object.added),' ',2))
	let d = Object.keys(object.deleted).length
	  if(d >0){
	  	console.log("d="+d+" "+JSON.stringify(Object.keys(object.deleted),' ',2))
	  	Object.keys(object.deleted).forEach((k)=>{
	  			 console.log("d="+k+" "+JSON.stringify(object.deleted[k],' ',2))
	  	})
	  }
	let u = Object.keys(object.updated).length
	  if(u >0)
	  	console.log("u="+u+" "+JSON.stringify(Object.keys(object.updated),' ',2))
	console.log("a="+a+" d="+d+" u="+u)
  return (a+d+u) === 0
},
isNumeric :function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
},
mergeModule(config, data){
	//return Object.assign({}, data, config, data)
	return _.assign(config , _.pick(data, _.keys(config)));
	/*return  Object.keys(data)					// if the key is in config
	  .reduce((a, key) => ({ ...a, [key]: config[key]?
	  																								//if it doesn't match the form data
	  																								// use the form data
	  																							((config[key]!==data[key])? data[key]: config[key]
	  																								:
	  																								|| config[key]
	  										}), {});*/
},

process_submit: async function (data, self){
			let cfg = require(__dirname+"/defaults.js")
			// cleanup the arrays
			if(1) {
				//console.log("arrays="+JSON.stringify(data.arrays,' ',2))
				for(const p of data.arrays){
					let t=p
					while(t.includes(".."))
						t=t.replace("..",'.')
					//console.log("processing for "+p+" cleanup="+t)
					let nested=false
					if(p.endsWith('[]')){
						nested=true
						t=p.slice(0,-2)
					}
					let v = t.split('.')
					//console.log("processing for "+p+" parts="+JSON.stringify(v))
					//  MMM-GooglePhotos.config.albums"
					let o = this.object_from_key(data,t)
					//console.log("object="+JSON.stringify(o,' ',2))
						if(_.isEqual(o.object[o.key], [ "fribble" ])){
							//console.log("items equal")
								if(nested){
									o.object[o.key] = [[]]
									//console.log("set nested")
								}
								else{
									o.object[o.key]= []
									//console.log("set NOT nested")
								}
						} else {
							// present but NOT an array
							this.reformat_array(o.object)
						}
				}
				delete data.arrays
			}
			// cleanup the pairs
			if(1){
				//console.log("saving data from client to "+configPath+"\n"+JSON.stringify(data))
				for(const p of Object.keys(data['pairs'])){
						let modified_value = {}
						let v=p.split('.')
						let j = (v[0] =='config')?data[v[0]][v[1]]: data[v[0]]['config'][v[1]]
	 					//console.log("processing for pair="+p+"  data="+JSON.stringify(j))
						// convert the array items to object items
						for(const item of j){
							  let property=item.split(':')
							  if(property[1]=="true")
							  	 property[1]=true
							  if(property[1]=="false")
							  	 property[1]=false
							  if(this.isNumeric(property[1]))
							  	property[1]=parseFloat(property[1])
								modified_value[property[0]]=property[1]
						}
						if(v[0] ==='config'){
							data[v[0]][v[1]]=modified_value
						}
						else
							data[v[0]]['config'][v[1]]=modified_value
					}
				delete data.pairs
			}
			if(0){  // calculate diff   form input with form output
				// loop thru the defines
				Object.keys(cfg.defined_config).forEach((module_define)=>{
					  // take off the 'defines' suffix
						let module_name=module_define.slice(0,module_define.lastIndexOf('_')).replace(/_/g,'-')
						//cfg.defined_config[module_define]['module']=module_name
						//cfg.defined_config[module_define]['position']=data.value[module_name]['position']
						//cfg.defined_config[module_define]['disabled']= data.value[module_name]['disabled']
						// compare the returned data to the defines, should remove all the attributes that are the same
						//console.log("module data="+JSON.stringify(data[module_name],' ',2))
						//let diff = this.difference(cfg.defined_config[module_define],data[module_name].config)

						let diff = detailedDiff(cfg.defined_config[module_define],data[module_name].config)

						/*if(this.clean_diff(diff))
							console.log("object equal for module="+module_name)
						else
							console.log("define compare for module="+module_name+"="+JSON.stringify(diff,' ',2)) */
				})

				// compare returned and cleaned up data with the module defines
				for ( const m of Object.keys(self.config.data.value)){
					let cfgmodule=this.getConfigModule(m, cfg.config.modules)
					//console.log (m !== 'config' && "module "+m+" disabled a="+self.config.data.value[m]['disabled']+" b="+this.getConfigModule(m, cfg.modules)['disabled']+" c="+data[m]['disabled'])
						if(m !== 'config' && (cfgmodule && self.config.data.value[m]['disabled']!=cfgmodule['disabled'] && data[m]['disabled']==false)){
							//console.log("comparing "+data[m]+" to "+self.config.data.value[m])

							// comparing submitted values again returned
							let x = detailedDiff( self.config.data.value[m],data[m])
							//if(Object.keys(x).length!=1)
							//	console.log("diff for module="+m+" = "+JSON.stringify(x))
						}
				}
			}

			// setup the final data to write out
			let r = {}
			r['config']=data['config']
			r['config']['modules']=[]
			// loop thru the form data (has all modules)
			// copy the modules over inside the modules block
			// only enabled modules, new ones start put disabled
			for(let m of Object.keys(data)){
				// don't copy config info
				if(m !== 'config' && data[m].disabled === false ){
					if(data[m].position==='none')
						delete data[m].position
					// default is what the form has
					let mx = data[m]
					// find the config.js entry, if present
					mx=this.getConfigModule(m, cfg.config.modules)
					// if present, merge from the form
					if(mx){
						mx=this.mergeModule(mx,data[m])
						mx.module=m
						//console.log("merging "+mx.module+"="+JSON.stringify(mx,' ',2))

					}
					// update the results
					r['config']['modules'].push(mx)
					//console.log("deleting data."+m+" data.config="+JSON.stringify(data['config'],' ',2))
				  //delete data[m]
				}
			}


		//	console.log(" config = "+JSON.stringify(cfg,' ',2))
			let x = detailedDiff(r['config'], cfg.config)
			let x1 = detailedDiff(cfg.config,r['config'])
			let x2 = detailedDiff(x,x1)
			//console.log("data new to old diff ="+JSON.stringify(x,' ',2)+ "\n\n old to new ="+JSON.stringify(x1,' ',2)+ "\n\n delta to original ="+JSON.stringify(x2,' ',2))
			//let reg=/(.*[^:])\:.*/gm
			let xx = JSON.stringify(r, null, 2)

			//console.log("there are "+xx.length+" matches")
			xx.match(/(.*[^:])\:.*/gm).forEach(match => {
				let t = match.split(":")
				t[0]=t[0].trimStart()
				//console.log("match="+match + " keyword="+t[0])
				if(!t[0].includes(" ") && !t[0].slice(1).match(/^\d/) && !t[0].startsWith('".') && !t[0].startsWith('"-')){ //} && !t[0].match(/^\d/)){
					//console.log("match 2="+match + " keyword="+t[0])
					xx=xx.replace(new RegExp(t[0]+':', 'g'), t[0].replace(/\"/g,"")+':')
				}
			})
			xx=xx.replace(new RegExp('config:'), 'var config =')
			fs.writeFile(__dirname +"/config.js", xx.slice(1,-1)+closeString, "utf8", function (err) {
				if (err) {
					console.error(err)
				}
			})

},

remote_start : function (self) {
	const app = express()
	let config = ""
	let configDefault = ""
	let configJSON = ""



	function getFiles(self) {
		console.log("path="+configPath)

		if (fs.existsSync(configPath)) {
			try {
				self.config.data = JSON.parse(fs.readFileSync(configPath, "utf8")) //json'd config file
				console.log("schema file loaded")
			//	console.log("have config parsed ="+JSON.stringify(self.config.data))
			} catch (e) {
 				console.log("config parse error="+e)
			}
		}
		//TODO this is async, all of the remote should be async too

	}

	const server = require('http').createServer(app)

	// Use the remote directory and initilize socket connection
	//this.expressApp.use(express.static( '/review'))
	remote.io = require("socket.io")(server, {
			  cors: {
				origin: "*",
				methods: ["GET", "POST"]
			  }
			});
// Start the server
	server.listen(8200)
	/**
   * When the connection begins
   */
    var self = this
	remote.io.on('connection', (socket) =>{
			console.log("connection started")	
		//console.log("socket connected")
		socket.emit('connected')

	  getFiles(self)

		socket.on('saveConfig', (data) =>{ // used to save the form JSON

				this.process_submit(data, self)
		})

		socket.on('getForm', () => {
			//console.log("sending config to client "+JSON.stringify(this.config))
			//  console.log("sending "+JSON.stringify(this.config.data))
				socket.emit("json", this.config.data )
		})

	}) // end - connection

/**
   * When a remote disconnects
   */
	remote.io.on('disconnect',  () =>{
		console.log("socket disconnected")
		remote.emit('disconnected')
	})// end - disconnect
}, // end - start,



/**
 * Find difference between two objects
 * @param  {object} origObj - Source object to compare newObj against
 * @param  {object} newObj  - New object with potential changes
 * @return {object} differences
 */
difference: function(origObj, newObj) {
	function changes(newObj, origObj) {
		let arrayIndexCounter = 0
			return transform(newObj, function (result, value, key) {
			if (!_.isEqual(value, origObj[key])) {
				let resultKey = _.isArray(origObj) ? arrayIndexCounter++ : key
				result[resultKey] = (_.isObject(value) && _.isObject(origObj[key])) ? _.isDate(value) ? value : changes(value, origObj[key]) : value
			}
		});
	};
	return changes(newObj, origObj);
},

difference2: function (object, base) {
	function changes(object, base) {
		return _.transform(object, function(result, value, key) {
			if (!_.isEqual(value, base[key])) {
				result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
			}
		});
	}
	return changes(object, base);
},

/*!
 * Find the differences between two objects and push to a new object
 * (c) 2019 Chris Ferdinandi & Jascha Brinkmann, MIT License, https://gomakethings.com & https://twitter.com/jaschaio
 * @param  {Object} obj1 The original object
 * @param  {Object} obj2 The object to compare against it
 * @return {Object}      An object of differences between the two
 */
 diffo : function (obj1, obj2) {
 		var self = this
    // Make sure an object to compare is provided
    if (!obj2 || Object.prototype.toString.call(obj2) !== '[object Object]') {
        return obj1;
    }

    //
    // Variables
    //

    var diffs = {};
    var key;


    //
    // Methods
    //

    /**
     * Check if two arrays are equal
     * @param  {Array}   arr1 The first array
     * @param  {Array}   arr2 The second array
     * @return {Boolean}      If true, both arrays are equal
     */
    var arraysMatch = function (arr1, arr2) {

        // Check if the arrays are the same length
        if (arr1.length !== arr2.length) return false;

        // Check if all items exist and are in the same order
        for (var i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }

        // Otherwise, return true
        return true;

    };

    /**
     * Compare two items and push non-matches to object
     * @param  {*}      item1 The first item
     * @param  {*}      item2 The second item
     * @param  {String} key   The key in our object
     */
    var compare = function (item1, item2, key) {

        // Get the object type
        var type1 = Object.prototype.toString.call(item1);
        var type2 = Object.prototype.toString.call(item2);

        // If type2 is undefined it has been removed
        if (type2 === '[object Undefined]') {
            diffs[key] = null;
            return;
        }

        // If items are different types
        if (type1 !== type2) {
            diffs[key] = item2;
            return;
        }

        // If an object, compare recursively
        if (type1 === '[object Object]') {
            var objDiff = self.diff(item1, item2);
            if (Object.keys(objDiff).length > 0) {
                diffs[key] = objDiff;
            }
            return;
        }

        // If an array, compare
        if (type1 === '[object Array]') {
            if (!arraysMatch(item1, item2)) {
                diffs[key] = item2;
            }
            return;
        }

        // Else if it's a function, convert to a string and compare
        // Otherwise, just compare
        if (type1 === '[object Function]') {
            if (item1.toString() !== item2.toString()) {
                diffs[key] = item2;
            }
        } else {
            if (item1 !== item2 ) {
                diffs[key] = item2;
            }
        }

    };


    //
    // Compare our objects
    //

    // Loop through the first object
    for (key in obj1) {
        if (obj1.hasOwnProperty(key)) {
            compare(obj1[key], obj2[key], key);
        }
    }

    // Loop through the second object and find missing items
    for (key in obj2) {
        if (obj2.hasOwnProperty(key)) {
            if (!obj1[key] && obj1[key] !== obj2[key] ) {
                diffs[key] = obj2[key];
            }
        }
    }

    // Return the object of differences
    return diffs;

},
 objectDiff: function (object, base) {
  function changes(object, base) {
    const accumulator = {};
    Object.keys(base).forEach((key) => {
      if (object[key] === undefined) {
        accumulator[`-${key}`] = base[key];
      }
    });
    return _.transform(
      object,
      (accumulator, value, key) => {
        if (base[key] === undefined) {
          accumulator[`+${key}`] = value;
        } else if (!_.isEqual(value, base[key])) {
          accumulator[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
        }
      },
      accumulator
    );
  }
  return changes(object, base);
},

deepDiff: function (fromObject, toObject) {
    const changes = {};

    const buildPath = (path, obj, key) =>
        _.isUndefined(path) ? key : `${path}.${key}`;

    const walk = (fromObject, toObject, path) => {
        for (const key of _.keys(fromObject)) {
            const currentPath = buildPath(path, fromObject, key);
            if (!_.has(toObject, key)) {
                changes[currentPath] = {from: _.get(fromObject, key)};
            }
        }

        for (const [key, to] of _.entries(toObject)) {
            const currentPath = buildPath(path, toObject, key);
            if (!_.has(fromObject, key)) {
                changes[currentPath] = {to};
            } else {
                const from = _.get(fromObject, key);
                if (!_.isEqual(from, to)) {
                    if (_.isObjectLike(to) && _.isObjectLike(from)) {
                        walk(from, to, currentPath);
                    } else {
                        changes[currentPath] = {from, to};
                    }
                }
            }
        }
    };

    walk(fromObject, toObject);

    return changes;
}



});