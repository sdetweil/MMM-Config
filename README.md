# MMM-Config

Enable form based (in browser) configuration for MagicMirror.

## Dependencies

* An installation of [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror)

## Explanation of module

A dynamically built form, based on modules installed (git cloned at least) into the modules folder and the contents of the config.js.

## Installation

1. `cd ~/MagicMirror/modules`
2. `git clone https://github.com/sdetweil/MMM-Config`
3. `cd MMM-Config`
4. `npm install`
5. Configure your `~/MagicMirror/config/config.js`: (via editor for the last time)

    ```
		{
			module:"MMM-Config",
			position:"top_right", 
				// the QR code (if requested) will appear here
			config:{

			}
		},
    ```

## Config Options (you can set/change all of these options in the form )

### All options are case sensitive

| **Option** | **Default** | **Default** | **Info**
| --- | --- | --- | --- |
| `showQR` | OPTIONAL | `false` | Show a QR code on the MM screen to allow quick access to the configuration form |
| | | ===> | **Otherwise, use a browser to open http://MM_IP_Address:MM_Port/modules/MMM-Config/review** |
| | | | `Note:` If MagicMirror is configured for `'address:"localhost"`, you `MUST use a browser ON the same system as MM`, and the QR code will be replaced by text on the screen explaining why the QRCode is not displayed
| `force_update` | OPTIONAL | false | Each time MM is started a scan is done of changed items, config.js and the modules folder. If either changed since last startup, then a new form is generated. If no changes, then the existing form is reused. Set to true `forces` a new form to be built on every MM startup |
| `restart` | OPTIONAL | none, static,  pm2, pm2:name/number, docker | If not 'none' (default), on save of config.js, MM will be restarted to use that new config file | managed_process.pm2_env

if you have multiple instances of MagicMirror running under pm2, and you want restart on save, look at the pm2 status output and get the unique name or number of the app, 
for example

pm2:MagicMirror1, or  pm2:0
this is particularly important if you are running multiple instances from the same MagicMirror folder with differnt config files,
you may specify only pm2, and the module will autodetect what app id to use

On form submission, a new config.js is constructed and saved, `AFTER` renaming the current config.js out of the way.  

The rename adds on the date and time the existing config.js was last modified.

The saved config.js filename will look like this `config.js.2021-05-04T10.01.27`.

The ':'  in the time is changed to '.' as Windows will not allow a filename with ':'.

MMM-Config uses the [jsonform](https://github.com/jsonform/jsonform/wiki) library to construct, present and operate  the form

### The form looks like this

Main form page. The form colors can be set in webform.css
![main page](./doc_images/MMM-Config%20form.png)

The base expanded.
![base variables](./doc_images/MMM-Config%20base.png)

Modules expanded.
Module names in red are disabled or not in config.js.
Module names in blue are in config.js and enabled.

![base variables](./doc_images/MMM-Config%20modules.png)

### The Module Positions section

![base variables](./doc_images/MMM-Config%20positions.png)

**Because the order of modules is top down by position, all the positioning is moved to this section of the form.**

**If u want a specific module first, select 1, second select 2, (consider date/time(1) above calendar(2))
if u don't care, select * (the default)**

**Disabled modules are left in config.js, just disabled.  Otherwise, we would lose the configuration information , like api keys, latitude/longitude, etc.**


# correcting or improving module presentation, seek the wiki link above


