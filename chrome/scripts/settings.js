// Load the settings
function LoadSettings(reset_timer, from_save) {
    $('#sound-type').val(Setting('sound-type'));
    $('#custom-sound').val(Setting('custom-sound', '', true));
    $('#update-time').val(Setting('update-time', 1, true));
    $('#chart-update-time').val(Setting('chart-update-time', 3, true));
    
    // Check/uncheck checkboxes
    $.each(settings_checkboxes, function(i, v) {
        if(Setting(i, v, true)) {
            $('#'+ i).attr('checked', 'checked');
        } else {
            $('#'+ i).removeAttr('checked');
        }
    });
    
    // Display/hide the notice
    if(Setting('hide-notice', false, true)) {
        $('#hide-notice').attr('checked', 'checked');
        if(from_save) $('#notice').fadeOut(800); else $('#notice').hide();
    } else {
        $('#hide-notice').removeAttr('checked');
        if(from_save) $('#notice').fadeIn(800); else $('#notice').show();
    }
    
    // Switch to/from icons
    if(Setting('use-icons')) {
        $('.button-btns').hide();
        $('.img-btns').show();
    } else {
        $('.button-btns').show();
        $('.img-btns').hide();
    }
    
    // Show the history disabled message if necessary
    if(Setting('track-history')) {
        $('#history-disabled').hide();
        $('#history-group').show();
    } else {
        $('#history-disabled').show();
        $('#history-group').hide();
    }
    
    // Do stuff for the notification sound
    if(Setting('play-sound', true, true)) {
        $('#play-sound').attr('checked', 'checked');
        $('#sound-type, #preview-sound, #loop-sound').removeAttr('disabled');
        if($('#sound-type').val() == 2) {
            $('#custom-sound').removeAttr('disabled');
        } else {
            $('#custom-sound').attr('disabled', 'disabled');
        }
    } else {
        $('#play-sound').removeAttr('checked');
        $('#sound-type, #custom-sound, #preview-sound, #loop-sound').attr('disabled', 'disabled');
    }
    
    // Set the audio to loop if looping is enabled
    if(Setting('loop-sound', false, true) && Setting('play-sound')) {
        $('#sound').attr('loop', 'loop');
        $('#close-alarm').text(locale('stopAlarm'));
        $('#show-popup').attr('disabled', 'disabled');
    } else {
        $('#sound').removeAttr('loop');
        $('#close-alarm').text(locale('close'));
        $('#show-popup').removeAttr('disabled');
    }
    
    // Set the notification audio to the proper src
    if(Setting('sound-type', 1, true) == 2) {
        $('#sound').attr('src', Setting('custom-sound'));
    } else {
        $('#sound').attr('src', 'Deneb.ogg');
    }
    
    // Verify custom sound URL
    verify_custom_sound();
    
    // Reset timer
    if(reset_timer) {
        clearTimeout(timer);
        timer = setTimeout('update_time()', Setting('update-time') * 1000);
    }
}

function SaveSettings() {
    old_use_icons = Setting('use-icons');
    
    // Verify that the custom sound URL is valid
    if(!verify_custom_sound(true)) {
        error(locale('invalidURL'));
        $('#custom-sound').focus();
        return false;
    }
    
    // Save the state of the checkboxes
    for(i in settings_checkboxes) {
        Setting(i, $('#'+ i).is(':checked'));
    }
    
    // Save the sound type and custom sound URL
    Setting('sound-type', $('#sound-type').val());
    Setting('custom-sound', $('#custom-sound').val());
    
    // Save the update times
    if(parseInt($('#update-time').val()) > 0 && parseInt($('#update-time').val()) <= 60) {
        Setting('update-time', $('#update-time').val());
    }
    if(parseInt($('#chart-update-time').val()) > 0 && parseInt($('#chart-update-time').val()) <= 60) {
        Setting('chart-update-time', parseInt($('#chart-update-time').val()));
    }
    
    // Check for notification permissions
    if(Setting('notify')) {
        webkitNotifications.requestPermission(function() {
            webkitNotifications.createNotification('/style/images/icon-64.png', locale('notificationsWork'), locale('notificationsWorkBody')).show();
        });
    }
    
    // Reload settings and stuff
    LoadSettings(true, true);
    rebuild_list();
    success('saved');
}

// Return or set the value of a setting
function Setting(name, value, only_not_exists) {
    if(typeof only_not_exists == 'undefined') only_not_exists = false;
    
    // Check if the setting exists
    if(typeof localStorage[name] == 'undefined') {
        var exists = false;
    } else {
        var exists = true;
    }
    
    if(typeof value != 'undefined' && ((exists && !only_not_exists) || (!exists && only_not_exists))) {
        // Set the setting
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