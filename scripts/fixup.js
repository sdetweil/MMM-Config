
const fs = require('fs')
const os = require('os')

const lineend=os.platform == 'win32'?'\r\n':'\n'
const index_html = process.argv[2]
const insertions = process.argv[3]
let debug = false;
try {
debug = process.argv[4]=='debug'?true:false
}
catch(error){}
let changed= false
let index_lines= fs.readFileSync(index_html).toString().split(lineend)
let insertion_lines = fs.readFileSync(insertions).toString().split('\n') // because this file is produced by ls , not dir

insertion_lines.forEach(extension_file =>{
	// if not already present
	if(extension_file.startsWith('.') && !extension_file.startsWith('..') ){
		extension_file= extension_file.slice(2)
	}
	let r = index_lines.filter(element => {return element.includes(extension_file)})
		
	if(r.length == 0){
		if(debug) console.log("did not find '"+extension_file+"'" )
		// if its a JS file
		if(extension_file.endsWith('.js')){
			// add it to the body
			changed = true
			if(debug) console.log("adding js="+extension_file)
			index_lines.splice(index_lines.indexOf('</body>')-1,0,
			'  <script type="text/javascript" src="'+extension_file+'"></script>')
		} else
		// if its a css file
		if (extension_file.endsWith('.css')){
			// add it to the head
			changed = true
			if(debug) console.log("adding css="+extension_file)
			index_lines.splice(index_lines.indexOf('</head>')-1,0,
			'  <link rel="stylesheet" type="text/css" href="'+extension_file+'"></script>')
		}
	}
})
if(changed){
	fs.writeFileSync(index_html,index_lines.join(lineend))
	if(debug) console.log("new file="+index_lines.join(lineend))
}
