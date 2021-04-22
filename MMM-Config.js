/*

sample module structure


 */


Module.register("MMM-Config", {

	// holder for config info from module_name.js
	config:null,

	// anything here in defaults will be added to the config data
	// and replaced if the same thing is provided in config
	defaults: {
		showQR: true,
		force_update: false
	},

	init: function(){
		Log.log(this.name + " is in init!");
	},

	start: function(){
		Log.log(this.name + " is starting!");
	},


	// return list of other functional scripts to use, if any (like require in node_helper)
	getScripts: function() {
	return	[ this.file('node_modules/qrcode/build/qrcode.min.js')

		]
	},


	// messages received from other modules and the system (NOT from your node helper)
	// payload is a notification dependent data structure
	notificationReceived: function(notification, payload, sender) {
		// once everybody is loaded up
		if(notification==="ALL_MODULES_STARTED"){
			// send our config to our node_helper
			this.config.address=config.address
			this.config.port=config.port
			this.config.whiteList=config.ipWhitelist
			this.sendSocketNotification("CONFIG",this.config)
		}
	},

	// messages received from from your node helper (NOT other modules or the system)
	// payload is a notification dependent data structure, up to you to design between module and node_helper
	socketNotificationReceived: function(notification, payload) {
		Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
		if(notification === "qr_url"){
			this.config.url = payload;
			// tell mirror runtime that our data has changed,
			// we will be called back at GetDom() to provide the updated content
			this.updateDom(1000)
		}

	},

	// system notification your module is being hidden
	// typically you would stop doing UI updates (getDom/updateDom) if the module is hidden
	suspend: function(){

	},

	// system notification your module is being unhidden/shown
	// typically you would resume doing UI updates (getDom/updateDom) if the module is shown
	resume: function(){

	},

	// this is the major worker of the module, it provides the displayable content for this module
	getDom: function() {
		var wrapper = document.createElement("div");

		// if user supplied message text in its module config, use it
		if(this.config.hasOwnProperty("url")){
			if(config.address === "0.0.0.0" && config.ipWhitelist === []){
				// using text from module config block in config.js
				//wrapper.innerText = this.config.message;
				var canvas=document.createElement('canvas')
				canvas.className='qr';
				QRCode.toCanvas(canvas, this.config.url, function (error) {
				    if (error) Log.error(error)
				    if(this.config.debug) Log.log('success!');
				  })
				wrapper.appendChild(canvas)
			} else {
				wrapper.innerHTML = "<p>"+this.name+" cannot use QR code,<br>address is set to localhost, <br>or<br>ipWhitelist prevents outside system access <br>use this url on the MagicMirror system <br>"+this.config.url

			}
		}
		return wrapper
	},

})
