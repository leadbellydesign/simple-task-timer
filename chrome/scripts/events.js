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
        
        check_width();
    });
    
    // User is leaving the page... Save the data.
    $(window).unload(function() {
        SaveTasks();
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
            // Cancel editing and add the task
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
            
            // Start the task if the start checkbox is checked and save the tasks
            if($('#new-start').is(':checked')) toggle_task(task_count - 1);
            SaveTasks();
            
            // Update table, text fields, etc.
            $('#new-txt').val('');
            $('table#task-list').tableDnDUpdate();
            if(Setting('autostart-default')) $('#new-start').attr('checked', 'checked');
            rebuild_charts();
        } else {
            error('invalid');
        }
    });
    
    // User clicked the save button in the tools menu
    $('#save-settings').click(function() {
        SaveSettings();
    });
    
    // User clicked the reset settings button
    $('#reset-settings').click(function() {
        if(confirm(locale('confirmResetSettings'))) {
            // Reset checkbox settings
            for(i in settings_checkboxes) {
                Setting(i, settings_checkboxes[i]);
            }
            
            // Reset other settings
            for(i in settings_other) {
                Setting(i, settings_other[i]);
            }
            
            // Reload settings
            LoadSettings(true, true);
        }
    });
    
    // User clicked the clear all history button
    $('#clear-all-history').click(function() {
        if(confirm(locale('confirmClearAllHistory'))) {
            for(t = 0; t < task_count; t++) {
                tasks[t].history = {};
            }
        }
    });
    
    // User clicked one of the clear data buttons
    $('.clear-data').click(function() {
        if(confirm(locale('confirmResetData'))) {
            $(window).unbind();
            clearTimeout(save_timer);
            clearTimeout(timer);
            localStorage.clear();
            location.reLoadSettings();
        }
    });
    
    // User clicked the totals help button
    $('.totals-help').click(function() {
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
        LoadSettings();
        tools_open = false;
        task_open = false;
        displaying_task = -1;
        
        $('#modal').fadeOut(600);
        $('#task-menu, #tools-menu').animate({left: '100%'}, 600);
    });
    
    // User clicked the close alarm button
    $('#close-alarm').click(function() {
        alarm_open = false;
        
        // Stop the sound
        if(Setting('play-sound')) {
            document.getElementById('sound').pause();
            document.getElementById('sound').currentTime = 0;
        }
        
        // Hide the popup
        $('#alarm-menu').fadeOut(600);
        if(!task_open && !tools_open) $('#modal').fadeOut(600);
    });
    
    // User clicked the Close button in the notice
    $('#close-notice').click(function() {
        $('#notice').fadeOut(600);
        Setting('hide-notice', true);
    });
    
    // User clicked the tools button
    $('#tools-button').click(function() {
        LoadSettings();
        tools_open = true;
        Setting('new-tools', false);
        
        $('#modal').fadeIn(600, function() { $('#tools-pulsate').stop(true, true).fadeOut(400); });
        $('#tools-menu').animate({left: ((($(window).width() - $('#tools-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'}, 600);
    });
    
    // User clicked the toggle button in the task info menu
    $('#task-toggle').click(function() {
        toggle_task(parseInt($(this).attr('name')));
    });
    
    // User clicked the reset button in the task info menu
    $('#task-reset').click(function() {
        reset_task(parseInt($(this).attr('name')));
    });
    
    // User clicked the delete button in the task info menu
    $('#task-delete').click(function() {
        cancel_edit();
        delete_task(parseInt($(this).attr('name')));
        $('.close-menus').click();
    });
    
    // User clicked the clear history button in the task info menu
    $('#task-clear-history').click(function() {
        var task = parseInt($(this).attr('name'));
        
        if(confirm(locale('confirmClearHistory', tasks[task].text))) {
            tasks[task].history = {};
        }
    });
    
    // User clicked the preview button for the notification sound
    $('#preview-sound').click(function() {
        // Verify that the custom sound URL is valid
        if(!verify_custom_sound(true)) {
            error(locale('invalidURL'));
            $('#custom-sound').focus();
            return false;
        }
        
        // Play preview sound
        if($('#sound-type').val() == 1 || $('#custom-sound').val() != '') {
            preview_sound = true;
            $('#preview').attr('src', $('#sound-type').val() == 1 ? 'Deneb.ogg' : $('#custom-sound').val());
            $(this).text(locale('loading')).attr('disabled', 'disabled');
        }
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
        
        verify_custom_sound();
    });
    
    // User changed the custom sound URL field
    $('#custom-sound').keyup(function() {
        verify_custom_sound();
    });
    
    // User pressed enter in one of the new task fields
    $('#new-task input').keypress(function (e) {
        if(e.keyCode == 13 && !$('#new-btn').attr('disabled')) {
            $('#new-btn').click();
        }
    });
});