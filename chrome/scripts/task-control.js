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
        tasks[task].current = 0;
        $('#task-'+ task +' td.current').text(format_time(tasks[task].current));
        $('#task-'+ task +' progress').val(0).text('0%');
        $('#task-'+ task +' button.toggle').removeAttr('disabled');
        if(!task_running[task]) $('#task-'+ task).removeAttr('class');
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
        $('#task-'+ task).removeAttr('class');
    } else {
        task_running[task] = true;
        $('#task-'+ task +' button.toggle').text('Stop');
        $('#task-'+ task).attr('class', 'running');
    }
}

// Add the task to the list
function list_task(task, anim) {
    // Progress done
    var progress = Math.floor(tasks[task].current / tasks[task].goal * 100);
    
    // Create the row
    $('#row-template').clone().attr('id', 'task-'+ task).appendTo('#task-list tbody');
    
    // Text
    $('#task-'+ task +' td.text').text(tasks[task].text);
    $('#task-'+ task +' td.current').text(format_time(tasks[task].current));
    $('#task-'+ task +' td.goal').text(tasks[task].goal.toString() + (tasks[task].goal > 1 ? ' Hours' : ' Hour'));
    $('#task-'+ task +' button.toggle').text(task_running[task] ? 'Stop' : 'Start');
    $('#task-'+ task +' progress').val(progress).text(progress.toString() +'%');
    if(task_running[task]) $('#task-'+ task).attr('class', 'running');
    
    // Disable the toggle button if task is at its goal, and change the bg colour
    if(tasks[task].current >= tasks[task].goal - 0.00015) {
        $('#task-'+ task +' button.toggle').attr('disabled', 'disabled');
        $('#task-'+ task).attr('class', 'done');
    }
    
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
    
    // Animation
    if(anim == 0) {
        // Show instantly
        $('#no-tasks').hide();
        $('#task-list').show();
        $('#task-'+ task).show();
    } else if(anim == 1) {
        // Fade all at once
        $('#task-'+ task).show();
        $('#no-tasks').fadeOut(400, function() {
            $('#task-list').fadeIn();
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
            tasks[i].current += (1 / 3600) * parseInt(localStorage['update-time']);
            
            // Stop updating this one if it's at the goal, show a desktop notification, and play the sound
            if(tasks[i].current >= tasks[i].goal - 0.00015) {
                tasks[i].current = tasks[i].goal;
                toggle_task(i);
                $('#task-'+ i +' button.toggle').attr('disabled', 'disabled');
                $('#task-'+ i).attr('class', 'done');
                
                if(localStorage['play-sound'] == 'true') document.getElementById('sound').play();
                if(localStorage['notify'] == 'true' && webkitNotifications.checkPermission() == 0) {
                    webkitNotifications.createNotification('/style/images/icon-64.png', 'Task Finished!', 'Task "'+ tasks[i].text +'" completed!').show();
                }
            }
            
            var progress = Math.floor(tasks[i].current / tasks[i].goal * 100);
            
            // Update list
            $('#task-'+ i +' td.current').text(format_time(tasks[i].current));
            $('#task-'+ i +' progress').val(progress).text(progress.toString() +'%')
        }
    }
    
    // Do it again in a second
    timer = setTimeout('update_time()', parseInt(localStorage['update-time']) * 1000);
}
