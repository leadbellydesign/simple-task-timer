var load, tasks = new Array(), task_running = new Array(), task_count = 0;
var dragging = false, preview_sound = false, tools_open = false, errord = false;
var current_plot = false, total_plot = false;
var save_timer, timer, timer_step = 0;

var settings_checkboxes = {
    'enable-charts': true,
    'confirm-reset': true,
    'confirm-delete': true,
    'autostart-default': false,
    'save-fields': true,
    
    'stop-timer': true,
    'only-one': false,
    
    'show-popup': true,
    'notify': false,
    'loop-sound': false
};

// Set error event (most important event)
window.onerror = function(msg, url, line) { error_notice(msg, url, line); };

// Document finished loading
$(document).ready(function() {
    try {
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
                
                $('#task-list').tableDnDUpdate();
                
                if($('#new-start').is(':checked')) toggle_task(task_count - 1);
                save();
                
                $('#new-txt').val('');
                if(setting('autostart-default')) $('#new-start').attr('checked', 'checked');
                rebuild_charts();
            } else {
                $('#error').text(locale('invalid')).center().stop(true, true).fadeIn(600).delay(2000).fadeIn(10, function() {
                    $(this).stop(true, true).fadeOut(600);
                });
            }
        });
        
        // User toggled the new task indefinite checkbox
        $('#new-goal-indef').change(function() {
            if($(this).is(':checked')) {
                $('#new-goal-hours, #new-goal-mins').attr('disabled', 'disabled') 
            } else {
                $('#new-goal-hours, #new-goal-mins').removeAttr('disabled');
            }
        });
        
        // User pressed enter in one of the new task fields
        $('#new-task input').keypress(function (e) {
            if(e.keyCode == 13 && !$('#new-btn').attr('disabled')) {
                $('#new-btn').click();
            }
        });
        
        // User clicked away from the goal fields
        $('#new-goal-hours, #new-goal-mins').blur(function() {
            if($(this).val() == '' || parseInt($(this).val()) < 0) $(this).val('0');
        });
        
        // User toggled the refreshed checkbox
        $('#refreshed').change(function() {
            if($('#refreshed').is(':checked')) {
                $('.clear-data').first().removeAttr('disabled');
            } else {
                $('.clear-data').first().attr('disabled', 'disabled');
            }
        });
        
        // User clicked the totals row help button
        $('#totals-help').click(function() {
            alert(locale('totalsHelp'));
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
        
        // User is leaving the page... Save the data.
        $(window).unload(function() {
            save();
        });
        
        // User resized window
        $(window).resize(function() {
            $('#error, #saved, #alarm').center();
            if(tools_open) $('#tools-menu').css({left: ((($(window).width() - $('#tools-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'});
        });
        
        
        
        // User clicked the tools button
        $('#tools-button').click(function() {
            Load();
            tools_open = true;
            setting('new-settings', false);
            
            $('div.modal').fadeIn(600, function() { $('#tools-pulsate').stop(1, 1).fadeOut(400); });
            $('#tools-menu').animate({left: ((($(window).width() - $('#tools-menu').outerWidth(true)) / $(window).width()) * 100).toString() + '%'}, 600);
        });
        
        // User clicked the close button in the tools modal
        $('#close-modal').click(function() {
            Load();
            tools_open = false;
            
            $('.modal').fadeOut(600);
            $('#tools-menu').animate({left: '100%'}, 600);
        });
        
        // User clicked the delete tasks button
        $('#delete-tasks').click(function() {
            if(confirm(locale('confirmDeleteTasks'))) {
                for(i = task_count - 1; i >= 0; i--) {
                    delete_task(i, true);
                }
            }
        });
        
        // User clicked the save button in the tools modal
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
            
            clearTimeout(timer);
            timer = setTimeout('update_time()', setting('update-time') * 1000);
            
            rebuild_list();
            editing_task = -1;
            
            $('#saved').center().stop(true, true).fadeIn(600).delay(2000).fadeIn(10, function() {
                $(this).stop(true, true).fadeOut(600);
            });
        });
        
        // User changed the play sound checkbox
        $('#play-sound').change(function() {
            if($('#play-sound').is(':checked')) {
                $('#sound-type, #preview-sound, #loop-sound').removeAttr('disabled');
                if($('#sound-type').val() == '2') $('#custom-sound').removeAttr('disabled');
            } else {
                $('#sound-type, #custom-sound, #preview-sound, #loop-sound').attr('disabled', 'disabled');
            }
        });
        
        // User changed the loop sound checkbox
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
        
        // User clicked the stop alarm button
        $('#close-alarm').click(function() {
            document.getElementById('sound').pause();
            document.getElementById('sound').currentTime = 0;
            $('#alarm, .modal').fadeOut(600);
        });
        
        
        /**************************************************
         ***********      D O   S T U F F       ***********
         **************************************************/
        
        // Set some variables
        load = $('#loading');
        
        // Localise the page
        localisePage();
        
        // Check the version, and show the changelog if necessary
        if(typeof localStorage['old-version'] != 'undefined') {
            if(chrome.app.getDetails().version != localStorage['old-version'] && confirm(locale('updated', chrome.app.getDetails().version))) {
                window.open('about.html#changelog');
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
        
        // Enable the add task fields
        $('#new-task input, #new-task button').removeAttr('disabled');
        
        // Check the auto-start box if enabled, and fill in the new task fields if enabled
        if(setting('autostart-default')) $('#new-start').attr('checked', 'checked');
        if(setting('save-fields')) {
            $('#new-txt').val(setting('field-name', '', true));
            $('#new-goal-hours').val(setting('field-hours', '4', true));
            $('#new-goal-mins').val(setting('field-mins', '0', true));
            
            if(setting('field-start', false, true)) $('#new-start').attr('checked', 'checked');
            if(setting('field-indef', false, true)) {
                $('#new-goal-indef').attr('checked', 'checked');
                $('#new-goal-hours').attr('disabled', 'disabled');
                $('#new-goal-mins').attr('disabled', 'disabled');
            }
        }
        
        // Set focus on the new task name field
        setTimeout(function() { $('#new-txt').focus(); }, 100);
        
        // Start the timers
        update_time();
        save_timer = setTimeout('save(true)', 60000);
        
        // Add to the launch count, and show a rating reminder if at a multiple of 6
        localStorage['launches'] = typeof localStorage['launches'] == 'undefined' ? 1 : parseInt(localStorage['launches']) + 1;
        var launches = setting(launches);
        
        if(launches % 6 == 0 && typeof localStorage['rated'] == 'undefined' && confirm(locale('rating'))) {
            localStorage['rated'] = 'true';
            window.open('https://chrome.google.com/webstore/detail/aomfjmibjhhfdenfkpaodhnlhkolngif');
        }
        
        // Make the table rows draggable
        $('#task-list').tableDnD({
            dragHandle: 'drag',
            
            /*onDragStart: function(table, row) {
                alert($(row).html());
                var id = parseInt($(row).attr('id').replace('task-', ''));
                dragging = tasks[id];
            },*/
            
            onDrop: function(table, row) {
                var old_id = parseInt($(row).attr('id').replace('task-', ''));
                var id = $('#task-list tbody tr').index(row);
                var tmp = tasks[old_id], tmp2 = task_running[old_id];
                
                if(typeof tasks[old_id] != 'undefined' /*&& tasks[old_id] === dragging*/) {
                    tasks.splice(old_id, 1);
                    tasks.splice(id, 0, tmp);
                    task_running.splice(old_id, 1);
                    task_running.splice(id, 0, tmp2);
                }
                
                rebuild_list();
            }
        });
        
        $('#tasks').show();
        tools_pulsate();
        rebuild_totals();
        rebuild_charts();
    } catch(e) {
        error_notice(e);
    }
});

// Rebuild the task list
function rebuild_list() {
    editing_task = -1;
    $('#task-list tbody').empty().removeClass('editing-name editing-current editing-goal');
    
    for(i = 0; i < task_count; i++) {
        list_task(i, 0);
    }
    
    $('#task-list').tableDnDUpdate();
    rebuild_totals();
    rebuild_charts();
}

// Rebuild the totals row
function rebuild_totals() {
    if(task_count > 0) {
        var current_hours = 0, current_mins = 0, current_secs = 0, goal_hours = 0, goal_mins = 0, dec_current = 0, dec_this_current, dec_this_goal, progress, i;
        
        // Get the total hours, minutes, and seconds
        for(i = 0; i < task_count; i++) {
            current_hours += tasks[i].current_hours;
            current_mins += tasks[i].current_mins;
            current_secs += tasks[i].current_secs;
            
            if(!tasks[i].indefinite) {
                goal_hours += tasks[i].goal_hours;
                goal_mins += tasks[i].goal_mins;
                
                // Don't add excess time spent
                dec_this_current = tasks[i].current_hours + (tasks[i].current_mins / 60) + (tasks[i].current_secs / 3600);
                dec_this_goal = tasks[i].goal_hours + (tasks[i].goal_mins / 60);
                dec_current += dec_this_current > dec_this_goal ? dec_this_goal : dec_this_current;
            }
        }
        
        // Fix things like 12:72:142
        if(current_secs > 59) {
            current_mins += Math.floor(current_secs / 60);
            current_secs = current_secs % 60;
        }
        if(current_mins > 59) {
            current_hours += Math.floor(current_mins / 60);
            current_mins = current_mins % 60;
        }
        if(goal_mins > 59) {
            goal_hours += Math.floor(goal_mins / 60);
            goal_mins = goal_mins % 60;
        }
        
        // Get the total progress done
        progress = Math.floor(dec_current / (goal_hours + (goal_mins / 60)) * 100);
        if(isNaN(progress)) progress = 0;
        
        // Display
        $('#task-list tfoot td.current').text(format_time(current_hours, current_mins, current_secs));
        $('#task-list tfoot td.goal').text(format_time(goal_hours, goal_mins, 0));
        $('#task-list tfoot progress').text(progress.toString() + '%').val(progress);
        
        if(task_count >= 2) $('#task-list tfoot').fadeIn(); else $('#task-list tfoot').fadeOut();
    }
}

// Update the pie charts
function rebuild_charts() {
    if(setting('enable-charts') && typeof tasks[0] != 'undefined') {
        var plot_data = new Array(), total_time = 0, i;
        
        // Get the total of all times
        for(i = 0; i < task_count; i++) {
            total_time += (tasks[i].current_hours) + (tasks[i].current_mins / 60) + (tasks[i].current_secs / 3600);
        }
        
        // Display charts container
        if(total_time > 0) $('#charts').fadeIn(); else $('#charts').fadeOut();
        
        // Build the time spent chart
        for(i = 0; i < task_count; i++) {
            plot_data[i] = {
                label: tasks[i].text,
                data: ((tasks[i].current_hours) + (tasks[i].current_mins / 60) + (tasks[i].current_secs / 3600)) / total_time * 100
            };
        }
        
        
        // Display the time spent chart
        if(current_plot) {
            /*current_plot.setData(plot_data);
            current_plot.setupGrid();
            current_plot.draw();*/
            current_plot = $.plot($('#current-pie-chart'), plot_data, {
                series: {
                    pie: {
                        show: true
                    }
                },
                
                legend: {
                    show: false
                }
            });
        } else {
            current_plot = $.plot($('#current-pie-chart'), plot_data, {
                series: {
                    pie: {
                        show: true
                    }
                },
                
                legend: {
                    show: false
                }
            });
        }
    } else {
        $('#charts').fadeOut();
    }
}

// Load the settings
function Load() {
    $('#custom-sound').val(setting('custom-sound', '', true));
    $('#update-time').val(setting('update-time', 1, true));
    $('#chart-update-time').val(setting('chart-update-time', 3, true));
    
    // Check/uncheck checkboxes
    $.each(settings_checkboxes, function(i, v) {
        if(setting(i, v, true)) {
            $('#'+ i).attr('checked', 'checked');
        } else {
            $('#'+ i).removeAttr('checked');
        }
    });
    
    // Display/hide the notice
    if(setting('hide-notice', false, true)) {
        $('#hide-notice').attr('checked', 'checked');
        $('#notice').hide();
    } else {
        $('#hide-notice').removeAttr('checked');
        $('#notice').show();
    }
    
    // Set the audio to loop if looping is enabled
    if(setting('loop-sound', false, true)) {
        $('#sound').attr('loop', 'loop');
        $('#close-alarm').text(locale('stopAlarm'));
        $('#show-popup').attr('disabled', 'disabled');
    } else {
        $('#sound').removeAttr('loop');
        $('#close-alarm').text(locale('close'));
        $('#show-popup').removeAttr('disabled');
    }
    
    // Do stuff for the notification sound
    if(setting('play-sound', true, true)) {
        $('#play-sound').attr('checked', 'checked');
        $('#sound-type, #preview-sound, #loop-sound').removeAttr('disabled');
        if($('#sound-type').val() == '2') {
            $('#custom-sound').removeAttr('disabled');
        } else {
            $('#custom-sound').attr('disabled', 'disabled');
        }
    } else {
        $('#play-sound').removeAttr('checked');
        $('#sound-type, #custom-sound, #preview-sound, #loop-sound').attr('disabled', 'disabled');
    }
    
    // If the user has chosen to use a custom sound, set the audio element's src to the custom sound path
    if(setting('sound-type', 1, true) == 2) {
        $('#sound').attr('src', setting('custom-sound'));
    } else {
        $('#sound').attr('src', 'Deneb.ogg');
    }
}

// Save the data in localStorage
function save(timeout) {
    if(timeout) load.show();
    $('button.delete, #new-btn').attr('disabled', 'disabled');
    
    // Save task data
    localStorage['tasks'] = JSON.stringify(tasks);
    
    // Save current new task field contents
    if(setting('save-fields')) {
        setting('field-name', $('#new-txt').val());
        setting('field-hours', $('#new-goal-hours').val());
        setting('field-mins', $('#new-goal-mins').val());
        setting('field-indef', $('#new-goal-indef').is(':checked'));
        setting('field-start', $('#new-start').is(':checked'));
    }
    
    // Timeout
    clearTimeout(save_timer);
    save_timer = setTimeout('save(true)', 60000);
    
    $('button.delete, #new-btn').removeAttr('disabled');
    if(timeout) load.hide();
}

// The little pulsate effect on the tools button
function tools_pulsate() {
    if(setting('new-settings', true, true)) {
        $('#tools-pulsate').animate({width: '150px', height: '150px'}, 800).animate({width: '75px', height: '75px'}, 800);
        setTimeout('tools_pulsate()', 1600);
    }
}