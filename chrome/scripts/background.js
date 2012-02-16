// Open the app if it was updated
if(typeof localStorage['old-version'] != 'undefined' &&  localStorage['old-version'] != chrome.app.getDetails().version && (typeof localStorage['update-alert'] == 'undefined' || localStorage['update-alert'] == 'true')) {
    window.open('index.html');
}