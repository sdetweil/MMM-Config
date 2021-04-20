use:'strict'
const debug= false
var t = true
var f = false
const sort=false

const defines = require(process.argv[2])

const merge = require('lodash.merge');

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
const module_form_template= {
							              "type": "fieldset",
							              "title": "modulename",
							              "expandable": true,
							              "items": []
}

var array_template= { "type": "array",
					"title": "variablename"
				}
var object_template= { "type":"array", "title":"foo", items: [ { "type": "fieldset","items":  [] } ]}/**/

var array_item_template ={
									"description": "Name",
									"key": "field"
								}
var data = {}
var pairVariables = {}

let value={}

schema['config']={ type:'object',title:"properties for MagicMirror base",properties:{}}
schema['config']['properties'] = {}



// copy the current non modules stuff from config.js
for(const setting of Object.keys(defines.config)){
	if(setting=='modules')
		break;
	 let dtype
	 let t = typeof defines.config[setting]
	 if(t =='object'){
		 if (Array.isArray( defines.config[setting])){
		 	  t = 'array'
		 	  dtype ='string'
		 	  if(defines.config[setting].length){
		 	    dtype = typeof defines.config[setting][0]
		 	    if( Array.isArray(defines.config[setting][0]))
		 	   	 dtype='array'
		 	  }
		 	  schema['config']['properties'][setting] = {type:t, title: setting, items: { type: dtype } }
		 } else {
		 	 dtype = typeof Object.keys(defines.config[setting])[0]
		 	 if(dtype=='string'){
		 	 	pairVariables['config'+'.'+setting]=1
		 	 	t='array'
		 	 	dtype='pair'
		 	 }
		 	 schema['config']['properties'][setting] = {type:t, title: setting, items: { type: dtype } }
		 }
	 }else {
	 	schema['config']['properties'][setting] = {type:t, title: setting  }
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

	 	  default:
	 	   form[0].items[0].items.push('config.'+setting)
	 }
}

// loop thru all the modules discovered on this system
for(const module_definition of Object.keys(defines.defined_config)){

	if(debug) console.log("key="+module_definition)
	// get the module name from the definition

	let module_name=module_definition.slice(0,module_definition.lastIndexOf('_')).replace(/_/g,'-')

  if(debug) console.log("properties="+JSON.stringify(defines.defined_config[module_definition])+"\n")
  // process for this module
	processModule(schema, form, value, defines.defined_config[module_definition], module_name)

}

if(!sort){
	let xy = []

	let temp =form[0].items[1].items

	defines.config.modules.forEach((m)=>{
			name=m.module
			for(let i in temp){
				if(temp[i].title == name){
					// watch out, splice returns an array
					// we want the element of the array
					xy.push(temp.splice(i,1)[0])
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
form.push(  {
    "type": "submit",
    "title": "OK Go - This Too Shall Pass"
  } )

// merge properties from defined and configured together
function copyprop(dest,source){
	  if(debug) console.log(" copying from "+JSON.stringify(source,' ',2)+ " to "+dest)
		for(let mp of Object.keys(source.properties)){
			if(debug) console.log("copying for "+mp)
			  if(source.properties[mp].type =='object'){
			  	if(debug)console.log(" props="+JSON.stringify(source.properties[mp],' ',2)+"  has properties="+source.properties[mp].hasOwnProperty('properties'))

			  	if(source.properties[mp].hasOwnProperty('properties')){
			  		if(debug) console.log(" handling properties for "+mp)
				  	dest[mp]={}
				  	copyprop(dest[mp],source.properties[mp])
			  	}
			  	else{
			  		 if(debug) console.log("props are "+Object.keys(source.properties[mp]))
			  			dest[mp]={}
			  			for(let cp of Object.keys(source.properties[mp])){
			  				dest[mp][cp]=source.properties[mp][cp]
			  			}
			  	}
			  }
			  else{
			  	if(debug) console.log("dest="+JSON.stringify(dest)+ " properties="+ dest['properties'] )
			  	if(dest['properties'] == undefined){
			  		//dest['properties']={}
			  		if(debug)	console.log("set properties "+JSON.stringify(dest))
			  	}
			  	if(dest[mp] == 'undefined'){
			  		dest[mp]={}
			  	}
					dest[mp]=(source.properties[mp].default != undefined)? source.properties[mp].default:source.properties[mp].value
			  }
		}
}
	function find_empty_arrays(obj, stack, hash){
		if(typeof obj == 'object'){
			if(Array.isArray(obj)){
				//console.log(" object is an array, length="+obj.length)
				for (const o of obj){
					stack.push("[]")
					hash=find_empty_arrays(o,stack, hash)
					stack.pop()
				}
				//console.log("adding "+stack.join('.'))
				let t = stack.join('.')
				if(t.endsWith(".[]"))
					t=t.replace(".[]","[]")
				hash.push(t)
			}
			else {
				if(obj){
					//console.log(" object is an object, length="+Object.keys(obj).length)
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
	// get the module properties from the config.js entry
	function getConfigModule(m, source){
		//console.log("looking for "+m.module)
		for (let x of source){
			if(x.module == m.module){
				//console.log(" getconf="+ x.module)
				return x
			}
		}
		return null
	}
	// loop thru the active config.js
	// merge with defaults
	for(let m of defines.config.modules){
		  if(value[m.module] !== undefined){
		  	let x = getConfigModule(m,defines.config.modules)
		  	// if this module is in config.js
		  	if(x){
		  		// merge the values
		 			value[m.module] = merge(value[m.module],getConfigModule(m,defines.config.modules))
		 			// if the module didn't specify disabled,
		 			if(x.disabled == undefined)
		 				// it defaults to false
		 				value[m.module]['disabled']=false
		 		}
		 	}
		 	else
		 		value[m.module]=m
	}

	let base= {}
	// get the non module parameters from active config.js
	for(let k of Object.keys(defines.config)){
		if(k !== 'modules'){
			base[k]=clone(defines.config[k])
		}
	}
	//let x = value
	value['config']=base


	let empty_arrays =find_empty_arrays(value,[],[])
	//value.empty_arrays=xyz

	//console.log(" empty arrays="+JSON.stringify(xyz,' ',2))

	// fixup the pair variables so they are proper objects for jsonform
	for(let m of Object.keys(pairVariables)){
			let mi=m.split('.')
			let varname= mi[1]
			// loop the module properties
			let t = []
			let module_properies= mi[0]=='config'?'config':value[mi[0]]
			if(debug) console.log("pairv ="+ m+" prop="+module_properies+" v="+varname + "  mi="+JSON.stringify(mi))
			for(let x of Object.keys(module_properies=='config'?defines.config[varname]:module_properies.config[varname])){
				let value
				 value=(module_properies=='config')?defines.config[varname][x]:module_properies.config[varname][x]
				x=x.replace(/\./g,"")

				let r= {}
				r[x]=value
				t.push( r )
			}
			if (module_properies=='config')
				value['config'][varname]=t
			else
				module_properies.config[varname]=t
	}



	let combined = { schema:schema, form:form, value:value, pairs:pairVariables, arrays:empty_arrays}
	//console.log( "    $('form').jsonForm({")
	let cc = JSON.stringify(combined,' ',2).slice(1,-1).replace(/"\.*/g,"\"")
	console.log('{'+cc+'}')


  function clone(obj){
  	return JSON.parse(JSON.stringify(obj))
  }

	function processModule(schema, form, value, defines, module_name){

		value[module_name]={ "disabled": true, "module": module_name,"position": "none",config:defines}

		if(debug) console.log("name="+module_name +" properties="+JSON.stringify(defines)+"\n")

		schema[module_name]= { type:'object',title:"properties for "+module_name, properties:{
			"module": {type:"string",title:"module", default:module_name, readonly:true},
			"disabled": {type:"boolean",title:"disabled", default:false},
			"position": {type:"string",title:"position",
					"enum": [ "none",
										"top_bar",
										"top_left",
										"top_center",
										"top_right",
										"upper_third",
										"middle",
										"center",
										"lower_third",
										"bottom_bar",
										"bottom_left",
										"bottom_center",
										"bottom_right",
										"fullscreen_below",
										"fullscreen_above"
									]
				},
			"classes": {type:"string",title:"classes", default:""},
			"config": {type:'object',title:"config", properties:{}}
		}}
	// make a copy of the template
	let mform= clone(module_form_template)
	mform.title= module_name
	mform.items.push(module_name+'.'+"disabled")
	mform.items.push(module_name+'.'+"position")

  processModuleProperties(schema, form, value, defines, module_name, mform)

  form[0].items[1].items.push(mform)

}
function processArrayProperty(schema, form, value, defines, module_name, mform , module_property){

					  	if(debug) console.log("\t\t"+module_property +" is an array")

				     	let type='array'

				    	schema[module_name]['properties']['config']['properties'][module_property]={'items':{type:'string'}}
				  	  // if the array is not null

				  	  let vform={
				  	  	type:"array",
				  	    title:module_property,
				  	    items:[{
				  	  	  key:module_name+".config."+module_property+"[]",
				  	  	  title:(module_property.endsWith('s')?module_property.slice(0,-1):module_property)+" {{idx}}"
				  	    }]}

				  	 	if(defines.length != 0 ){

					  		for(const o of defines){

					  			if(debug) console.log("checking array element item types")

					  			if(Array.isArray(o)){
					  				schema[module_name]['properties']['config']['properties'][module_property]={'items':{type:'array',"items":{"type":"string"}}}
					  				delete vform.key
					  				//let mkey="\""+module_name+"."+"config"+"."+module_property+"\""
					  				vform["items"]={type:"section", items:[]}
					  				if(debug) console.log("vform="+JSON.stringify(vform))
					  				vform['items']['items'].push(module_name+"."+"config"+"."+module_property)

					  				//for(let oo of o){
					  				//schema[module_name]['properties']['config']['properties'][module_property]={'items':{type:'array','items':{type:'string'}}}

					  			} else if(typeof o == 'object'){
					  				//console.log(name+"= object="+JSON.stringify(o))
					  				schema[module_name]['properties']['config']['properties'][module_property]={'items':{type: "object",properties: {}}}
					  				//schema[module_name]['properties'][x]['items']['properties']={}
					  				vform= clone(object_template)
					  	  		vform.title=module_property
					  	  		vform.items[0].items=[]
					  	  		//vform.key=name+"."+x
					  				for(let oo of Object.keys(o)){
					  					vform.items[0].items.push({ "key": module_name+'.config.'+module_property+"[]."+oo})
					  					schema[module_name]['properties']['config']['properties'][module_property]['items']['properties'][oo]={type: "string",title: oo}
											//schema[module_name]['properties'][x]['items']['properties'].push({"type": "string","title": oo, "default": defines.defined_config[module_definition][x][o][oo]})
					  					//console.log("array object element ="+oo)
					  				}
					  			}
					  			else if(typeof o == 'string')
					  				schema[module_name]['properties']['config']['properties'][module_property]={'items':{'type':'string'}}
					  			else if(Number.isInteger(o))
					  				schema[module_name]['properties']['config']['properties'][module_property]={'items':{'type':'integer'}}
					  			else
					  				schema[module_name]['properties']['config']['properties'][module_property]={'items':{'type':'number'}}
					  		}
					  	}
							mform.items.pop()
							if(debug)
								console.log('form='+JSON.stringify(vform))
							mform.items.push(vform)
							return type
}

function processObjectProperty(schema, form, value, defines, module_name, mform, module_property){
  let type= 'object'
	if(debug) console.log("\t\t"+module_property +" is an object")
	schema[module_name]['properties']['config']['properties'][module_property]={title:module_property,properties:{}}
  // if there is some value for this property
	if(defines !=null ){
		let first_done= false;
		let pair_object=false
		// loop thru them (may be only 1)
		vform = clone(object_template)
		vform['type'] ='fieldset'
		vform['items']=[]
		vform['title']=module_property
		for( const o of Object.keys(defines)){

	  	if(debug) console.log("\t\t\t object item "+o+" = "+defines[o])
	  	// get its value
	    let vv = defines[o]

	  	let value_type= (vv==null ?"string": typeof vv)
	  	// get its value
	  	if(debug) console.log("variable="+o+" type="+typeof vv+" value_type="+value_type)

	    if(typeof vv === "string" || pair_object==true){
	    	if(debug) console.log("object with string value")
	    	pair_object=true
	    	vform= clone(array_template)
	     // vform.type='object'
	  	  vform.title=module_property
	  	  vform['items']={}

	  	  vform['items']['key']=module_name+'.config.'+module_property+"[]"
	  	  vform['items']['title']="definition   and   value"

				if(debug) console.log("deleting properties tree")
			  delete schema[module_name]['properties']['config']['properties'][module_property]['properties']
			  type='array'
			  pairVariables[module_name+'.'+module_property]=1

				schema[module_name]['properties']['config']['properties'][module_property]={type:type,title:" ", 'items':{type:"pair"}}

	  	  mform.items.pop()
				mform.items.push(vform)
	    }
	    else if(value_type === 'object'){
	    	if(!Array.isArray(vv)){
	    		if(debug) console.log("object , but IS NOT array")
	    		vv = JSON.stringify(vv)
  	  	  vform= clone(object_template)
  	  	  vform['type']='array'
  	  	  vform['title']=module_property
  	  	  mform.items.pop()
  	  	  mform.items.push(vform)
	    	}
	    	else{
	    		value_type='array'
	    		if(debug) console.log("object , but IS array")
	    		schema[module_name]['properties']['config']['properties'][module_property]['properties'][o] ={type:value_type,title:o, items: {"type":"string"}}
      		if(vform != undefined){
	  	  		let xform= { title:o, type:"array", items:[]}
	  	  			xform.items.push({
	  	  						title:(module_property.endsWith('s')?module_property.slice(0,-1):module_property)+" {{idx}}",
	  	  						key: module_name+'.config.'+module_property+"."+trimit(o,'\.')+"[]"
	  	  					})
	  	  		if(debug) console.log("vform="+JSON.stringify(vform))
	  	  		vform['items'].push(xform)
	  	  		mform.items.pop()
	  	  		mform.items.push(vform)
	  	  	}
	    	}
	    } else {
	       if( value_type != "string" )
  	    	if(debug) console.log(" module="+module_name+" properties="+module_property+" name="+o+" value="+vv+ " " + JSON.stringify(schema[module_name]['properties']['config']['properties'],' ',2))
  	  		schema[module_name]['properties']['config']['properties'][module_property]['properties'][o] ={type:value_type, value: vv}
  	  	  if(vform != undefined){
	  	  		let xform= {}
	  	  		xform['title']=o
	  	  		xform['key']= module_name+'.config.'+module_property+"."+trimit(o,'\.')
	  	  		if(debug) console.log("vform="+JSON.stringify(vform))
	  	  		vform['items'].push(xform)
	  	  		mform.items.pop()
	  	  		mform.items.push(vform)
	  	  	}
  	  }
  	first_done=true;
	  }
	}
	else
		if(debug) console.log("\t\t\t object item "+"= null")
	return type
}
function processModuleProperties(schema, form, value, defines, module_name, mform){

	// loop thru all the properties for this module
	for(var module_property of Object.keys(defines)){

		if(debug) console.log("module_property="+module_property+
												" data="+JSON.stringify(defines[module_property]))

		// create the schema space for properties (object)
		schema[module_name]['properties']['config']['properties'][module_property]={}

		// git a default value
		let type='undefined'
		// check for null in the definition
		if(defines[module_property] ==null)
			// guess and make it string (will be right 99% of the time)
			type='string'
		else
			// use the actual type
		  type=typeof defines[module_property]
    // save the updated schema info
    // doing value replace
		schema[module_name]['properties']['config']['properties'][module_property]={type:type, title: module_property}
		// save the default form structure, will be replaced later if need be
		mform.items.push(module_name+'.config.'+module_property)

		switch(type){
			case 'undefined':
			case 'null':
			break
			case 'object':

					if( Array.isArray( defines[module_property] ) ){
						// use the array worker
						type=processArrayProperty(schema, form, value, defines[module_property], module_name,mform,  module_property)

					}
				  else {
				  	// use the object worker
						type=processObjectProperty(schema, form, value, defines[module_property], module_name,mform, module_property)
				  }
				  break;

				case 'number':

				  let n = defines[module_property]
				  if(n.toString().indexOf('.')<0)
				  	type='integer'
			  // fall thru here is intentional
			  case 'string':
			  case 'boolean':
					if(debug) console.log("\t\t\t"+module_property +" = "+defines[module_property])
					schema[module_name]['properties']['config']['properties'][module_property]={'default':defines[module_property],title:module_property}
				break

		}
		if(debug) console.log("\tconfig var "+module_property + "= type "+ type)
		// replace the type name. if it changed
		schema[module_name]['properties']['config']['properties'][module_property]['type']=type
	}

}
function trimit(str,c){
	while(str.charAt(0)==c)
		str=str.slice(1)
	return str
}