
let debug=false
const fs=require('fs')
const outdated_category="Outdated Modules"
//const file = process.argv[2]
const sort_types= ['date','name']

let sort_type="date"

module.exports= (data,sorttype)=>{

sort_type=sorttype

let temp=__dirname.split('/').slice(0,-2)
///home/sam/MagicMirror/modules/MMM-Config/module_installer
//temp.push('modules')
let MM_modules_Path=temp.join('/')
if(debug)
	 console.info("MM folder="+MM_modules_Path)
let categories = {};

let hash = {
	"alert":{"readme_url":"https://docs.magicmirror.builders/modules/alert.html"},
	"calendar":{"readme_url":"https://docs.magicmirror.builders/modules/calendar.html"},
	"clock":{"readme_url":"https://docs.magicmirror.builders/modules/clock.html"},
	"compliments":{"readme_url":"https://docs.magicmirror.builders/modules/compliments.html"},
	"helloworld":{"readme_url":"https://docs.magicmirror.builders/modules/helloworld.html"},
	"newsfeed":{"readme_url":"https://docs.magicmirror.builders/modules/newsfeed.html"},
	"updatenotification":{"readme_url":"https://docs.magicmirror.builders/modules/updatenotification.html"},
	"weather":{"readme_url":"https://docs.magicmirror.builders/modules/weather.html"}
}

try {
	hash = require(__dirname+"/../module_url_hash.json")
} catch(e){}
// get the file data
let moduleList = JSON.parse(data)
if(debug){
	if(Array.isArray(moduleList))
		console.log("have array of module info")
}

// loop thru the module entries to make data for category ordered structure
moduleList.forEach(module=>{
	// assume module is installed

	if(debug)
		console.log("checking installed for module="+module.name+" at path="+ MM_modules_Path+'/'+module.name)
	if(!hash[module.name]){
	  hash[module.name]={ "repo_url":module.url,"readme_url":"null"}
	  // we should get the readme_url here
	}
	try {
		// check
		let fn = MM_modules_Path+'/'+module.name
		fs.statSync(fn)
		module['installed']=true
		module['previously_installed']=true

  } catch(error){
  	// exception if not
  	// set not installed

		module['installed']=false
		module['previously_installed']=false
		if(debug)
			console.log("module="+module.name+" not installed")
  }
  // set the readme_url from the hash
	module['readme_url']= hash[module.name].readme_url
  // if nothing in that category yet
	if(categories[module.category] === undefined)
		// make it an empty array
	  categories[module.category]=[]

	// put the module in its category
	categories[module.category].push(module) 	
})

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
