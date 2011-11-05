var load, tasks = new Array(), task_running = new Array(), task_count = 0, save_timeout, timer;

// Set error event (most important event)
window.onerror = function(msg, url, line) {
    // Print error
    $('#tasks').css({'text-align': 'left'}).html('<div class="error">An error has occurred somewhere. Please report a bug with the following information, as well as what you did/what happened:<br /><br /></div>');
    $('#tasks').append('<strong>App Version:</strong> '+ chrome.app.getDetails().version +'<br />');
    $('#tasks').append('<strong>Error Message:</strong> '+ msg +'<br />');
    $('#tasks').append('<strong>URL:</strong> '+ url +'<br />');
    $('#tasks').append('<strong>Line number:</strong> '+ line +'<br />');
    //$('#tasks').append('<strong>Stack trace:</strong><br />'+ printStackTrace().join('<br />') +'<br />');
    $('#tasks').append('<strong>localStorage:</strong><br />'+ JSON.stringify(localStorage));
    
    // Make sure the error message is visible
    $('#tasks').show();
    $('.modal').hide();
}

$(document).ready(function() {
    // Set some variables
    load = $('#loading');
    
    // Check the version, and show the changelog if necessary
    if(typeof localStorage['old-version'] != 'undefined') {
        if(chrome.app.getDetails().version != localStorage['old-version'] && confirm('Task Timer has been updated!\nWould you like to see the changelog?\n\nBe aware that you will need to start your tasks again if Chrome auto-updated the app while any were running.')) {
            window.open('changelog.html');
        }
    } else {
        localStorage['old-version'] = chrome.app.getDetails().version;
        window.location = 'installed.html';
    }
    
    localStorage['old-version'] = chrome.app.getDetails().version;
    
    // Retrieve any tasks they've previously added
    if(localStorage['tasks']) {
        tasks = JSON.parse(localStorage['tasks']);
        task_count = tasks.length;
        
        for(i = 0; i < task_count; i++) {
            // Convert from the old method of storing times to the new one
            if(typeof tasks[i].current_hours == 'undefined') {
                tasks[i].current_hours = Math.floor(tasks[i].current);
                tasks[i].current_mins = Math.floor((tasks[i].current - tasks[i].current_hours) * 60);
                tasks[i].current_secs = Math.round((tasks[i].current - tasks[i].current_hours - (tasks[i].current_mins / 60)) * 3600);
                
                tasks[i].goal_hours = Math.floor(tasks[i].goal);
                tasks[i].goal_mins = Math.round((tasks[i].goal - tasks[i].goal_hours) * 60);
            }
            
            // Add the notified property to a task if it doesn't exist
            if(typeof tasks[i].notified == 'undefined') {
                if(tasks[i].current_hours >= tasks[i].goal_hours && tasks[i].current_mins >= tasks[i].goal_mins) {
                    tasks[i].notified = true;
                } else {
                    tasks[i].notified = false;
                }
            }
            
            list_task(i, 0);
            task_running[i] = false;
        }
    }
    
    // Load settings
    Load();
    
    // Enable the add task fields and check the auto-start box if default is enabled
    $('#new-task input, #new-task button').removeAttr('disabled');
    if(localStorage['autostart-default'] == 'true') $('#new-start').attr('checked', 'checked');
    
    // Set focus on the new task name field
    setTimeout(function() { $('#new-txt').focus(); }, 100);
    
    // Start the timers
    update_time();
    save_timeout = setTimeout('save(true)', 60000);
    
    // Add to the launch count, and show a rating reminder if at a multiple of 6
    localStorage['launches'] = typeof localStorage['launches'] == 'undefined' ? 1 : parseInt(localStorage['launches']) + 1;
    var launches = parseInt(localStorage['launches']);
    
    if(launches % 6 == 0 && typeof localStorage['rated'] == 'undefined' && confirm('Would you like to give this app a rating/review on the Chrome Web Store? It really helps out!')) {
        localStorage['rated'] = 'true';
        window.open('https://chrome.google.com/webstore/detail/aomfjmibjhhfdenfkpaodhnlhkolngif');
    }
    
    
    
    
    /**************************************************
     *************      E V E N T S       *************
     **************************************************/
    
    // User clicked the Close button in the notice
    $('#close-notice').click(function() {
        $('#notice').fadeOut(600);
        localStorage['hide-notice'] = 'true';
        $('#hide-notice').attr('checked', 'checked');
    });
    
    // User clicked the Add Task button
    $('#new-btn').click(function() {
        if($('#new-txt').val() != '' && (parseInt($('#new-goal-hrs').val()) > 0 || parseInt($('#new-goal-mins').val()) > 0)) {
            cancel_edit();
            add_task({
                'text': $('#new-txt').val(),
                'current_hours': 0,
                'current_mins': 0,
                'current_secs': 0,
                'goal_hours': parseInt($('#new-goal-hrs').val()),
                'goal_mins': parseInt($('#new-goal-mins').val()),
                'notified': false
            });
            
            if($('#new-start').is(':checked')) toggle_task(task_count - 1);
            save();
            
            $('#new-txt').val('');
            if(localStorage['autostart-default'] == 'true') $('#new-start').attr('checked', 'checked');
        } else {
            $('#error').fadeIn(600).delay(2000).fadeOut(600);
        }
    });
    
    // User pressed enter in one of the new task fields
    $('#new-task input').keypress(function (e) {
        if(e.keyCode == 13 && !$('#new-btn').attr('disabled')) {
            $('#new-btn').click();
        }
    });
    
    // User is leaving the page... Save the data.
    $(window).unload(function() {
        save();
    });
    
    // User clicked the Options button
    $('#options').click(function() {
        Load();
        $('.modal').fadeIn(400, function() { $('#modal-contents').show().animate({'height': '300px'}).animate({'width': '500px'}); });
    });
    
    // User clicked the cancel button in the options modal
    $('#close-modal').click(function() {
        Load();
        $('#modal-contents').animate({'width': '0px'}).animate({'height': '0px'}, 400, function() {
            $('.modal').fadeOut(); $('#modal-contents').hide(); 
        });
    });
    
    // User clicked the save button in the options modal
    $('#save-settings').click(function() {
        // Save the settings
        localStorage['hide-notice'] = $('#hide-notice').is(':checked').toString();
        localStorage['confirm-reset'] = $('#confirm-reset').is(':checked').toString();
        localStorage['confirm-delete'] = $('#confirm-delete').is(':checked').toString();
        localStorage['autostart-default'] = $('#autostart-default').is(':checked').toString();
        
        localStorage['notify'] = $('#notify').is(':checked').toString();
        localStorage['play-sound'] = $('#play-sound').is(':checked').toString();
        localStorage['sound-type'] = $('#sound-type').val();
        localStorage['custom-sound'] = $('#custom-sound').val();
        
        localStorage['only-one'] = $('#only-one').is(':checked').toString();
        localStorage['stop-timer'] = $('#stop-timer').is(':checked').toString();
        
        if(parseInt($('#update-time').val()) > 0 && parseInt($('#update-time').val()) < 60) {
            localStorage['update-time'] = parseInt($('#update-time').val());
        }
        
        // Check for notification permissions
        if(localStorage['notify'] == 'true') {
            webkitNotifications.requestPermission(function() {
                webkitNotifications.createNotification('/style/images/icon-64.png', 'Desktop Notifications Work!', 'You seeing this means desktop notifications are enabled and working correctly! Woo!').show();
            });
        }
        
        // Check the auto-start box if setting is enabled
        if(localStorage['autostart-default'] == 'true') $('#new-start').attr('checked', 'checked');
        
        clearTimeout(timer);
        timer = setTimeout('update_time()', parseInt(localStorage['update-time']) * 1000);
        
        // Rebuild task list
        editing_task = -1;
        $('#task-list tbody').empty();
        for(i = 0; i < task_count; i++) {
            list_task(i, 0);
        }
        
        $('#saved').fadeIn(600).delay(2000).fadeOut(600);
        $('#close-modal').click();
    });
    
    // User changed the play sound checkbox
    $('#play-sound').change(function() {
        if($('#play-sound').is(':checked')) {
            $('#sound-type').removeAttr('disabled');
            if($('#sound-type').val() == '2') $('#custom-sound').removeAttr('disabled');
        } else {
            $('#sound-type, #custom-sound').attr('disabled', 'disabled');
        }
    });
    
    // User changed the sound type dropdown
    $('#sound-type').change(function() {
        if($('#sound-type').val() == '2') {
            $('#custom-sound').removeAttr('disabled');
        } else {
            $('#custom-sound').attr('disabled', 'disabled');
        }
    });
    
    
    $('#tasks').show();
});



// Load the settings
function Load() {
    // Set default settings if they don't exist
    if(typeof localStorage['hide-notice'] == 'undefined') localStorage['hide-notice'] = 'false';
    if(typeof localStorage['confirm-reset'] == 'undefined') localStorage['confirm-reset'] = 'true';
    if(typeof localStorage['confirm-delete'] == 'undefined') localStorage['confirm-delete'] = 'true';
    if(typeof localStorage['autostart-default'] == 'undefined') localStorage['autostart-default'] = 'false';
    if(typeof localStorage['notify'] == 'undefined') localStorage['notify'] = 'false';
    if(typeof localStorage['play-sound'] == 'undefined') localStorage['play-sound'] = 'true';
    if(typeof localStorage['sound-type'] == 'undefined') localStorage['sound-type'] = '1';
    if(typeof localStorage['custom-sound'] == 'undefined') localStorage['custom-sound'] = '';
    if(typeof localStorage['only-one'] == 'undefined') localStorage['only-one'] = 'false';
    if(typeof localStorage['stop-timer'] == 'undefined') localStorage['stop-timer'] = 'true';
    if(typeof localStorage['update-time'] == 'undefined') localStorage['update-time'] = '1';
    
    $('#sound-type').val(parseInt(localStorage['sound-type']));
    $('#custom-sound').val(localStorage['custom-sound']);
    $('#update-time').val(localStorage['update-time']);
    
    if(localStorage['hide-notice'] == 'true') {
        $('#hide-notice').attr('checked', 'checked');
        $('#notice').hide();
    } else {
        $('#hide-notice').removeAttr('checked');
        $('#notice').show();
    }
    
    $.each({'confirm-reset': 0, 'confirm-delete': 0, 'autostart-default': 0, 'stop-timer': 0, 'notify': 0, 'only-one': 0}, function(i, v) {
        if(localStorage[i] == 'true') {
            $('#'+ i).attr('checked', 'checked');
        } else {
            $('#'+ i).removeAttr('checked');
        }
    });
    
    if(localStorage['play-sound'] == 'true') {
        $('#play-sound').attr('checked', 'checked');
        $('#sound-type').removeAttr('disabled');
        if($('#sound-type').val() == '2') {
            $('#custom-sound').removeAttr('disabled');
        } else {
            $('#custom-sound').attr('disabled', 'disabled');
        }
    } else {
        $('#play-sound').removeAttr('checked');
        $('#sound-type').attr('disabled', 'disabled');
        $('#custom-sound').attr('disabled', 'disabled');
    }
    
    // If the user has chosen to use a custom sound, set the audio element's src to the custom sound path
    if(localStorage['sound-type'] == '2') {
        $('#sound').attr('src', localStorage['custom-sound']);
    } else {
        $('#sound').attr('src', 'Deneb.ogg');
    }
}

// Save the data in localStorage
function save(timeout) {
    if(timeout) load.show();
    $('button.delete, #new-btn').attr('disabled', 'disabled');
    
    // Save data
    localStorage['tasks'] = JSON.stringify(tasks);
    
    // Timeout
    clearTimeout(save_timeout);
    save_timeout = setTimeout('save(true)', 60000);
    
    $('button.delete, #new-btn').removeAttr('disabled');
    if(timeout) load.hide();
}

// Format the time to the format h:mm:ss
function format_time(hours, mins, secs) {
    return hours.toString() +':'+ (mins < 10 ? '0' : '') + mins.toString() +':'+ (secs < 10 ? '0' : '') + secs.toString();
}
