/*

sample module structure


 */

Module.register("MMM-Config", {
  // holder for config info from module_name.js
  config: null,

  // anything here in defaults will be added to the config data
  // and replaced if the same thing is provided in config
  defaults: {
    showQR: false,
    force_update: true,
    restart: "",
    ModuleSortOrder:"date",
    debug: false,
  },

  getTranslations: function () {
    return {
      en: "translations/en.json",
      es: "translations/es.json",
      da: "translations/da.json",
      de: "translations/de.json"
    };
  },

  init: function () {
    Log.log(this.name + " is in init!");
  },

  start: function () {
    Log.log(this.name + " is starting!");
    this.config.lang = this.config.lang || config.language; //automatically overrides and sets language :)
  },

  getStyles: function () {
    return ["MMM-Config.css"];
  },

  // return list of other functional scripts to use, if any (like require in node_helper)
  /* getScripts: function () {
    return [this.file("node_modules/qrcode/build/qrcode.min.js")];
  }, */

  // messages received from other modules and the system (NOT from your node helper)
  // payload is a notification dependent data structure
  notificationReceived: function (notification, payload, sender) {
    // once everybody is loaded up
    if (notification === "ALL_MODULES_STARTED") {
      // send our config to our node_helper
      this.config.address = config.address;
      this.config.port = config.port;
      this.config.whiteList = config.ipWhitelist;
      this.config.id = this.identifier
      if (!this.config.restart)
        this.config.restart=this.defaults.restart
      this.sendSocketNotification("CONFIG", this.config);
    }
  },

  // messages received from from your node helper (NOT other modules or the system)
  // payload is a notification dependent data structure, up to you to design between module and node_helper
  socketNotificationReceived: function (notification, payload) {
    Log.log(
      this.name +
        " received a socket notification: " +
        notification +
        " - Payload: " +
        payload
    );
    if (notification === "qr_url") {
      this.config.url = payload;
      // tell mirror runtime that our data has changed,
      // we will be called back at GetDom() to provide the updated content
      this.updateDom(1000);
    }
  },

  // system notification your module is being hidden
  // typically you would stop doing UI updates (getDom/updateDom) if the module is hidden
  suspend: function () {},

  // system notification your module is being unhidden/shown
  // typically you would resume doing UI updates (getDom/updateDom) if the module is shown
  resume: function () {},

  // this is the major worker of the module, it provides the displayable content for this module
  getDom: function () {
    var wrapper = document.createElement("div");

    // if user supplied message text in its module config, use it
    if (this.config.hasOwnProperty("url")) {
      if (config.address.toLowerCase() !== "localhost") {
        let image = document.createElement("img");
        image.src = this.config.url;
        image.className = "qr";
        wrapper.appendChild(image);
      } else {
        wrapper.classList.add("text");
        wrapper.innerHTML = this.translate("QR_ERROR_MESSAGE").replace('8080',config.port);
      }
    }
    return wrapper;
  }
});
