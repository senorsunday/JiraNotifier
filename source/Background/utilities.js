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
        console.error('Request failed:', {'Error':e, 'URL':url, 'args':args} );
        return { 'Error':e, 'URL':url, 'args':args }
    }
    try{
        let responseObject = await response.json();
        return responseObject; // Success!
    }
    catch(e){
        console.error('Failed to load:', {'Error':e, 'URL':url, 'args':args} );
        return { 'Error':e, 'URL':url, 'args':args }
    }
};