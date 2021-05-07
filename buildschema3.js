const path = require('path')
const defines = require(process.argv[2])
const merge = require('lodash').merge;
const interfaces= require('os').networkInterfaces()

const fs = require("fs")
var debug=false



const networkInterfaces=[]
const languages=[]
const sort=false
var schema = {}
var form = [
						{
						 "title": "Settings",
        		 "type": "fieldset",
        		 "expandable": false,
        		 "order":0,
        		 "items":[
		        		 {
			        		 	"type": "fieldset",
					          "title": "Base",
					          "expandable": true,
					          "items": [
					          		// per base settings
						        ]
					        },
					        {
					          "type": "fieldset",
					          "title": "Modules",
					          "expandable": true,
					          "items": [
					             							// per module
			           		]
			         		}
			         ]
			       }
	         ]

const processTable ={
	'object':processObject,
	'array': processArray,
	'number':processNumber,
	'boolean':processBoolean,
	'string':processString,
	'textarea':processTextarea,
	'integer':processInteger,
	'function':processFunction,
	'objectPair':processPairObject,
	'pair': processPair
}

const form_code_block={type: "ace",aceMode: "json",aceTheme: "twilight", width: "100%",height: "100px"}

for(let interface of Object.keys(interfaces)){
	for( let info in interfaces[interface]){
		if(interfaces[interface][info].family ==='IPv4'){
			let address = interfaces[interface][info].address
			if(address ==="127.0.0.1")
				address="localhost"
			if(debug)console.log(" interface = "+address)
			networkInterfaces.push(address)
		break;
		}
	}
}
networkInterfaces.splice(1,0,"0.0.0.0")
if( debug) console.log("networkInterfaces="+JSON.stringify(networkInterfaces))
function getColor(cssfile,name){
	for(let line=0 ; line< cssfile.length; line++){
		//console.log(name+" found on line="+line+" = "+cssfile[line])
		if(cssfile[line].includes(name)){
			//console.log(name+" found on line="+cssfile[r])
			return cssfile[line+1].split(':')[1].replace(';','').trim()
		}
	}
	return ""
}
let fp
if(!__dirname.includes("MagicMirror"))
	fp=path.join(__dirname.split(path.sep).slice(0,-1).join(path.sep),'/MagicMirror','translations',path.sep)
else
	fp=path.join(__dirname.split(path.sep).slice(0,-2).join(path.sep), 'translations')
if(debug)console.log("listing languages from "+fp)
// get the language list
fs.readdirSync(fp).forEach(file => {
        //console.log(file);
        languages.push(file.split('.')[0])
});



const module_position_schema= JSON.parse(fs.readFileSync(__dirname+"/module_positions_schema.json",'utf8'))
const module_position_form= JSON.parse(fs.readFileSync(__dirname+"/module_positions_form.json",'utf8'))
const module_positions = JSON.parse(fs.readFileSync(__dirname+"/module_positions.json",'utf8'))
const cssfile = fs.readFileSync(__dirname+"/webform.css",'utf8').split('\n')
let module_enabled_color = getColor(cssfile,'module_enabled')
let module_disabled_color = getColor(cssfile,'module_disabled')

const module_form_template= {
							              "type": "fieldset",
							              "title": "modulename",
							              //"htmlClass":"module_name_class",
							              "expandable": true,
							              "items": []
}

var array_template= { "type": "array",
					"title": "name"
				}
var object_template= { "type":"array", "title":"foo", items: [ { "type": "fieldset","items":  [] } ]}/**/

var array_item_template ={
									"description": "Name",
									"key": "field"
								}

var data = {}
var pairVariables = {}

var value={}
// items used for data restoration
var convertedObjects=[]
let empty_objects=[]
let empty_arrays = []
let mangled_names={}
let form_object_correction= []
if(process.argv.length>3 && process.argv[3] ==='debug')
	debug=true


let results=[]

copyConfig(defines,schema,form);

Object.keys(defines.defined_config).forEach((module_definition)=>{
	let r=''
	let stack=[]
	if(debug) console.log("processing for module "+module_definition)
	let module_name=module_definition.slice(0,module_definition.lastIndexOf('_')).replace(/_/g,'-')

  if(debug) console.log("properties="+JSON.stringify(defines.defined_config[module_definition],tohandler)+"\n")
  // process for this module
	processModule(schema, form, value, defines.defined_config[module_definition], module_definition)

})


if(!sort){
	let xy = []

	let temp =form[0].items[1].items

	defines.config.modules.forEach((m)=>{
			let name=m.module
			for(let i in temp){
				if(temp[i].title === name){
					// watch out, splice returns an array
					// we want the element of the array
					let t = temp.splice(i,1)[0]
					//t.inconfig=true
					xy.push(t)
					break;
				}
			}
	})
	// save the rest of the items to end of the new array
	xy.push.apply(xy, temp);
	// reset the form to the new order
	form[0].items[1].items=xy
}
else {
	// sort the form alphabetically, vs as found
	form[0].items[1].items.sort(function (a, b) {

		// compare titles, function for clarity
		function testit(x,y){
			if(a.title.toLowerCase() < b.title.toLowerCase()) { return -1; }
	    if(a.title.toLowerCase() > b.title.toLowerCase()) { return 1; }
	    return 0;
	  }
	  // get the difference
		let r = testit(a,b)
		// return results to sort
		return r
	})
}

// add a push button to submit the form
form.push(module_position_form)
form.push(  {
    "type": "submit",
    "title": "Save, Create config",
    "id":"submit_button"
  } )

//let layout_order={}
module_positions.forEach((position)=>{
	module_position_schema.items.properties.position.enum.push(position)
	//layout_order[position]=[]
})
schema['positions']=module_position_schema


let positions =[]
let position_hash = {}
// loop thru the form data
// save position info for all modules
Object.keys(value).forEach((key)=>{
	switch(key){
		case 'config':
		break;
		default:
		   position_hash[key]={name:key,position:value[key].position,order:value[key].order}
	}
})
// loop thru the active config.js
// merge with defaults
// overlay position info with other
for(let m of defines.config.modules){
	  // if we have data in the value section
	  if(value[m.module] !== undefined){
	  	if(debug) console.log(" have module info ="+m.module+"="+JSON.stringify(value[m.module],tohandler,2))
	  	value[m.module]=JSON.parse(JSON.stringify(value[m.module],tohandler).replace(/"\.*/g,"\""),fromhandler)
	  	let x = getConfigModule(m,defines.config.modules)
	  	// if this module is in config.js
	  	if(x){
	 			if(x.disabled === undefined)
	 				// it defaults to false
	 				x.disabled=false
	  		if(debug) console.log(" have module info in config.js ="+x.module+"="+JSON.stringify(x,tohandler,2))
	  		// merge the values
	 			let tt = merge(value[m.module],x)
				tt.inconfig="1"
	 			if(debug) console.log(" tt="+JSON.stringify(tt,tohandler,2))
	 			// if the module didn't specify disabled,
	 			if(tt.disabled === undefined)
	 				// it defaults to false
	 				tt.disabled=false
	 			if(tt.order === undefined ){
	 				tt.order='*'
	 			}
	 			if(tt.position === undefined ){
	 				tt.position='none'
	 			}
	 			// watch out for spaces in position names
	 			tt.position=tt.position.replace(' ','_')
	 			//layout_order[tt.position].push(tt)
	 			value[m.module]=clone(tt)
	 			/*let mp=(value[m.module].position !== undefined)?value[m.module].position:'none'
	 			let order=(value[m.module].order !== undefined)?value[m.module].order:'*') */
	 			position_hash[m.module]={name:m.module,position:tt.position,order:tt.order}
	 		} else {
	 				if(debug)  console.log("DO NOT have module info in config.js ="+m.module)
	 				position_hash[m.module]={name:m.module,position:"none".position,order:"*",inconfig:"0"}
	 		}
	 	}
	 	else{
	 		if(debug) console.log("DO NOT have module info ="+m.module)
	 		//value[m.module]=m
	 		if(m.position === undefined ){
	 			m.position='none'
	 		}
	 		m.position=m.position.replace(' ','_')
	 		if(m.order === undefined ){
	 			m.order='*'
	 		}
	 		m.inconfig="0";
	 		value[m.module]=clone(m)
	 		position_hash[m.module]={name:m.module,position:m.position,order:m.order}
	 	}
}
Object.keys(position_hash).forEach((p)=>{
	positions.push(position_hash[p])
})

positions.sort(function (a, b) {
	// compare titles, function for clarity
	function testit(x,y){
		if(a.name.toLowerCase() < b.name.toLowerCase()) { return -1; }
    if(a.name.toLowerCase() > b.name.toLowerCase()) { return 1; }
    return 0;
  }
  // get the difference
	let r = testit(a,b)
	// return results to sort
	return r
})

empty_arrays =find_empty_arrays(value,[],[])

form_object_correction.forEach((key)=>{
	let temp_key = key.replace('.config','')
	let t = temp_key.split('.')
	let module_define_name= t[0].replace(/-/g,'_')+'_defaults'
	// module info used
	t.shift()
	let variable_definition=get_define_info(defines.defined_config[module_define_name], t.join('.'))
	if(Array.isArray(variable_definition)){
		// if it has NOTHING inside
		if(!variable_definition.length){
			// then we can fixup the form to add the editor capabilities
			if(debug) console.log("found item, key="+key)
			updateFormElement(form[0].items[1].items, key, form_code_block)
			updateValueElement(value,key)
		}
	}
})

value['positions']=positions

let base= {}
// get the non module parameters from active config.js
for(let k of Object.keys(defines.config)){
	if(k !== 'modules'){
		base[k]=clone(defines.config[k])
	}
}
//let x = value
value['config']=base

// fixup the pair variables so they are proper objects for jsonform
Object.keys(pairVariables).forEach((m)=>{
  if(debug)console.log("addressing pairs ="+m)
	let mi=m.split('.')
	let varname= mi[1]
	if(debug) console.log(" varname="+varname)
	// loop the module properties
	let module_properties
	if(mi[0]==='config')
		 module_properties='config'
	else{
	   module_properties=getValueObject(m,value)
	 }
	var  t =[]
	for(let x of Object.keys(module_properties==='config'?defines.config[varname]:module_properties)){
		let existing_value
		 existing_value=(module_properties==='config')?defines.config[varname][x]:module_properties[x]
		x=x.replace(/\./g,"")

		let r= {}
		r[x]=existing_value
		t.push( r )
	}
	setValueObject(m,value,t)
})
empty_arrays.forEach((key)=>{
		if(debug) console.log("checking for empty array definitions="+key)
		let module_data=getValueObject(key,value)
	  if(module_data){
	  	if(debug) console.log("found value data for empty array definitions="+key+" value="+JSON.stringify(module_data,tohandler,2)+" type="+typeof module_data)
			if(Array.isArray(module_data)){
				if(debug) console.log("found value data for empty array definitions="+key+" item is array")
				// if there are elements
				if(module_data.length){
					if(debug) console.log("found value data for empty array definitions="+key+" item is array, and has elements")
					// get the 1st one
					let array_element = module_data[0]
					if(debug) console.log("found value data for empty array definitions="+key+" item is array, and has elements, type="+typeof array_element)
					if(typeof array_element === 'object'){
						// we need to fixup the form definition
						// find the form element
						// add the info for code block
					}
				}
			}
		}
})
empty_arrays.push('config.ipWhitelist')
empty_arrays.push('config.logLevel')

// set the enabled style for the modules
form[0].items[1].items.forEach((m)=>{
		if(debug)	console.log("module ="+m.title+ " value data ="+ value[m.title].disabled)
			m.htmlClass=((value[m.title].disabled !== undefined && value[m.title].disabled===true )?"module_disabled":"module_enabled") // +' module_name_class'
})

value = JSON.parse(JSON.stringify(value,tohandler).replace(/"\.*/g,"\""),fromhandler )

let combined = { schema:schema, form:form, validate:false, value:value, pairs:pairVariables, arrays:empty_arrays, objects:empty_objects, mangled_names:mangled_names, convertedObjects:convertedObjects}
//console.log( "    $('form').jsonForm({")
let cc = JSON.stringify(combined,tohandler,2).slice(1,-1)
console.log('{'+cc+'}')
//
// functions after here
//
	function updateValueElement(data,key){
		let t=key.split('.')
		let left = t.shift()
		if(t.length){
			updateValueElement(data[left],t.join('.'))
			return
		}
		let temparray=[]
		data[left].forEach((item)=>{
			let temp_string=JSON.stringify(item, tohandler,2)
			temp_string=temp_string.replace(/\\n/g,"\n")
			temparray.push(temp_string)
		})
		data[left] = temparray
	}
	function updateFormElement(data, key, new_attributes){
		let t = key.split('.')
		left = t.shift()
		for(let form_entry of data){
			if(form_entry.title===left){
				if(t.length){
					updateFormElement(form_entry.items, t.join('.'), new_attributes)
					return
				}
				form_entry['draggable']=false
				Object.keys(new_attributes).forEach((key)=>{
					form_entry.items[0][key]=new_attributes[key]
				})
				break
			}

		}
	}
	// get the item in an array
	function get_define_info(data, key){
		// get the key parts
		let t=key.split('.')
		let left = t.shift()
		// if there is more key
		if(t.length){
			// iterate
			return get_define_info(data[left], t.join('.'))
		}
		// last key part now
		return data[left]
	}
	// get the module properties from the config.js entry
	function getConfigModule(m, source){
		//console.log("looking for "+m.module)
		for (let x of source){
			if(x.module === m.module){
				//console.log(" getconf="+ x.module)
				return x
			}
		}
		return null
	}
	function find_empty_arrays(obj, stack, hash){
		if(typeof obj == 'object'){
			if(Array.isArray(obj)){
				if(debug) console.log(" object is an array, length="+obj.length)
				for (const o of obj){
					if(typeof o ==='object' && !Array.isArray(o)){
						let t = stack.join('.')
						if(!form_object_correction.includes(t))
							form_object_correction.push(t)
					}
					stack.push("[]")
					hash=find_empty_arrays(o,stack, hash)
					stack.pop()
				}
				//console.log("adding "+stack.join('.'))
				let last = stack.slice(-1).toString()
				if(last.startsWith('.')){
					if(debug) console.log("last="+last+" startsWith .")
					stack.pop()
					last=last.replace(/\./g,'')
					stack.push(last)
				}
				let t = stack.join('.')
				if(debug) console.log(" array name="+t)
				if(t.endsWith(".[]"))
					t=t.replace(".[]","[]")
				if(t.includes('.[]'))
					t=t.replace('.[]','')
				for(let i in hash){
					if(hash[i].startsWith(t)) {
						if(!hash.includes(t))
							hash.splice(i,0,t)
						break;
					}
				}
				//	if(hash.includes(t+'[]')){
				//		hash.splice(-1,0,t)
				//	} else {
				if(!hash.includes(t))
					hash.push(t)
				//	}
			}
			else {
				if(obj){
					if(debug) console.log(" object is an object, length="+Object.keys(obj).length)
					for(const x of Object.keys(obj)){
						//console.log("item ="+x)
						if(typeof obj[x] == 'object'){
							stack.push(x)
							hash=find_empty_arrays(obj[x],stack, hash)
							stack.pop()
						}
					}
				}
			}
		}
		return hash
	}
	function copyConfig(defines, schema, form){
		schema['config']={ type:'object',title:"properties for MagicMirror base", properties:{}}
		schema['config']['properties'] = {}
		// copy the current non modules stuff from config.js
		for(const setting of Object.keys(defines.config)){
			if(setting==='modules')
				break;
			 let dtype
			 let t = typeof defines.config[setting]
			 if(t ==='object'){
				 if (Array.isArray( defines.config[setting])){
				 	  if(setting ==='logLevel'){
				 	  	t='string'
				 	  	schema['config']['properties'][setting] = { type: "array",title: setting, "items": { type: "string",enum:["INFO","LOG","WARN","ERROR","DEBUG"]}}
				 	  } else {
					 	  t = 'array'
					 	  dtype ='string'
					 	  if(defines.config[setting].length){
					 	    dtype = typeof defines.config[setting][0]
					 	    if( Array.isArray(defines.config[setting][0]))
					 	   	 dtype='array'
					 	  }
				 	  	schema['config']['properties'][setting] = {type:t, title: setting, items: { type: dtype } }
				 	  }
				 } else {
				 	 dtype = typeof Object.keys(defines.config[setting])[0]
				 	 if(dtype==='string'){
				 	 	pairVariables['config'+'.'+setting]=1
				 	 	t='array'
				 	 	dtype='pair'
				 	 }
				 	 schema['config']['properties'][setting] = {type:t, title: setting, items: { type: dtype } }
				 }
			 }else {
			 		let as= {type:t, title: setting  }
			 		switch(setting){
				 		case 'address':
				 	   	 as={ type: "string",title: setting,enum:networkInterfaces}
				 	   	 break
				 	  case 'language':
				 	   	 as={ type: "string",title: setting,enum:languages}
							 break;
				 	  case 'timeFormat':
				 	   	 as={ type: "string",title: setting,enum:[12,24]}
				 	   	 break;
				 	  case 'units':
				 	  	 as={ type: "string",title: setting,enum:['imperial','metric']}
				 	   	 break;
				 	  case 'serverOnly':
				 	  	 as={ type: "string",title: setting,enum:['false','true','local']}
				 	  	break;
				 	  case 'logLevel':
				 	  	as={ type: "array",title: setting, "items": { type: "string",enum:["INFO","LOG","WARN","ERROR","DEBUG"]}}
				 	  	break
				 	 	default:

				 	  }
				 	schema['config']['properties'][setting]=as
			 }
			 switch(t){
			 	  case 'array':

				 	          form[0].items[0].items.push( {
			                  "type": "array",
			                  "title": setting,
			                  "items": [
			                    {
			                      "key": "config."+setting+"[]",
			                      "title": setting +" {{idx}}"
			                    }
			                  ]
			                })

			 	  break;
			 	  case 'object':
			 	  		form[0].items[0].items.push( {
						  "type": "array",
						  "title": setting,
						  "items": [
							{
							  "key": "config."+setting+"[]",
							  "title": setting +" {{idx}}"
							}
						  ]
						})
				  break;
			 	  default:
				 	  if(setting ==='address'){
				 	  	let tm = {}
				 	  	networkInterfaces.forEach((interface)=>{
				 	  		switch(interface){
				 	  			case "0.0.0.0":
				 	  				tm[interface]= interface+" - application access from any machine that can access network"
				 	  			break;
				 	  			case "localhost":
				 	  			  tm[interface]= interface+" - application access only from same machine"
				 	  			break;
				 	  			default:
				 	  			 tm[interface]= interface +" - application access only from machine on same network"
				 	  			}
				 	  	})
				 	  	form[0].items[0].items.push( {key:'config.'+setting, titleMap:tm})
				 	  }else if(setting === 'logLevel'){
				 	  	form[0].items[0].items.push( {key:'config.'+setting,type:'checkboxes'})
				 	  }else
				 	  {
				 	   form[0].items[0].items.push('config.'+setting)
				 	  }
				  }
			}
	}

function clone(obj){
 	return JSON.parse(JSON.stringify(obj,tohandler),fromhandler)
}
function getType(value, property, wasObject){
	  //console.log("processing gettype for v="+value+" and p="+property+" and wo="+wasObject)
	  let type='string'
		if(value !== undefined){
			type = typeof value
				//if(debug) console.log("type = "+type+" for property="+property)
			switch(type){
				case 'number':
					if(!value.toString().includes('.'))
					 type='integer'
				break;
				case 'object':
					if(value === null){
						type='string'
					}else if(Array.isArray(value)){
						type = 'array'
				//	} else if("{}" === JSON.stringify(value)){
				//		type ='pair'
					}
				break;

				default:
			}
		} else {
			if(typeof property === 'string' && wasObject)
				type='function'
			else
				type='string'
		}
		//console.log("processing gettype for v="+value+" and p="+property+" and wo="+wasObject+" returning="+type)
		return type
}
	function processModule(schema, form, value, defines, module_definition){
		let stack=[]
		let module_name=module_definition.slice(0,module_definition.lastIndexOf('_')).replace(/_/g,'-')
		value[module_name]={ "disabled": true, "module": module_name,"position": "none",order:"*", inconfig:"0", config:defines}

		if(debug) console.log("name="+module_name +" properties="+JSON.stringify(defines,tohandler)+"\n")

		schema[module_name]= { type:'object',title:"properties for "+module_name, properties:{
			"module": {type:"string",title:"module", default:module_name, readonly:true},
			"disabled": {type:"boolean",title:"disabled", default:false},
			"position": {type:"string",title:"module position",
					"readonly": "true"
				},
			"classes": {type:"string",title:"classes", default:""},
			"order": {type:"string",title:"order", default:"*"},
			"inconfig": {type:"string",title:"inconfig", default:"0"},
			"config": {type:'object',title:"config", properties:{}}
		}}
	// make a copy of the template
	let mform= clone(module_form_template)
	mform.title= module_name
	mform.items.push({ key:module_name+'.'+"disabled", "onChange":
		"(evt,node)=>{var selection=$(evt.target).prop('checked');var parent =$(evt.target).closest('fieldset');parent.find('legend').first().css('color',selection?'"+module_disabled_color+"':'"+module_enabled_color+"')}"})
	mform.items.push({ key:module_name+'.'+"position", description:"use Module Positions section below to set or change"})
	mform.items.push({key:module_name+'.'+"classes"})
	mform.items.push({key:module_name+'.'+"order", type:"hidden"})
	mform.items.push({key:module_name+'.'+"inconfig", type:"hidden"})
	mform.items.push({type: "section",title: "config",items:[]})
	let ptr=-1
	for(let i in mform.items){
		if(Object.keys(mform.items[i]).includes('title')) {
			if (mform.items[i]['title'] === 'config') {
				ptr = i
				break;
			}
		}
	}

	Object.keys(defines).forEach((propertyName)=>{
		if(debug) console.log("processing for each property "+ propertyName)
		let property_value = defines[propertyName]
		let type = getType(property_value, propertyName, false)
		let r=processTable[type](module_name+'.config', propertyName, property_value, [],true, false, false)
		let schema_value=r.results
		if(schema_value.startsWith('"'+propertyName+'":{')  || containsSpecialCharacters(propertyName) || isNumeric(propertyName))
			stack.push(schema_value)
		else
			stack.push('"'+propertyName+'":{'+schema_value+'}')
		if(r.mform){
			if(debug) console.log("m mform="+(typeof r.mform ==='string'?r.mform:JSON.stringify(r.mform)))
			if(Array.isArray(r.mform)){
				for(let f of r.mform)
				//  mform.items.push(f)
					mform.items[ptr]['items'].push(f)
			}
			else
				 //mform.items.push(r.mform)
				mform.items[ptr]['items'].push(r.mform)

		}
	})
	let r = '{'+stack.join(',')+'}'
	if(debug) console.log("module info ="+r+'\n\n')
	schema[module_name].properties.config.properties=JSON.parse(r, fromhandler)

  form[0].items[1].items.push(mform)

}
function containsSpecialCharacters(str){
	if(str) {
		var regex = /[ !@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?]/g;
		return regex.test(str);
	} else
		return false;
}
function isNumeric(n) {
	if(n)
		return !isNaN(parseFloat(n)) && isFinite(n);
	else
		return false
}
function processObject(m,p,v,mform, checkPair, recursive, wasObject){
	if(debug) console.log("processing object "+p +" for module "+m+" value="+JSON.stringify(v,tohandler))
	let pair_object=false;
	let results=''
	let stack=[]
	let formtitle = p.endsWith("[]")?p.slice(0,-2):p
	let vform = clone(object_template)
	vform['type'] ='fieldset'
	vform['items']=[]
	vform['title']=formtitle // (formtitle.endsWith('s')?formtitle.slice(0,-1):formtitle)+(recursive?" {{idx}}":'')
	let isPair= false
	if(checkPair)
		isPair = checkForPair(v)
	if(isPair){
		//v=v[Object.keys(v)[0]]
		type='objectPair'
		pairVariables[m+'.'+p]=1
		return processTable[type](m, p, v ,[], false, true , false)
	}
	if(Object.keys(v).length) {
		for (let p1 of Object.keys(v)) {
			if (debug) console.log("processing object item for module " + m + " for property " + p1 + " and value " + v[p1])
			let type = getType(v[p1], p, wasObject)

			if (debug) console.log("object element type=" + type + " for " + JSON.stringify(v, tohandler, 2) + ' and ' + p1)
			type = (type == null ? "textarea" : type)
			if (debug) console.log("object element type=" + type + " vv=" + type + " variable=" + m + '.' + p + '.' + p1)

			let r = processTable[type](m + '.' + p, p1, v[p1], [], isPair, true, wasObject)
			let schema_value = r.results
			let kk = '"' + p1 + '":{'
			if (schema_value.startsWith(kk) || containsSpecialCharacters(p1) || isNumeric(p1))
				stack.push(schema_value)
			else
				stack.push('"' + p1 + '":{' + schema_value + '}')
			if (r.mform) {
				if (debug) console.log("o mform=" + (typeof r.mform === 'string' ? r.mform : JSON.stringify(r.mform)))
					if(r.mform.type==='array' && r.mform.items[0].type==='ace')
						r.mform['draggable']=false
				if (Array.isArray(r.mform)) {
					for (let f of r.mform)
						vform.items.push(f)
				} else
					vform.items.push(r.mform)
			}
		}
	}
	else {
		type='array'
		if(debug) console.log("processing for variable "+ p +" empty object now array ")
		convertedObjects.push(m+'.'+p)
	// if we haven't already pushed the parent
		if(!empty_objects.includes(m))
			// do it now
			empty_objects.push(m)
		// save the child object
		//empty_objects.push(m+'.'+p)
		return processTable[type](m, p, v ,[], false, true, true )
	}
	/*else {  // JSONFORM error on anonymous properties
		type='string'  // was textarea
		let r = processTable[type](m , p, v, [], isPair, true)
		let schema_value = r.results
		//let kk = '"' + p1 + '":{'
		if (JSON.stringify(v) =='{}') //|| schema_value.startsWith(kk) || containsSpecialCharacters(v) || isNumeric(v))
			stack.push(schema_value)
		else
			stack.push('"' + Object.keys(v)[0] + '":{' + schema_value + '}')
		if (r.mform) {
			if (debug) console.log("o mform=" + (typeof r.mform === 'string' ? r.mform : JSON.stringify(r.mform)))
			if (Array.isArray(r.mform)) {
				for (let f of r.mform)
					vform.items.push(f)
			} else
				vform.items.push(r.mform)
		}
	}*/
	results=stack.join(',')
	if(debug) console.log('object results='+results)
	if(recursive)
		return {mform:vform,results:'"type": "object","properties": {'+results+'}'}
	else
		return {mform:vform,results:'"'+p+'":{"type": "object","title": "'+p+'","properties": {'+results+'}}'}
}


function processArray(m,p,v,mform, checkPair, recursive, wasObject){
	let results=''
	 if(debug) console.log("processing array "+p +" for module "+m+" value="+JSON.stringify(v,tohandler))
	let type
	let p1=''
	let t = trimit(p)
	let addedTitle=''
	let formtitle = p // p.endsWith("[]")?p.slice(0,-2):p
	let vform={
		type:"array",
	  title:formtitle,
		 items:[{
			 key:m+'.'+trimit(formtitle),
			 title:(formtitle.endsWith('s')?formtitle.slice(0,-1):formtitle)+(isNumeric(formtitle.slice(-1))?" - ":"")+" {{idx}}"
		 }
	]}
	p1=v[0]
	if(debug) console.log("processing array item for module "+m+" for property "+JSON.stringify(p1,tohandler,2))
	let isPair = checkPair?checkForPair(v):checkPair
	if(isPair){
		// drop the other array objects, we only need 1
		//v=v.slice(0,1)
		type='pair'
		let r =processTable[type](m, trimit(p), p1, [], false, true, wasObject)
		results=r.results
		pairVariables[m+'.'+p]=2
		return {mform:vform,results:'"'+trimit(p)+'":{"type": "array","items": {'+results+'}}'}
	}

	// get the first item in array
	let temp =JSON.stringify(v)
	if(debug) console.log("checking array item contents="+v)
	// also used below on 'else'
	if(v!=='[[]]' && v !== '[]'){

		// get its type
		type = getType(p1, p, wasObject)

		let r =processTable[type](m, trimit(p)+'[]', p1, [], isPair, true, wasObject)
		let schema_value=r.results
		if(t!==p){
			// need to adda title tring if not present
			addedTitle='"title":"'+p+'",'
			mangled_names[m+'.'+t]=p
		}
		let variable = p1
		if( p1=== undefined)
			variable = p
		if(debug) console.log("immediate array results="+schema_value+" property name="+p)
		if(schema_value.startsWith('"'+p+'[]":{')){
			if(debug) console.log("fixing array info ="+schema_value)
			schema_value=schema_value.slice(schema_value.indexOf('{')+1,-1)
			if(debug) console.log("post fixing array info ="+schema_value)
			addedTitle=''
		}
		results+=schema_value
		if(r.mform) {
			if (debug) console.log("a mform=" + (typeof r.mform === 'string' ? r.mform : JSON.stringify(r.mform)))
			if (Array.isArray(r.mform)) {
				vform.items=[]
				for(let n of r.mform){
					if(n.title.endsWith("[]")){
						//empty_arrays.push(m+'.'+p[])
						addedTitle=''
						/*if(m.key.endsWith("[][]")){
							if(recursive){
								addedTitle=''
								let t=m.key.replace("[][]","[]")
								empty_arrays.push(t)
					     	m.key=t+"."+p
							}
					  } */
						n.title=n.title.slice(0,-2)+ " {{idx}}"
						if(t !== p){
							if(n.title.startsWith(t))
								n.title=n.title.replace(t,p)
						}
					}
					vform.items.push(n)
				}
			} else {
				/*for (let item of r.mform.items) {
					for (let k of Object.keys(item)) {
						switch (k) {
							case 'key':
								let values = item[k].split('.')
								let i = values.indexOf(p)
								let option = values[i] + '[]'
								values[i]=option
								item[k] = values.join('.')
								break
							default:
						}
					}
				}*/
				if(JSON.stringify(variable) ==='[]' && r.mform.title.endsWith('[]'))
					delete r.mform.title
			    vform.items=JSON.parse(JSON.stringify(r.mform,tohandler))
			}
		}
	}
	else {
		if(debug) console.log("processing for empty array at "+m+'.'+p+" value="+temp)
		  empty_objects.push(m+'.'+p)

		  if('[[]]'=== JSON.stringify(v))
		  	vform= { title:p, type: "section",items: [m+'.'+p] }
		  else
		  	vform= { type: "section",items: [m+'.'+p] }
		  results='"type":"array","items":{"type":"string"}'
	}
	if(debug) console.log('array results='+results+" = "+JSON.stringify(results))

  if(recursive && (type === 'object' || type ==='array'))
		return {mform:vform,results:'"type": "array","items": {'+results+'}'}
	else
		return {mform:vform,results:'"'+trimit(p)+'":{"type": "array",'+addedTitle+'"items": {'+results+'}}'}

}
function processNumber(m,p,v,mform, checkPair, recursive,wasObject){
	if(debug) console.log("processing number "+p +" for module "+m+" value="+v)
  mform.push({title:p, key:m+'.'+trimit(p)})
	return {mform:mform,results:'"type": "integer"'}
}
function processBoolean(m,p,v,mform, checkPair, recursive,wasObject){
	if(debug) console.log("processing boolean "+p +" for module "+m+" value="+v)
  mform.push({title:p, key:m+'.'+trimit(p)})
	return {mform:mform,results:'"type": "boolean"'}
}
function processString(m,p,v,mform, checkPair, recursive,wasObject){
	if(debug) console.log("processing string "+p +" for module "+m)
  mform.push({title:p, key:m+'.'+trimit(p)})
	return  {mform:mform,results:'"type": "string"'}
}
function processTextarea(m,p,v,mform, checkPair, recursive,wasObject){
	if(debug) console.log("processing string "+p +" for module "+m)
  mform.push({title:p, key:m+'.'+trimit(p),type:'textarea'})
	return  {mform:mform,results:'"type": "string"'}
}
function processPair(m,p,v,mform, checkPair, recursive,wasObject){
	if(debug) console.log("processing string "+p +" for module "+m)
	mform.push({title:p, key:m+'.'+trimit(p)})
	return  {mform:mform,results:'"type": "pair"'}
}
function processInteger(m,p,v,mform, checkPair, recursive,wasObject){
	if(debug) console.log("processing integer "+p +" for module "+m+" value="+v)
  mform.push({title:p, key:m+'.'+trimit(p)})
	return {mform:mform,results:'"type": "integer"'}
}
function processPairObject(m,p,v,mform, checkPair, recursive, wasObject){
	let results=''
	if(debug) console.log("processing pair "+p +" for module "+m+" value="+JSON.stringify(v,tohandler))
	let type
	let p1=''
	let t = trimit(p)
  let vform={
	type:"array",
  title:p,
  items:[{
	  key:m+'.'+trimit(p)+"[]",
	  title:(p.endsWith('s')?p.slice(0,-1):p)+" {{idx}}"
  }]}
  type= 'pair'
	let r =processTable[type](m, trimit(p), p1, [], checkPair, true, wasObject)
	results+=r.results
	if(r.mform){
		if(debug)console.log("p mform="+(typeof r.mform ==='string'?r.mform:JSON.stringify(r.mform)))
		if(Array.isArray(r.mform)){
			;
		}
		else
			 vform.items.push(r.mform)
	}
	if(debug) console.log('pair results='+results+" = "+JSON.stringify(results))

	if(t!==p)
		mangled_names[m+'.'+t]=p
	return {mform:vform,results:'"'+trimit(p)+'":{"type": "array","items": {"type":"pair"}}'}

}
function processFunction(m,p,v,mform, checkPair, recursive,wasObject){
	if(debug) console.log("processing function "+p +" for module "+m+" value="+v)
	let t = '{"title":"'+p+'","key":"'+m+'.'+trimit(p)+'",'+JSON.stringify(form_code_block).slice(1,-1)+'}'
	if(debug) console.log("adding code block definition="+t)
  mform.push(JSON.parse(t))
	return  {mform:mform,results:'"type": "string"'}

}
function tohandler(key, value){
	if (typeof value === 'function') {
  	return value + ''; // implicitly `toString` it
		}
	return value;
}

function fromhandler(key,value){
	if(value
		&& (typeof value =='string')
		&& (value.startsWith("(") || value.startsWith("function("))
		&& value.endsWith("}")
		){
		return eval('('+value+')')
	}
	return value
}
function trimit(str,c){
	if(c=== undefined)
		c='.'
	while(str.charAt(0)===c)
		str=str.slice(1)
	return str
}
function getValueObject(key, data){
	if(key.includes('.')){
		let keys=key.split('.')
		key = keys.shift()
		return getValueObject(keys.join('.'), data[key])
	}

	return data[key]
}
function setValueObject(key, data, v){
	if(key.includes('.')){
		let keys=key.split('.')
		key = keys.shift()
		setValueObject(keys.join('.'), data[key], v)
		return
	}
	data[key]=clone(v)
}
function checkForPair(data){
	result = false;
	let keys={}
	// if this is an array
	if(Array.isArray(data)){
		// loop thru the elements
		if(data.length){
			for(let i in data){
				// if the item is an object
				if(typeof data[i] === 'object'){
						keys[i] = Object.keys(data[i])
				}
				else // can't be a pair
					return false
			}
			let first_element=keys[0]
			if(Object.keys(keys).length===1  && first_element.length===1)
				return true
			if(Object.keys(keys).length>1){
				for(let i=1 ; i<Object.keys(keys).length; i++){
					// if same number of keys in each array element
					if(keys[i].length === keys[i-1].length){
						if(keys[i].join('|') !== keys[i-1].join('|'))
							return true
					}
					else
						return false;
				}
			}
			// empty array, guess...
		} else
			result = false;
	} else if(typeof data === 'object'){
		let c = Object.keys(data)
		// if more keys than 1
		result = true
		if(c.length !== 1){
			for(let k of Object.keys(data)){
				if(typeof data[k] !== 'string'){
					result = false;
					break;
				}
			}
		}
	}
	return result;
}
