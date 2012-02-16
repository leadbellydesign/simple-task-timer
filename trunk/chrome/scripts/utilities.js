// Display a success message
function success(s) {
    $('#success').text(locale(s)).center().stop(true, true).fadeIn(600).delay(2000).fadeIn(10, function() {
            $(this).stop(true, true).fadeOut(600);
    });
}

// Display an error message
function error(s) {
    $('#error').text(locale(s)).center().stop(true, true).fadeIn(600).delay(2000).fadeIn(10, function() {
        $(this).stop(true, true).fadeOut(600);
    });
}

// Format the time to the format h:mm:ss
function format_time(hours, mins, secs, indef) {
    if(indef) return locale('indefinite');
    
    if(hours == null) hours = 0;
    if(mins == null) mins = 0;
    if(secs == null) secs = 0;
    
    return hours.toString() +':'+ (mins < 10 ? '0' : '') + mins.toString() +':'+ (secs < 10 ? '0' : '') + secs.toString();
}

// Get a single locale string
function locale(messageID, args) {
    var i18n = chrome.i18n.getMessage(messageID, args);
    return i18n != '' ? i18n : messageID;
}

// Localise page
function localisePage() {
    var text_tags = ['OPTION', 'A', 'BUTTON', 'H1', 'H2', 'H3', 'TITLE'];
    var html_tags = ['DIV', 'P', 'TD', 'TH', 'SPAN'];
    
    $('[i18n]').each(function(i, v) {
        var i18n = locale($(this).attr('i18n'));
        
        // Set the HTML or text
        if($.inArray($(this)[0].tagName, text_tags) != -1) $(this).text(i18n);
        else if($.inArray($(this)[0].tagName, html_tags) != -1) $(this).html(i18n.replace(/\n/g, '<br />'));
        
        // Set attributes
        if($(this).attr('title')) $(this).attr('title', i18n);
        if($(this).attr('alt')) $(this).attr('alt', i18n);
        if($(this).attr('placeholder')) $(this).attr('placeholder', i18n);
    });
}

// JS Error handler
function js_error(error, url, line) {
    if(!js_error_shown) {
        var trace = false;
        
        // See if we're coming from try...catch or window.onerror
        if(typeof error.message != 'undefined') {
            msg = error.message;
            url = error.url;
            line = error.number;
            trace = true;
        } else {
            msg = error;
        }
        
        // Stop timers
        clearTimeout(timer);
        clearTimeout(save_timer);
        
        // Print error
        $('#js-error h3').text(locale('errorNotice'));
        $('#error-info').html('<strong>App Version:</strong> '+ chrome.app.getDetails().version +'<br />');
        $('#error-info').append('<strong>Error Message:</strong> '+ msg +'<br />');
        if(!trace) $('#error-info').append('<strong>URL:</strong> '+ url +'<br />');
        if(!trace) $('#error-info').append('<strong>Line number:</strong> '+ line +'<br />');
        if(trace) $('#error-info').append('<strong>Stack trace:</strong><br />'+ printStackTrace({e: error}).join('<br />') +'<br />');
        $('#error-info').append('<strong>localStorage:</strong><br />'+ JSON.stringify(localStorage));
        
        // Make sure the error message is visible
        $('#tasks, #charts, #modal').hide();
        $('#js-error').show();
        
        // Alert only once
        if(!js_error_shown) {
            js_error_shown = true;
            alert(locale('errorOccurred'));
        }
    }
}