$(document).on('form_loaded', function () {
	$('.m_compliments div[class$="---when"]  option:selected').each(
		function(){
			var o=$(this).text(); 
			if(o.endsWith('-format')){
				$(this).closest('fieldset').find('div[class$="'+o+'"]').css('display','block')
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
	let result=(new RegExp(date_regex).test(content))
	if(result){
		if(content[0]!='.'){
			let thisYear=new Date().getFullYear()
			let specified_year=content.slice(0,4)
			if(!(parseInt(specified_year)>=thisYear))
				result=false
		}
	}

	return result
}
