var load, tasks = new Array(), task_running = new Array(), task_count = 0, save_timer, timer, preview_sound = false;;

// Set error event (most important event)
window.onerror = function(msg, url, line) { error_notice(msg, url, line); };

// Document finished loading
$(document).ready(function() {
    try {
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
                
                // Add the indefinite property to a task if it doesn't exist
                if(typeof tasks[i].indefinite == 'undefined') tasks[i].indefinite = false;
                
                // Make sure goal times aren't null
                if(tasks[i].goal_hours == null) tasks[i].goal_hours = 0;
                if(tasks[i].goal_mins == null) tasks[i].goal_mins = 0;
                
                list_task(i, 0);
                task_running[i] = false;
            }
        }
        
        // Load settings
        Load();
        
        // Enable the add task fields and check the auto-start box if default is enabled
        $('#new-task input, #new-task button').removeAttr('disabled');
        if(setting('autostart-default')) $('#new-start').attr('checked', 'checked');
        
        // Set focus on the new task name field
        setTimeout(function() { $('#new-txt').focus(); }, 100);
        
        // Start the timers
        update_time();
        save_timer = setTimeout('save(true)', 60000);
        
        // Add to the launch count, and show a rating reminder if at a multiple of 6
        localStorage['launches'] = typeof localStorage['launches'] == 'undefined' ? 1 : parseInt(localStorage['launches']) + 1;
        var launches = setting(launches);
        
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
            setting('hide-notice', true);
        });
        
        // User clicked the Add Task button
        $('#new-btn').click(function() {
            if($('#new-goal-hrs').val() == '') $('#new-goal-hrs').val('0');
            if($('#new-goal-mins').val() == '') $('#new-goal-mins').val('0');
            
            var hours = parseInt($('#new-goal-hrs').val()), mins = parseInt($('#new-goal-mins').val()), indef = $('#new-goal-indef').is(':checked');
            
            if($('#new-txt').val() != '' && (hours > 0 || mins > 0 || indef) && !(hours < 0) && !(mins < 0)) {
                cancel_edit();
                add_task({
                    'text': $('#new-txt').val(),
                    'current_hours': 0,
                    'current_mins': 0,
                    'current_secs': 0,
                    'goal_hours': hours,
                    'goal_mins': mins,
                    'indefinite': indef,
                    'notified': false
                });
                
                if($('#new-start').is(':checked')) toggle_task(task_count - 1);
                save();
                
                $('#new-txt').val('');
                if(setting('autostart-default')) $('#new-start').attr('checked', 'checked');
            } else {
                $('#error').fadeIn(600).delay(2000).fadeOut(600);
            }
        });
        
        // User toggled the new task indefinite checkbox
        $('#new-goal-indef').change(function() {
            if($(this).is(':checked')) {
                $('#new-goal-hrs, #new-goal-mins').attr('disabled', 'disabled') 
            } else {
                $('#new-goal-hrs, #new-goal-mins').removeAttr('disabled');
            }
        });
        
        // User pressed enter in one of the new task fields
        $('#new-task input').keypress(function (e) {
            if(e.keyCode == 13 && !$('#new-btn').attr('disabled')) {
                $('#new-btn').click();
            }
        });
        
        // User clicked away from the goal fields
        $('#new-goal-hrs, #new-goal-mins').blur(function() {
            if($(this).val() == '') $(this).val('0');
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
            setting('hide-notice', $('#hide-notice').is(':checked'));
            setting('confirm-reset', $('#confirm-reset').is(':checked'));
            setting('confirm-delete', $('#confirm-delete').is(':checked'));
            setting('autostart-default', $('#autostart-default').is(':checked'));
            
            setting('notify', $('#notify').is(':checked'));
            setting('play-sound', $('#play-sound').is(':checked'));
            setting('sound-type', $('#sound-type').val());
            setting('custom-sound', $('#custom-sound').val());
            
            setting('only-one', $('#only-one').is(':checked'));
            setting('stop-timer', $('#stop-timer').is(':checked'));
            
            if(parseInt($('#update-time').val()) > 0 && parseInt($('#update-time').val()) < 60) {
                setting('update-time', $('#update-time').val());
            }
            
            // Check for notification permissions
            if(setting('notify')) {
                webkitNotifications.requestPermission(function() {
                    webkitNotifications.createNotification('/style/images/icon-64.png', 'Desktop Notifications Work!', 'You seeing this means desktop notifications are enabled and working correctly! Woo!').show();
                });
            }
            
            // Check the auto-start box if setting is enabled
            if(setting('autostart-default')) $('#new-start').attr('checked', 'checked');
            
            clearTimeout(timer);
            timer = setTimeout('update_time()', setting('update-time') * 1000);
            
            rebuild_list();
            editing_task = -1;
            
            $('#saved').fadeIn(600).delay(2000).fadeOut(600);
            $('#close-modal').click();
        });
        
        // User changed the play sound checkbox
        $('#play-sound').change(function() {
            if($('#play-sound').is(':checked')) {
                $('#sound-type, #preview-sound').removeAttr('disabled');
                if($('#sound-type').val() == '2') $('#custom-sound').removeAttr('disabled');
            } else {
                $('#sound-type, #custom-sound, #preview-sound').attr('disabled', 'disabled');
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
        
        // User clicked the preview button for the notification sound
        $('#preview-sound').click(function() {
            preview_sound = true;
            $('#preview').attr('src', $('#sound-type').val() == 1 ? 'Deneb.ogg' : $('#custom-sound').val());
            $(this).text('Loading...').attr('disabled', 'disabled');
        });
        
        // Preview sound is ready
        $('#preview').bind('canplay', function() {
            if(preview_sound) {
                preview_sound = false;
                this.play();
                $('#preview-sound').text('Preview sound').removeAttr('disabled');
            }
        });
        
        // Preview sound invalid
        $('#preview').error(function() {
            if(preview_sound) {
                preview_sound = false;
                $('#preview-sound').text('Error!');
                setTimeout(function() { $('#preview-sound').text('Preview sound').removeAttr('disabled'); }, 2000);
            }
        });
        
        
        $('#tasks').show();
    } catch(e) {
        error_notice(e);
    }
});



// Load the settings
function Load() {
    $('#sound-type').val(setting('sound-type', 1, true));
    $('#custom-sound').val(setting('custom-sound', '', true));
    $('#update-time').val(setting('update-time', 1, true));
    
    if(setting('hide-notice', false, true)) {
        $('#hide-notice').attr('checked', 'checked');
        $('#notice').hide();
    } else {
        $('#hide-notice').removeAttr('checked');
        $('#notice').show();
    }
    
    $.each({'confirm-reset': true, 'confirm-delete': true, 'autostart-default': false, 'stop-timer': true, 'notify': false, 'only-one': false}, function(i, v) {
        if(setting(i, v, true)) {
            $('#'+ i).attr('checked', 'checked');
        } else {
            $('#'+ i).removeAttr('checked');
        }
    });
    
    if(setting('play-sound', true, true)) {
        $('#play-sound').attr('checked', 'checked');
        $('#sound-type, #preview-sound').removeAttr('disabled');
        if($('#sound-type').val() == '2') {
            $('#custom-sound').removeAttr('disabled');
        } else {
            $('#custom-sound').attr('disabled', 'disabled');
        }
    } else {
        $('#play-sound').removeAttr('checked');
        $('#sound-type, #custom-sound, #preview-sound').attr('disabled', 'disabled');
    }
    
    // If the user has chosen to use a custom sound, set the audio element's src to the custom sound path
    if(setting('sound-type') == 2) {
        $('#sound').attr('src', setting('custom-sound'));
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
    clearTimeout(save_timer);
    save_timer = setTimeout('save(true)', 60000);
    
    $('button.delete, #new-btn').removeAttr('disabled');
    if(timeout) load.hide();
}

// Return or set the value of a setting
function setting(name, value, only_not_exists) {
    if(typeof only_not_exists == 'undefined') only_not_exists = false;
    
    // Check if the setting exists
    var exists;
    if(typeof localStorage[name] == 'undefined') {
        exists = false;
    } else {
        exists = true;
    }
    
    // Set the setting
    if(typeof value != 'undefined' && ((exists && !only_not_exists) || (!exists && only_not_exists))) {
        if(typeof value.toString() != 'undefined') {
            localStorage[name] = value.toString();
        } else {
            localStorage[name] = value;
        }
        
        return value;
    } else {
        // Return the value
        value = localStorage[name];
        if(value == 'true') return true;
        if(value == 'false') return false;
        if(!isNaN(parseInt(value))) return parseInt(value);
        return value;
    }
}

// Format the time to the format h:mm:ss
function format_time(hours, mins, secs, indef) {
    if(indef) return 'Indefinite';
    
    if(hours == null) hours = 0;
    if(mins == null) mins = 0;
    if(secs == null) secs = 0;
    
    return hours.toString() +':'+ (mins < 10 ? '0' : '') + mins.toString() +':'+ (secs < 10 ? '0' : '') + secs.toString();
}

// Error handler
function error_notice(error, url, line) {
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
    $('#tasks').css({'text-align': 'left'}).html('<div id="js-error">An error has occurred somewhere. Please report a bug with the following information, as well as what you did/what happened:<br /><br /></div>');
    $('#tasks').append('<strong>App Version:</strong> '+ chrome.app.getDetails().version +'<br />');
    $('#tasks').append('<strong>Error Message:</strong> '+ msg +'<br />');
    if(!trace) $('#tasks').append('<strong>URL:</strong> '+ url +'<br />');
    if(!trace) $('#tasks').append('<strong>Line number:</strong> '+ line +'<br />');
    if(trace) $('#tasks').append('<strong>Stack trace:</strong><br />'+ printStackTrace({e: error}).join('<br />') +'<br />');
    $('#tasks').append('<strong>localStorage:</strong><br />'+ JSON.stringify(localStorage));
    
    // Make sure the error message is visible
    $('#tasks').show();
    $('.modal').hide();
    alert('An error has occurred!');
}
