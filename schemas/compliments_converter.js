function converter(config_data, direction){
	const weather_list=[
                      "day_sunny",
                      "day_cloudy",
                      "cloudy",
                      "cloudy_windy",
                      "showers",
                      "rain",
                      "thunderstorm",
                      "snow",
                      "fog",
                      "night_clear",
                      "night_cloudy",
                      "night_showers",
                      "night_rain",
                      "night_thunderstorm",
                      "night_snow",
                      "night_alt_cloudy_windy"
                    ]
	if (direction == 'toForm'){ // convert FROM native object format to form schema array format
		// create entry array
		let nc = []
		// config format is an object, need an extendable array
		Object.keys(config_data.compliments).forEach(c =>{
			// for each key (morning, afternoon, eventing, date..., weather )
			// push an object onto the 'array '
			// the object must match the custom schema definition
			let x = c

			if(c.includes("^"))
				x = c.replace(new RegExp("\\^", "g"),'.')
			let when
			let df=null
			let field=null
			let entry = { when : x,  list: config_data.compliments[c]}
			// if the key contains space a space, then its the cron date/time type format
			if(x.includes(' ')){
				field='date-time-format'
				df=x
			}// if the object key contains a . or starts with a number, THEN its a date field
 			else if(weather_list.includes(x)) {
				// weather
				field='weather-format'
				df=x
			}
			else if(x.includes('.') || !isNaN(parseInt(x[0]))){
				field='date-format'
				df=x
			}
			// if we found a custom field, then fix the entry structure
			if(df){
				entry.when=field
				entry[field]=df
			}
			// save the new field structure in the array
			nc.push( entry)
		})
		// pass back a good copy of the data
		config_data.compliments= JSON.parse(JSON.stringify(nc))
		return config_data
	}
	else if (direction == 'toConfig'){  // convert TO native object from form array
		// create empty object
		let nc = {}
		// form format is an array , need an object for config.js
		config_data.compliments.forEach(e =>{
			// for each key (morning, afternoon, eventing, date... )
			// make an object entry from the two fields in each array element
			// as defined in the custom schema
			// special handling for the two date related values
			switch(e.when){
				case 'date-format':
				case 'date-time-format':
				case 'weather-format':
					// custom field, get the data from the right place in the structure
					nc[e[e.when]]=e.list
					break
				default:
					// default location for all others
					nc[e.when]= e.list
			}
		})
		// pass back a good copy of the data
		config_data.compliments= JSON.parse(JSON.stringify(nc))
		return config_data
	}
}
exports.converter=converter