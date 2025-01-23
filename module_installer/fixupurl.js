const rm= "/README.md"
let debug=false

function getrm(raw, repoURL){
	if(debug) console.log("processing for url="+repoURL)
	let xregex=/(\/readme\.(md|org)\")/gi
    let searchstring=rm
    let m = raw.match(xregex)
    if(debug)
    	console.log("matches=",m)
    let newurl=repoURL
    if(m){
    	searchstring=m[1]

    /*while(true){
        let index=raw.indexOf(searchstring)
        if(debug) console.log("uppercase index="+index)
        if(index==-1){
            index=raw.indexOf(rm.toLowerCase())
            if(index>-1){
                searchstring=rm.toLowerCase()
                break;
            }else {
            	return null
            	break
            }

        } else {
            break
        }
    }*/


	    for(let index=raw.indexOf(searchstring);index>=0;index=raw.indexOf(searchstring,index)){
	        if(debug) console.log("found a hit index="+index)
	       let start= raw.lastIndexOf('"',index)
	       let path=raw.substring(start,index+rm.length).split('/')
	       if(debug) console.log("path parts=", path)
	       if(repoURL.includes('github.com')){
	       	 // https://raw.githubusercontent.com/sdetweil/MM-Config/refs/heads/main/README.md
		       let user=path.slice(1,2)
		       let repo=path.slice(2,3)
		       let branch=path.slice(-2,-1)
		       let fn=path.slice(-1)
	         newurl=`https://raw.githubusercontent.com/${user}/${repo}/refs/heads/${branch}/${fn}`
		     }

	       if(repoURL.includes('gitlab.com')){
	       	 //https://gitlab.com/dnmmrdr1/MMM-NCTtimes/-/blob/main/README.md?ref_type=heads
		       //	  'dnmmrdr1', -6  -- user
					 //	  'MMM-NCTtimes', -5 -- repo
					 //	  '-',         -4
					 //	  'blob',      -3
					 //	  'main',      -2  -- branch
					 //	  'README.md'  -1  -- fn
					 /*	  '"',
						  'khassel', -6
						  'MMM-Shell-Output', -5
						  '-',         -4
						  'blob',      -3
						  'master',    -2
						  'README.md'  -1
						[2025-01-21 15:11:56.198] [LOG]   start=956 index=996 hit ="/khassel/MMM-Shell-Output/-/blob/master/README.md
						 start=956 index=996 hit ="/khassel/MMM-Shell-Output/-/blob/master/README.md
						[2025-01-21 15:11:56.198] [LOG]   newurl=https://gitlab.com///-/blob/master/README.md?ref_type=heads    	*/
		       let user=path.slice(-6,-5)
		       let repo=path.slice(-5,-4)
		       let branch=path.slice(-2,-1)
		       let fn=path.slice(-1)
		       newurl=`https://gitlab.com/${user}/${repo}/-/blob/${branch}/${fn}?ref_type=heads`
		     }
	       if(debug) console.log("start="+start+" index="+index+" hit ="+path.join('/'))
	       if(debug) console.log("newurl="+newurl)
	       break
	       index++
	    }
	}
    if(debug) console.log("returing url="+newurl)
    return newurl
}

let data = "";

async function main() {
  if(process.argv.length>3 && process.argv[3]==='debug')
  	debug=true

  if(debug) console.log("entered main")
  for await (const chunk of process.stdin) data += chunk;

  if(debug) console.log("calling processor, "+process.argv[2])
  console.log(getrm(data, process.argv[2]))
}

main();
