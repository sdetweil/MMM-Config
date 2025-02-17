$(document).on('form_loaded', function () {
    // find all the elements of our when selection list and get the selected option in each
    $('input[name$=".inconfig"]').each(
        // process each
        function () {
            var isinconfig = $(this).val() == '1';
            if (!isinconfig) {
                var legend = $(this).closest('fieldset')
                legend.addClass("module_notLoaded")
                legend.removeClass("module_disabled")
            }
        })
})