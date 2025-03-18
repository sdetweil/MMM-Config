const { exec, execSync } = require("child_process");
const path=require('path')
const os= require('os')
const fs = require('fs')
const which= require("which")
const moment = require('moment-timezone')

const source_name=__dirname+"/module_form_schema.json"

const BASE_INSTANCE_PORT=9000
let run_port = process.env.PORT || BASE_INSTANCE_PORT;
let remote_io = null
  // if last parm is debug, others are down 1(adjustment)
let local_debug = false
const parm_adjustment = (process.argv[process.argv.length - 1] == "debug" ? 1 : 0)
const startMM=true
const our_path=__dirname.split('/').slice(0,-2).join('/')

const cf_name=process.env.MM_CONFIG_FILE?"process.env.MM_CONFIG_FILE":"config/config.js"
const modules_url="https://kristjanesperanto.github.io/MagicMirror-3rd-Party-Modules/data/modules.json"
const module_form_template=__dirname+"/module_schema_template.json"
const module_selector_form=__dirname+"/module_selector_schema.json"
const module_url_hash=__dirname+"/../module_url_hash.json"
const modules_location=__dirname+"/../../../modules"
const formTail = ", \"installable\":[]\n}}"
const formatter=require(__dirname+'/'+'formatModuleInfo.js')
const refresh_time_hour=5

const socketIOPath="/mInstaller"

var processList=[]

let in_docker_container = false

// the generated module list form
let formdata

const Configurator_in_config_file = false

let nodejspath
which('node', function(err, result) {
  nodejspath=result;
});

// check to see if we are running in docker container
try {
  if(fs.statSync('/.dockerenv'))
    in_docker_container = true
}
catch(error){}

if(local_debug)
  console.log("running in docker container="+in_docker_container)

// same code as in MMM-Config to make control files unique by instance
String.prototype.hashCode = function(port) {
  var hash = 0,
    i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString().replace('-','')+port.toString();

}

// startup in async mode
module.exports = async (expressApp, io, NodeHelper, sortOrder, debug) => {
  local_debug = debug
  remote_io=io
  buildFormData(NodeHelper, sortOrder)
  setupServer(expressApp, NodeHelper)
}

// Setup our web form server page html loaded here
// and socket io server for form data (used by form_client.js)
async function setupServer(expressApp, NodeHelper, sortOrder){
  // setup the installer url
  expressApp.get("/installer", (req, res) => {
    // redirect to config form
    res.redirect(
      // same server, different route
      "/modules/MMM-Config/module_installer/module_installer.html"
    );
  });

  /*
   * When the connection begins
   */
  remote_io.of(socketIOPath).on("connection", (socket) => {
    handleConnection( socket, "connect");
  }); // end - connection
  remote_io.of(socketIOPath).on("reconnect", (socket) => {
    handleConnection(socket, "reconnect");
  });
  /**
   * When a remote disconnects
   */
  remote_io.of(socketIOPath).on("disconnect", () => {
    console.log("socket disconnected");
    //socket.emit("disconnected");
  }); // end - disconnect

  // setup a refreshing of the source data
  const now = new moment().tz("Europe/Berlin")  // timezone the list builder is run in
  let then=now.clone()

  if(now.hour()<(refresh_time_hour)){                   //    16>4
    then= then.startOf('day').add(refresh_time_hour,'h');
  } else if(now.hour()<(refresh_time_hour+12)){          //    16<16
    then= then.startOf('day').add(refresh_time_hour+12,'h'); //16:00
  } else { //if(now.hour()>=(refresh_time_hour+12){
    then = then.add(1,'d').startOf('day').add(refresh_time_hour,'h') // tomorrow 04:00
  }

  if(local_debug)
    console.log("will pull config data at "+then.format("HH:mm:ss")+" in "+ then.diff(now)+" ms")
  // set next refresh time at 1pm/am , then 12hours between,
  // do after the data is refreshed
  setTimeout(()=>{
    setInterval(()=>{
      buildFormData(NodeHelper, sortOrder)
      },
      12*60*60*1000 // 12 hours in ms
      )
      buildFormData(NodeHelper, sortOrder);  // fetch the data again now (to get syncronized)
    }, then.diff(now)
  )
}

async function buildFormData(NodeHelper, sortOrder){
  // get the latest data from the 3rd party repo
  const response = await fetch(modules_url);
  if (!response.ok) {
    const message = `An error occured: ${response.status}`;
    throw new Error(message);
  }
  // we need the json
  const responseData = await response.json();

  // format in category and in category sorted as requested (date or time)
  let data = await formatter(responseData, sortOrder, local_debug)
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

//
//  get the jsonform form definition, created prior to this pgm running
//
function getFile() {
  let configPath = __dirname + path.sep+source_name;

  if (local_debug ) console.log("path=" + configPath);

  if (fs.existsSync(configPath)) {
    try {
      // read in the text file
      let data = fs.readFileSync(configPath, "utf8");
      return data
    } catch (e) {
      console.log("config parse error=" + e);
    }
  }
  return null
}

// handle the socket connection from the web page
let cancount=0
function handleConnection(socket, type) {
  if (local_debug) console.log("connection started = " + type);
  //console.log("socket connected")
  socket.emit("connected");

  // when the web page sends back data
  socket.on("saveConfig", (data) => {
    // used to save the form JSON
    // process the data
    process_submit(data, socket);
  });

  socket.on("cancel", () => {
    if(cancount++==0){
      if(local_debug)
        console.log("cancel requested")
      console.log("cancel received, closing installer")
      socket.emit("close")
     // setTimeout(()=>{process.exit(1)}, 3000)
    }
  });

  // when the page askes for form
  socket.on("getForm", () => {
    if(local_debug)
  	  console.log("form requested")
    // send it via socket io, string data
    socket.emit("json", "'" + formdata + "'");
  });
}

// process the data from the form
// don't have all the problems like MMM-Config has

async function process_submit(data, socket){
	//console.log("form received ="+JSON.stringify(data,null,2))
  let worklist= []

  // check to see if any not registered modules  were requested
  if(data.urls && data.urls.length){
    // if so, add them to the install work list
    data.urls.forEach(url=>{
      if(local_debug)
        console.log("url='"+url+"'")
      if(url.toLowerCase().startsWith("http")){
        modulename=url.split('/').slice(-1)[0].split('.')[0]
        if(local_debug)
          console.log("url based module name ="+modulename)
        worklist.push({
          url:url,
          "name":modulename
        })
      } else {
        console.log("skipping mis formatted url")
      }
    })
  }

  // loop thru the catagories returned on the form
  data.categories.forEach(categorylist =>{
    //if(local_debug)
    //  console.log("categorylist ="+JSON.stringify(categorylist,null,2)+"\n")
    // loop thru the modules in the catefory
    categorylist.category.modules.forEach(module=>{
      //if(local_debug)
      //  console.log("module "+ module.name+ " installed status="+module.installed+ (" previously="+module.previously_installed))
      // if install is selected and not previously
      if(module.installed && (module.previously_installed === false)){
        // add this module to the install work list
        worklist.push(module)
      }
    })
  })

  // install each module in the list
  // inform web page of activity
  if(local_debug)
    console.log("worklist="+JSON.stringify(worklist,null, 2))

  // now work thru the work list, one at a time

  let count=0
  local_debug = true
  worklist.forEach((module)=>{

    if(local_debug)
      console.log("processing for module ="+module.name)
    let extension=os.type() === "Windows_NT"?"cmd":"sh"
    // inform web page  we are processing for this module
    socket.emit("processing", module.name)

    // launch the background script to do this install
    // this is exec, so we are stopped while it works
    let cmdstring=`${__dirname}/install_module.${extension} ${module.name} ${module.url}`
    if(local_debug)
      console.log("processing command="+cmdstring)
    count++
    let child=exec(cmdstring, (error, stdout, stderr) => {
      if (error) {
        if(local_debug)
          console.error(`exec error: ${error}`);
        return;
      }
      if(local_debug){
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      }
    })
    // watch for the module install to end
    child.on('exit', (code, signal) => {
      if(local_debug)
        console.log("module install ended for module "+module.name)
      count--
      // inform the web page we are done processing for this module
      socket.emit("completed", module.name)
    })
  })
  // check every 2 seconds to see if installers ended
  const waitHandle=setInterval(
    ()=>{
        if(local_debug)
          console.log("checking for installers to end, count="+count)
       // if all installers finished
       if(count<=0){
         // stop the interval timer
         clearInterval(waitHandle)
         // launch the server
         launchServer(worklist, socket)
       }
     }
   , 2000)

}

async function launchServer(worklist, socket){
  //  now start MM and MMM-Config for the config part.
  //
  //  we will open the MMM-Config page when the schema file is created under the instance
  //
  if(startMM && worklist.length>0){
    socket.emit("waitfor")
    let cfgpath=path.resolve(__dirname,"../../../"+cf_name)
    let env=process.env  // get the environment variables
      env['MM_PORT']=run_port=BASE_INSTANCE_PORT  // add a MM custom port value (overrides in MM config.js)
      env["MM_INSTALLER"]=1
    let hash= cfgpath.hashCode(env['MM_PORT'])
    // get the MMM-Config output file used in the config form, using same encoding
    let fp=path.resolve(__dirname,"../schema3_"+hash+".json")
    let canceledfp =path.resolve(__dirname,"../canceled")

    try {
      // if the output file exists
      if(fs.statSync(fp)){
        // erase it
        // makes it easier later to check for it
        if(local_debug)
          console.log("removing the old schema file=",fp," \nand canceled flag", canceledfp)
        fs.unlinkSync(fp)
        fs.unlinkSync(canceledfp)
      }
    }
    catch(error) {

    }
 
    // starting config server (MM with MMM-Config installed, added on the fly if not present in prior config)
    // module was installed in the script it not already present
    // on a specific port
    // launch another instance of MagicMirror in server mode, on a different port
    // with the same config.js, so MMM-Config modifies the correct file
    const child = await exec(nodejspath +' serveronly',
        {
          detached: true, // Make the child process independent from the parent
          stdio: 'inherit', // was 'ignore' // Prevent child process from inheriting parent's stdio
          cwd: __dirname.split('/').slice(0,-3).join('/'),
          env:env
        },
       (error, stdout, stderr)=>{
          if(local_debug){
            if(error)
              console.log("error=",error)
          }
          if(local_debug){
            if(stdout)
              console.log("stdout=",stdout)
          }
       }
    );
    let cpid=child.pid
    if(local_debug){
      console.log(" node seerveronly process id = "+cpid)
      if(!in_docker_container){
        if(os.type() !== "Windows_NT")  // linux and macos
          console.log(JSON.stringify(execSync("ps -ef | grep servero | grep -v grep").toString().trim().split(/\n/),null,2));
		else   
		  console.log(JSON.stringify(execSync(`wmic process get Caption,ParentProcessId,ProcessId | findstr ${cpid} | findstr node.exe`).toString().trim().split(/\n/),null,2))	
      }
    }
    processList = getWorkConfigServerProcessList(cpid)

    // make sure not to get nodejs blocked
    child.unref()

    if(local_debug)
      console.log("about to watch for schema file write ="+fp)
    //  wait for new schema file to be written
    // keep trying on interval
    let count=0, countc=0
    let handle2=null
    let handle=setInterval(()=>{
      // cycling checking the schema file created
      try {
        // see if it exists now
        if(local_debug)
          console.log("checking for schema form file existing ="+fp)
        if(fs.statSync(fp)){
          if(count++==0){
            // hurray, we can stop checking
            if(local_debug)
              console.log("file exists")
            clearInterval(handle)
            if(handle2)
              clearInterval(handle2)
            // then the MM instance with MMM-Config is ready for the config page
            // from the newly generated form schema file
            MagicMirrorWorkServerReady(socket, cpid, env['MM_PORT'])
          }
        }
      } catch(error){
        if(local_debug)
          console.log("file doesn't exist yet ="+fp)
      }
      count=0
      try {
        // check to see if the page was closed without submitting
        handle2=setInterval(()=>{
        try {
          if(fs.statSync(canceledfp)){
              if(countc++ === 0){
                clearInterval(handle2)
                killWorkConfigServer(processList)
                console.log("configuration canceled (page closed), exiting installer")
                setTimeout(()=>{display_no_work(0)},4000)
              }
            }
          } catch(e){/* ok that it doesn't exist*/}
        },1000)
      }
      catch(e){}// watching for exist, error if not, ifnore it
    }, 1000)
  }
  else {
    display_no_work(1)
  }

}
function display_no_work(type){
  /*  if(type)
      console.log("you didn't select any modules to be installed, so no additional installation steps are required")
    console.log("if you want to change the configuration of your existing modules in the future, use the MMM-Config web page ")
    console.log("http://MM_SERVER:MM_PORT/modules/MMM-Config/review" )
    process.exit(0) */
}

// get the URL the user needs from a remote system doing the config
// tasks
function MagicMirrorWorkServerReady(socket, pid, port){
      // url to MMM-Config page

      let url = "http://localhost:"+port+"/configure";  // don't know what our outside address is, browser side will fix
      socket.emit('openurl', url)
      // tell the installer web page we are done
      // we waited so there wasn't a big flash
      // new page came up over old
      // and then old will close behind it
      //setTimeout(()=>{socket.emit("close")}, 3000)

      // mmm-config is supporting the config
      // need to know when that happens.. so we can clean up (however we need to clean up)
      // wait for the config to be written
      //

      // if the server is set to auto restart due to config file change
      // we will die and this code will never be executed
      let count =0
      fs.watch(__dirname+"/../../../"+cf_name,async (eventType, filename) => {
        if (eventType === 'change') {
          if(local_debug)
            console.log(`File ${filename} has been changed`);
          // watch out we could get called multiple times
          if(count++ == 0){
			socket.emit('close')
            killWorkConfigServer(processList)
            restartMagicMirror()
          }
        }
      })

}
function getWorkConfigServerProcessList(pid){
  let list=[]
  if(in_docker_container){
    list.push(1)
  }else {
    try {
         if(os.type() !== "Windows_NT"){
          const psRes = execSync(`ps -ef | grep ${pid} | grep -v grep`).toString().trim().split(/\n/);
          if(local_debug){
            console.log("pid list="+ JSON.stringify(psRes))
          }
          if(psRes){
            (psRes || []).forEach(pidGroup => {
              if(local_debug)
                console.log("processing for "+pidGroup)
              const [x, actual, parent] = pidGroup.trim().split(/ +/);
              if(local_debug){
                console.log("actual ="+actual+" parent="+parent)
                console.log(`comparing '${parent}' with '${pid}'`)
              }
              if (parent.toString() === pid.toString()) {
                if(local_debug)
                  console.log(`save '${actual}' to list`)
                list.push(parseInt(actual, 10));
                if(local_debug)
                  console.log("added pid=",list.slice(-1)[0]," to the list")
              }
            });
          }
        } else {
			const psRes = execSync(`wmic process get Caption,ParentProcessId,ProcessId | findstr ${pid} | findstr node.exe`).toString().trim().match(/\b\w+\b/g);	
			console.log("psRes=",psRes)
			pid = psRes[3]
        }
        list.push(pid)  // put parent on the end of list
        if(local_debug)
          console.log("list=",list)
      }
    catch(error){

    }
  }
  return list
}
function killWorkConfigServer (list)  {

  list.forEach(childPid => {
      if(local_debug)
        console.log("killing child pid=",childPid)
      try {
		 if(os.type() !== "Windows_NT"){
            process.kill(childPid)
		 } else {
			console.log("killing pid="+childPid)
			execSync(`taskkill /f /pid:${childPid}`)
		 }
      } catch(e){console.log("error=",e)}
  });
};

function restartMagicMirror(){

  if(in_docker_container){
    process.kill(1)
  }
  else{
    exec("pm2 jlist", (error, stdout, stderr) => {
      if (!error) {
        let o=stdout.toString()
        // maybe there is a pm2 error message in front of the json
        if(!o.startsWith('[')){
          // remove everything before process list
          o=o.slice(o.indexOf('['))
        }
        let output = JSON.parse(o);
        for(let managed_process of output){
          if(managed_process.pm2_env.status === 'online' ){
            if(managed_process.pm2_env.pm_exec_path.startsWith(our_path)){
              if (local_debug)
                console.info(
                  "found our pm2 entry, id=" + managed_process.pm_id
                );
              pm2_id = managed_process.pm_id;
              exec("pm2 restart "+pm2_id, (error, stdout, stderr)=>{
                if(local_debug){
                  if(error)
                    console.log("pm2 restart error=",error)
                }
                if(debug){
                  if(stdout)
                    console.log("pm2 succsee=",stdout)
                }
              })
              return
            }
          }
        };
        console.log("Unable to locate a MagicMirror instance under pm2, so cannot restart\nPlease restart it at your convenience")
      } else {
         console.log("Unable to restart the MagicMirror instance\nPlease restart it at your convenience")
      }
    });
  }
}

