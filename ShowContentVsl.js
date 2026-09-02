let subdetail = {};
export function showContentVsl(feature) {
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

    // 2. Hydrate mandatory core text fields using UKMTO attributes
    const titleText = props.incidentTypeName 
        ? `${props.incidentTypeName} (${props.incidentIssuer || 'UKMTO'} #${props.incidentNumber || ''})`
        : "No Title";
    clone.querySelector(".title").textContent = titleText;
    clone.querySelector(".body-text").textContent = props.otherDetails || "";

    // 3. Handle optional strings natively using UKMTO date and location/place
    const dateEl = clone.querySelector(".date");
    if (props.utcDateOfIncident || props.utcDateCreated) {
        dateEl.textContent = props.utcDateOfIncident || props.utcDateCreated;
    } else {
        dateEl.remove();
    }

    const locEl = clone.querySelector(".location");
    if (props.place || props.locationLatitudeDDDMMSS) {
        locEl.textContent = props.place ? `${props.place} [${props.locationLatitudeDDDMMSS}, ${props.locationLongitudeDDDMMSS}]` : `${props.locationLatitudeDDDMMSS}, ${props.locationLongitudeDDDMMSS}`;
    } else {
        locEl.remove();
    }

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

    // 4. Handle conditional links & metadata (e.g., vessel type/status as secondary triggers if needed)
    const parsedChannels = safeParseArray(props.channel);
    const channelBtn = clone.querySelector(".channel-link");
    
    if (channelBtn) {
        channelBtn.textContent = `Vessel Type: ${props.vesselType || 'N/A'} (${parsedChannels.length})`;
        
        if (parsedChannels.length > 0) {
            subdetail.channel = parsedChannels;
            channelBtn.addEventListener('click', function() {
                rendersubdetail(subdetail.channel);
            });
        } else {
            channelBtn.remove(); 
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
            refsBtn.remove();
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