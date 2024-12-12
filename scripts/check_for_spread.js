const fs = require('fs')
const os = require('os')

if(process.argv.length<5){

	console.log("application requires 3 parameters, config_file config_prefix_file config_variable_file")
	process.exit(1)
}



const cfg = process.argv[2] //"/home/sam/MagicMirror.old/config/config.js"

let debug=(process.argv.length>=6 && process.argv[5]==='debug')?true:false
if(debug)
   console.log("process args=",process.argv)
const lines = fs.readFileSync(cfg).toString().split("\n")
if(debug)
	console.log("there are "+lines.length+" lines to process")
let i=0
let r = /config\s*=\s*{/
for(i in lines){
	//console.log("l line ",i," is ", lines[i])
	if(r.test(lines[i])){
	//	console.log("line ",i," not found match")
	//}
	//else
		 if(debug)
		 	console.log("l line ",i," is ", lines[i])
	   break;
	 }
}
let limit=0
for(limit=0; limit <i; limit++){
		// print the lines at the top of config.js
	  if(debug)
			console.log(lines[limit])
}

// regex for spread operator, capture variable name
spread_operator_regex = /\s*\.\.\.(.*[^,])/
// where used, if found
usage_list=[]
// module name extractor regex
module_regex=/module\s*:\s['"]([^"',]+)/

//
// loop thru the rest (after prefix) of config
// look for any sp[read operator usage]
// if found get the variable name and the nested path
//
let module_name=""
for(let cfg_line=limit; cfg_line<lines.length; cfg_line++){
	// current module name
	// if we found the module: line
	if(module_regex.test(lines[cfg_line])){
		if(debug)
			console.log("m="+lines[cfg_line]+" "+cfg_line)
		// extract the module name
		module_name = lines[cfg_line].match(module_regex)[1]
	}
	// if we found the spread operator line
  if(spread_operator_regex.test(lines[cfg_line])){
  	if(debug)
  		console.log("spread_operator_regex="+lines[cfg_line])
  	// get the variable name
  	let m =lines[cfg_line].match(spread_operator_regex)[0]
  	// then find the variable nesting path back up to config
  	let v = findparent(parseInt(cfg_line)-1,lines, limit)
  	// save this info for this module,
  	// but could be multiples
  	usage_list.push({ module:module_name, path:v, variable:m.slice(m.lastIndexOf('.')+1)})
  	if(debug)
  		console.log("path="+module_name+'.'+v+'.'+m.slice(m.lastIndexOf('.')+1))
  }
}

if (debug)
		console.log(JSON.stringify(usage_list))

// look thru the prefix to find any referenced variable
// if none found, then don't need this prefix
let found = false
if(usage_list.length){
	for(let item  of usage_list){
		for(let l=0;l<limit;l++ ){
			if(lines[l].includes(item.variable)){
				found = true;
			}
		}
	}
}
if(found){
	fs.writeFileSync(process.argv[3], lines.slice(0,limit).join("\n"))
	fs.writeFileSync(process.argv[4], JSON.stringify(usage_list))
}


function findparent(start, list, limit){
	let v = []
	if(debug)
		console.log("start="+start)
	for(; start>limit; start--){
		if(debug)
			console.log("line ="+ list[start])
		if(list[start].includes('{') || list[start].includes('[')){
			if(debug)
				console.log("found parent ="+ list[start])
			varname=list[start].trim().split(':')[0]
			if(debug)
				console.log("varname="+varname)
			v.unshift(varname)
			if(varname==='config')
				break;
		}
	}
	if(v.length){
		if(debug)
			console.log("returning ",v)
		return v// .join('.')
	}
	else
		return ''
}

