var debug = false;
// document.body.innerHTML = '';

// For displaying settings in the settings menus dynamically
document.addEventListener( 'DOMContentLoaded', onLoad );

async function onLoad(){
    debug = await browser.runtime.sendMessage('debug');
    if(debug) console.info('Loading Settings For:', document.title);
    if(document.title==='Toolbar'){
        let button = document.getElementById('options');
        button.addEventListener("click", ()=>{ browser.runtime.openOptionsPage() });
    }
    // Sync settings
    let settings = await browser.storage.sync.get();
    let settingInputs = document.getElementsByClassName('setting');
    for(let i = 0; i<settingInputs.length; i++){
        let input = settingInputs[i];
        input.value = branch(settings, input.id)
        input.addEventListener( 'change', elem=>{
            let set = {};
            set[elem.target.id] = elem.target.value
            browser.storage.sync.set( set );
        });
    }
};

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