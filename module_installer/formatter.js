const { exec, execSync } = require("child_process");
const path=require('path')
const os= require('os')
const fs = require('fs')
const formatter=require(__dirname+'/'+'formatModuleInfo.js')
const modules_url ="https://modules.magicmirror.builders/data/modules.json"
const module_form_template=__dirname+"/module_schema_template.json"
const module_selector_form=__dirname+"/module_selector_schema.json"
const module_url_hash=__dirname+"/../module_url_hash.json"
const modules_location=__dirname+"/../../../modules"
const formTail = ", \"installable\":[]\n}}"

async function buildFormData(/*NodeHelper,*/ sortOrder, debug){
  // get the latest data from the 3rd party repo
  //console.log("entered buildformdata")
  const response = await fetch(modules_url);
  if (!response.ok) {
    const message = `An error occured: ${response.status}`;
    throw new Error(message);
  }
  //console.log("fetch conmpleted")
  // we need the json
  const responseData = await response.json();
  //console.log("have form data l="+responseData.length)

  // Extract modules array from the new API structure
  const modulesArray = responseData.modules || responseData;

  // format in category and in category sorted as requested (date or time)
  let data = await formatter(modulesArray, sortOrder, debug)
  //console.log("back from formatter")
  // make the form for the installer page
  let newformdata=fs.readFileSync(module_form_template)+'"categories":'+JSON.stringify(data.categories,null,2)+formTail
  // save it for page load
  formdata=newformdata
  // write it out for next time start
  // write it out to be loaded by installer page
  fs.writeFileSync(module_selector_form, newformdata)
  // write out the updated url hash (adds/deletes done twice a day) 
  fs.writeFileSync(module_url_hash, JSON.stringify(data.hash, null, 2))
  // async, return something
  return true
}

let sortOrder=process.argv[2];
let debug= false
//console.log("args=",process.argv)
if(process.argv.length>2){
	if(process.argv[3]==='debug')
		debug = true
}
// check to see if url hash exists, and is complete
fs.stat(module_url_hash, (err, stats) => {
  //console.log("module hash stat rc="+err)
  if (!err){  // found it, background process not processing
    if(stats.size>200000){  // if large, should be done processing
      //console.log("module hash stat size="+stats.size)
      buildFormData(sortOrder, debug) // so we can check and update
    }
  }
});
