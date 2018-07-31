var debugSettings = false;
// document.body.innerHTML = '';

// For displaying settings in the settings menus dynamically
document.addEventListener( 'DOMContentLoaded', onLoad );

async function onLoad(){
    if(debugSettings) console.log('Loading Settings');
    await restoreOptions();
    return loadedSettings();
};

async function saveOptions(){
    if(debugSettings) console.log("Saving...")
    let setsAll = await browser.storage.sync.get();
    Array.from( document.getElementsByClassName('setting') ).forEach(elem=>{
        // For each setting input box, it has a parent <div> with the config's title as it's name.
        setsAll[ elem.parentElement.getAttribute('name') ][ elem.name ].value = elem.value;
    })
    await browser.storage.sync.set(setsAll);
    return browser.runtime.sendMessage('main');
};

async function restoreOptions(){
    let setsAll = await browser.storage.sync.get();
    let body = '';
    if(debugSettings) console.log(document.title+':');
    Object.keys(setsAll).forEach( title => {
        body += `
        <div id='${title}' class="container-fluid">
            <center class='heading card card-block'> ${title} </center>
            <div class="row">`;
        Object.keys(setsAll[title]).forEach( setting => {
            // Hide hidden settings from toolbar, but never from the main settings page.
            if( !setsAll[title][setting].hidden || document.title==='Settings' ){
                let val = setsAll[title][setting].value;
                body += `
                <div class="col-xs-12 col-sm-12 col-md-6 col-lg-4" name="${title}">
                    <center class='card card-block bg-light text-muted'> ${setting} </center>
                    <input class='setting form-control' value=`+
                    (!Number.isNaN(parseFloat(val))?val+' type="number" ':"'"+val+"' ")+
                    `name='${setting}' `;
                ['min', 'max', 'step', 'placeholder'].forEach( attr=>{
                    if( setsAll[title][setting].hasOwnProperty(attr) ){
                        body += attr+"='"+setsAll[title][setting][attr]+"' ";
                    }
                });
                body += `>
                </div>`;
            }
        })
        body += `
            </div>
        </div>
        <br/>`;
    })
    if(debugSettings) console.log( body );
    // The DOM does NOT like adding unmatched <'s.
    // Reassinging this way also destroys event listeners.
    bodyObject = document.createElement("body")
    bodyObject.innerHTML = body;
    document.body.appendChild(bodyObject)
    Array.from(document.getElementsByClassName('heading')).forEach(heading=>{
        let color = '#'+(0.606060+seededRandom(heading.parentElement.id)).toString(16).slice(2,8);
        heading.style.backgroundColor = color;
    })
    Array.from(document.getElementsByClassName('setting')).forEach(setting=>{
        if(debugSettings) console.log(setting);
        setting.addEventListener( 'change', saveOptions );
    });
    return
};

async function loadedSettings(){
    // console.log('Settings loaded')
    let button = document.createElement('button');
    if(document.title==='Settings'){
        button.className = "btn btn-secondary";
        button.innerHTML = "Reload Extension";
        // We can keep stacking event listeners here since it runs in a
        // settings page's context and is killed every time they reload.
        button.addEventListener("click", async()=>{
            await saveOptions();
            window.location.reload(true); // True means the cache is bypassed
        });
    }
    if(document.title==='Toolbar'){
        button.style = "width: 100%";
        button.className = "btn btn-secondary";
        button.innerHTML = "More Settings";
        button.addEventListener("click", ()=>{ browser.runtime.openOptionsPage() });
    }
    document.body.appendChild(button);
};


// To colorize titles randomly with a seed.
function seededRandom(seed) {
    seed = parseInt(seed) || parseInt(stringToBytes(seed));
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function stringToBytes(string){
    return string.split('').map( char =>{
        code = char.charCodeAt(0);
        return [code & 0xff,(code / 256 >>> 0)].map( byte => {
            return byte.toString().padStart(3,0);
        }).join('')
    }).join('')
}

// // Similar but slightly different handling for checkboxes
// function setValue(element, value){
//     if(element.type=='checkbox') element.checked = value;
//     else element.value = value;
// }