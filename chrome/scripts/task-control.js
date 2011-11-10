// Add a task
function add_task(data) {
    tasks[task_count] = data;
    task_running[task_count] = false;
    list_task(task_count, (task_count == 0 ? 1 : 2));
    
    task_count++;
}

// Reset a task
function reset_task(task) {
    try {
        if(!setting('confirm-reset') || confirm(locale('confirmReset', tasks[task].text))) {
            tasks[task].current_hours = tasks[task].current_mins = tasks[task].current_secs = 0;
            tasks[task].notified = false;
            rebuild_list();
        }
    } catch(e) {
        error_notice(e);
    }
}

// Delete a task
function delete_task(task) {
    try {
        if(!setting('confirm-delete') || confirm(locale('confirmDelete', tasks[task].text))) {
            load.show();
            $('#new-btn, #task-'+ task +' button').attr('disabled', 'disabled');
            
            if(task_running[task]) toggle_task(task);
            
            tasks.splice(task, 1);
            task_running.splice(task, 1);
            task_count--;
            
            // Animate accordingly.
            if(task_count == 0) {
                setTimeout(function() {
                    $('#edit-tasks').fadeOut();
                    $('#task-list').fadeOut(400, function() {
                        $('#task-list tbody').empty();
                        $('#no-tasks').fadeIn();
                        
                        $('#new-btn').removeAttr('disabled');
                    });
                }, 10);
            } else {
                setTimeout(function() {
                    $('#task-'+ task).fadeOut(400, function() {
                        rebuild_list();
                        $('#new-btn').removeAttr('disabled');
                    });
                }, 10);
            }
            
            save();
            load.hide();
        }
    } catch(e) {
        error_notice(e);
    }
}

// Toggle whether a task is running or not
function toggle_task(task) {
    try {
        if(task_running[task]) {
            task_running[task] = false;
            $('#task-'+ task +' button.toggle').text(locale('start'));
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
            $('#task-'+ task).addClass('running');
        }
    } catch(e) {
        error_notice(e);
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
        $('#row-template').clone().attr('id', 'task-'+ task).appendTo('#task-list tbody');
        
        // Text
        $('#task-'+ task +' td.text').text(tasks[task].text);
        $('#task-'+ task +' td.current').text(format_time(tasks[task].current_hours, tasks[task].current_mins, tasks[task].current_secs));
        $('#task-'+ task +' td.goal').text(format_time(tasks[task].goal_hours, tasks[task].goal_mins, 0, tasks[i].indefinite));
        $('#task-'+ task +' button.toggle').text(task_running[task] ? locale('stop') : locale('start'));
        $('#task-'+ task +' progress').val(progress).text(progress.toString() +'%');
        
        if(task_running[task]) $('#task-'+ task).addClass('running');
        
        // Option Buttons
        $('#task-'+ task +' button.toggle').attr('name', task).click(function() {
            toggle_task(parseInt(this.name));
        });
        $('#task-'+ task +' button.reset').attr('name', task).click(function() {
            reset_task(parseInt(this.name));
        });
        $('#task-'+ task +' button.delete').attr('name', task).click(function() {
            cancel_edit();
            delete_task(parseInt(this.name));
        });
        
        // In-line editing events
        $('#task-'+ task +' td.text').dblclick(function() {
            edit_name(parseInt($(this).parent().attr('id').replace('task-', '')));
        });
        $('#task-'+ task +' td.goal').dblclick(function() {
            edit_goal(parseInt($(this).parent().attr('id').replace('task-', '')));
        });
        
        // Disable the toggle button if task is at its goal, and change the bg colour
        if(!tasks[task].indefinite && tasks[task].current_hours >= tasks[task].goal_hours && tasks[task].current_mins >= tasks[task].goal_mins) {
            if(setting('stop-timer')) $('#task-'+ task +' button.toggle').attr('disabled', 'disabled');
            $('#task-'+ task).addClass('done');
        }
        
        // Animation
        if(anim == 0) {
            // Show instantly
            $('#no-tasks').hide();
            $('#edit-tasks, #task-list, #task-'+ task).show();
        } else if(anim == 1) {
            // Fade all at once
            $('#task-'+ task).show();
            $('#no-tasks').fadeOut(400, function() {
                $('#edit-tasks, #task-list').fadeIn();
            });
        } else {
            // Fade in
            $('#task-'+ task).fadeIn();
        }
    } catch(e) {
        error_notice(e);
    }
}

// Rebuild the task list
function rebuild_list() {
    editing_task = -1;
    $('#task-list tbody').empty().removeClass('editing-name editing-current editing-goal');
    
    for(i = 0; i < task_count; i++) {
        list_task(i, 0);
    }
    
    $('#task-list').tableDnDUpdate();
}

// Increase the current time on tasks that are running by a second
function update_time() {
    try {
        for(i = 0; i < task_count; i++) {
            if(task_running[i]) {
                // Increment time
                tasks[i].current_secs += setting('update-time');
                if(tasks[i].current_secs >= 60) { tasks[i].current_secs -= 60; tasks[i].current_mins++; }
                if(tasks[i].current_mins >= 60) { tasks[i].current_mins -= 60; tasks[i].current_hours++; }
                
                // Stop updating this one if it's at the goal
                if(!tasks[i].indefinite && tasks[i].current_hours >= tasks[i].goal_hours && tasks[i].current_mins >= tasks[i].goal_mins) {
                    $('#task-'+ i).addClass('done');
                    
                    // Stop the timer
                    if(setting('stop-timer')) {
                        toggle_task(i);
                        $('#task-'+ i +' button.toggle').attr('disabled', 'disabled');
                    }
                    
                    // Show notification and play the sound
                    if(!tasks[i].notified) {
                        tasks[i].notified = true;
                        if(setting('play-sound')) document.getElementById('sound').play();
                        if(setting('notify') && webkitNotifications.checkPermission() == 0) {
                            webkitNotifications.createNotification('/style/images/icon-64.png', locale('taskFinished'), locale('taskFinished', tasks[i].text)).show();
                        }
                    }
                }
                
                var progress = Math.floor((tasks[i].current_hours + (tasks[i].current_mins / 60) + (tasks[i].current_secs / 3600)) / (tasks[i].goal_hours + (tasks[i].goal_mins / 60)) * 100);
                if(tasks[i].indefinite == true) progress = 0;
                if(progress == Infinity) progress = 100;
                
                // Update list
                $('#task-'+ i +' td.current').text(format_time(tasks[i].current_hours, tasks[i].current_mins, tasks[i].current_secs));
                $('#task-'+ i +' progress').val(progress).text(progress.toString() +'%')
            }
        }
        
        // Do it again in a second
        timer = setTimeout('update_time()', setting('update-time') * 1000);
    } catch(e) {
        error_notice(e);
    }
}
