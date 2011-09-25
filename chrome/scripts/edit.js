var editing_task = -1;

// Begin editing a task's name
function edit_name(task) {
    if(editing_task === -1) {
        editing_task = task;
        
        // Disable all delete buttons
        $('button.delete').attr('disabled', 'disabled');
        
        // Replace the text with a text field and a save button
        $('#task-'+ task +' td.text').empty();
        $('#name-edit-template').clone().attr('id', 'name-edit-'+ task).appendTo('#task-'+ task +' td.text');
        
        // Set the current name and focus
        $('#name-edit-'+ task +' input').val(tasks[task].text).focus();
        
        // Set names & add events
        $('#name-edit-'+ task +' input').attr('name', task).keypress(function (e) {
            if(e.keyCode == 13) save_name(parseInt(this.name));
        });
        $('#name-edit-'+ task +' button').attr('name', task).click(function() {
            save_name(parseInt(this.name));
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
    
    // Enable all delete buttons
    $('button.delete').removeAttr('disabled');
    
    editing_task = -1;
    save();
}
