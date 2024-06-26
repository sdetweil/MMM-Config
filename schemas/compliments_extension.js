$(document).on('form_loaded', function () {
	$('.m_compliments div[class$="---when"]  option:selected').each(
		function(){
			var selected_option=$(this).text();
			if(selected_option.endsWith('format')){
				$(this).closest('fieldset').find('div[class$="'+selected_option+'"]').css('display','block')
			}
		}
	)
})
const cron_regex =  /^(((\d+,)+\d+|((\d+|[*])[/]\d+|((JAN|FEB|APR|MA[RY]|JU[LN]|AUG|SEP|OCT|NOV|DEC)(-(JAN|FEB|APR|MA[RY]|JU[LN]|AUG|SEP|OCT|NOV|DEC))?))|(\d+-\d+)|\d+(-\d+)?[/]\d+(-\d+)?|\d+|[*]|(MON|TUE|WED|THU|FRI|SAT|SUN)(-(MON|TUE|WED|THU|FRI|SAT|SUN))?) ?){5}$/i;
const date_regex = "[1-9.][0-9.][0-9.]{2}-([0][1-9]|[1][0-2])-([1-2][0-9]|[0][1-9]|[3][0-1])"
function cron_validator(content){
	return (cron_regex.exec(content) !== null)
}
function date_validator(content){
	// make sure the data fits the right format
	let result=(new RegExp(date_regex).test(content))
	// if the right format, check for future date
	if(result){
		if(!content.includes('.')){  // check if the content DOES SPECIFY an actual year 2021 or 2024  for example
			// if so, make sure the specified data is after today, else it will never trigger
			result = new Date(content) >=new Date()
		}
	}

	return result
}
