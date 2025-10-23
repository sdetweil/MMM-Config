# MMM-Config

Enable form based (in browser) configuration for MagicMirror.

## Dependencies

* An installation of [MagicMirror<sup>2</sup>](https://github.com/MagicMirrorOrg/MagicMirror)

## Explanation of module

A dynamically built form, based on modules installed (git cloned at least) into the modules folder and the contents of the config.js.

and a module installer is provided as well , see [Module Installer](#minstaller) below

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

| **Option** | **status** | **Default** | **Info**
| --- | --- | --- | --- |
| `showQR` | OPTIONAL | `false` | Show a QR code on the MM screen to allow quick access to the configuration form |
| | | ===> | **Otherwise, use a browser to open http://MM_IP_Address:MM_Port/configure** |
| | | | `Note:` If MagicMirror is configured for `'address:"localhost"`, you `MUST use a browser ON the same system as MM`, and the QR code will be replaced by text on the screen explaining why the QRCode is not displayed
| `force_update` | OPTIONAL | false | Each time MM is started a scan is done of changed items, config.js and the modules folder. If either changed since last startup, then a new form is generated. If no changes, then the existing form is reused. Set to true `forces` a new form to be built on every MM startup |
| `ModuleSortOrder` | OPTIONAL | `date`	| this is used by the installer to organize the modules  in the installer list , either  by last update date or by `name`
| `AdditionalInstancePort` | OPTIONAL | 9000 | this is the port that will be used for the module installer config instance,<br> see the docker setup info below
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

# setup for running the installer in a docker container<br>
we need to add some properties to the container

this value matches the `AdditionalInstancePort` config variable above

a port at 9000:9000
for kHassel's docker container I added the following lines to magicmirror/run/compose.yaml

    restart: xxx  whatever its set to
	#
	# added
	# 
    ports:
      - "9000:9000"
	#
	#  end of added
	#  

the p in ports,  lines up in the same column as the restart line<br>
there cannot be any tabs in the front of the two lines added, yaml is VERY strict about indentation

after docker compose up -d<br>
you should be able to use 
```sh
docker inspect mm
```
to see that the ports were added<br> (you will have to scroll up in the terminal output to see this info)
```text
        "NetworkSettings": {
            "Bridge": "",
            "SandboxID": "65610510c6f92a73ad9921a8a45c159b88e91cbbcf64f4a049f86ea43271c59e",
            "HairpinMode": false,
            "LinkLocalIPv6Address": "",
            "LinkLocalIPv6PrefixLen": 0,
            "Ports": {
                "8080/tcp": [
                    {
                        "HostIp": "0.0.0.0",
                        "HostPort": "8080"
                    },
                    {
                        "HostIp": "::",
                        "HostPort": "8080"
                    }
                ],
                "9000/tcp": [
                    {
                        "HostIp": "0.0.0.0",
                        "HostPort": "9000"
                    },
                    {
                        "HostIp": "::",
                        "HostPort": "9000"
                    }
                ]
            },
```
# usage

### to open the <h4>configuration page form</h4> in some browser, use the url  <h4>http://MM_IP_Address:MM_Port/configure</h4>
    note the requirement for config address and ipWhitelist above on the parms section

### to open the <h4>module installer page form</h4> in some browser, use the url  <h4>http://MM_IP_Address:MM_Port/installer</h4>  
    note the requirement for config address and ipWhitelist above on the parms section

### The form looks like this

Main form page. The form colors can be set in webform.css
![main page](./doc_images/MMM-Config_example_base.png)

The base expanded
![main page](./doc_images/MMM-Config_form.png)

Modules color key.

Module names in green are in config.js and enabled.<br>
Module names in red are in config.js but disabled.<br>
Module names in blue are installed but NOT in config.js<br>

![base variables](./doc_images/MMM-Config_modules-color-key.png)

Modules expanded

![base variables](./doc_images/MMM-Config_modules.png)

![base variables](./doc_images/MMM-Config_module_expanded.png)

### The Module Positions section

![base variables](./doc_images/MMM-Config_positions.png)

**Because the order of modules is top down by position, all the positioning is moved to this section of the form.**

**If u want a specific module first, select 1, second select 2, (consider date/time(1) above calendar(2))
if u don't care, select * (the default)**

**Disabled modules are left in config.js, just disabled.  Otherwise, we would lose the configuration information , like api keys, latitude/longitude, etc.**


# correcting or improving module presentation, see the wiki link above


# Module installer<a name="minstaller"></a>


the module installer is a built in component of this module and can be opened by using the url 
```
http://mmserver_ip:mm_port/installer
```
###



#### it gets the list of modules from the 3rd party module list

* the categories are sorted alphabetically, with the Outdated category moved to the bottom

* modules in a category are sorted by `last date updated` by default
* * you can change this by changing the `ModuleSortOrder` config option

the installer page looks like this 

![base variables](./module_installer/images/installer_top.png)
you can search for a module by name, case doesn't matter
if found the page will be scrolled to that module entry, with the entry open
and the bottom looks like this
![base variables](./module_installer/images/installer_bottom.png)

when the categories are expanded 

![base variables](./module_installer/images/installer_expanded.png)

and a module expanded
![base variables](./module_installer/images/installer_module.png)

and a module with readme open
![base variables](./module_installer/images/installer_readme_open.png)

the unregistered section looks like this 

![base variables](./module_installer/images/installer_unregistered.png)

as you select modules to be installed a list is maintained at the bottom 

![base variables](./module_installer/images/installer_module_multi_selected.png)


* * if a module is already installed, its selection will be marked (and cannot be unselected)
* * this application will NOT remove modules.. you can disable them in the configurator (second step)

* * once the selection of modules is done,  press the<br> **Install selected modules** button

when the module installation(s) are completed, the configuration screen will be opened with the recently installed modules included. 

once you have completed the configuration, press the **Save, Create config** button 


MMM-Config will try to restart your MagicMirror system after configuration is complete

if the MagicMirror instance is configured to auto restart due to config.js change,  that will happen naturally

if the MagicMirror instance is **NOT** configured to auto restart due to config.js change, then the MMM-Config restart option will be used to restart 

if the MagicMirror instance is in a docker container, like khassel's
then the MagicMirror process will be killed, causing the container to restart 

if none of those options work, then you will have to restart the MagicMirror instance manually 

# customizing the styling

all css goes in the local.css of the appropriate folder <br>
MMM-Config/local.css for configuration<br>
MMM-Config/module_installer/local.css for module installation

# styling the configuration page

the css class names for the configuration page components are

* * Base
* * moduleList
* * * moduleEntry
* * * * m_moduleName
* * * * * module_enabled or module_disabled
* * * * moduleConfig 
* * * * * repo_button

# styling the installer page

the css class names for the installer page components are

* unregistered
* * unregistedUrl
* category
* * moduleList
* * * moduleEntry
* * * * moduleName
* * * * moduleDescription
* * * * moduleLastUpdated
* moduleInstallList

None of these styles are set
and any changes go in
```
MMM-Config/module_installer/local.css
```
note that these apply to ALL  modules,  and ALL unregistered URLs at the same time
so additional select clause elements would be required to target just some. 
(like modules in a particular category)


