
$(function () {

	// global vars
	var u = window.location.href
	var pos = u.substr(u.lastIndexOf("/") + 1)
	var server= u.slice(0,u.indexOf(":",5))
	var socket = io()
	let port=8200


	// config vars
	var timeoutID
	var timerHandle

	// watch out in case the libraries don't load
	if(location.href.split("/").slice(-1) =='config.html'){
		if(typeof JSONForm !== 'object'){
			$('#outMsg').html("Unable to load Required Libraries <br> Please try again in a few moments")
			showElm('#out', 1)
			return false;
		}
	}

	function parseData(data){
		return JSON.parse(

	   		data,

	   		function (key, value) {
				if (typeof value === "string"){
					// only handle specified field sin jsonform
					switch(key){
					  case 'onChange':
					  case 'onClick':
					  case 'onKeyUp':
					  		// get the function from the string
					  		// parens mean don't EXECUTE the function, just get its value
								value = eval("(" + value + ")");
						break;
						}
				}
				return value;
			}
		);
	}
	// socket

  const activesocket = io(server+":"+port, {
	  reconnectionDelayMax: 10000
	});
	// global socket events
	activesocket.on('connected', function () {

		switch (pos) {
		case "config.html":
			config_init()
			break;
		default:
			index_init()
		}
	})

	activesocket.on('disconnect', function () {
		// don't know what to do on disconnect
		$('#outmessage').html("<p><strong>MagicMirror is not running</strong></p>")
		$('#result').html('<form id="result-form" class="form-vertical"></form>');
		//hideElm('#submit_button')

		if(timerHandle)
			clearTimeout(timerHandle)
		;
	})

	// config socket events
	activesocket.on('json', function (incoming_json) {
		//data.configJSON =  data
		let data = parseData(incoming_json.slice(1,-1))
		// free the memory
		incoming_json=null
		let pairs = data.pairs
		let arrays = data.arrays
		let objects = data.objects
		$('#outmessage').text("")
		try {
			data.onSubmitValid = function (values) {
				values['pairs']=pairs
				values['arrays']=arrays
				values['objects']=objects

				activesocket.emit('saveConfig', values)
				$('#outmessage').html("<p><strong>Your Configuration has been submitted.</strong></p>")
			};
			data.onSubmit = function (errors,values) {
				if (errors) {
					console.log('Validation errors 1', errors, values);
					let buildInner = ""
					errors.forEach(function (errItem) {
						let errSchemaUri = errItem.schemaUri.replace(/.+\/properties\//, "").replace("/", " >> ")
						buildInner += `<p><strong style="font-color:red">Error: ` + errItem.message +
							"</strong></br>Location: " +
							errSchemaUri +
							"</p>"
					})
					$('#outMsg').html(buildInner)
					console.log('Validation errors 2', values);
					return false;
				}
				return true;
			};

			// replace any form from last connection
			$('#result').html('<form id="result-form" class="form-vertical"></form>');
			// insert the new form
			$('#result-form').jsonForm(data);

		}
		catch (e) {
			$('#result').html('<pre>Entered content is not yet a valid' +
				' JSON Form object.\n\nThe JSON Form library returned:\n' +
				e.stack + '</pre>');
			console.error("error stack", e.stack)
			return;
		}
	})

	activesocket.on("saved", function (msg) {
		if (!msg) {
			msg = "I Could not save your configuration. Don't give me that look, I'm just as sad about it as you are."
		}
		if(msg.includes("successfully")){
			timer_handle=setTimeout(()=>{
						config_init()
						timerHandle=null;
					},
				10000)
		}
		$('#outmessage').html("<p><strong>" + msg + "</strong></p>")
	})

	/*

	  ______                _   _
	 |  ____|              | | (_)
	 | |__ _   _ _ __   ___| |_ _  ___  _ __  ___
	 |  __| | | | '_ \ / __| __| |/ _ \| '_ \/ __|
	 | |  | |_| | | | | (__| |_| | (_) | | | \__ \
	 |_|   \__,_|_| |_|\___|\__|_|\___/|_| |_|___/



	*/



	// global functions
	function isIosDevice() {
		var iosDeviceList = [
			"iPhone", "iPod", "iPad", "iPhone Simulator", "iPod Simulator",
			"iPad Simulator", "Pike v7.6 release 92", "Pike v7.8 release 517"
		]
		return iosDeviceList.some(function (device) {
			return device == navigator.platform
		})
	}

	function index_init() {
		if (isIosDevice()) {
			$speak.addClass('hidden')
			$nospeak.removeClass('hidden')
		}
		if (annyang) {
			activesocket.emit('getAnnyAng')
		}
	}

	function config_init() {
		activesocket.emit('getForm', true)
		$('#outmessage').html("<div></div>")
	}

	// config functions
	function hideElm(element) {
		$(element).fadeOut("fast")
	}
	function showElm(element, timeOutMins = 1) {
		var timeOutMillis = timeOutMins * 60000
		$(element).fadeIn()
		timeoutID = setTimeout(function () {
			hideElm(element);
		}, timeOutMillis)
	}




})
