var load, tasks = new Array(), task_count = 0, save_timeout, task_running = new Array(), timer;

$(document).ready(function() {
    // Set some variables
    load = $('#loading');
    if(typeof localStorage['confirm-reset'] == 'undefined') localStorage['confirm-reset'] = 'true';
    
    // Retrieve any tasks they've previously added
    if(localStorage['tasks']) {
        tasks = JSON.parse(localStorage['tasks']);
        task_count = tasks.length;
        
        for(i = 0; i < task_count; i++) {
            list_task(i, 0);
            task_running[i] = false;
        }
    }
    
    // Load settings
    Load();
    
    // Enable the add task fields
    $('.field').removeAttr('disabled');
    
    // Set focus on the new task name field
    setTimeout(function() { $('#new-txt').focus(); }, 100);
    
    // Start the update timer
    update_time();
    
    
    
    // User clicked the Close button in the notice
    $('#close-notice').click(function() {
        $('#notice').fadeOut(600);
        localStorage['hide-notice'] = 'true';
        $('#hide-notice').attr('checked', 'checked');
    });
    
    // User clicked the Add Task button
    $('#new-btn').click(function() {
        var goal = parseFloat($('#new-goal').val());
        
        if($('#new-txt').val() !== '' && goal > 0 && goal <= 80) {
            load.show();
            
            add_task({
                'text': $('#new-txt').val(),
                'current': 0.0,
                'goal': goal
            });
            save();
            
            $('#new-txt').val('');
            load.hide();
        }
    });
    
    // User pressed enter in the task name field
    $('#new-txt').keypress(function (e) {
        if(e.keyCode == 13 && !$('#new-btn').attr('disabled')) {
            $('#new-btn').click();
        }
    });
    
    // User pressed enter in the task goal field
    $('#new-goal').keypress(function (e) {
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
    
    // If the user has chosen to use a custom sound, set the audo element's src to the custom sound path
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

// Format the time to the format hh:mm:ss from a decimal
function format_time(decimal) {
    var hours = Math.floor(decimal);
    var minutes = Math.floor((decimal - hours) * 60);
    var seconds = Math.floor((decimal - hours - (minutes / 60)) * 3600)
    
    minutes = (minutes < 10 ? '0' : '') + minutes.toString();
    seconds = (seconds < 10 ? '0' : '') + seconds.toString();
    
    return hours.toString() +':'+ minutes +':'+ seconds;
}
