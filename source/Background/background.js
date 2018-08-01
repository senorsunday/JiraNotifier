console.info('Starting Jira Notifier...');
var debug=false,
    settings={};

// Event listeners are functions that asynchronously trigger whenever an event happens.
browser.runtime.onMessage.addListener( async(message, sender, response) => {
    // if(debug) console.log('*** We get signal ***\nMessage:', message, ' Sender:', sender, '\n***Signal End***');
    if(message==='debug'){
        if(debug) response(true);
        else response(false);
    }
    return true;
});

browser.runtime.onInstalled.addListener( async(details)=>{
    if(details.temporary){  // Will never be true from AMO (Firefox ) installation
        console.info( 'Temporary installation. Debug mode on.' )
        debug=true;         // Verbose error and info printing, and quality-of-life for testing
        browser.storage.sync.get().then( a => { console.log("---Settings:", a) } );
    }
    settings = await browser.storage.sync.get()
    // Run the notifier 
    if( branch(settings, 'API') && ( branch(settings, 'Query') || branch(settings, 'Queue') ) ){
        main();                 // Run once the program starts, or triggered when settings change
    }
    else notify('Settings', 'Jira Notifier Settings Unset', 'Click here to go to settings');
    if(settings.Freq>1) settings.Freq = 5;
    setInterval( ( _=> main() ), settings.Freq*60000 ); // Re-run at the user's set Freq
} );

// "project in (EERS) AND resolution = Done AND assignee in (EMPTY, currentUser()) ORDER BY created DESC"

browser.notifications.onClicked.addListener( ID => {
    if(ID=='Settings') browser.runtime.openOptionsPage();
    if(ID=='Tickets'){
        let query = '';
        if(settings.Query) query = unescape(settings.Query);
        else query = "project = "+settings.Queue+" AND resolution = Unresolved AND assignee = EMPTY"
        browser.tabs.create({
            'url': settings.API+'/issues/?jql='+escape(query),
            'active': true
        })
    }
})

async function main(){  // Same as 'const main = async function(){...}'
    if(debug) console.info('Running main()');
    settings = await browser.storage.sync.get()
    let query = '';
    if(settings.Query) query = unescape(settings.Query);
    else query = "project = "+settings.Queue+" AND resolution = Unresolved AND assignee = EMPTY"
    req = JSON.stringify({
        "jql": query,
        "maxResults":0
    })
    args = {
        'method': 'POST',
        'body': req,
        'headers': {'Content-Type': "application/json"}
    }
    jiraPoll = await fetchObject(settings.API+'/rest/api/2/search', args)
    console.log("Tickets open:", jiraPoll.total)
    if( jiraPoll.total>0 ){
        notify('Tickets', jiraPoll.total+" Tickets", "Click here to view");
    }
}

function notify(ID, title, message){
    browser.notifications.create(ID, {
        "type": "basic",
        "iconUrl": browser.extension.getURL("Public/Icons/favicon.ico"),
        "title": title,
        "message": message
    })
}