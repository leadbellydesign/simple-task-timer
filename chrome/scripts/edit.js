var editing_task = -1;

// Begin editing a task's name
function edit_name(task) {
    if(editing_task === -1) {
        editing_task = task;
        
        // Disable the task's toggle button
        $('#task-'+ task +' button.toggle').attr('disabled', 'disabled');
        
        // Replace the text with a text field and a save button
        $('#task-'+ task +' td.text').empty();
        $('#name-edit-template').clone().attr('id', 'name-edit-'+ task).appendTo('#task-'+ task +' td.text');
        
        // Set the current name and focus
        $('#name-edit-'+ task +' input').val(tasks[task].text).focus();
        
        // Set names & add events
        $('#name-edit-'+ task +' input').attr('name', task).keypress(function (e) {
            if(e.keyCode == 13) save_name(parseInt(this.name));
        });
        $('#name-edit-'+ task +' button.save').attr('name', task).click(function() {
            save_name(parseInt(this.name));
        });
        $('#name-edit-'+ task +' button.cancel').click(function() {
            cancel_edit();
        });
    } else {
        if(task != editing_task) alert('Finish editing any other task first!');
    }
}

// Finish editing a task's name
function save_name(task) {
    // Set the name
    tasks[task].text = $('#name-edit-'+ task +' input').val();
    
    // Replace the edit fields with just the task name
    $('#task-'+ task +' td.text').empty().text(tasks[task].text);
    
    // Enable all delete buttons and the task's toggle button
    $('button.delete, #task-'+ task +' button.toggle').removeAttr('disabled');
    
    editing_task = -1;
    save();
}

// Begin editing a task's goal
function edit_goal(task) {
    if(editing_task === -1) {
        editing_task = task;
        if(task_running[task]) toggle_task(task);
        
        // Disable the task's toggle button
        $('#task-'+ task +' button.toggle').attr('disabled', 'disabled');
        
        // Replace the goal text with inputs
        $('#task-'+ task +' td.goal').empty();
        $('#goal-edit-template').clone().attr('id', 'goal-edit-'+ task).appendTo('#task-'+ task +' td.goal');
        
        // Set the current goal and focus
        $('#goal-edit-'+ task +' input').first().val(tasks[task].goal_hours).focus();
        $('#goal-edit-'+ task +' input').last().val(tasks[task].goal_mins);
        
        // Set names & add events
        $('#goal-edit-'+ task +' input').attr('name', task).keypress(function (e) {
            if(e.keyCode == 13) save_goal(parseInt(this.name));
        });
        $('#goal-edit-'+ task +' button.save').attr('name', task).click(function() {
            save_goal(parseInt(this.name));
        });
        $('#goal-edit-'+ task +' button.cancel').click(function() {
            cancel_edit();
        });
    } else {
        if(task != editing_task) alert('Finish editing any other task first!');
    }
}

// Finish editing a task's goal
function save_goal(task) {
    // Set the goal
    tasks[task].goal_hours = parseInt($('#goal-edit-'+ task +' input').first().val());
    tasks[task].goal_mins = parseInt($('#goal-edit-'+ task +' input').last().val());
    
    // Replace the edit fields with just the task goal
    $('#task-'+ task +' td.goal').empty().text(format_time(tasks[task].goal_hours, tasks[task].goal_mins, 0));
    
    // Rebuild task list
    $('#task-list tbody').empty();
    for(i = 0; i < task_count; i++) {
        list_task(i, 0);
    }
    
    editing_task = -1;
    save();
}

// Cancel editing
function cancel_edit() {
    editing_task = -1;
    
    // Rebuild task list
    $('#task-list tbody').empty();
    for(i = 0; i < task_count; i++) {
        list_task(i, 0);
    }
}
