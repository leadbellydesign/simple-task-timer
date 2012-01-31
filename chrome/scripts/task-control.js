// Add a task
function add_task(data) {
    tasks[task_count] = data;
    task_running[task_count] = false;
    task_count++;
    
    list_task(task_count - 1, (task_count - 1 == 0 ? 1 : 2));
    rebuild_totals();
}

// Reset a task
function reset_task(task, override) {
    try {
        if(override || !setting('confirm-reset') || confirm(locale('confirmReset', tasks[task].text))) {
            tasks[task].current_hours = tasks[task].current_mins = tasks[task].current_secs = 0;
            tasks[task].notified = false;
            rebuild_list();
            rebuild_totals();
        }
    } catch(e) {
        js_error(e);
    }
}

// Delete a task
function delete_task(task, override) {
    try {
        if(override || !setting('confirm-delete') || confirm(locale('confirmDelete', tasks[task].text))) {
            load.show();
            $('#new-btn, #task-'+ task +' button').attr('disabled', 'disabled');
            $('#task-'+ task +' img').addClass('disabled');
            $('table#task-list tbody tr').addClass('nodrag nodrop');
            $('table#task-list').tableDnDUpdate();
            
            if(task_running[task]) toggle_task(task);
            
            tasks.splice(task, 1);
            task_running.splice(task, 1);
            task_count--;
            
            // Animate accordingly.
            setTimeout(function() {
                if(task_count == 0) {
                    $('#edit-tasks').fadeOut();
                    $('table#task-list').fadeOut(400, function() {
                        $('table#task-list tbody').empty();
                        $('#no-tasks').fadeIn();
                        
                        $('#new-btn').removeAttr('disabled');
                    });
                } else {
                    $('#task-'+ task).fadeOut(400, function() {
                        rebuild_list();
                        $('#new-btn').removeAttr('disabled');
                    });
                }
                
                if(task_count >= 2) $('table#task-list tfoot').fadeIn(); else $('table#task-list tfoot').fadeOut();
            }, 20);
            
            save();
            $('#new-txt').focus();
            load.hide();
        }
    } catch(e) {
        js_error(e);
    }
}

// Toggle whether a task is running or not
function toggle_task(task) {
    try {
        if(task_running[task]) {
            task_running[task] = false;
            $('#task-'+ task +' button.toggle').text(locale('start'));
            $('#task-'+ task +' img.toggle').attr('title', locale('start')).attr('src', 'style/images/control_play_blue.png');
            $('#task-'+ task).removeClass('running');
        } else {
            // Disable other tasks if they have it set to allow only one running at a time
            if(setting('only-one')) {
                for(i = 0; i < task_count; i++) {
                    if(task_running[i]) toggle_task(i);
                }
            }
            
            task_running[task] = true;
            $('#task-'+ task +' button.toggle').text(locale('stop'));
            $('#task-'+ task +' img.toggle').attr('title', locale('stop')).attr('src', 'style/images/control_stop_blue.png');
            $('#task-'+ task).addClass('running');
        }
    } catch(e) {
        js_error(e);
    }
}

// Add the task to the list
function list_task(task, anim) {
    try {
        // Progress done
        var progress = Math.floor((tasks[task].current_hours + (tasks[task].current_mins / 60) + (tasks[task].current_secs / 3600)) / (tasks[task].goal_hours + (tasks[task].goal_mins / 60)) * 100);
        if(tasks[task].indefinite == true) progress = 0;
        if(progress == Infinity) progress = 100;
        
        // Create the row
        $('#row-template').clone().attr('id', 'task-'+ task).appendTo('table#task-list tbody');
        if(task_running[task]) $('#task-'+ task).addClass('running');
        
        // Text
        $('#task-'+ task +' td.text').text(tasks[task].text);
        $('#task-'+ task +' td.current').text(format_time(tasks[task].current_hours, tasks[task].current_mins, tasks[task].current_secs));
        $('#task-'+ task +' td.goal').text(format_time(tasks[task].goal_hours, tasks[task].goal_mins, 0, tasks[i].indefinite));
        $('#task-'+ task +' button.toggle').text(task_running[task] ? locale('stop') : locale('start'));
        $('#task-'+ task +' img.toggle').attr('title', task_running[task] ? locale('stop') : locale('start')).attr('src', 'style/images/control_'+ (task_running[task] ? 'stop' : 'play') +'_blue.png');
        
        // Progress bar
        if(!tasks[task].indefinite) {
            $('#task-'+ task +' progress').val(progress).text(progress + '%').attr('max', '100');
        } else {
            $('#task-'+ task +' progress').removeAttr('value').removeAttr('max').text('...');
        }
        
        // Option Buttons
        $('#task-'+ task +' .toggle').attr('name', task).click(function() {
            if(!$(this).hasClass('disabled')) toggle_task(parseInt($(this).attr('name')));
        });
        $('#task-'+ task +' .reset').attr('name', task).click(function() {
            if(!$(this).hasClass('disabled')) reset_task(parseInt($(this).attr('name')));
        });
        $('#task-'+ task +' .delete').attr('name', task).click(function() {
            if(!$(this).hasClass('disabled')) {
                cancel_edit();
                delete_task(parseInt($(this).attr('name')));
            }
        });
        
        // In-line editing events
        $('#task-'+ task +' td.text').dblclick(function() {
            edit_name(parseInt($(this).parent().attr('id').replace('task-', '')));
        });
        $('#task-'+ task +' td.current').dblclick(function() {
            edit_current(parseInt($(this).parent().attr('id').replace('task-', '')));
        });
        $('#task-'+ task +' td.goal').dblclick(function() {
            edit_goal(parseInt($(this).parent().attr('id').replace('task-', '')));
        });
        
        // Disable the toggle button if task is at its goal, and change the bg colour
        if(!tasks[task].indefinite && tasks[task].current_hours >= tasks[task].goal_hours && tasks[task].current_mins >= tasks[task].goal_mins) {
            if(setting('stop-timer')) {
                $('#task-'+ task +' button.toggle').attr('disabled', 'disabled');
                $('#task-'+ task +' img.toggle').attr('src', 'style/images/control_play.png').addClass('disabled');
            }
            
            $('#task-'+ task).addClass('done');
        }
        
        // Animation
        if(anim == 0) {
            // Show instantly
            $('#no-tasks').hide();
            $('#edit-tasks, table#task-list, #task-'+ task).show();
        } else if(anim == 1) {
            // Fade all at once
            $('#task-'+ task).show();
            $('#no-tasks').fadeOut(400, function() {
                $('#edit-tasks, table#task-list').fadeIn();
            });
        } else {
            // Fade in
            $('#task-'+ task).fadeIn();
        }
    } catch(e) {
        js_error(e);
    }
}

// Increase the current time on tasks that are running by a second
function update_time() {
    try {
        for(var i = 0; i < task_count; i++) {
            if(task_running[i]) {
                // Increment time
                tasks[i].current_secs += setting('update-time');
                if(tasks[i].current_secs >= 60) { tasks[i].current_secs -= 60; tasks[i].current_mins++; }
                if(tasks[i].current_mins >= 60) { tasks[i].current_mins -= 60; tasks[i].current_hours++; }
                
                // Stop updating this one if it's at the goal
                if(!tasks[i].indefinite && tasks[i].current_hours >= tasks[i].goal_hours && tasks[i].current_mins >= tasks[i].goal_mins) {
                    $('tr#task-'+ i).addClass('done');
                    
                    // Stop the timer
                    if(setting('stop-timer')) {
                        toggle_task(i);
                        $('tr#task-'+ i +' button.toggle').attr('disabled', 'disabled');
                        $('tr#task-'+ i +' img.toggle').attr('src', 'style/images/control_play.png').addClass('disabled');
                    }
                    
                    // Show notification and play the sound
                    if(!tasks[i].notified) {
                        tasks[i].notified = true;
                        
                        // Play sound
                        if(setting('play-sound')) document.getElementById('sound').play();
                        
                        // Show popup
                        if(setting('show-popup')) {
                            alarm_open = true;
                            
                            $('#alarm-txt').text(locale('taskFinishedLong', tasks[i].text));
                            $('#modal, #alarm-menu').fadeIn(600);
                            $('#alarm-menu').center();
                        }
                        
                        // Show Desktop Notification
                        if(setting('notify') && webkitNotifications.checkPermission() == 0) {
                            webkitNotifications.createNotification('/style/images/icon-64.png', locale('taskFinished'), locale('taskFinishedLong', tasks[i].text)).show();
                        }
                    }
                }
                
                // Progress done
                var progress = Math.floor((tasks[i].current_hours + (tasks[i].current_mins / 60) + (tasks[i].current_secs / 3600)) / (tasks[i].goal_hours + (tasks[i].goal_mins / 60)) * 100);
                if(tasks[i].indefinite) progress = 0;
                if(progress == Infinity) progress = 100;
                
                // Update list
                $('tr#task-'+ i +' td.current').text(format_time(tasks[i].current_hours, tasks[i].current_mins, tasks[i].current_secs));
                if(!tasks[i].indefinite) {
                    $('tr#task-'+ i +' progress').val(progress).attr('max', '100').text(progress.toString() +'%');
                }
            }
        }
        
        // Update totals row
        rebuild_totals();
        
        // Update pie charts
        if(timer_step >= setting('chart-update-time', 3, true)) {
            rebuild_charts();
            timer_step = 0;
        }
        
        // Do it again in a second
        timer = setTimeout('update_time()', setting('update-time') * 1000);
        timer_step++;
    } catch(e) {
        js_error(e);
    }
}