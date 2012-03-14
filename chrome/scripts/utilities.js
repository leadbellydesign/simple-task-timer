var dialog_queue = new Array();

// Trigger a dialog
function dialog(text, callback, data, type, override, force_native) {
    // Default the argument values
    if(typeof text == 'undefined') text = 'dialog';
    if(typeof callback == 'undefined') callback = function() {};
    if(typeof data == 'undefined') data = {};
    if(typeof type == 'undefined') type = 1;
    if(typeof override == 'undefined') override = false;
    if(typeof force_native == 'undefined') force_native = false;

    if(override) {
        callback(true, data);
    } else {
        // Add the dialog to the queue and display it if it's the only one
        dialog_queue[dialog_queue.length] = {'text': text, 'type': type, 'callback': callback, 'data': data, 'force_native': force_native};
        if(dialog_queue.length == 1) dialog_display(0);
    }
}

// Create and display a modal dialog
function dialog_display(dialog) {
    var text = dialog_queue[dialog].text, type = dialog_queue[dialog].type, callback = dialog_queue[dialog].callback, data = dialog_queue[dialog].data;
    dialog_open = true;

    // Tweak the buttons for the type of dialog
    switch(type) {
        case 2: case 'confirm':
            $('#dialog-ok').text(locale('btnOK'));
            $('#dialog-cancel').text(locale('btnCancel')).show();
            break;
        case 3: case 'question': case 'yesno':
            $('#dialog-ok').text(locale('btnYes'));
            $('#dialog-cancel').text(locale('btnNo')).show();
            break;
        case 1: case 'alert': default:
            $('#dialog-ok').text(locale('btnOK'));
            $('#dialog-cancel').hide();
            var type = 1;
            break;
    }

    if(Setting('pretty-dialogs') && !dialog_queue[dialog].force_native) {
        // Set the text
        $('#dialog-txt').html(word_wrap(text, 100).replace(/\n/, '<br />'));

        // Bind events to the buttons
        $('#dialog-ok').click({cb: callback, d: data}, function(e, d) { e.data.cb(true, e.data.d); });
        $('#dialog-cancel').click({cb: callback, d: data}, function(e, d) { e.data.cb(false, e.data.d); });
        $('#modal-dialog button').click(function() {
            // Remove from the dialog queue and unbind events
            dialog_queue.splice(0);
            $('#modal-dialog button').unbind();

            // Show the next dialog or fade out
            if(dialog_queue.length == 0) {
                dialog_open = false;
                $('#modal-dialog').fadeOut(600);
                if(!alarm_open && !task_open && !tools_open) $('#modal').fadeOut(600);
            } else {
                modal_dialog_display(0);
            }
        });

        // Display the dialog
        $('#modal, #modal-dialog').fadeIn(600).center();
    } else {
        // Regular browser dialogs
        if(type == 1) {
            alert(text);
            callback(true, data);
        } else {
            callback(confirm(text), data);
        }

        // Remove from the dialog queue
        dialog_queue.splice(dialog);
    }
}

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

// Fix time input fields
function fix_time(hours_field, mins_field, secs_field) {
    // Get value of fields
    var hours = parseInt($(hours_field).val()), mins = parseInt($(mins_field).val()), secs = (secs_field ? parseInt($(secs_field).val()) : 0);
    
    // Verify numbers
    if(hours < 0 || hours > Number.MAX_VALUE) hours = 0;
    if(mins < 0 || mins > Number.MAX_VALUE) mins = 0;
    if(secs < 0 || secs > Number.MAX_VALUE) secs = 0;

    // Fix mins and secs greater than 59
    if(secs > 59) {
        mins += Math.floor(secs / 60);
        secs %= 60;
    }
    if(mins > 59) {
        hours += Math.floor(mins / 60);
        mins %= 60;
    }

    // Put new values in the input fields
    $(hours_field).val(hours);
    $(mins_field).val(mins);
    if(secs_field) $(secs_field).val(secs);
}

// Format time to the format h:mm:ss
function format_time(hours, mins, secs, indef) {
    if(indef) return locale('txtIndefinite');
    
    if(hours == null) hours = 0;
    if(mins == null) mins = 0;
    if(secs == null) secs = 0;
    
    return hours.toString() +':'+ (mins < 10 ? '0' : '') + mins.toString() +':'+ (secs < 10 ? '0' : '') + secs.toString();
}

// Wrap long sentences to new lines
function word_wrap(str, width, brk, cut) {
    width = width || 75;
    brk = brk || '\n';
    cut = cut || false;

    if(!str) { return str; }

    var regex = '.{1,'+ width +'}(\\s|$)' + (cut ? '|.{'+ width +'}|.+$' : '|\\S+?(\\s|$)');
    return str.match(RegExp(regex, 'g')).join(brk);
}

// Get a single locale string
function locale(messageID, args) {
    var i18n = chrome.i18n.getMessage(messageID, args);
    
    // Replace URLs in the format of [Text|URL]
    i18n = i18n.replace(/\[(.+)\|(.+)\]/gi, '<a href="$2">$1</a>');
    
    // Return locale string
    return i18n != '' ? i18n : messageID;
}

// Localise page
function localisePage() {
    var text_tags = ['OPTION', 'A', 'BUTTON', 'H1', 'H2', 'H3', 'TITLE'];
    var html_tags = ['DIV', 'P', 'TD', 'TH', 'SPAN'];
    
    $('[i18n]').each(function(i, v) {
        var i18n = locale($(this).attr('i18n')), type;
        
        // Text or HTML tag? 1 = text, 2 = HTML, 3 = N/A
        type = $.inArray($(this)[0].tagName, text_tags) != -1 ? 1 : ($.inArray($(this)[0].tagName, html_tags) != -1 ? 2 : 3);
        
        // Set the text or HTML
        if(type == 1) $(this).text(i18n);
        else if(type == 2) $(this).html(i18n.replace(/\n/g, '<br />'));
        
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
            alert(locale('noteErrorOccurred'));
        }
    }
}