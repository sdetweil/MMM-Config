async function process_readme(readme_url, pos){

const manipulateSource = false

function detectBrowser() {
  const userAgent = navigator.userAgent;

  if (userAgent.indexOf("Chrome") > -1) {
    return "Chrome";
  } else if (userAgent.indexOf("Firefox") > -1) {
    return "Firefox";
  } else if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) {
    return "Safari";
  } else if (userAgent.indexOf("Edge") > -1) {
    return "Edge";
  } else if (userAgent.indexOf("Opera") > -1) {
    return "Opera";
  } else {
    return "Unknown";
  }
}

  const browserName = detectBrowser();

    let viewer = $('#viewer')
    let x=readme_url.split('/')
    converter = new showdown.Converter({tables: true})
    if(!readme_url.endsWith('.html') && !readme_url.includes('gitlab.com')){
      let response=await fetch(readme_url) //, { signal: AbortSignal.timeout(10000)} )// ,{ mode: 'no-cors'})
      let text = await response.text();
      //console.log("readme="+text)
      if(readme_url.includes("github")){
        user = x[3]
        repo = x[4]
        branch = x[7]
        text= text.replace(/\]\(\.\//g,"]("+`https://raw.githubusercontent.com/${user}/${repo}/${branch}/`)
      }
      html      = converter.makeHtml(text).toString();
      if(!html.startsWith("<html><head><body>")){
        html ='<html><head><link rel="stylesheet" type="text/css" href="viewer.css"/></head><body>' +html+'"</body></html>'
      }
      window.sHTML = html;
      viewer.attr('src', 'javascript:parent.sHTML')

    } else {
      if(manipulateSource){
        let response=await fetch(readme_url, { mode: 'no-cors'})
        let text = await response.text();
        html      = converter.makeHtml(text).toString()
        window.sHTML = html;
        viewer.attr('src', 'javascript:parent.sHTML')
      } else {
        //if(readme_url.includes("gitlab.com"))
        //  viewer.attr('src', readme_url)
        //else
          viewer.attr('src', "/cors?url="+readme_url)
      }
    }

    $('#viewerFrame').css("top", pos.top)
    toggle_visibility('viewerFrame')
    //$('#viewerFrame').removeClass('hidden')
    //$('#viewerFrame').toggle();
}

 function toggle_visibility(id) {
     var e = document.getElementById(id);
     if(e.style.display == 'block')
        e.style.display = 'none';
     else
        e.style.display = 'block';
 }
function closeViewer(event){
  //event.preventDefault();
  toggle_visibility('viewerFrame') //addClass('hidden')
  return false
}

$(function () {
  const event = new Event("form_loaded");
  $("#closeViewer").on("click", closeViewer)
  // global vars
  var u = window.location.href;
  // get the page name
  var pos = u.substr(u.lastIndexOf("/") + 1);

  // config vars
  var timeoutID;
  var timerHandle;
  var wasDisconnected = false;
  var usercanceled = false;

  window.onbeforeunload=()=>{
    if(activesocket && usercanceled === false)
      activesocket.emit('cancel')
  }
  // watch out in case the libraries don't load
  if (pos.endsWith("installer.html")) {
    if (typeof JSONForm !== "object") {
      $("#outMsg").html(
        "Unable to load Required Libraries <br> Please try again in a few moments"
      );
      showElm("#out", 1);
      return false;
    }
  }
  function triggerCancel(){
    usercanceled= true
    activesocket.emit("cancel");
  }
  function findGetParameter(parameterName) {
    var result = null,
      tmp = [];
    var items = location.search.substr(1).split("&");
    for (var index = 0; index < items.length; index++) {
      tmp = items[index].split("=");
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    }
    return result;
  }

  function updateInstallableList(moduleName, status){
    var listholder = $('.install-list');
    var list = listholder.find('._jsonform-array-ul');
    var li = list.find("li:contains('"+moduleName+"')")
    li.text(moduleName+"-"+status)
  }

  function parseData(data) {
    return JSON.parse(
      data,

      function (key, value) {
        if (typeof value === "string") {
          // only handle specified fields in jsonform
          switch (key) {
            case "onChange":
            case "onClick":
            case "onKeyUp":
            case "onInput":
              // get the function from the string
              // parens mean don't EXECUTE the function, just get its value
              value = eval("(" + value + ")");
              break;
            //	default:
            //		if ( (value.startsWith("(") || value.startsWith("function(")) 	&& value.endsWith("}"))
            //			value = eval("(" + value + ")");
          }
        }
        return value;
      }
    );
  }
  // socket

  const activesocket = io("/mInstaller"
    , {
    reconnectionDelayMax: 10000
  });
  // global socket events
  activesocket.on("connected", function () {

    if(pos.endsWith("installer.html"))
        config_init();
  });

  activesocket.on("close", function(){
      usercanceled= true
      window.close()
  })

  activesocket.on('processing', function(moduleName){
      updateInstallableList(moduleName, "processing")
  })

  activesocket.on('completed', function(moduleName){
      updateInstallableList(moduleName, "completed")
  })

  activesocket.on("disconnect", function () {
    // don't know what to do on disconnect
    window.close()
    $("#outmessage").html("<p><strong>MagicMirror module installer is not running</strong></p>");
    $("#result").html('<form id="result-form" class="form-vertical"></form>');
    //hideElm('#submit_button')
    wasDisconnected = true;
    if (timerHandle) clearTimeout(timerHandle);
  });

  $("#openlink").bind('click', function() {
      window.location.href = $(this).attr('href');
  });
  activesocket.on('openurl', function(url){
    $("#openlink").attr("href",url.replace("localhost",window.location.hostname))
    $("#openlink").trigger('click');
  })
  // config socket events
  activesocket.on("json", function (incoming_json) {
    usercanceled= false
    //data.configJSON =  data
    let data = parseData(incoming_json.slice(1, -1));
    // free the memory
    incoming_json = null;
    let pairs = data.pairs;
    let arrays = data.arrays;
    let objects = data.objects;
    let mangled_names = data.mangled_names;
    let convertedObjects = data.convertedObjects;
    let scriptConverted = data.scriptConvertedObjects
    let substituted_variables=null
    if(data.substituted_variables)
      substituted_variables = data.substituted_variables

    $("#outmessage").text("");
    try {
      data.onSubmitValid = function (values) {
        // restore the fixup data from the incoming
        values["pairs"] = pairs;
        values["arrays"] = arrays;
        values["objects"] = objects;
        values["mangled_names"] = mangled_names;
        values["convertedObjects"] = convertedObjects;
        values["scriptConvertedObjects"]=scriptConverted
        if(substituted_variables)
          values["substituted_variables"] = substituted_variables

        activesocket.emit("saveConfig", values);
        $("#outmessage").html(
          "<p><strong>your selected modules are being installed</strong></p>"
        );
      };
      data.onSubmit = function (errors, values) {
        if (errors) {
          console.log("Validation errors 1", errors, values);
          let buildInner = "";
          errors.forEach(function (errItem) {
            let errSchemaUri = errItem.schemaUri
              .replace(/.+\/properties\//, "")
              .replace("/", " >> ");
            buildInner +=
              `<p><strong style="font-color:red">Error: ` +
              errItem.message +
              "</strong></br>Location: " +
              errSchemaUri +
              "</p>";
          });
          $("#outMsg").html(buildInner);
          console.log("Validation errors 2", values);
          return false;
        }
        return true;
      };

      // replace any form from last connection
      $("#result").html('<form id="result-form" class="form-vertical"></form>');
      // insert the new form
      $("#result-form").jsonForm(data);
      // trigger the custom event for any extension that needs to manipulate its part of the form
      document.dispatchEvent(event)
      // delete entry
      $(
        "fieldset.module_entry > div > div > div > div > ul ~ span > ._jsonform-array-deletelast "
      ).click((event) => {
        let m = $(event.target)
          .closest(".module_entry")
          .children("legend")
          .text();
        $("[value='" + m + "']")
          .closest(".possibly-hidden-tab")
          .find("._jsonform-array-deleteitem")
          .trigger("click");
      });

      // add entry
      $(
        "fieldset.module_entry > div > div > div > div > ul ~ span > ._jsonform-array-addmore "
      ).click((event) => {
        let m = $(event.target)
          .closest(".module_entry")
          .children("legend")
          .text();
        $("[value='" + m + "']")
          .closest(".possibly-hidden-tab")
          .find("._jsonform-array-addmore")
          .trigger("click");
      });
    } catch (e) {
      $("#result").html(
        "<pre>Entered content is not yet a valid" +
          " JSON Form object.\n\nThe JSON Form library returned:\n" +
          e.stack +
          "</pre>"
      );
      console.error("error stack", e.stack);
      return;
    }
  });

  activesocket.on("saved", function (msg) {
    if (!msg) {
      msg =
        "I Could not save your configuration. Don't give me that look, I'm just as sad about it as you are.";
    }
    if (msg.includes("successfully")) {
      timer_handle = setTimeout(() => {
        config_init();
        timerHandle = null;
      }, 10000);
    }
    $("#outmessage").html("<p><strong>" + msg + "</strong></p>");
  });
   activesocket.emit("hello")

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
      "iPhone",
      "iPod",
      "iPad",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad Simulator",
      "Pike v7.6 release 92",
      "Pike v7.8 release 517"
    ];
    return iosDeviceList.some(function (device) {
      return device == navigator.platform;
    });
  }

  function index_init() {
    if (isIosDevice()) {
      $speak.addClass("hidden");
      $nospeak.removeClass("hidden");
    }
  }

  function config_init() {
    if (wasDisconnected) window.location.reload(true);
    else {
      activesocket.emit("getForm", true);
      $("#outmessage").html("<div></div>");
    }
  }

  // config functions
  function hideElm(element) {
    $(element).fadeOut("fast");
  }
  function showElm(element, timeOutMins = 1) {
    var timeOutMillis = timeOutMins * 60000;
    $(element).fadeIn();
    timeoutID = setTimeout(function () {
      hideElm(element);
    }, timeOutMillis);
  }
});
