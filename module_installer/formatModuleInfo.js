
const fs=require('fs')
//const { result } = require('lodash')
const path = require('path')
const outdated_category="Outdated Modules"
//const file = process.argv[2]
const sort_types = ['date', 'name']
let fixer = require(__dirname+"/fixupurl.js")

let sort_type="date"

module.exports= async (data,sorttype, debug)=>{

	sort_type=sorttype	
	
	let temp=__dirname.split(path.sep).slice(0,-2)
	///home/sam/MagicMirror/modules/MMM-Config/module_installer
	/// C:\Users\sdetw\MagicMirror\modules\MMM-Config\module_installer

	let MM_modules_Path=temp.join(path.sep)

	let categories = {};

	let default_hash = {
		"alert":{"readme_url":"https://docs.magicmirror.builders/modules/alert.html"},
		"calendar":{"readme_url":"https://docs.magicmirror.builders/modules/calendar.html"},
		"clock":{"readme_url":"https://docs.magicmirror.builders/modules/clock.html"},
		"compliments":{"readme_url":"https://docs.magicmirror.builders/modules/compliments.html"},
		"helloworld":{"readme_url":"https://docs.magicmirror.builders/modules/helloworld.html"},
		"newsfeed":{"readme_url":"https://docs.magicmirror.builders/modules/newsfeed.html"},
		"updatenotification":{"readme_url":"https://docs.magicmirror.builders/modules/updatenotification.html"},
		"weather":{"readme_url":"https://docs.magicmirror.builders/modules/weather.html"}
	}
	let old_hash = {}
	try {
		// try to load the old hash if any	
		old_hash = require(__dirname+"/../module_url_hash.json")
	} catch (e) { }
	
//  create the new hash, this will support deletes and adds	
	let hash = {}		
	// get the module data from 3rd party list has current module list 
	// some may have been deleted and added
	let moduleList=data // = JSON.parse(data)
	
	if(debug){
		if(Array.isArray(moduleList))
			console.log("have array of module info")
	}
		
	Object.keys(default_hash).forEach(k => {
		hash[k]=default_hash[k]	
	})	

	let promise_list = []
	
	// loop thru the module entries to make data for category ordered structure
	const max_promises = 5
	const numb_module_entries = moduleList.length-1
	const use_promise = true
	// loop thru the modules use surrounding async
	// don't do foreach
	for (let index in moduleList) {
		let module = moduleList[index]
		// assume module is installed
		// if nothing in that category yet
		if (categories[module.category] === undefined)
			// make it an empty array
			categories[module.category] = []
		// put the module in its category
		categories[module.category].push(module) 	
		if (debug)
			console.log("checking installed for module=" + module.name + " at path=" + MM_modules_Path + '/' + module.name)		
		try {
			// check
			let fn = MM_modules_Path + path.sep + module.name
			fs.statSync(fn)
			module['installed'] = true
			module['previously_installed'] = true

		} catch (error) {
			// exception if not
			// set not installed
			module['installed'] = false
			module['previously_installed'] = false
			if (debug)
				console.log("module=" + module.name + " not installed")
		}		

		if (index <= numb_module_entries) {
			// is the module is NOT in the old hash
			if (!old_hash[module.name]) {
				// put it in the new hash
				hash[module.name] = { "repo_url": module.url, "readme_url": "null" }
				// we need to figure out the  url of the readme
				if (use_promise) {
					console.log("adding to the list for module="+module.name)
					// call the url fixer.. not to many at a time
					promise_list.push(fixer( module.name, hash[module.name], module.category, debug))
				}
				//we should get the read me_url here
			} else {
				// is preset in the hash, copy entry over
				hash[module.name] = old_hash[module.name]
				// set the readme_url from the hash, if set
				// already has the report url from 3rd party data
				// if it has a readme_url add it to the installer module entry
				if (hash[module.name].readme_url)
					module['readme_url'] = hash[module.name].readme_url			
				else
					module['readme_url'] = null
			}
		}
		if (use_promise) {
			// if we called the fixer its promise as added to the list
			// if we have our batch
			// or we hit the end and there are some
			if(debug)
			  console.log("index="+index)
			if ((promise_list.length == max_promises) || (promise_list.length > 0 && index == numb_module_entries)) {
				if(debug)
					console.log("awaiting")
				let results = await Promise.allSettled(promise_list)
				promise_list = []
				if(debug)
					console.log("back from awaiting")
				results.forEach(result => {
					if (result.status === "fulfilled") {
						let info = result.value	
						if(debug)
							console.log("setting readme_url for module " + info.name + " url=" + info.moduleinfo.readme_url)
						// if there is a radme_url provided
						if (info.moduleinfo.readme_url)
							// loop thru the modules in the category for this module
							for (m of categories[info.category]) {
								// if this module foune
								if (m.name === info.name) {
									// update its readme_url
									m.readme_url = info.moduleinfo.readme_url
									break
								}
							}
						hash[info.name] = info.moduleinfo
					}
				})

			}
		}
	}

	delete old_hash
	// sorted categories by name, alphabetical
	let catlist =Object.keys(categories).sort((x,y)=>{
		return x<y?-1:1
	})

	// source the modules in each category
	catlist.forEach(c=>{
		categories[c]=categories[c].sort((x,y)=>{
			switch(sort_type){
			case 'date':
				return x.lastCommit<y.lastCommit?1:-1
				break;
			case 'name':
				return x.name<y.name?-1:1
				break
				}
			}
		)
	})

	// move outdated to the end
	let x = catlist.indexOf(outdated_category)
	catlist.splice(x,1)
	catlist.push(outdated_category)

	let outlist = []

	// create the form data structure
	catlist.forEach(c=>{
		outlist.push({category:{name:c,description:"foo", modules:categories[c]}})
		if(0){
			console.log("modules for category "+c)
			categories[c].forEach(m=>{
				console.log("\t"+m.name+"  last updated="+m.lastCommit)
				if(m.outdated != undefined)
					console.log("\t\t"+m.name+"  is outdated status="+m.outdated)
			})
		}
	})

	// generate the structure to stdout
	console.log()
	return({categories:outlist,hash:hash })
}
