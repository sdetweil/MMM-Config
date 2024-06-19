
function converter(config_data, direction){
	
	if (direction == 'toForm'){ // convert FROM native object format to form schema array format
		let nc = []
		// config format is an object, need an extendable array 
		Object.keys(config_data.compliments).forEach(c =>{
			// for each key (morning, afternoon, eventing, date... )
			// push an object onto the 'array '
			// the object must match the custom schema definition
			let x = c
			if(c.includes("^"))
				x = c.replace(new RegExp("\\^", "g"),'.')
			nc.push( { when : x, list: config_data.compliments[c]})
		})
		// pass back a good copy of the data
		config_data.compliments= JSON.parse(JSON.stringify(nc))
		return config_data
	} 
	else if (direction == 'toConfig'){  // convert TO native object from form array
	
		let nc = {}
		// config format is an array , need an object 
		config_data.compliments.forEach(e =>{
			// for each key (morning, afternoon, eventing, date... )
			// make an object entry from the two fields in each array element
			// as defined in the custom schema
			nc[e.when]= e.list			
		})
		// pass back a good copy of the data
		config_data.compliments= JSON.parse(JSON.stringify(nc))
		return config_data	
	}
}
exports.converter=converter