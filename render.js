import { map, EvtData, VslData, AspData, WfrData,showContentEvt, showContentVsl, showContentAsp,showContentWfr } from './mapinit.js';
import { parseCustomDate,convertToStandardDate } from './sortFilter.js';
import { container } from './displayEvents.js';

export function processAndRender(listContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("cari")?.toLowerCase().trim() || "";
    const sortBy = urlParams.get("sort") || "";
    const dateQuery = urlParams.get("date") || "";
    const occurQuery = urlParams.get("occur") || "";

    // 1. Safely retrieve raw data depending on occurrence type
    let rawData;
    if (occurQuery === "vessel") {
        rawData = VslData?.temp;
    } else if (occurQuery === "airspace") {
        rawData = AspData?.temp;
    } 
    else if  (occurQuery === "warfare"){
        rawData = WfrData?.temp;
    }
    else {
        rawData = EvtData?.temp;
    }

    // Normalize to an array of features regardless of whether it's an array or FeatureCollection
    const originalFeatures = Array.isArray(rawData) 
        ? rawData 
        : (rawData?.features || []);

    // 2. Map standard UI properties and track true original index for view bindings
    const processedFeatures = originalFeatures.map((feature, index) => {
        const props = feature.properties || feature;
        const geometry = feature.geometry || {
            type: "Point",
            coordinates: [props.locationLongitude || 0, props.locationLatitude || 0]
        };

        let title = "";
        let date = "";
        let crime = props.crime || "";

        if (occurQuery === "vessel") {
            const typeName = props.incidentTypeName || "Incident";
            const place = props.place || "Unknown Location";
            const vslType = (props.vesselType || "").trim();
            title = `${typeName}: ${place} ${vslType ? `(${vslType})` : ""}`;
            
            const rawDate = props.utcDateOfIncident || props.utcDateCreated || props.date || "";
            date = rawDate ? rawDate.split('T')[0] : "";
            crime = typeName;
        } else if (occurQuery === "airspace") {
            const htmlLink = props.link || "";
            const match = htmlLink.match(/>([^<]+)<\/a>/);
            title = match ? match[1] : "Airspace Event";
            date = "";
            crime = props.type;
        }  else {
            // Common event mapping
            title = props.title || "Untitled";
            date = props.date || "";
        }

        if (occurQuery === "warfare") {
            crime = props.status;
        }

        return {
            type: "Feature",
            geometry: geometry,
            properties: props,
            originalIndex: index,
            uiProperties: { title, date, crime }
        };
    });

    // 3. Apply Search Filter Rules
    let filtered = processedFeatures;
    if (searchQuery) {
        filtered = filtered.filter(f => f.uiProperties.title.toLowerCase().includes(searchQuery));
    }

    // 4. Apply Sort Ordering using the smart parseCustomDate handler
    if (sortBy === "judul_asc") {
        filtered.sort((a, b) => a.uiProperties.title.localeCompare(b.uiProperties.title));
    } else if (sortBy === "judul_desc") {
        filtered.sort((a, b) => b.uiProperties.title.localeCompare(a.uiProperties.title));
    } else if (sortBy === "tanggal_asc") {
        filtered.sort((a, b) => parseCustomDate(a.uiProperties.date) - parseCustomDate(b.uiProperties.date));
    } else if (sortBy === "tanggal_desc") {
        filtered.sort((a, b) => parseCustomDate(b.uiProperties.date) - parseCustomDate(a.uiProperties.date));
    }

    if (dateQuery) {
        const standardizedQuery = convertToStandardDate(dateQuery);
    
        if (standardizedQuery) {
            filtered = filtered.filter(f => {
                const standardizedItemDate = convertToStandardDate(f.uiProperties.date);
                return standardizedItemDate === standardizedQuery;
            });
        } else {
            // Optional: Reset array or handle invalid user input format
            filtered = []; 
        }
    }
    

    // 5. Render list output and handle item clicks
    renderList(filtered, originalFeatures, listContainer, occurQuery);
}

function renderList(featuresArray, originalFeatures, listContainer, occurQuery) {
    listContainer.textContent = ""; 

    const listWrapper = document.createElement("ul");
    listWrapper.id = "pin-list"; 
    listWrapper.style.listStyleType = "none";
    listWrapper.style.padding = "0";
    listWrapper.style.margin = "0";

    const template = document.getElementById("event-row-template");

    featuresArray.forEach((feature) => {
        const ui = feature.uiProperties;
        const coords = feature.geometry?.coordinates || [0, 0];
        
        const clone = document.importNode(template.content, true);
        const listItem = clone.querySelector(".event-item");
        const titleEl = clone.querySelector(".event-title");
        const dateEl = clone.querySelector(".event-date");

        listItem.setAttribute('data-index', feature.originalIndex);
        listItem.setAttribute('data-lng', coords[0]);
        listItem.setAttribute('data-lat', coords[1]);

        titleEl.textContent = ui.title;
        dateEl.textContent = ui.date || "No Date";
        
        const crimeColors = {
            "Attack": "#FF0000",
            "Suspicious Activity": "#FFA500",
            "Advisory": "#FFD700",
            "Hijack": "#800080",
            "Pembunuhan": "#FF0000",
            "Pencurian": "#800080",
            "Aktivitas Illegal": "#0000FF",
            'easa_conflict_zone' : '#FF1744',       
            'conflict_zone_information_notes' : '#00E5FF',
            'bomb-1': '#FF4500',     // Orange-Red
            'elect-1': '#FFD700',    // Gold / Yellow
            'speech-10': '#4169E1',  // Royal Blue
            'phone-2': '#1E90FF',    // Dodger Blue
            'dead-2': '#8B0000',     // Dark Red
            'shahed-1': '#FF8C00',   // Dark Orange
            'medicine-2': '#32CD32', // Lime Green
            'fires-1': '#FF0000',    // Red
            'medicine-1':'#228B22', // Forest Green
            'ak-1': '#A52A2A',       // Brown
            'drone-2': '#9370DB',    // Medium Purple
            'aa-2': '#4682B4',       // Steel Blue
        };
        titleEl.style.color = crimeColors[ui.crime] || "#808080";
        
        listWrapper.appendChild(clone);
    });

    listWrapper.addEventListener('click', function(event) {
        const item = event.target.closest('li');
        const button = event.target.closest('button');
    
        if (!item) return;
    
        if (button && button.textContent === "Lokasi") {
            const lng = parseFloat(item.getAttribute('data-lng'));
            const lat = parseFloat(item.getAttribute('data-lat'));
            
            container.style.display = "none";
            const section = container.querySelector("section");
            if (section) section.textContent = "";
    
            map.flyTo({ center: [lng, lat], zoom: 12, essential: true, speed: 1.2 });
        } else {
            const featureIndex = parseInt(item.getAttribute('data-index'), 10);
            const selectedFeature = originalFeatures[featureIndex];
        
            if (!selectedFeature) return;

            const detailEl = document.getElementById("detail");
            if (detailEl) {
                const buttonSet = detailEl.querySelector("button");
                if (buttonSet) buttonSet.setAttribute("work", "closeDetail");
            }

            // Route execution cleanly to the specific viewer handler
            if (occurQuery === "vessel") {
                showContentVsl(selectedFeature);
            } else if (occurQuery === "airspace") {
                showContentAsp(selectedFeature);
            } else if (occurQuery === "warfare") {
                showContentWfr(selectedFeature);
            }
             else {
                showContentEvt(selectedFeature);
            }
        }
    });
    
    listContainer.appendChild(listWrapper);
}