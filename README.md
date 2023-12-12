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
			position:"top_right",  // the QR code (if requested) will appear here
			config:{

			}
		},
    ```

## Config Options (you can set/change all of these options in the form )

### All options are case sensitive

| **Option** | **Default** | **Default** | **Info**
| --- | --- | --- | --- |
| `showQR` | OPTIONAL | `false` | Show a QR code on the MM screen to allow quick access to the configuration form |
| | | | **Otherwise, use a browser to open http://MM_IP_Address:MM_Port/modules/MMM-Config/review** |
| | | | `Note:` If MagicMirror is configured for `'address:"localhost"`, you `MUST use a browser ON the same system as MM`, and the QR code will be replaced by text on the screen explaining why the QRCode is not displayed
| `force_update` | OPTIONAL | false | Each time MM is started a scan is done of changed items, config.js and the modules folder. If either changed since last startup, then a new form is generated. If no changes, then the existing form is reused. Set to true `forces` a new form to be built on every MM startup |
| `restart` | OPTIONAL | none, static,  pm2, docker | If not 'none' (default), on save of config.js, MM will be restarted to use that new config file |
| `debug` | OPTIONAL | false | Turns on debugging of the form submisson and rewrite of config.js |

On form submission, a new config.js is constructed and saved, `AFTER` renaming the current config.js out of the way.  

The rename adds on the date and time the existing config.js was last modified.

The saved config.js filename will look like this `config.js.2021-05-04T10.01.27`.

The ':'  in the time is changed to '.' as windows will not allow a filename with ':'.

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


# correcting or improving module presentation

There are no specific programmming guidelines or standards for how to write a MagicMirror module. Just Javascript and a little on module layout.

to support configuration overrides, each module needs to create a defaults:{} list of the variables to be used as overridable parameters (from config.js)

MMM-Config uses that defaults:{} object list to construct the form for editing.

### however some defintions are ambiguous

in the default calendar the 
```
		titleReplace: {
			"De verjaardag van ": "",
			"'s birthday": ""
		},
```			
titleReplace object is a list of words in the event Title to replace with a different string. (a key/value pair)

this list can be customized by the user in config.js by adding or removing specific strings
			
so its treated as an array (the form library supports adding/removing things from an array)

the MMM-NewsAPI module uses the similar query structure
```
		 query: {
					country: "us",
					category: "",
					q: "",
					qInTitle: "",
					sources: "",
					domains: "",
					excludeDomains: "",
					language: "en"
			}
```
to document chracteristics of a search process over news articles.

BUT the structure is a fixed size. the user cannot ADD a new field to this structuture


another example is in the default calendar, Using a list (array) 
```  
		customEvents: []
```
this an array of objects of a particular format.	

         {keyword: "", symbol: "", color: "", eventClass: ""}

but not listed in the defaults section (because Javascript doesn't provide a template/model type syntax)

another is 
```
		excludedEvents: [] 
```
this is also array of objects of a particular format.	 
		
	a list of words in event titles AND/OR
    a list of OBJECTS {}
      which describe a filter 
			
			from the doc 
				['Birthday', 
				 	'Hide This Event', 
				  {filterBy: 'Payment', until: '6 days', caseSensitive: true}, 
				  {filterBy: '^[0-9]{1,}.*', regex: true}
				]
				

				
in each of these cases , and more across many modules, MMM-Config cannot construct a proper form for creating the definitions for those fields.  

but.. the form library DOES provide support for those types of entries, if the definition is created correctly.  

### building the form customization 

This custom schema file process requires someone: module author, or module user, to create the proper form definition file (schema.json in the module folder), and if present MMM-Config will use that instead of creating the structure dynamically.


To minimize the customization effort, MMM-Config provides two different but complimentary approaches to custominzing the generated for content

1. a file in the module folder called MMM-Config.overrides.json, can provide the desired layout for the fields    we discussed above
	 
2. MMM-Config provides a command to generate the entire module schema that can be customized

```
  create_form_for_module.sh (or .cmd on windows)  modulename
```

   this will generate and create the file **schema.json** in the module folder, where MMM-Config would look for it. (warning it WILL overwrite the same named file without warning)
	 

if the module has not been updated in a long time (mmm-Pages, ...etc) where it is unlikely the module files will ever be updated to include this schema.json file, then the form editor/author can submit the updated form (schema.json) as a PR to MMM-Config (in the schemas folder) and it will be distibuted and used from there 
	 
	 
	 the schema.json file has 3 sections
	 1. "schema"
	     used to define the variables and data types 
		 and organziation of the defaults section
	 2. "form"
	     used to define the presentation of the form, 
		 fields, dropdown, checkboxes, etc
   	 3. "value"
	     used to define the default values to be presented 
		 in the form if no value is supplied from config.js
			 
if the overrides file is present when the create_form_for_module command is executed, then the customizations will be applied before the schema.json is generated.  this minimizes or eliminates custom editing of the
schema.json file

### a few examples for the MMM-Config.overrides.json:

in the 1st example in the calendar module, the titleReplace and locationTitleReplace we clarify these are used as lists of key/value pairs


``````
    {
		"titleReplace":"type":"pairs"},
		"locationTitleReplace":{"type":"pairs"},
		"excludedEvents":{"type":"object","object":{
			"filterBy": "", 
			"until": "nn day(s)/week(s)/month(s)", 
			"caseSensitive": false, 
			"regex":false}},
	        "customEvents":{"type":"object","object":{
			"keyword": "", 
			"symbol": "", 
			"color": "", 
			"eventClass": ""}}
	}
``````		
for the **customEvents** and **excludedEvents** we describe the structures that will appear in the array.

Now MMM-Config can generate fields for the two structures 

in the **excludedEvents** structure, one can use the filterBy field in each instance the same as the 'string' of words  

#### changing text field in defaults to operate as a dropdown selection list

another instance of customization would be a selection list instead of just string that the user would enter

for example,  in MMM-NewsAPI there are four fields that are used as selection lists

**choice, type, sortBy and country,**

and we need to clarify that query is an object
the overrides file for MMM-NewsApi would be
```
   {
        "query":{"type":"object"},
        "choice":{"type":"string","enum":["headlines","everything"]},
        "type":{"type":"string","enum":["horizontal","vertical"]},
        "sortBy":{"type":"string","enum":[" ","relevancy", "popularity", "publishedAt"]},
        "country":{"type":"string","enum":[
			" ","ae","ar","at","au","be","bg","br","ca","ch","cn","co","cu","cz","de","eg","fr","gb",
			"gr","hk","hu","id","ie","ve","za","il","in","it","jp","kr","lt","lv","ma","mx","my","ng",
			"nl","no","nz","ph","pl","pt","ro","rs","ru","sa","se","sg","si","sk","th","tr","tw","ua","us"]}
	}
```

all we had to do was copy the text from the MMM-NewsAPI README.md file for the text of the choices. and change the single backtic quote to double quotes require by JSON

these selection list fields now make the data entry easier for the user, and provide data integrity for the author as the data will be as expected (no typos etc)


so in summary

#### MMM-Config.overrides.json in the module folder
	and/or
#### schema.json in the module folder, 
    OR
####  modulename.schema.json in the schemas folder of MMM-Config	


## overrides definitions
the override file is a json file, so it starts with {}

then there is a row for each variable to be overridden.(everything in double quotes, per JSON, blank lines are acceptable, and ignored. no comments are allowed)

1. ### "variable name"  // always, from the module defaults section
   ### :                   <------- required by json
2. ### simple type definition   

   {"type":"pairs"}  // use this if the 'object' is a list of key/value pairs (like titleReplace in calendar)

   or 

   {"type":"object"}  // use this when the object is correct, not expandable 
    
3. ### type with explicit definition	

    {"type":"object", "object":{xxxxxxx}}
	where xxxxxxx is the definition of the variables in the object 

	for excludedEvents it looks like this 

	{"type":"object",
	
		"object":{
			"filterBy": "", 
			"until": "nn day(s)/week(s)/month(s)", 
			"caseSensitive": false, 
			"regex":false
		}
	},

	// use this when the module doesn't declare the contents of the object, but its described in the doc or code
	     excludedEvents:{}

4. ### string with a selection list 		 

	{"type":"string",

		"enum":[comma separated list of choices]
		       [ "a", "b", "c", "foo" ]  // for example
	},

	// use this when the module has a string variable 
	something:"" or something:null (but usage implies string and a choice)

		like removeStartTags in newsfeed 

	looking at the code, there are only three choices		

		if (this.config.removeStartTags === "title" || this.config.removeStartTags === "both") { 

			or

		if (this.config.removeStartTags === "description" || this.config.removeStartTags === "both") {

		so the list would be 
		"enum":["title","description","both"]

		final definition 
		"removeStartTags":{"type":"string","enum":["title","description","both"]}

		you can add a "default":"xxxx", where "xxxx" is one of the choices, for example

		"removeStartTags":{"type":"string","enum":["title","description","both"]}

		the first entry in the enum[] list will be the default value (selected if no value found in the current config.js) 
