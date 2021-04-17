var NodeHelper = require("node_helper");
const { spawn, exec } = require('child_process');
const express = require('express')
const path = require ('path')
const os = require('os')
const stream = require('stream')
const _ = require('lodash')
let remote = new stream.Writable()
const { inspect } = require('util')
const transform = require('lodash.transform')
const isEqual = require('lodash.isequal')
const isArray = require('lodash.isarray')
const isObject = require('lodash.isobject')
const diff = require("deep-object-diff").diff;

// add require of other javascripot components here
// var xxx = require('yyy') here

module.exports = NodeHelper.create({
config:{},
	launchit(){

		if(this.config.debug) console.log("execing "+this.config.command)
		exec(this.config.command, (error, stdout, stderr) => {
		  if (error) {
		    console.error(`exec error: ${error}`);
		    return;
		  }
		  console.log(`stdout: ${stdout}`);
		  if(stderr)
		  	console.error(`stderr: ${stderr}`);
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
		this.config.command = __dirname+"/test_convert.sh"
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


remote_start : function (self) {
	const express = require('express')
	const app = express()
	const fs = require('fs')
	const getConfigSchema = require(__dirname+'/schema3.json')

	let config = ""
	let configDefault = ""
	let configJSON = ""
	let configPath = __dirname + '/schema3.json'


	function getFiles(self) {
		console.log("path="+configPath)

		if (fs.existsSync(configPath)) {
			try {
				self.config.data = JSON.parse(fs.readFileSync(configPath, "utf8")) //json'd config file
			//	console.log("have config parsed ="+JSON.stringify(self.config.data))
			} catch (e) {
 				console.log("config parse error="+e)
			}
		}
		//TODO this is async, all of the remote should be async too

	}
	getFiles(self)

	const server = require('http').createServer(app)

	// Use the remote directory and initilize socket connection
	this.expressApp.use(express.static( '/review'))
	remote.io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
// Start the server
	server.listen(8192)
	/**
   * When the connection begins
   */
	remote.io.on('connection', (socket) =>{
		var self = this
		//console.log("socket connected")
		socket.emit('connected')

		socket.on('saveConfig', (data) =>{ // used to save the form JSON

			let cfg = require(__dirname+"/../../config/config.js")
			//console.log(" loaded data="+JSON.stringify(self.config,' ',2))
			for ( const m of Object.keys(self.config.data.value)){
					if(m !== 'config'){
						//console.log("comparing "+data[m]+" to "+self.config.data.value[m])
						let x = diff( self.config.data.value[m],data[m])
						if(Object.keys(x).length!=1)
							console.log("diff for module="+m+" = "+JSON.stringify(x))
					}
			}

			if(0){
				console.log("saving data from client to "+configPath+"\n"+JSON.stringify(data))
				for(const p of Object.keys(data['pairs'])){
						let modified_value = {}
						let v=p.split('.')
						let j = (v[0] =='config')?data[v[0]][v[1]]: data[v[0]]['config'][v[1]]
	 					console.log("processing for pair="+p+"  data="+JSON.stringify(j))
						// convert the array items to object items
						for(const item of j){
							  let property=item.split(':')
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
			let r = {}
			r['config']=data['config']
			r['config']['modules']=[]
			for(let m of Object.keys(data)){
				if(m !== 'config'){
					let mx = {}
					mx.module=m
					mx=Object.assign(mx,data[m])

					r['config']['modules'].push(mx)
					//console.log("deleting data."+m+" data.config="+JSON.stringify(data['config'],' ',2))
				  //delete data[m]
				}
			}




			console.log(" config = "+JSON.stringify(cfg,' ',2))
			let x = diff(r['config'], cfg)
			let x1 = diff(cfg,r['config'])
			let x2 = diff(x1,x)
			console.log("data new to old diff ="+JSON.stringify(x,' ',2)+ "\n\n old to new ="+JSON.stringify(x1,' ',2)+ "\n\n delta to original ="+JSON.stringify(x2,' ',2))
			fs.writeFile(configPath+"o", JSON.stringify(r, null, 2), "utf8", function (err) {
				if (err) {
					console.error(err)
				}
			})
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
difference: function (newObj,origObj) {
  function changes(newObj, origObj) {
    let arrayIndexCounter = 0
    return transform(newObj, function (result, value, key) {
      if (!isEqual(value, origObj[key])) {
        let resultKey = isArray(origObj) ? arrayIndexCounter++ : key
        result[resultKey] = (isObject(value) && isObject(origObj[key])) ? changes(value, origObj[key]) : value
      }
    })
  }
  return changes(newObj, origObj)
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