
$(function () {

	// global vars
	var u = window.location.href
	var pos = u.substr(u.lastIndexOf("/") + 1)
	var server= u.slice(0,u.indexOf(":",5))
	var socket = io()
	let port=8192


	// config vars
	var timeoutID

	/*

	   _____ _ _      _         _______ _
	  / ____| (_)    | |       / / ____| |
	 | |    | |_  ___| | __   / / |    | |__   __ _ _ __   __ _  ___
	 | |    | | |/ __| |/ /  / /| |    | '_ \ / _` | '_ \ / _` |/ _ \
	 | |____| | | (__|   <  / / | |____| | | | (_| | | | | (_| |  __/
	  \_____|_|_|\___|_|\_\/_/   \_____|_| |_|\__,_|_| |_|\__, |\___|
														   __/ |
														  |___/

	*/

	// watch out in case the libraries don't load
	if(location.href.split("/").slice(-1) =='config.html'){
		if(typeof JSONForm !== 'object'){
			$('#outMsg').html("Unable to load Required Libraries <br> Please try again in a few moments")
			showElm('#out', 1)
			return false;
		}
	}

	/*

	   _____            _        _     ______               _
	  / ____|          | |      | |   |  ____|             | |
	 | (___   ___   ___| | _____| |_  | |____   _____ _ __ | |_ ___
	  \___ \ / _ \ / __| |/ / _ \ __| |  __\ \ / / _ \ '_ \| __/ __|
	  ____) | (_) | (__|   <  __/ |_  | |___\ V /  __/ | | | |_\__ \
	 |_____/ \___/ \___|_|\_\___|\__| |______\_/ \___|_| |_|\__|___/



	*/

  const activesocket = io("http://sams:8192", {
	  reconnectionDelayMax: 10000
	});
	// global socket events
	activesocket.on('connected', function () {
	/*	$connectionBar.removeClass('disconnected').addClass('connected')
		$connectionText.html('Connected!')
		$.get('nav.html', function (data) {
			$navBar.html(data)
		}) */
		switch (pos) {
		case "config.html":
			config_init()
			break;
		default:
			index_init()
		}
	})

	activesocket.on('disconnect', function () {
		//$connectionBar.removeClass('connected').addClass('disconnected')
		//$connectionText.html('Disconnected :(')
		;
	})

	// config socket events
	activesocket.on('json', function (data) {
		data.configJSON =  data
		let pairs = data.pairs
		try {
			data.configJSON.onSubmitValid = function (values) {
				let x = pairs
				if (console && console.log) {
					console.log('Values extracted from submitted form', values);
					console.log(JSON.stringify(values, null, 2))
				}
				values['pairs']=pairs

				activesocket.emit('saveConfig', values)
				$('#outMsg').html("<p><strong>Your Configuration has submitted.</strong></p>")
				showElm('#out', 1)
			};
			data.configJSON.onSubmit = function (errors,values) {
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
					showElm('#out', 1)
					console.log('Validation errors 2', values);
					return false;
				}
				return true;
			};
			/*data.configJSON.form.some(function (rootItm, rootIdx) {
				if (!rootItm.title) { return false }
			})*/

			//$('#result').html('<form id="result-form" class="form-vertical"></form>');
			$('#result-form').html("<div></div>")
			$('#result-form').jsonForm(data.configJSON);

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
		$('#outMsg').html("<p><strong>" + msg + "</strong></p>")
		showElm('#out', 1)
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
