let subdetail = {};

export function showContentWfr(feature) {
    // Flush previous pin data instantly so zero-data pins don't accidentally display old data
    subdetail = {}; 

    // Adjusting to your GeoJSON schema: properties are under feature.properties.properties
    const props = feature.properties?.properties || feature.properties;
    const detail = document.getElementById("detail");
    const content = document.querySelector("section");
    
    detail.style.display = "inline-block";
    content.textContent = ""; // Clear out previous view

    // 1. Get the template and clone its structural node tree
    const template = document.getElementById("detail-template");
    const clone = document.importNode(template.content, true);

    // 2. Hydrate mandatory core text fields (adjusting keys: title, description, date, etc.)
    clone.querySelector(".title").textContent = props.title || "No Title";
    clone.querySelector(".body-text").textContent = props.description || props.paragraph || "";

    // 3. Handle optional strings natively without structural rebuilding
    const dateEl = clone.querySelector(".date");
    if (props.date) dateEl.textContent = props.date;
    else if (dateEl) dateEl.remove();

    const locEl = clone.querySelector(".location");
    // GeoJSON coordinates can also be leveraged if location property is missing
    const defaultLocation = feature.geometry && feature.geometry.coordinates 
        ? `${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]}` 
        : "";
    if (props.location || defaultLocation) {
        locEl.textContent = props.location || defaultLocation;
    } else if (locEl) {
        locEl.remove();
    }

    // HELPER: Map frameworks pass arrays inside features as stringified JSON strings.
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

    // 4. Handle conditional links & images (mapping 'channels' and 'references' or similar keys)
    const parsedChannels = safeParseArray(props.channel || props.channels);
    const channelBtn = clone.querySelector(".channel-link");
    
    if (channelBtn) {
        channelBtn.textContent = `Channel (${parsedChannels.length})`;
        
        if (parsedChannels.length > 0) {
            subdetail.channel = parsedChannels;
            channelBtn.addEventListener('click', function() {
                rendersubdetail(subdetail.channel);
            });
        } else {
            channelBtn.remove(); 
        }
    }

    const thumbSrc = props.thumbnail || props.image || props.img;
    if (thumbSrc) {
        const thmEl = clone.querySelector(".thumbnail");
        if (thmEl) {
            // Tell the browser not to send a Referer header for this image request
            thmEl.referrerPolicy = "no-referrer"; 
            
            thmEl.src = thumbSrc;
            thmEl.style.display = "block";
        }
    }
    

    const parsedReferences = safeParseArray(props.references || props.refs);
    const refsBtn = clone.querySelector(".refs-list");
    
    if (refsBtn) {
        refsBtn.textContent = `View References (${parsedReferences.length})`;
        
        if (parsedReferences.length > 0) {
            subdetail.references = parsedReferences;
            refsBtn.addEventListener('click', function() {
                rendersubdetail(subdetail.references);
            });
        } else {
            refsBtn.remove();
        }
    }
    
    function rendersubdetail(listToProcess) {
        const subcontainer = document.getElementById('subdetail');
        const targetSection = document.getElementById('externalchannel');
        const templateRef = document.getElementById('ref-link-template');
        
        if (!targetSection || !templateRef) return;
        
        targetSection.innerHTML = ""; // Clear old links
        
        listToProcess.forEach(item => {
            if (!item) return;
            
            // Support both object structures ({url, name}) and raw string links ("https://...")
            const itemUrl = typeof item === 'string' ? item : (item.url || item.link);
            const itemName = typeof item === 'string' ? item : (item.name || item.title || itemUrl);
            const itemIcon = typeof item === 'object' ? (item.icon_url || item.icon) : null;

            if (!itemUrl) return;
    
            // Clone the template fragment structure
            const itemClone = document.importNode(templateRef.content, true);
            const linkref = itemClone.querySelector("a");
            const iconImg = itemClone.querySelector(".link-icon");
            const textEl = itemClone.querySelector(".link-text");
    
            // Configure the anchor attributes
            if (linkref) {
                linkref.href = itemUrl.startsWith('http') ? itemUrl : `https://${itemUrl}`;
            }
            if (textEl) {
                textEl.textContent = itemName;
            }
            
            // Conditionally display the icon image node
            if (itemIcon && iconImg) {
                iconImg.src = itemIcon;
                iconImg.style.display = "inline-block";
            } else if (iconImg) {
                iconImg.style.display = "none";
            }
            
            // Append the operational cloned elements into your container section
            targetSection.appendChild(itemClone);
        });
        
        if (subcontainer) {
            subcontainer.style.display = "block"; // Enforce correct stacking layout
        }
    }

    // 6. Mount the fully populated layout straight to the visible DOM
    content.appendChild(clone);
}