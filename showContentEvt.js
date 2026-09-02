
let subdetail = {};
export function showContentEvt(feature) {
    // FIXED: Flush previous pin data instantly so zero-data pins don't accidentally display old data
    subdetail = {}; 

    const props = feature.properties;
    const detail = document.getElementById("detail");
    const content = document.querySelector("section");
    
    detail.style.display = "inline-block";
    content.textContent = ""; // Clear out previous view

    // 1. Get the template and clone its structural node tree
    const template = document.getElementById("detail-template");
    const clone = document.importNode(template.content, true);

    // 2. Hydrate mandatory core text fields
    clone.querySelector(".title").textContent = props.title || "No Title";
    clone.querySelector(".body-text").textContent = props.paragraph || "";

    // 3. Handle optional strings natively without structural rebuilding
    const dateEl = clone.querySelector(".date");
    if (props.date) dateEl.textContent = props.date;
    else dateEl.remove();

    const locEl = clone.querySelector(".location");
    if (props.location) locEl.textContent = props.location;
    else locEl.remove();

    // HELPER: Map frameworks pass arrays inside features as stringified JSON strings.
    // This safely ensures we parse them or fall back to an empty array [].
    function safeParseArray(dataField) {
        if (!dataField) return [];
        if (Array.isArray(dataField)) return dataField;
        try {
            const parsed = JSON.parse(dataField);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    // 4. Handle conditional links & images
    const parsedChannels = safeParseArray(props.channel);
    const channelBtn = clone.querySelector(".channel-link");
    
    if (channelBtn) {
        channelBtn.textContent = `Channel (${parsedChannels.length})`;
        
        if (parsedChannels.length > 0) {
            subdetail.channel = parsedChannels;
            channelBtn.addEventListener('click', function() {
                rendersubdetail(subdetail.channel);
            });
        } else {
            // Option A: Hide completely if 0 data
            channelBtn.remove(); 
            // Option B (Alternative): If you prefer to keep it visible but unclickable, use:
            // channelBtn.style.opacity = "0.5";
            // channelBtn.style.pointerEvents = "none";
        }
    }

    if (props.thumbnail) {
        const thmEl = clone.querySelector(".thumbnail");
        thmEl.src = props.thumbnail;
        thmEl.style.display = "block";
    }

    const parsedReferences = safeParseArray(props.references);
    const refsBtn = clone.querySelector(".refs-list");
    
    if (refsBtn) {
        refsBtn.textContent = `View References (${parsedReferences.length})`;
        
        if (parsedReferences.length > 0) {
            subdetail.references = parsedReferences;
            refsBtn.addEventListener('click', function() {
                rendersubdetail(subdetail.references);
            });
        } else {
            // Option A: Hide completely if 0 data
            refsBtn.remove();
            // Option B (Alternative): If you prefer to keep it visible but unclickable, use:
            // refsBtn.style.opacity = "0.5";
            // refsBtn.style.pointerEvents = "none";
        }
    }
    
    function rendersubdetail(listToProcess) {
        const subcontainer = document.getElementById('subdetail');
        const targetSection = document.getElementById('externalchannel');
        const template = document.getElementById('ref-link-template');
        
        if (!targetSection || !template) return;
        
        targetSection.innerHTML = ""; // Clear old links
        
        listToProcess.forEach(item => {
            if (!item || !item.url) return;
    
            // Clone the template fragment structure
            const clone = document.importNode(template.content, true);
            const linkref = clone.querySelector("a");
            const iconImg = clone.querySelector(".link-icon");
            const textEl = clone.querySelector(".link-text");
    
            // Configure the anchor attributes
            linkref.href = item.url.startsWith('http') ? item.url : `https://${item.url}`;
            textEl.textContent = item.name || item.url;
            
            // Conditionally display the icon image node
            if (item.icon_url && iconImg) {
                iconImg.src = item.icon_url;
                iconImg.style.display = "inline-block";
            }
            
            // Append the operational cloned elements into your container section
            targetSection.appendChild(clone);
        });
        
        if (subcontainer) {
            subcontainer.style.display = "block"; // Enforce correct stacking layout
        }
    }

    // 6. Mount the fully populated layout straight to the visible DOM
    content.appendChild(clone);
}