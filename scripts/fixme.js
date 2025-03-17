$(document).on('form_loaded', function () {
    // find all the elements of our when selection list and get the selected option in each
    $('.moduleEntry').each(
        // process each
        function () {
            var mname = $(this).find('legend').text().toUpperCase()
            $(this).addClass(mname)
        }
    )
})
