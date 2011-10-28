// Add a task
function add_task(data) {
    tasks[task_count] = data;
    task_running[task_count] = false;
    list_task(task_count, (task_count == 0 ? 1 : 2));
    
    task_count++;
}

// Reset a task
function reset_task(task) {
    if(localStorage['confirm-reset'] == 'false' || confirm('Are you sure you want to reset task "'+ tasks[task].text +'"?')) {
        tasks[task].current_hours = tasks[task].current_mins = tasks[task].current_secs = 0;
        $('#task-'+ task +' td.current').text(format_time(tasks[task].current_hours, tasks[task].current_mins, tasks[task].current_secs));
        $('#task-'+ task +' progress').val(0).text('0%');
        $('#task-'+ task +' button.toggle').removeAttr('disabled');
        if(!task_running[task]) $('#task-'+ task).removeAttr('class');
        tasks[task].notified = false;
    }
}

// Delete a task
function delete_task(task) {
    if(localStorage['confirm-delete'] == 'false' || confirm('Are you sure you want to delete task "'+ tasks[task].text +'"?')) {
        load.show();
        $('#new-btn').attr('disabled', 'disabled');
        $('#task-'+ task +' button').attr('disabled', 'disabled');
        
        tasks.splice(task, 1);
        task_count--;
        
        if(task_running[task]) toggle_task(task);
        task_running.splice(task, 1);
        
        save();
        
        // Animate accordingly.
        if(task_count == 0) {
            $('#task-list').fadeOut(400, function() {
                $('#task-list tbody').empty();
                $('#no-tasks').fadeIn();
                $('#edit-tasks').fadeOut();
                
                $('#new-btn').removeAttr('disabled');
            });
        } else {
            $('#task-'+ task).fadeOut(400, function() {
                // Rebuild the task list
                $('#task-list tbody').empty();
                for(i = 0; i < task_count; i++) {
                    list_task(i, 0);
                }
                
                $('#new-btn').removeAttr('disabled');
            });
        }
        
        load.hide();
    }
}

// Toggle whether a task is running or not
function toggle_task(task) {
    if(task_running[task]) {
        task_running[task] = false;
        $('#task-'+ task +' button.toggle').text('Start');
        if(!(tasks[task].current_hours >= tasks[task].goal_hours && tasks[task].current_mins >= tasks[task].goal_mins)) {
            $('#task-'+ task).removeAttr('class');
        } else {
            $('#task-'+ task).attr('class', 'done');
        }
    } else {
        // Disable other tasks if they have it set to allow only one running at a time
        if(localStorage['only-one'] == 'true') {
            for(i = 0; i < task_count; i++) {
                if(task_running[i]) toggle_task(i);
            }
        }
        
        task_running[task] = true;
        $('#task-'+ task +' button.toggle').text('Stop');
        if(!(tasks[task].current_hours >= tasks[task].goal_hours && tasks[task].current_mins >= tasks[task].goal_mins)) {
            $('#task-'+ task).attr('class', 'running');
        } else {
            $('#task-'+ task).attr('class', 'running done');
        }
    }
}

// Add the task to the list
function list_task(task, anim) {
    // Progress done
    var progress = Math.floor((tasks[task].current_hours + (tasks[task].current_mins / 60) + (tasks[task].current_secs / 3600)) / (tasks[task].goal_hours + (tasks[task].goal_mins / 60)) * 100);
    
    // Create the row
    $('#row-template').clone().attr('id', 'task-'+ task).appendTo('#task-list tbody');
    
    // Text
    $('#task-'+ task +' td.text').text(tasks[task].text);
    $('#task-'+ task +' td.current').text(format_time(tasks[task].current_hours, tasks[task].current_mins, tasks[task].current_secs));
    $('#task-'+ task +' td.goal').text(format_time(tasks[task].goal_hours, tasks[task].goal_mins, 0));
    $('#task-'+ task +' button.toggle').text(task_running[task] ? 'Stop' : 'Start');
    $('#task-'+ task +' progress').val(progress).text(progress.toString() +'%');
    
    if(task_running[task]) $('#task-'+ task).attr('class', 'running');
    
    // Option Buttons
    $('#task-'+ task +' button.toggle').attr('name', task).click(function() {
        toggle_task(parseInt(this.name));
    });
    $('#task-'+ task +' button.reset').attr('name', task).click(function() {
        reset_task(parseInt(this.name));
    });
    $('#task-'+ task +' button.delete').attr('name', task).click(function() {
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
    if(tasks[task].current_hours >= tasks[task].goal_hours && tasks[task].current_mins >= tasks[task].goal_mins) {
        if(localStorage['stop-timer'] == 'true') $('#task-'+ task +' button.toggle').attr('disabled', 'disabled');
        $('#task-'+ task).attr('class', 'done');
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
}

// Increase the current time on tasks that are running by a second
function update_time() {
    for(i = 0; i < task_count; i++) {
        if(task_running[i]) {
            // Increment time
            tasks[i].current_secs += parseInt(localStorage['update-time']);
            if(tasks[i].current_secs >= 60) { tasks[i].current_secs -= 60; tasks[i].current_mins++; }
            if(tasks[i].current_mins >= 60) { tasks[i].current_mins -= 60; tasks[i].current_hours++; }
            
            // Stop updating this one if it's at the goal, show a desktop notification, and play the sound
            if(tasks[i].current_hours >= tasks[i].goal_hours && tasks[i].current_mins >= tasks[i].goal_mins) {
                if(localStorage['stop-timer'] == 'true') {
                    toggle_task(i);
                    $('#task-'+ i +' button.toggle').attr('disabled', 'disabled');
                    $('#task-'+ i).attr('class', 'done');
                } else {
                    $('#task-'+ i).attr('class', 'running done');
                }
                
                if(!tasks[i].notified) {
                    tasks[i].notified = true;
                    if(localStorage['play-sound'] == 'true') document.getElementById('sound').play();
                    if(localStorage['notify'] == 'true' && webkitNotifications.checkPermission() == 0) {
                        webkitNotifications.createNotification('/style/images/icon-64.png', 'Task Finished!', 'Task "'+ tasks[i].text +'" completed!').show();
                    }
                }
            }
            
            var progress = Math.floor((tasks[i].current_hours + (tasks[i].current_mins / 60) + (tasks[i].current_secs / 3600)) / (tasks[i].goal_hours + (tasks[i].goal_mins / 60)) * 100);
            
            // Update list
            $('#task-'+ i +' td.current').text(format_time(tasks[i].current_hours, tasks[i].current_mins, tasks[i].current_secs));
            $('#task-'+ i +' progress').val(progress).text(progress.toString() +'%')
        }
    }
    
    // Do it again in a second
    timer = setTimeout('update_time()', parseInt(localStorage['update-time']) * 1000);
}
