// Chrome and Firefox compatibility.
var browser = browser||chrome;
// var storage = {};
// if(chrome){
//     storage = {
//         'get': async(a)=>{
//             chrome.storage.sync.get( a, (b)=>{b} );
//         },
//         'set': async(a)=>{
//             chrome.storage.sync.set( a, (b)=>{b} );
//         },
//         'remove': async(a)=>{
//             chrome.storage.sync.remove( a, (b)=>{b} );
//         }
//     }
// }
// else{
//     storage = browser.storage.sync
// }

/////////////////////////////////////
// Highly Generalizable Functions //
///////////////////////////////////

// Gets or creates a branch of an object
// Works a lot like python's dict.get()
// obj = { 'a.b.c' : 'Nope', 'a' : { 'b' : { 'c' : 'Yup!' } } }
// obj['a.b.c'] === 'Nope';
// branch(obj, 'a.b.c') === 'Yup!';
// branch({},'a.b.c') === undefined;
function branch(parentTree, keyPath, err=null){
    try{
        let target = parentTree;
        keyPath.split('.').forEach((key)=>{
            if(target.hasOwnProperty(key)) target = target[key];
            else throw err;
        });
        return target;
    }
    catch(e){ return e; }
};

// Returns all strings that match the specified pattern within the text
// string = 'Call 1-800-123-4567, TTY:555-123-4567'
// pattern = '((\\d+-)?\\d{3})-\\d{3}-\\d{4}'
// areaCodes = parsePattern(string, pattern, groups=[1])
function parsePattern(text, pattern, flags='igm', groups=[0], set=true){
    if(!pattern||pattern.length===0) return [text]; // Else you'll crash the browser!
    let re = new RegExp(pattern, flags);            // Converts the string to a RegExp object
    let output = ( set===true ? new Set() : [] );   // Will return a set or an array
    if(flags.includes('g')){                        // Else you'll crash the browser!
        if(groups.length===0) groups=[0];
        while ((match = re.exec(text)) != null) {   // Match objects are self consuming in JS...
            groups.forEach((group)=>{
                if(set===true) output.add(match[group]);
                else output.push(match[group]);
            })
        }
    }
    else return [re.exec(text)[0]]; // Returns the first match as an array so join() doesn't break
    return output; // Returns an array or set of tokens
};

/////////////////////////////////
// Promises For Webextensions //
///////////////////////////////

// Asyncronously time things
function sleep(ms){
    return new Promise( resolve => setTimeout(resolve, ms) );
};


// Fetch and parse an object with lots of error handling
async function fetchObject(url, args=null){
    let response = null
    try{
        response = await fetch(url, args);
    }
    catch(e){
        browser.notifications.create('', {
            "type": "basic",
            "iconUrl": browser.extension.getURL("Public/Icons/favicon.svg"),
            "title": "Can't access file",
            "message": "Check the path and certificate for:\n"+url
        });
        console.error('Request failed:', {'Error':e, 'URL':url, 'args':args} );
        return { 'Error':e, 'URL':url, 'args':args }
    }
    try{
        let responseObject = await response.json();
        return responseObject; // Success!
    }
    catch(e){
        browser.notifications.create('', {
            "type": "basic",
            "iconUrl": browser.extension.getURL("Public/Icons/favicon.svg"),
            "title": "Can't parse the file",
            "message": "Check the file (URL in console):\n"+url
        })
        console.error('Failed to load:', {'Error':e, 'URL':url, 'args':args} );
        return { 'Error':e, 'URL':url, 'args':args }
    }
};


// Takes one or more strings and returns the stored value
// loadSettings('apps.newTab', 'apps.server').then( settingsArray => {...} )
// async function loadSettings(){
//     if(arguments.length===0) return browser.storage.sync.get();
//     else if(arguments.length===1){
//         let tree = await browser.storage.sync.get( arguments[0].split('.')[0] );
//         return branch(tree, arguments[0]);
//     }
//     else{
//         return Promise.all( // So we don't return 
//             Array.from(arguments).map( async(arg)=> {
//                 let tree = await browser.storage.sync.get( arg.split('.')[0] );
//                 return branch(tree, arg);
//             })
//         );
//     }
// };

// Loads an HTML template, updates it,
// then returns the tab object
async function pageBuilder(template, content, settings={}){
    settings['url'] = template;
    let tab = await browser.tabs.create(settings);
    let code = '(() => { let heads=[], elems=[];';
    if(content.hasOwnProperty('title')) code += `
        let title = document.createElement('title');
        title.innerHTML = "${content.title}";
        heads.push(title);`;
    if(content.hasOwnProperty('scripts')) content.scripts.map((script, index) => { code += `
        let script${index} = document.createElement('script');
        script${index}.type = "text/javascript";
        script${index}.src = ${script};
        heads.push(script${index});
    `; });
    if(content.hasOwnProperty('body')) content.body.map((text, index) => { code += `
        let text${index} = document.createElement('${text[0]}');
        text${index}.innerHTML = \`${text[1]}\`;
        elems.push(text${index});
    `; });
    code += `
        heads.forEach((head)=>{document.head.appendChild(head);});
        elems.forEach((elems)=>{document.body.appendChild(elems);});
        })();`;
    if(content.hasOwnProperty('data')) code += `
        var appData = ${content.data};`;
    // console.log(code)
    return browser.tabs.executeScript(tab.id, {"code": code });
}

// A Promise that returns the contents of a directory in the extension.
// ls('Static/Configs').then(( pathsAndFiles )=> {...} )
async function ls(path, flags='', debug=false){
    if(debug) console.dir('ls',(flags!==''?'-'+flags+' '+path:path));
    let output = [],
        promises = [],
        re = /201: ([\S]+).*/ig,
        response = await fetch( browser.extension.getURL(path), {mode:'same-origin'});
    try{
        blob = await response.blob();   // Blob() is a Promise, so we can't pass it directly to the reader
    }
    catch(e){
        console.error('Failed to ls directory.\nVerify permissions.',e);
        return '';                      // Easier to error handle '' in this case
    }
    let directoryText = await new Promise((resolve, reject)=>{
        let reader = new FileReader();
        reader.onload  = function(s){resolve(s.originalTarget.result)}
        reader.onerror = function(e){reject(e)}
        reader.readAsText(blob);
    });
    while((matches = re.exec(directoryText))!==null){
        if(matches[0].match(/FILE ?$/)) output.push(path+matches[1]);
        else if(matches[0].match(/DIRECTORY ?$/)){
            if(flags.includes('R')) promises.push( ls(path+matches[1], flags=flags) );
            else output.push(path+matches[1]);
        }
    }
    if(promises.length!==0){
        return Promise.all(promises).then((outputs)=>{
            outputs.forEach((vals)=>{
                output = output.concat(vals);
            })
            return output;
        });
    }
    else return output;
}