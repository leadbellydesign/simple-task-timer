$(document).ready(function() {
    /**************************************************
     ******     G E N E R A L   E V E N T S      ******
     **************************************************/
    // User clicked away from the goal fields
    $('#new-goal-hours, #new-goal-mins').blur(function() {
        if($(this).val() == '' || parseInt($(this).val()) < 0) $(this).val('0');
    });
    
    // User resized window
    $(window).resize(function() {
        $('#error, #saved, #alarm-menu').center();
        if(task_open) $('#task-menu').css({left: ((($(window).width() - $('#task-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'});
        if(tools_open) $('#tools-menu').css({left: ((($(window).width() - $('#tools-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'});
    });
    
    // User is leaving the page... Save the data.
    $(window).unload(function() {
        save();
    });
    
    // Preview sound is ready
    $('#preview').bind('canplay', function() {
        if(preview_sound) {
            preview_sound = false;
            this.play();
            $('#preview-sound').text(locale('optPreview')).removeAttr('disabled');
        }
    });

    // Preview sound invalid
    $('#preview').error(function() {
        if(preview_sound) {
            preview_sound = false;
            $('#preview-sound').text(locale('error'));
            setTimeout(function() { $('#preview-sound').text(locale('optPreview')).removeAttr('disabled'); }, 2000);
        }
    });
    
    
    /**************************************************
     *******     B U T T O N   E V E N T S      *******
     **************************************************/
    // User clicked the Add Task button
    $('#new-btn').click(function() {
        if($('#new-goal-hours').val() == '' || parseInt($('#new-goal-hours').val()) < 0) $('#new-goal-hours').val('0');
        if($('#new-goal-mins').val() == '' || parseInt($('#new-goal-mins').val()) < 0) $('#new-goal-mins').val('0');
        
        var hours = parseInt($('#new-goal-hours').val()), mins = parseInt($('#new-goal-mins').val()), indef = $('#new-goal-indef').is(':checked');
        
        if($('#new-txt').val() != '' && (hours > 0 || mins > 0 || indef)) {
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
            
            $('table#task-list').tableDnDUpdate();
            
            if($('#new-start').is(':checked')) toggle_task(task_count - 1);
            save();
            
            $('#new-txt').val('');
            if(setting('autostart-default')) $('#new-start').attr('checked', 'checked');
            rebuild_charts();
        } else {
            error('invalid');
        }
    });
    
    // User clicked the save button in the tools menu
    $('#save-settings').click(function() {
        // Save the state of the checkboxes
        for(i in settings_checkboxes) {
            setting(i, $('#'+ i).is(':checked'));
        }
        
        // Save the other field types
        setting('sound-type', $('#sound-type').val());
        setting('custom-sound', $('#custom-sound').val());
        
        if(parseInt($('#update-time').val()) > 0 && parseInt($('#update-time').val()) <= 60) {
            setting('update-time', $('#update-time').val());
        }
        if(parseInt($('#chart-update-time').val()) > 0 && parseInt($('#chart-update-time').val()) <= 60) {
            setting('chart-update-time', parseInt($('#chart-update-time').val()));
        }
        
        // Check for notification permissions
        if(setting('notify')) {
            webkitNotifications.requestPermission(function() {
                webkitNotifications.createNotification('/style/images/icon-64.png', locale('notificationsWork'), locale('notificationsWorkBody')).show();
            });
        }
        
        // Check the auto-start box if setting is enabled
        if(setting('autostart-default')) $('#new-start').attr('checked', 'checked');
        
        // Hide/show the notice box
        if(setting('hide-notice')) $('#notice').fadeOut(800); else $('#notice').fadeIn(800);
        
        clearTimeout(timer);
        timer = setTimeout('update_time()', setting('update-time') * 1000);
        
        rebuild_list();
        editing_task = -1;
        
        success('saved');
    });
    
    // User clicked one of the clear data buttons
    $('.clear-data').click(function() {
        if(confirm(locale('confirmResetData'))) {
            $(window).unbind();
            clearTimeout(save_timer);
            clearTimeout(timer);
            localStorage.clear();
            location.reload();
        }
    });
    
    // User clicked the totals info button
    $('.totals-info').click(function() {
        alert(locale('totalsHelp'));
    });
    
    // User clicked the reset all button
    $('.reset-all').click(function() {
        if(confirm(locale('confirmResetAll'))) {
            for(t = 0; t < task_count; t++) {
                reset_task(t, true);
            }
        }
    });
    
    // User clicked the delete all button
    $('.delete-all').click(function() {
        if(confirm(locale('confirmDeleteAll'))) {
            for(t = task_count - 1; t >= 0; t--) {
                delete_task(t, true);
            }
        }
    });
    
    // User clicked the close button in one of the menus
    $('.close-menus').click(function() {
        Load();
        tools_open = false;
        
        $('#modal').fadeOut(600);
        $('#tools-menu').animate({left: '100%'}, 600);
    });
    
    // User clicked the close alarm button
    $('#close-alarm').click(function() {
        document.getElementById('sound').pause();
        document.getElementById('sound').currentTime = 0;
        alarm_open = false;
        
        $('#alarm-menu').fadeOut(600);
        if(!task_open && !tools_open) $('#modal').fadeOut(600);
    });
    
    // User clicked the Close button in the notice
    $('#close-notice').click(function() {
        $('#notice').fadeOut(600);
        setting('hide-notice', true);
    });
    
    // User clicked the tools button
    $('#tools-button').click(function() {
        Load();
        tools_open = true;
        setting('new-settings', false);
        
        $('#modal').fadeIn(600, function() { $('#tools-pulsate').stop(true, true).fadeOut(400); });
        $('#tools-menu').animate({left: ((($(window).width() - $('#tools-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'}, 600);
    });
    
    // User clicked the info button on a task
    $('button.task-info').click(function() {
        task_open = true;
        
        $('#modal').fadeIn(600);
        $('#task-menu').animate({left: ((($(window).width() - $('div#task-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'}, 600);
    });
    
    
    /**************************************************
     ********     I N P U T   E V E N T S      ********
     **************************************************/
    // User toggled the new task indefinite checkbox
    $('#new-goal-indef').change(function() {
        if($(this).is(':checked')) {
            $('#new-goal-hours, #new-goal-mins').attr('disabled', 'disabled') 
        } else {
            $('#new-goal-hours, #new-goal-mins').removeAttr('disabled');
        }
    });
    
    // User toggled the refreshed checkbox
    $('#refreshed').change(function() {
        if($('#refreshed').is(':checked')) {
            $('.clear-data').first().removeAttr('disabled');
        } else {
            $('.clear-data').first().attr('disabled', 'disabled');
        }
    });
    
    // User toggled the play sound checkbox
    $('#play-sound').change(function() {
        if($('#play-sound').is(':checked')) {
            $('#sound-type, #preview-sound, #loop-sound').removeAttr('disabled');
            if($('#sound-type').val() == '2') $('#custom-sound').removeAttr('disabled');
        } else {
            $('#sound-type, #custom-sound, #preview-sound, #loop-sound').attr('disabled', 'disabled');
        }
    });

    // User toggled the loop sound checkbox
    $('#loop-sound').change(function() {
        if($('#loop-sound').is(':checked')) {
            $('#show-popup').attr('disabled', 'disabled');
        } else {
            $('#show-popup').removeAttr('disabled');
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
        $(this).text(locale('loading')).attr('disabled', 'disabled');
    });
    
    // User pressed enter in one of the new task fields
    $('#new-task input').keypress(function (e) {
        if(e.keyCode == 13 && !$('#new-btn').attr('disabled')) {
            $('#new-btn').click();
        }
    });
});