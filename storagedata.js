let fetchQueue = Promise.resolve();
// const Url = "./markers.geojson";
// const HeaderS = {}
const Headers = {"Access-Control-Allow-Origin" : "*"}
const Url = "https://informed-stag-162043.upstash.io/json.get/mapEvent/";
const HeaderS = {
    "Authorization" : "ggAAAAAAAnj7AAIgcDKuVGwervXtgpLltV5HEqV-kRfcpoAJtHQzUgdUiKYZCA",
}


export const EvtData = {
    type : "event",
    parent: null, // Untouched master data
    temp: null,   // Current filtered view for the map
};

export const VslData = {
    type : "vessel",
    parent: null, // Untouched master data
    temp: null,   // Current filtered view for the map
};

export const AspData= {
    type : "airspace",
    parent : null,
    temp : null
}

export const WfrData = {
    type : "warfare",
    parent : null,
    temp : null
}



await fetchAndPopulate(Url, HeaderS, EvtData);
await fetchAndPopulate("https://sccd.royalnavy.mod.uk/api/ukmto/all", Headers, VslData);
await fetchAndPopulate("https://www.easa.europa.eu/en/api/maps/czibs", Headers, AspData);
await fetchAndPopulate("https://liveuamap.com", Headers, WfrData);

// 2. PRIVATE Fetch Function (Stays inside this JS file, not exported)
function fetchAndPopulate(url, headerS, constData) {
    fetchQueue = fetchQueue.then(async() => {
        try {
            const response = await fetch(url,{
                method: 'GET',
                headers: headerS
        });

        async function dataTypefetch(constdatatype,response){
            if (constdatatype === "event") {
                const rawdata = await response.json();
                return JSON.parse(rawdata.result)
            }

            if (constdatatype === "vessel") {
                const rawdata = await response.json();
                return {
                    type: "FeatureCollection",
                    features: rawdata.map(item => ({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [item.locationLongitude, item.locationLatitude]
                        },
                        properties: { ...item }
                    }))
                }
            }

            if (constdatatype === "airspace") {
                const rawdata = await response.json();
                return rawdata
            }
            
            if (constdatatype === "warfare") {
                const extractLiveUAMapDate = (url) => {
                    // Matches: /2026/31-august- [where '31' is day, 'august' is month, and the next number is the ID]
                    const pattern = /\/(\d{4})\/(\d{1,2})-([a-z]+)-\d+-/i;
                    const match = url.match(pattern);
                    if (!match) return null;
                
                    const [, year, day, monthName] = match;
                    
                    const months = {
                        january: '01', february: '02', march: '03', april: '04', 
                        may: '05', june: '06', july: '07', august: '08', 
                        september: '09', october: '10', november: '11', december: '12'
                    };
                
                    const mm = months[monthName.toLowerCase()];
                    const dd = String(day).padStart(2, '0');
                    
                    if (!mm) return null;
                
                    return `${year}-${mm}-${dd}`;
                };
            
                // 1. Get the raw HTML string of the main page
                const rawdata = await response.text();
            
                // 2. Parse the main HTML string into a DOM Document object
                const parser = new DOMParser();
                const doc = parser.parseFromString(rawdata, 'text/html');
            
                // 3. Find all source elements
                const listwar = doc.querySelectorAll(".sourcees");
            
                // 4. Map over each element asynchronously and use Promise.all
                const featurePromises = Array.from(listwar).map(async (el) => {
                    const sublink = el.getAttribute('data-link');
                    if (!sublink) return null;
            
                    try {
                        // Fetch the sub-link page
                        const subResponse = await fetch(sublink, {
                            method: 'GET',
                            headers: headerS
                        });
                        const subHtml = await subResponse.text();
                        
                        const subdoc = parser.parseFromString(subHtml, 'text/html');
            
                        // Isolate the script block containing the specific event coordinates
                        const eventScriptMatch = subHtml.match(/document\.addEventListener\(['"]DOMContentLoaded['"][\s\S]*?\);/);
            
                        let lat = 48.8829; // Fallback
                        let lng = 31.1810; // Fallback
            
                        if (eventScriptMatch) {
                            const eventScript = eventScriptMatch[0];
            
                            const latMatch = eventScript.match(/lat\s*=\s*([0-9.-]+)/);
                            const lngMatch = eventScript.match(/lng\s*=\s*([0-9.-]+)/);
                        
                            if (latMatch) lat = parseFloat(latMatch[1]);
                            if (lngMatch) lng = parseFloat(lngMatch[1]);
                        }
            
                        // Query elements safely from the sub-document
                        const infozone = subdoc.querySelector(".popup-text");
                        
                        const status = infozone?.querySelector(".bgma")?.getAttribute('data-src') || null;
                        const title = infozone?.querySelector("h2")?.textContent?.trim() || null;
                        const locationText = infozone?.querySelector(".tagas strong")?.textContent?.trim() || null;
                        const thumbnail = infozone?.querySelector(".popup_video + * img")?.src || null;
                        const reference = subdoc?.querySelector(".source-link")?.href || null;
            
                        // Return a clean GeoJSON Feature object
                        return {
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: [lng, lat] // [longitude, latitude]
                            },
                            properties: {
                                references: [sublink, reference].filter(Boolean),
                                title: title,
                                status: status,
                                location: locationText,
                                thumbnail: thumbnail,
                                date: extractLiveUAMapDate(sublink) // Extracts accurate date from the sublink
                            }
                        };
            
                    } catch (error) {
                        console.error("Failed to fetch/parse sublink:", sublink, error);
                        return null;
                    }
                });
            
                // 5. Wait for all sub-fetches to finish and filter out any null failures
                const features = (await Promise.all(featurePromises)).filter(Boolean);
            
                // 6. Assign final GeoJSON structure to data
                return {
                    type: "FeatureCollection",
                    features: features
                };
            }
        }
        
            // Save original data reference
            const data = await dataTypefetch(constData.type,response);
            console.log(data)
            constData.parent = data
            // FIXED: Create a fresh outer reference for temp so filtering doesn't overwrite parent
            constData.temp = {
                ...data,
                features: [...data.features] 
            }


        } catch (error) {
            console.error("Secure fetch failed:", error);
        }
    })
    return fetchQueue;
}


const subcontainer = document.getElementById('subdetail');
// 1. Handle Closing the Detail Panel
subcontainer.addEventListener('click', function(event) {
    const button = event.target.closest('button');
    if (!button) return;
  
    const workAction = button.getAttribute('work');
    if (workAction === "closesubdetail") {
        subcontainer.style.display = "none";
        const section = subcontainer.querySelector("section");
        if (section) section.textContent = "";
    }
});





