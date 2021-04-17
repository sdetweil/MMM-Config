var NodeHelper = require("node_helper");
const { spawn, exec } = require('child_process');
const express = require('express')
const path = require ('path')
const os = require('os')

// add require of other javascripot components here
// var xxx = require('yyy') here

module.exports = NodeHelper.create({
config:{},
	launchit(){

		// console.log("execing "+this.command)
		exec(this.command, (error, stdout, stderr) => {
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

		//this.expressApp.use("/MMM-Config/review");
	},
	start() {
		this.command = __dirname+"/test_convert."+((os.platform()=='win32')?'cmd':'sh'	)
		console.log("command ="+this.command);
		console.log('Starting module helper:' +this.name);
		this.launchit()
		this.extraRoutes()
	},

	getConfig: function(req,res){
		res.redirect(this.config.url+"/modules/"+this.name+"/testit.html")
	},

	// handle messages from our module// each notification indicates a different messages
	// payload is a data structure that is different per message.. up to you to design this
	socketNotificationReceived(notification, payload) {
		console.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
		// if config message from module
		if (notification === "CONFIG") {
			// save payload config info
			this.config=payload

			this.hostname = os.hostname()

			this.config.url ='http://'+
			(this.config.address=="0.0.0.0"?this.hostname:"localhost")+":"+this.config.port

			if(this.config.showQR){
				this.sendSocketNotification("qr_url", this.config.url+"/modules/"+this.name+"/review")
			}
		}


	},

});