use:'strict'
const debug= false
var t = true
var f = false

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
							              "items": [
							                    /* "modulename.property",   // not array
																		//.
																		//.
																		//.
							                    "modulname.propertyn",   // array
							                    {
								                    "type": "array",
								                    "items": [
								                      "modulename.property2"
								                    ]
							                    },
							                    "modulname.propertyn1",   // object
							                    {
								                    "type": "array",
								                    "items": [
								                      "modulename.property2.element_name"
								                    ]
							                    } */
							              ]
							            }
/*
 "form":[
      {
        "title": "Settings",
        "type": "fieldset",
        "expandable": true,
        "order":0,
        "items":[
            {
              "type": "fieldset",
              "title": "MMM-GooglePhotos",
              "expandable": true,
              "items": [
                    "MMM-GooglePhotos.albums",
                    "MMM-GooglePhotos.updateInterval",
                    "MMM-GooglePhotos.sort",
                    "MMM-GooglePhotos.uploadAlbum",
                    "MMM-GooglePhotos.condition",
*/
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
//if(debug) console.log(JSON.stringify(defines.config,2,' '))
schema['base']={ type:'object',title:"properties for MagicMirror base",properties:{}}
schema['base']['properties'] = {}
function trimit(str,c){
	while(str.charAt(0)==c)
		str=str.slice(1)
	return str
}

for(const setting of Object.keys(defines.config)){
	if(setting=='modules')
		break;
	 schema['base']['properties'][setting] = {type:typeof setting, title: setting, default: defines.config[setting]  }
	 form[0].items[0].items.push('base.'+setting)
}
let value = {}
for(const module_definition of Object.keys(defines.defined_config)){

	if(debug) console.log("key="+module_definition)

	let module_name=module_definition.slice(0,module_definition.lastIndexOf('_')).replace(/_/g,'-')

	value[module_name]={ "disabled": true, "module": module_name,"position": "top",config:defines.defined_config[module_definition]}

	if(debug) console.log("name="+module_name)

	schema[module_name]= { type:'object',title:"properties for "+module_name, properties:{
						"module": {type:"string",title:"module", default:module_name, readonly:true},
						"disabled": {type:"boolean",title:"disabled", default:false},
						"position": {type:"string",title:"position",
								"enum": [ "top",
													"top_bar",
													"top_left",
													"top_center",
													"top_right",
													"lower_third",
													"bottom",
													"bottom_left",
													"bottom_center",
													"bottom_right",
													"left",
													"right",
													"middle",
													"center",
													"fullscreen_below",
													"fullscreen_above"
												]
							},
						"classes": {type:"string",title:"classes", default:""},
						"config": {type:'object',title:"config", properties:{}}
					}}
	// make a copy of the template
	let mform= JSON.parse(JSON.stringify(module_form_template))
	mform.title= module_name
	mform.items.push(module_name+'.'+"disabled")
	mform.items.push(module_name+'.'+"position")

	for(var module_property of Object.keys(defines.defined_config[module_definition])){

		if(debug) console.log("module_property="+module_property+" module_definition="+module_definition+
												" data="+JSON.stringify(defines.defined_config[module_definition][module_property]))

		schema[module_name]['properties']['config']['properties'][module_property]={}


		let type='undefined'

		if(defines.defined_config[module_definition][module_property] ==null)
			type='string'
		else
		  type=typeof defines.defined_config[module_definition][module_property]

		schema[module_name]['properties']['config']['properties'][module_property]={type:type, title: module_property}
		//let x = module_property

		mform.items.push(module_name+'.config.'+module_property)

		switch(type){
			case 'undefined':
			case 'null':
			break
			case 'object':


					if( Array.isArray( defines.defined_config[module_definition][module_property] ) ){

				  	if(debug) console.log("\t\t"+module_property +" is an array")

				  	type='array'

				  	schema[module_name]['properties']['config']['properties'][module_property]={'items':{type:'string'}}
				  	  // if the array is not null

				  	  /*
				  	  let vform= JSON.parse(JSON.stringify(array_template))
				  	  vform.title=module_property
				  	  vform.key=module_name+".config."+module_property
				  	  */
				  	  let vform={
				  	  	type:"array",
				  	    title:"module_property",
				  	    items:[{
				  	  	  key:module_name+".config."+module_property+"[]",
				  	  	  title:(module_property.endsWith('s')?module_property.slice(0,-1):module_property)+" {{idx}}"
				  	    }]}

/*
                    {
                      "title": "morning",
                      "type":"array",
                      "items":{
                     		"key": "compliments.config.compliments.morning[]",
                     		"title":"compliment {{idx}}"
                      }
                    },				  	   */

				  	 	if(defines.defined_config[module_definition][module_property].length != 0 ){

					  		for(const o of defines.defined_config[module_definition][module_property]){

					  			if(debug) console.log("checking array element item types")

					  			if(Array.isArray(o)){
					  				schema[module_name]['properties']['config']['properties'][module_property]={'items':{type:'array',"items":{"type":"string"}}}
					  				delete vform.key
					  				let mkey="\""+module_name+"."+"config"+"."+module_property+"\""
					  				vform["items"]={type:"section", items:[]}
					  				if(debug) console.log("vform="+JSON.stringify(vform))
					  				vform['items']['items'].push(module_name+"."+"config"+"."+module_property)

					  				//for(let oo of o){
					  				//schema[module_name]['properties']['config']['properties'][module_property]={'items':{type:'array','items':{type:'string'}}}

					  			} else if(typeof o == 'object'){
					  				//console.log(name+"= object="+JSON.stringify(o))
					  				schema[module_name]['properties']['config']['properties'][module_property]={'items':{type: "object",properties: {}}}
					  				//schema[module_name]['properties'][x]['items']['properties']={}
					  				vform= JSON.parse(JSON.stringify(object_template))
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
					}
				  else {
				  	if(debug) console.log("\t\t"+module_property +" is an object")
				  	schema[module_name]['properties']['config']['properties'][module_property]={title:module_property,properties:{}}
				    // if there is some value for this property
				  	if(defines.defined_config[module_definition][module_property] !=null ){
				  		let first_done= false;
				  		let pair_object=false
				  		// loop thru them (may be only 1)
				  		vform = JSON.parse(JSON.stringify(object_template))
				  		vform['type'] ='fieldset'
				  		vform['items']=[]
				  		vform['title']=module_property
				  		for( const o of Object.keys(defines.defined_config[module_definition][module_property])){

				  	  	if(debug) console.log("\t\t\t object item "+o+" = "+defines.defined_config[module_definition][module_property][o])
				  	  	// get its value
				  	    let vv = defines.defined_config[module_definition][module_property][o]
				  	  	// try to determine what kind of value this is
				  	    // we may have to guess
				  	  	//  'null' == lets default to string
				  	  	//  object, could be array

				  	  	//if(debug) console.log("variable="+o+" type="+typeof vv)

				  	  	let value_type= (vv==null ?"string": typeof vv)
				  	  	// get its value
				  	  	if(debug) console.log("variable="+o+" type="+typeof vv+" value_type="+value_type)

				  	    if(typeof vv === "string" || pair_object==true){
				  	    	if(debug) console.log("object with string value")
				  	    	pair_object=true
				  	    	vform= JSON.parse(JSON.stringify(array_template))
				  	     // vform.type='object'
						  	  vform.title=module_property
						  	  vform['items']={}
						  	  //vform.type='fieldset'
						  	  //vform.key=module_name+'.config.'+module_property

						  	  vform['items']['key']=module_name+'.config.'+module_property+"[]"
						  	  vform['items']['title']="definition   and   value"
						  	  //vform.key=module_name+".config."+module_property
									//vform.items.push({ "key": module_name+'.config.'+module_property+"[]"})

								  //  "items":{
								  //    "type": "object",
								  //    "properties": {
								  //      "field":{
									if(debug) console.log("deleting properties tree")
								  delete schema[module_name]['properties']['config']['properties'][module_property]['properties']
								  type='array'
								  pairVariables[module_name+'.'+module_property]=1
								  //console.log("pairvariables saving entry m="+module_name+":"+module_property)
									schema[module_name]['properties']['config']['properties'][module_property]={type:type,title:" ", 'items':{type:"pair"}}
									// schema[module_name]['properties']['config']['properties'][module_property]={'items':{'type':'string'}}[o] ={type:"pair",from:o,  to: vv}
						  	  mform.items.pop()
									mform.items.push(vform)
				  	    }
				  	    else if(value_type === 'object'){
				  	    	if(!Array.isArray(vv)){
				  	    		if(debug) console.log("object , but IS NOT array")
				  	    		vv = JSON.stringify(vv)
					  	  	  vform= JSON.parse(JSON.stringify(object_template))
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
				  }
				  break;
			case 'string':
				if(debug) console.log("\t\t\t"+module_property +" = "+defines.defined_config[module_definition][module_property])
				schema[module_name]['properties']['config']['properties'][module_property]={'default':defines.defined_config[module_definition][module_property],title:module_property}
			break;
			case 'number':
			  let n = defines.defined_config[module_definition][module_property]
			  if(n.toString().indexOf('.')<0)
			  	type='integer'
				if(debug) console.log("\t\t\t"+module_property +" = "+defines.defined_config[module_definition][module_property])
				schema[module_name]['properties']['config']['properties'][module_property]={'default':defines.defined_config[module_definition][module_property],title:module_property}
			break
			case 'boolean':
				if(debug) console.log("\t\t\t"+module_property +" = "+defines.defined_config[module_definition][module_property])
				schema[module_name]['properties']['config']['properties'][module_property]={'default':defines.defined_config[module_definition][module_property],title:module_property}
			break;
		}
		if(debug) console.log("\tconfig var "+module_property + "= type "+ type)
		// replace the type name
		schema[module_name]['properties']['config']['properties'][module_property]['type']=type
	}
	form[0].items[1].items.push(mform)
}

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
	form.push(  {
      "type": "submit",
      "title": "OK Go - This Too Shall Pass"
    } )

	//let value = {}
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
/*	for(let m of Object.keys(schema)){
		if(m !== 'base'){
				//console.log(" key="+m)
				value[m]={}
				copyprop(value[m],schema[m])
		}
	} */
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
		 		value[m.module] = merge(value[m.module],getConfigModule(m,defines.config.modules))
		 	}
		 	else
		 		value[m.module]=m
	}

	for(let m of Object.keys(pairVariables)){
			let mi=m.split('.')
			let varname= mi[1]
			// loop the module properties
			let t = []
			let module_properies= value[mi[0]]
			//console.log("values="+JSON.stringify(module_properies.config[varname],' ',2))
			for(let x of Object.keys(module_properies.config[varname])){
				let value=module_properies.config[varname][x]
				x=x.replace(/\./g,"")
				//console.log("x="+x)
				let r= {}
				r[x]=value
				t.push( r )
			}
			module_properies.config[varname]=t
	}

	let base= {}
	// get the non module parameters from active config.js
	for(let k of Object.keys(defines.config)){
		if(k !== 'modules'){
			base[k]=JSON.parse(JSON.stringify(defines.config[k]))
		}
	}
	let x = value
	x['base']=base
	let combined = { schema:schema, form:form, value:x}
	console.log( "    $('form').jsonForm({")
	let cc = JSON.stringify(combined,' ',2).slice(1,-1).replace(/"\.*/g,"\"")
	console.log(cc)
	console.log("      ,onSubmit: function (errors, values) {\
        if (errors) {\
          $('#res').html('<p>I beg your pardon?</p>');\
        } else {\
          $('#res').html('<p>Hello ' + values.name + '.' +\
            (values.age ? '<br/>You are ' + values.age + '.' : '') +\
            '</p>');\
        }\
      }\
    });")