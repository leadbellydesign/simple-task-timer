var load, tasks = new Array(), task_count = 0, save_timeout, task_running = new Array();

$(document).ready(function() {
    // Set some variables
    load = $('#loading');
    
    // Check that they have localStorage and native JSON available
    if(typeof localStorage !== 'object' || typeof JSON !== 'object') {
        $('#out-of-date').show();
        return true;
    }
    
    // Retrieve any tasks they've previously added
    if(localStorage['tasks']) {
        tasks = JSON.parse(localStorage['tasks']);
        task_count = tasks.length;
        
        for(i = 0; i < task_count; i++) {
            list_task(i, 0);
            task_running[i] = false;
        }
    }
    
    // Show the notice if they haven't hidden it
    if(!localStorage['notice-closed']) {
        $('#notice').show();
    }
    
    // Enable the add task fields
    $('.field').removeAttr('disabled');
    
    // Start the update timer
    update_time();
    
    
    
    // User clicked the Close button in the notice
    $('#close-notice').click(function() {
        var sure = confirm('Are you sure you want to close this notice?\nIt cannot be displayed again.');
        
        if(sure) {
            $('#notice').fadeOut(600);
            localStorage['notice-closed'] = true;
        }
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
    
    save();
    $('#tasks').show();
});



// Save the data in localStorage
function save(timeout) {
    if(timeout) load.show();
    localStorage['tasks'] = JSON.stringify(tasks);
    
    clearTimeout(save_timeout);
    save_timeout = setTimeout('save(true)', 60000);
    
    window.status = 'Saved.';
    if(timeout) load.hide();
}

// Add a task
function add_task(data) {
    tasks[task_count] = data;
    task_running[task_count] = false;
    list_task(task_count, (task_count === 0 ? 1 : 2));
    
    task_count++;
}

// Delete a task
function delete_task(task) {
    load.show();
    $('#new-btn').attr('disabled', 'disabled');
    $('#task-'+ task +' button').attr('disabled', 'disabled');
    
    tasks.splice(task, 1);
    task_count--;
    
    if(task_running[task]) toggle_task(task);
    task_running.splice(task, 1);
    
    save();
    
    // Animate accordingly.
    if(task_count === 0) {
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
    $('#task-'+ task +' button.delete').attr('name', task).click(function() {
        delete_task(parseInt(this.name));
    });
    
    // Animation
    if(anim === 0) {
        // Show instantly
        $('#no-tasks').hide();
        $('#task-list').show();
        $('#task-'+ task).show();
    } else if(anim === 1) {
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
            tasks[i].current += 1 / 3600;
            
            // Stop updating this one if it's at the goal, and play the notification sound
            if(tasks[i].current >= tasks[i].goal - 0.00015) {
                tasks[i].current = tasks[i].goal;
                toggle_task(i);
                $('#task-'+ i +' button.toggle').attr('disabled', 'disabled');
                $('#task-'+ i).attr('class', 'done');
                
                document.getElementById('sound').play();
            }
            
            var progress = Math.floor(tasks[i].current / tasks[i].goal * 100);
            
            // Update list
            $('#task-'+ i +' td.current').text(format_time(tasks[i].current));
            $('#task-'+ i +' progress').val(progress).text(progress.toString() +'%')
        }
    }
    
    // Do it again in a second
    setTimeout('update_time()', 1000);
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
