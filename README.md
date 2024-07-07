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

to support configuration overrides, each module needs to create a [defaults:{}](https://docs.magicmirror.builders/development/core-module-file.html#available-module-instance-properties) list of the variables to be used as overridable parameters (from config.js)

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


To minimize the customization effort, MMM-Config provides two different but complimentary approaches to customizing the generated for content

1. a file in the module folder called MMM-Config.overrides.json, can provide the desired definition for the fields   
	 
2. MMM-Config provides a command to generate the entire module schema/form/value contents that can be customized

```
  create_form_for_module.sh (or .cmd on windows)  modulename
```

   this will generate and create the file **MMM-Config.schema.json** in the module folder, where MMM-Config would look for it. (warning it WILL NOT overwrite the same named file, so if you have one and try to genertae a new one, oops.. no change, and no warning)
	 

if the module has not been updated in a long time (mmm-Pages, ...etc) where it is unlikely the module files will ever be updated to include this MMM-Config.schema.json file (as modulename.schema,json in the MMM-Config schemas folder) , then the form editor/author can submit the updated form (modulename.schema.json) as a PR to MMM-Config (in the schemas folder) and it will be distibuted and used from there 
	 
	 
	 the schema.json file has 3 sections
	 1. "schema"
	     used to define the variables and data types 
		 and organization of the defaults section
	 2. "form"
	     used to define the presentation of the form, 
		 fields, dropdown, checkboxes, etc
   	 3. "value"
	     used to define the default values to be presented 
		 in the form if no value is supplied from config.js

if the overrides file is present when the create_form_for_module command is executed, then the customizations will be applied before the schema.json is generated.  this minimizes or eliminates custom editing of the schema.json file

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
#### MMM-Config.schema.json in the module folder, 
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

		"enum":[comma separated list of choices, in the order you want them to appear.. 
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

		otherwise the first entry in the enum[] list will be the default value (selected if no value found in the current config.js) 

5. ### sometimes none of the the choices seem to work, for  example the compliments module 

	in javascript, the list of compliments it is an object '{....}', which is fixed in size

	```js 
		compliments: {
			anytime: [..,''..],
			morning: [..,..,..],
			afternoon: [..,..,..],
			evening: [..,..,..],
			"....-01-01": [..,..,..]
		}
	```
	but in reality the structure is an extendable list, more like an array '[...]', but arrays in json have a different structure
	[ 
		fieldname: field_value,
		fieldname: field_value
	]

	the compliments object key (anytime, morning...) isn't named..

	so, how can we get from one format to the other? 
	a workable format might be an array of objects 
	```json
	{
		"when":"anytime",
		"list": [...,...,...]
	}
	```
	the schema might look like this 

	```json 
		"compliments": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"when": {
						"type": "string"
					},
					"list": {
						"type": "array",
						"items": {
							"type": "string"
						}
					}
				}
			}
		},
	```

		and the config data like this 

	```json 		
		"compliments": [
            {
              "when": "anytime",
              "list": [
                "Hey there sexy!"
              ]
            },
            {
              "when": "morning",
              "list": [
                "Good morning, handsome!",
                "Enjoy your day!",
                "How was your sleep?"
              ]
            },
            {
              "when": "afternoon",
              "list": [
                "Hello, beauty!",
                "You look sexy!",
                "Looking good today!"
              ]
            },
            {
              "when": "evening",
              "list": [
                "Wow, you look hot!",
                "You look nice!",
                "Hi, sexy!"
              ]
            },
            {
              "when": "....-01-01",
              "list": [
                "Happy new year!"
              ]
            }
		]
	```

    **we can't change the module config format in config.js as we would have to rewrite the module code**

	we **CAN** make a custom schema, and just need to convert the config/defaults values to this form format and back to config.js format

	enter the converter script in js
	a new file, named MMM-Config_converter.js , located in the module folder, same location as the schema file

```js
	  // you MUST convert all the multiple module config data items that need converting in this one function call
	  some_function_name: function(config_data, direction){
		if(direction == 'toForm'){
           // here you would do whatever conversions are required for the data 
		   // in compliments , we need to change the object to an  array 
		   let new_compliments = []
		   Object.keys(config_data.compliments).forEach(when=>{
                // we have the object key 
				// now we need to create a little 'object' for each element in the array
				// so we will add to the array for each entry in the object
                new_compliments.push(
					{
						// the schema says the element has a when value (the anytime....)
						"when":when,
						"list":config_data.compliments[when] // and a list value (the stuff to the right of the ':')
					}
				)  
		   })
		   // done processing all the entries in the config format object
		   // now update the passed in config data
		   // we want the data to survive, so cant be local, the JSON library will let us make a copy 
		   config_data.compliments = JSON.parse(JSON.stringify(new_compliments))
		}
		else if direction == 'toConfig'){
           // we need to go from form format (array), back to expected config.js format object 
		   // setup the empty object
		   let config_compliments = {}
		   // loop thru each array element
		   confg_data.compliments.forEach(element=>{
			   // create a keyed entry in the old format, by using the two parts of the array entry
               config_compliments[element.when] = element.list
		   })
		   // all done with the array 
		   // save the modified data 
		   config_data.compliments = JSON.parse(JSON.stringify(config__compliments))
		}
		return confg_data // modified
	  }	
	  // this line is critical, we need to tell MMM-Config what the function is
	  // MMM-Config EXPECTS the name to be 'converter', so the export allows you to name your function
	  // any way you like
    exports.converter=some_function_name

```

    then you can create a custom form section (in the schema.json file (section :schema, form, value ))
	note: compliments supports multiple instances in config.js so THAT is an array too.. 

	 here is the config section of the module definition, 
	 
	 **comments are not allowed in json
	 but I will put them here for some better explanation**

```json 

      "title": "config",
      "items": [
        {
          "type": "array",
          "title": "compliments",
          "deleteCurrent": false,  // if you want the user to delete ANY item in the list, not just the last  set to true (default)
          "draggable":false,       // if you want the user to be able to reorganize the list, set to true (default)
          "items": {
            "type": "fieldset",    // collection of fields with header
            "items": [             // start of list of fields to show in this collection
			                       // the field display will be taken from the schema definition , string, number, .....
              {
                "title": "when to show",  
                "key": "compliments.config.compliments[].when"  // where to get/set the data for this field
              },
              {
                "type": "array",
                "title":"list of phases to show for this time",
                "deleteCurrent": false, // same as above
                "draggable":false,      // same as above
                "htmlClass":"compliments_list",   // in this case I want a custom field class so I can address it in css
                "items": [
                  {
                    "notitle": true,         // dont display any title over this entry
                    "deleteCurrent": false,  // same as above.. altho this might be useful as true, it DOES add a new separate row with the delete button on EACH element
                    "key": "compliments.config.compliments[].list[]"
                  }
                ]
              }
            ]
          }
        },
```

	so at the end the compliments format in the form looks like this , with the add/remove buttons for the list of phrases
![main page](./doc_images/new_config_top.png)

	and at the bottom of this section is another add/remove, for the 'when' 
![main page](./doc_images/new_config2.png)

6. ### All that is really cool, but, 

the custom date format YYY-MM-DD doesn't work properly.. the schema says there is ONE format ....-01-01, but really, thats just one of many.  the form handler can't match data (....-04-03 with ....-01-01)

SO.. if we had ANOTHER field we could use for the actual data then the drop down selection for date-format could expose the other field for data entry
and our conversion script could handle the changes

so the schema and form sections get some improvements

##the schema section

```json
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "when": {
                    "type": "string",
                    "enum":[
                      "anytime",
                      "morning",
                      "afternoon",
                      "evening",
                      "date-format",
                      "date-time-format",
					  "weather-format"					  
                    ]
                  },
                  "date-format":{
                    "type":"string"
                  },
                  "date-time-format":{
                    "type":"string"
                  },
                  "weather-format":{
                    "type":"string",
                    "enum":[
                      "day_sunny",
                      "day_cloudy",
                      "cloudy",
                      "cloudy_windy",
                      "showers",
                      "rain",
                      "thunderstorm",
                      "snow",
                      "fog",
                      "night_clear",
                      "night_cloudy",
                      "night_showers",
                      "night_rain",
                      "night_thunderstorm",
                      "night_snow",
                      "night_alt_cloudy_windy"
                    ]
                  },				  
                  "list": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
```
##the form section

```json
          "type": "array",
          "title": "compliments",
          "deleteCurrent": false,
          "draggable":false,
          "items": {
            "type": "fieldset",
            "items": [
              {
                "title": "when to show",
                "key": "compliments.config.compliments[].when",
                "onChange":"(evt,node)=>{let choices=['date-format','date-time-format'];let value=evt.target.value; let i=0; let index=choices.indexOf(value); var parentElement =$(evt.target).closest('fieldset');choices.forEach(f=>{let target=parentElement.find('div[class$='+f+']');let style=(index != i?'none':'block'); target[0].style.display=style;i++})}",
				"titleMap":{
                      "anytime":"anytime",
                      "morning":"morning",
                      "afternoon":"afternoon",
                      "evening":"evening",
                      "weather-format":"weather",
                      "date-format":"date",
                      "date-time-format":"datetime"
                }
              },
              {
                "key": "compliments.config.compliments[].date-format",
                "title":"date to show",
                "placeholder":"YYYY-MM-DD",
                "fieldHtmlClass":"date-format",
                "type": "text",
                "description": "YYYY-MM-DD, use .(dot) for any value you don't care, for birthday, don't care about year so ....-MM-DD",
                "required":true,
                "onInput":"(evt,node)=>{let value=evt.target.value;if(!date_validator(value)){evt.target.parentElement.classList.add('fieldError')}else {evt.target.parentElement.classList.remove('fieldError')}}"
              },
              {
                "key": "compliments.config.compliments[].date-time-format",
                "title":"date/time to show",
                "placeholder":"min hour day_of_month month dow",
                "type": "text",
                "fieldHtmlClass":"date-time-format",
                "description": "see <a href=\"https://crontab.cronhub.io/\">cron schedule creator</a>",
                "required":true,
                "onInput":"(evt,node)=>{let value=evt.target.value;if(!cron_validator(value)){evt.target.parentElement.classList.add('fieldError')}else {evt.target.parentElement.classList.remove('fieldError')}}"
              },
			  {
                "key": "compliments.config.compliments[].weather-format",
                "title":"weather type to show",
                "fieldHtmlClass":"weather-format",
                "required":true
              },
```
now there is a some extra work to do..
we need to hide the field(s) if not used by the selection

so css helps here , we'll hide the 1st div under the fieldset for this modules form contents (the developers window can show the html layout generated)
```css
.m_compliments fieldset div[class$="format"] {
  display:none;
}
```

this is really a module specific css.. hm.. how to add to the form page?

now the custom fields are hidden..   oops..  IF the fields WERE set, then the selection list (when) should be set to 'date-format'
AND the field with the actual data should be shown WHEN the form is opened..

hmm, can't do that without code.. (css doesn't have a field contents operator yet)

this is really module specific js code.. hm.. how to add to the form page? AND how does it get invoked..


for both these problems, I have extended MMM-Config to support 2 new files in the module folder
```text
MMM-Config.extension.css
MMM-Config.extension.js
```

the form builder will locate and add these to the html file used to launch the config form.
and will do the same for any module with an extension..

ok, now have the fields hidden....

we cant use the browser document.on('ready') event , because this happens WAY before the form is built..

turns out one can make custom events..

so after the form is generated into the web page, the event 'form_loaded' is fired,

so for compliments a little event handler in MMM-Config.extension.js can process when the form is loaded..
here JQuery makes quick work
find **all** the elements in the document, wherever they are, that are the selected option of the select list
in the m_compliments document tree with a classname specfied that ends with '---when' (that json form generated, from our property name ('when') )
and then LOOP thru those
if the selected option ends with '-format', its one of the special types, and we need to surface the extra input field (change its display style setting)

so, look back UP the document tree for the first fieldset element (see the generated html) and then find (downward) the div with a class name that ends with the text of the selection entry (JSON form generated from our fieldHtmlClass value) 

and set its display attribute to not none to make it visible again (in this case display:block works)

the cool part of JQuery here is that this one 'search' will return ALL instances of this selected option across as many compliments form elements in the entire doc, across multiple instances, etc.. no special coding required.
```js
// on form_loaded event
$(document).on('form_loaded', function () {
	// find all the elements of our when selection list and get the selected option in each
	$('.m_compliments div[class$="---when"]  option:selected').each(
		// process each 
		function(){
			// get its selected option text
			var selected_option_value=$(this).val(); //.text() contains the visible value from titlemap, .val() contains the enum value
													 // if no title map .text() and .val() are the same
			// if its one of the special fields 
			if(selected_option_value.endsWith('-format')){
				// look above the select to the next element that encloses select and the custom fields (fieldset) 
				$(this).closest('fieldset')
					// find below the fieldset to find the appropriate div with the right class, 
					.find('div[class$="'+selected_option_value+'"]')
						// and set its display style property to block, previously set to display:none by MMM-Config.extension.css
						.css('display','block')
			}
		}
	)
})
```

so, we have our custom fields,
	the form loader will put the right data in the fields(schema and form),
	they all will be hidden(css, MMM-Config_extension.css).
```css
.m_compliments fieldset div[class$="-format"] {
  display:none;
}
```	
	and some will be shown when used.. (form_loaded event handler, MMM-Config_extension.js)<br>

oops.. NOW we have to fix the converter to handle putting/getting the JS object data to/from the form layout

it now looks like this
```js
function converter(config_data, direction){
	const weather_list=[
                      "day_sunny",
                      "day_cloudy",
                      "cloudy",
                      "cloudy_windy",
                      "showers",
                      "rain",
                      "thunderstorm",
                      "snow",
                      "fog",
                      "night_clear",
                      "night_cloudy",
                      "night_showers",
                      "night_rain",
                      "night_thunderstorm",
                      "night_snow",
                      "night_alt_cloudy_windy"
                    ]
	if (direction == 'toForm'){ // convert FROM native object format to form schema array format
		// create entry array
		let nc = []
		// config format is an object, need an extendable array
		Object.keys(config_data.compliments).forEach(c =>{
			// for each key (morning, afternoon, eventing, date..., weather )
			// push an object onto the 'array '
			// the object must match the custom schema definition
			let x = c

			if(c.includes("^"))
				x = c.replace(new RegExp("\\^", "g"),'.')
			let when
			let df=null
			let field=null
			let entry = { when : x,  list: config_data.compliments[c]}
			// if the key contains space a space, then its the cron date/time type format
			if(x.includes(' ')){
				field='date-time-format'
				df=x
			}// if the object key contains a . or starts with a number, THEN its a date field
 			else if(weather_list.includes(x)) {
				// weather
				field='weather-format'
				df=x
			}
			else if(x.includes('.') || !isNaN(parseInt(x[0]))){
				field='date-format'
				df=x
			}
			// if we found a custom field, then fix the entry structure
			if(df){
				entry.when=field
				entry[field]=df
			}
			// save the new field structure in the array
			nc.push( entry)
		})
		// pass back a good copy of the data
		config_data.compliments= JSON.parse(JSON.stringify(nc))
		return config_data
	}
	else if (direction == 'toConfig'){  // convert TO native object from form array
		// create empty object
		let nc = {}
		// form format is an array , need an object for config.js
		config_data.compliments.forEach(e =>{
			// for each key (morning, afternoon, eventing, date... )
			// make an object entry from the two fields in each array element
			// as defined in the custom schema
			// special handling for the two date related values
			switch(e.when){
				case 'date-format':
				case 'date-time-format':
				case 'weather-format':
					// custom field, get the data from the right place in the structure
					nc[e[e.when]]=e.list
					break
				default:
					// default location for all others
					nc[e.when]= e.list
			}
		})
		// pass back a good copy of the data
		config_data.compliments= JSON.parse(JSON.stringify(nc))
		return config_data
	}
}
exports.converter=converter
````

what is left..    we we have fields that contain custom formatted data.. we should help the user get it right while editing the form, not
later when MagicMirror is started..

lets add some field validation to this..

the form section above adds the onInput() event handler to each of the new fields..
we just need to call some function on this fields data

well, we HAVE MM-Config.extension.js that is being loaded already, so we can put the functions in there
one for each data type. and we can use the javascript regular expression function to validate the data 1 char at a time, live.
That looks like this (without the regex strings, which are long.. look at the code if u need to)
```js
// this is for the cron type field, I hope to add to compliments
function cron_validator(content){
	return (cron_regex.exec(content) !== null)
}
// this is for the date field.. make sure its this year or  later or it wont trigger
function date_validator(content){
	let result=(new RegExp(date_regex).test(content))  //  test that the field content matches the YYYY-MM-DD format
	if(result){  // if true
		if(!content.includes('.')){  // check if the content DOES SPECIFY an actual year 2021 or 2024  for example
			result = new Date(content) >=new Date()
		}
	}

	return result
}
```

and we have a css entry to turn the field red if the regex validation test fails..

```css
.m_compliments .fieldError::before {
    content: ' * incorrect format';
    color: red;
    display: block;
}
```

.. food for thought.. these fields require the user to type the text of the field format.
there ARE visual date, and date/time pickers
for the date one, we need to know if the date is specific to THIS year (2024-07-25), or the month/day in any year (birthday ....-07-25)
for the cron.. once we have the date/time range, we need to convert that to the format required by cron.

the two fields could be extended with onClick handlers to trigger the pickers..



