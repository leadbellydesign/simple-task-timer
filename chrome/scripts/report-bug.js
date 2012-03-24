$(document).ready(function() {
	localisePage();

	// Print debug info
    $('#debug-info').html('<strong>App Version:</strong> '+ chrome.app.getDetails().version +'<br />');
    $('#debug-info').append('<strong>localStorage:</strong><br />'+ JSON.stringify(localStorage));
});