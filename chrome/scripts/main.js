var load, tasks = new Array(), task_running = new Array(), task_count = 0, save_timeout, timer;

$(document).ready(function() {
    // Set some variables
    load = $('#loading');
    
    // Check the version, and show the changelog if necessary
    if(typeof localStorage['old-version'] == 'undefined') localStorage['old-version'] = '0';
    if(chrome.app.getDetails().version != localStorage['old-version'] && confirm('Task Timer has been updated!\nWould you like to see the changelog?')) {
        window.open('changelog.html');
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
            
            list_task(i, 0);
            task_running[i] = false;
        }
    }
    
    // Load settings
    Load();
    
    // Enable the add task fields
    $('#new-task input, #new-task button').removeAttr('disabled');
    
    // Set focus on the new task name field
    setTimeout(function() { $('#new-txt').focus(); }, 100);
    
    // Start the update timer
    update_time();
    
    // Add to the launch count, and show a rating reminder if at a multiple of 6
    localStorage['launches'] = typeof localStorage['launches'] == 'undefined' ? 1 : parseInt(localStorage['launches']) + 1;
    var launches = parseInt(localStorage['launches']);
    
    if(launches % 6 == 0 && typeof localStorage['rated'] == 'undefined' && confirm('Would you like to give this app a rating/review on the Chrome Web Store? It really helps out!')) {
        localStorage['rated'] = 'true';
        window.open('https://chrome.google.com/webstore/detail/aomfjmibjhhfdenfkpaodhnlhkolngif');
    }
    
    
    
    // User clicked the Close button in the notice
    $('#close-notice').click(function() {
        $('#notice').fadeOut(600);
        localStorage['hide-notice'] = 'true';
        $('#hide-notice').attr('checked', 'checked');
    });
    
    // User clicked the Add Task button
    $('#new-btn').click(function() {
        if($('#new-txt').val() != '' && (parseInt($('#new-goal-hrs').val()) > 0 || parseInt($('#new-goal-mins').val()) > 0)) {
            add_task({
                'text': $('#new-txt').val(),
                'current_hours': 0,
                'current_mins': 0,
                'current_secs': 0,
                'goal_hours': parseInt($('#new-goal-hrs').val()),
                'goal_mins': parseInt($('#new-goal-mins').val())
            });
            save();
            
            $('#new-txt').val('');
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
        $('.modal').fadeIn(400, function() { $('#modal-contents').show().animate({'height': '240px'}).animate({'width': '500px'}); });
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
        
        localStorage['notify'] = $('#notify').is(':checked').toString();
        localStorage['play-sound'] = $('#play-sound').is(':checked').toString();
        localStorage['sound-type'] = $('#sound-type').val();
        localStorage['custom-sound'] = $('#custom-sound').val();
        
        if(parseInt($('#update-time').val()) > 0 && parseInt($('#update-time').val()) < 60) {
            localStorage['update-time'] = parseInt($('#update-time').val());
        }
        
        // Check for notification permissions
        if(localStorage['notify'] == 'true') {
            webkitNotifications.requestPermission(function() {
                webkitNotifications.createNotification('/style/images/icon-64.png', 'Desktop Notifications Work!', 'You seeing this means desktop notifications are enabled and working correctly! Woo!').show();
            });
        }
        
        clearTimeout(timer);
        timer = setTimeout('update_time()', parseInt(localStorage['update-time']) * 1000);
        
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
    
    save();
    $('#tasks').show();
});



// Load the settings
function Load() {
    // Set default settings if they don't exist
    if(typeof localStorage['hide-notice'] == 'undefined') localStorage['hide-notice'] = 'false';
    if(typeof localStorage['confirm-reset'] == 'undefined') localStorage['confirm-reset'] = 'true';
    if(typeof localStorage['confirm-delete'] == 'undefined') localStorage['confirm-delete'] = 'true';
    if(typeof localStorage['notify'] == 'undefined') localStorage['notify'] = 'false';
    if(typeof localStorage['play-sound'] == 'undefined') localStorage['play-sound'] = 'true';
    if(typeof localStorage['sound-type'] == 'undefined') localStorage['sound-type'] = '1';
    if(typeof localStorage['custom-sound'] == 'undefined') localStorage['custom-sound'] = '';
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
    
    $.each({'confirm-reset': 0, 'confirm-delete': 0, 'notify': 0}, function(i, v) {
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
    localStorage['tasks'] = JSON.stringify(tasks);
    
    clearTimeout(save_timeout);
    save_timeout = setTimeout('save(true)', 60000);
    
    window.status = 'Saved.';
    if(timeout) load.hide();
}

// Format the time to the format h:mm:ss
function format_time(hours, mins, secs) {
    return hours.toString() +':'+ (mins < 10 ? '0' : '') + mins.toString() +':'+ (secs < 10 ? '0' : '') + secs.toString();
}
