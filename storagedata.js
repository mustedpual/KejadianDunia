let fetchQueue = Promise.resolve();

export const EvtData = {
    type : "event",
    parent: null, 
    temp: null,   
    url : "https://informed-stag-162043.upstash.io/json.get/mapEvent/", // Upstash usually allows direct fetch, or wrap it if needed
    HeaderS : {
        "Authorization" : "ggAAAAAAAnj7AAIgcDKuVGwervXtgpLltV5HEqV-kRfcpoAJtHQzUgdUiKYZCA",
    },
};

// Route restricted URLs through your Vercel proxy
export const VslData = {
    type : "vessel",
    parent: null, 
    temp: null,   
    url : `/api/proxy?url=${encodeURIComponent("https://sccd.royalnavy.mod.uk/api/ukmto/all")}`,
    HeaderS : {}
};

export const AspData= {
    type : "airspace",
    parent : null,
    temp : null,
    url : `/api/proxy?url=${encodeURIComponent("https://www.easa.europa.eu/en/api/maps/czibs")}`,
    HeaderS : {}
}

export const WfrData = {
    type : "warfare",
    parent : null,
    temp : null,
    url : `/api/proxy?url=${encodeURIComponent("https://liveuamap.com")}`,
    HeaderS : {}
}

await fetchAndPopulate(EvtData.url, EvtData.HeaderS, EvtData);
await fetchAndPopulate(VslData.url, VslData.HeaderS, VslData);
await fetchAndPopulate(AspData.url, AspData.HeaderS, AspData);
await fetchAndPopulate(WfrData.url, WfrData.HeaderS, WfrData);

function fetchAndPopulate(url, headerS, constData) {
    fetchQueue = fetchQueue.then(async() => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headerS
            });

            async function dataTypefetch(constdatatype, response) {
                if (constdatatype === "event") {
                    const rawdata = await response.json();
                    return JSON.parse(rawdata.result);
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
                    return rawdata;
                }
                
                if (constdatatype === "warfare") {
                    const extractLiveUAMapDate = (urlStr) => {
                        const pattern = /\/(\d{4})\/(\d{1,2})-([a-z]+)-\d+-/i;
                        const match = urlStr.match(pattern);
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
                
                    const rawdata = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(rawdata, 'text/html');
                    const listwar = doc.querySelectorAll(".sourcees");
                
                    const featurePromises = Array.from(listwar).map(async (el) => {
                        let sublink = el.getAttribute('data-link');
                        if (!sublink) return null;
                
                        // Ensure relative links become absolute before passing to proxy
                        if (sublink.startsWith('/')) {
                            sublink = `https://liveuamap.com${sublink}`;
                        }
                
                        try {
                            // Route sublink fetches through the proxy to prevent CORS errors here too
                            const proxySublink = `/api/proxy?url=${encodeURIComponent(sublink)}`;
                            const subResponse = await fetch(proxySublink);
                            const subHtml = await subResponse.text();
                            
                            const subdoc = parser.parseFromString(subHtml, 'text/html');
                            const eventScriptMatch = subHtml.match(/document\.addEventListener\(['"]DOMContentLoaded['"][\s\S]*?\);/);
                
                            let lat = 48.8829; 
                            let lng = 31.1810; 
                
                            if (eventScriptMatch) {
                                const eventScript = eventScriptMatch[0];
                                const latMatch = eventScript.match(/lat\s*=\s*([0-9.-]+)/);
                                const lngMatch = eventScript.match(/lng\s*=\s*([0-9.-]+)/);
                            
                                if (latMatch) lat = parseFloat(latMatch[1]);
                                if (lngMatch) lng = parseFloat(lngMatch[1]);
                            }
                
                            const infozone = subdoc.querySelector(".popup-text");
                            const status = infozone?.querySelector(".bgma")?.getAttribute('data-src') || null;
                            const title = infozone?.querySelector("h2")?.textContent?.trim() || null;
                            const locationText = infozone?.querySelector(".tagas strong")?.textContent?.trim() || null;
                            const thumbnail = infozone?.querySelector(".popup_video + * img")?.src || null;
                            const reference = subdoc?.querySelector(".source-link")?.href || null;
                
                            return {
                                type: "Feature",
                                geometry: {
                                    type: "Point",
                                    coordinates: [lng, lat] 
                                },
                                properties: {
                                    references: [sublink, reference].filter(Boolean),
                                    title: title,
                                    status: status,
                                    location: locationText,
                                    thumbnail: thumbnail,
                                    date: extractLiveUAMapDate(sublink) 
                                }
                            };
                        } catch (error) {
                            console.error("Failed to fetch/parse sublink:", sublink, error);
                            return null;
                        }
                    });
                
                    const features = (await Promise.all(featurePromises)).filter(Boolean);
                
                    return {
                        type: "FeatureCollection",
                        features: features
                    };
                }
            }
            
            const data = await dataTypefetch(constData.type, response);
            console.log(data);
            constData.parent = data;
            constData.temp = {
                ...data,
                features: [...data.features] 
            };

        } catch (error) {
            console.error("Secure fetch failed:", error);
        }
    });
    return fetchQueue;
}

const subcontainer = document.getElementById('subdetail');
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