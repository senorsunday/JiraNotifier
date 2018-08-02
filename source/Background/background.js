console.info('Starting Jira Notifier...');
var debug=false,
    timer=setTimeout(()=>{}, 1)
    settings={};

// Event listeners are functions that asynchronously trigger whenever an event happens.
browser.runtime.onMessage.addListener( async(message, sender, response) => {
    // if(debug) console.log('*** We get signal ***\nMessage:', message, ' Sender:', sender, '\n***Signal End***');
    if(message==='debug'){
        if(debug) response(true);
        else response(false);
    }
    if(message==='main'){
        clearTimeout(timer); // Kills next main() run so we don't start more than one thread
        timer = setTimeout( _ => main() , settings.Freq*60000); // Start it again (after the time window so we don't spam main())
    }
    return;
});

browser.runtime.onInstalled.addListener( async(details)=>{
    if(details.temporary){  // Will never be true from AMO (Firefox ) installation
        console.info( 'Temporary installation. Debug mode on.' )
        debug=true;         // Verbose error and info printing, and quality-of-life for testing
        browser.storage.sync.get().then( a => { console.log("---Settings:", a) } );
    }
    settings = await browser.storage.sync.get();
    if(settings.Freq>1) settings.Freq = 5;
    // Run the notifier 
    if( branch(settings, 'API') && ( branch(settings, 'Query') || branch(settings, 'Queue') ) ){
        main();                 // Run once the program starts, or triggered when settings change
    }
    else notify( 'Settings', 'Jira Notifier Settings Unset', 'Click here to go to settings' );
} );

// The notifications object persists and can change ID per visible popup
browser.notifications.onClicked.addListener( ID => {
    if(ID==='Jira') browser.tabs.create({'url':settings.API});
    if(ID==='Settings') browser.runtime.openOptionsPage();
    if(ID==='Tickets'){
        let query = '';
        if(settings.Query) query = unescape(settings.Query);
        else query = "project = "+settings.Queue+" AND resolution = Unresolved AND assignee = EMPTY"
        browser.tabs.create({
            'url': settings.API+'/issues/?jql='+escape(query),
            'active': true
        })
    }
    browser.notifications.clear(ID);
})

// 
async function main(){
    if(debug) console.info('Running main()');
    clearTimeout(timer); // Just in case I missed any logic bugs
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
    let jiraPoll = await fetchObject(settings.API+'/rest/api/2/search', args)
    if(jiraPoll.hasOwnProperty('Error')){
        notify( 'Jira', 'Not logged into Jira', 'Click here to go to '+settings.API );
        let t=new Date()
        console.error( t.getHours()+':'+t.getMinutes()+':'+t.getSeconds()+'--Not logged into Jira\n'+settings.API );
        return
    }
    if(jiraPoll.hasOwnProperty('errorMessages')){
        // if( branch(jiraPoll.errorMessages, 1) )
        notify( 'Settings', 'Bad Jira Query/Queue', jiraPoll.errorMessages );
        console.error( t.getHours()+':'+t.getMinutes()+':'+t.getSeconds()+'--Bad Jira Query/Queue\n'+jiraPoll.errorMessages+'\n'+settings.Query||settings.Queue );
        return
    }
    console.info("Tickets open:", jiraPoll.total)
    if( jiraPoll.total>0 ){
        notify( 'Tickets', jiraPoll.total+" Tickets", "Click here to view" );
    }
    timer = setTimeout( _ => main() , settings.Freq*60000);
}

function notify(ID, title, message){
    browser.notifications.create(ID, {
        "type": "basic",
        "iconUrl": browser.extension.getURL("Public/Icons/favicon.png"),
        "title": title,
        "message": message
    })
}