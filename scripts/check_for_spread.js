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
const content=fs.readFileSync(cfg).toString()
const lastLine = content.split('\n').pop(); // Get the last line

const lineEnding = lastLine.endsWith('\r') ? '\r\n' : '\n';
const lines = content.split(lineEnding)
if(debug)
	console.log("there are "+lines.length+" lines to process")
let i=0
let r = /config\s*=\s*{/
//
// loop thru the lines of config.js

for(i in lines){
	// til we find the config = line
	if(r.test(lines[i])){
		 if(debug)
		 	console.log("l line ",i," is ", lines[i])
	   break;
	 }
}
let limit
// if debug print lines up to config =
if(debug){
	for(limit=0; limit <i; limit++){
			// print the lines at the top of config.js
		  if(debug)
				console.log(lines[limit])
	}
}
else
	// not debug. just save the number
	limit = i

// regex for spread operator, capture variable name
spread_operator_regex = /\s*\.\.\.(.*[^,])/
// where used, if found
usage_list=[]
// module name extractor regex
module_regex=/^\s*module\s*:\s*['"]([^"',]+)/
// regex for index:nn in modules with multiple instances in config.js
// used by MMM-Config
index_regex=/^\s*index\s*:\s*([\d]*)/

//
// loop thru the rest (after prefix) of config lines
// look for any sp[read operator usage]
// if found get the variable name and the nested path
// check for module name and index along the way
//
let module_name=""
let prev_module=""
let index={}
let spread_found = false, index_found= {}
//let saved_index=0

for(let cfg_line=limit; cfg_line<lines.length; cfg_line++){
	// current module name
	// if we found a module: line
	if(module_regex.test(lines[cfg_line])){
		if(debug)
			console.log("m="+lines[cfg_line]+" "+cfg_line)
		// save the previos module_name if any, so we can tell if we have switched modules while looking for other stuff
		prev_module=module_name
		// extract the module name
		module_name = lines[cfg_line].match(module_regex)[1]
		// indicate we haven't found info for this module
		spread_found = false
		index_found[module_name] = false
		// if prev and current are the same
		// this doesn't work if they are not sequential
		if(prev_module === module_name){
			if(debug)
				console.log("module name same=",module_name)
			// increment the index, in case it wasn't specified yet
			index[module_name]++
		}
		else{
			// reset the index to 0, we just switched modules
			if(index[module_name] === undefined) // havent seen this module before
				index[module_name]=0

			if(debug)
				console.log("module name change old=",prev_module, " new=", module_name)
		}
		continue
	}  // end of module found
	//
	// look for =index: nn
	//
	if(index_regex.test(lines[cfg_line])  && module_name.length){
		if(debug)
			console.log("index lines=",lines[cfg_line])
		// found index: line, extract number
		index[module_name]=parseInt(lines[cfg_line].match(index_regex)[1])
		// indicate we found it
		index_found[module_name] = true
		//saved_index=index
		if(debug)
			console.log("index: found for module ", module_name, " specified index=",index[module_name])
		// if we have found the spread operator and we saved it already
		// index: was AFTER the spread usage, which saved SOMETHING, but index it probably wrong
		if(spread_found && usage_list.length){

			if(debug)
				console.log("in prefix usage list=",usage_list)
			// get the last entry added
			let temp=usage_list.slice(-1)[0]  // slice returns array
			if(debug)
				console.log("sliced entry=",temp, " name=", temp.module)
			// if the module names match
			if(temp.module === module_name){
				// pop it off the list, as we will update it
				temp=usage_list.pop()
				if(debug){
					console.log("previous saved entry=",temp, " current index=", index[module_name])
				}
				//
				temp.index=index[module_name] // set the index for this module now
				index[module_name]= parseInt(index) // update the counter in case
				usage_list.push(temp)
				if(debug)
					console.log("updated list=",usage_list)
			} else {
				if(debug)
					console.log("module names don't match (saved)", temp.module, " current module ", module_name)
			}
		}
		continue
	}
	// if we found a spread operator line
  if(spread_operator_regex.test(lines[cfg_line])){
  	spread_found= true
  	if(debug)
  		console.log("spread_operator_regex="+lines[cfg_line])
  	// get the variable name used after the spread
  	let vname =lines[cfg_line].match(spread_operator_regex)[0]
  	// then find the variable nesting path back up to config
  	let cfg_path = findparent(parseInt(cfg_line)-1,lines, limit)
  	// save this info for this module,
  	// but could be multiples
   if(index_found[module_name]){
  		if(debug)
  			console.log("spread using saved index=", index[module_name])
  		mindex=index[module_name]
  	}
  	else
  		mindex=0
  	usage_list.push({ index: mindex, module:module_name, path:cfg_path, variable:vname.slice(vname.lastIndexOf('.')+1)})
  	if(debug)
  		console.log("path="+module_name+'.'+cfg_path+'.'+vname.slice(vname.lastIndexOf('.')+1))
  }
}

if (debug)
		console.log("list=",JSON.stringify(usage_list))

// look thru the prefix to find any referenced variable
// if none found, then don't need this prefix
let found = false
if(debug)
	console.log("usage list=",usage_list)
if(usage_list.length){
	if(debug)
		console.log("have entries to check=",usage_list)
	for(let item  of usage_list){
		for(let l=0;l<limit;l++ ){
			if(lines[l].includes(item.variable)){
				found = true;
				if(debug)
					console.log("found variable in usage list=",item.variable)
				break;
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

