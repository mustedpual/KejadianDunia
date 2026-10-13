let fetchQueue = Promise.resolve();

// Helper to generate current month metrics dynamically based on system clock
function getCurrentMonth() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(currentYear, now.getMonth() + 1, 0).getDate();

    return {
        yearMonth: `${currentYear}-${currentMonth}`,          // e.g., "2026-09"
        startDate: `${currentYear}-${currentMonth}-01`,      // e.g., "2026-09-01"
        endDate: `${currentYear}-${currentMonth}-${lastDay}`, // e.g., "2026-09-30"
        vesselPattern: `${currentYear}-${currentMonth}%`     // e.g., "2026-09%"
    };
}

export const EsriMap = {
    type: "esrimap",
    parent: null,
    temp: null, 
    url: process.env.ESRI_URL,
    methodUrl: "GET",
    HeaderS: {},
};

export const EvtData = {
    type: "event",
    parent: null,
    temp: null, 
    url: process.env.UPSTASH_URL,
    methodUrl: "GET",
    HeaderS: {
        "Authorization": process.env.UPSTASH_API_KEY,
    },
};

export const VslData = {
    type: "vessel",
    parent: null,
    temp: null,
    url: process.env.TURSO_URL_DB,
    methodUrl: "POST",
    HeaderS: {
        "Authorization": process.env.TURSO_API_KEY
    },
    get reqBody() {
        return {
            statements: [
                `SELECT * FROM ukmto_events WHERE utcDateOfIncident LIKE '${getCurrentMonth().vesselPattern}';`
            ]
        };
    },
};

export const AspData = {
    type: "airspace",
    parent: null,
    temp: null,
    url: process.env.TURSO_URL_DB,
    methodUrl: "POST",
    HeaderS: {
        "Authorization": process.env.TURSO_API_KEY
    },
    get reqBody() {
        const month = getCurrentMonth();
        return {
            statements: [
                // Converts DB's DD/MM/YYYY format to YYYY-MM-DD on the fly and checks for current month overlap
                `SELECT * FROM easa_czibs WHERE (SUBSTR(date_start, 7, 4) || '-' || SUBSTR(date_start, 4, 2) || '-' || SUBSTR(date_start, 1, 2)) <= '${month.endDate}' AND (SUBSTR(date_end, 7, 4) || '-' || SUBSTR(date_end, 4, 2) || '-' || SUBSTR(date_end, 1, 2)) >= '${month.startDate}';`
            ]
        };
    },
};

export const WfrData = {
    type: "warfare",
    parent: null,
    temp: null,
    url: process.env.TURSO_URL_DB,
    methodUrl: "POST",
    HeaderS: {
        "Authorization": process.env.TURSO_API_KEY
    },
    get reqBody() {
        const month = getCurrentMonth();
        return {
            statements: [
                // Uses year-month-day layout with LIKE for the current month
                `SELECT * FROM warfare_events WHERE date LIKE '${month.yearMonth}%';`
            ]
        };
    },
};

// Execute all data pipelines sequentially
await fetchAndPopulate(EvtData);
await fetchAndPopulate(VslData);
await fetchAndPopulate(AspData);
await fetchAndPopulate(WfrData);
await fetchAndPopulate(EsriMap);

function fetchAndPopulate(constData) {
    fetchQueue = fetchQueue.then(async () => {
        try {
            const options = {
                method: constData.methodUrl,
                headers: constData.HeaderS
            };

            // Only attach body if method is POST and reqBody exists
            if (constData.methodUrl === "POST" && constData.reqBody) {
                options.body = JSON.stringify(constData.reqBody);
            }

            const response = await fetch(constData.url, options);
            
            const data = await dataTypefetch(constData.type, response);
            
            constData.parent = data;
            if (constData.type === "esrimap"){
                // Convert to [key, value] pairs to keep the index
                const entries = Object.entries(data);
                
                if (entries.length > 0) {
                    function extractDate(itemTitle) {
                        const match = itemTitle?.match(/\d{4}-\d{2}-\d{2}/);
                        return match ? new Date(match[0]) : new Date(0);
                    }

                    // Reduce to find the entry with the latest date
                    const latestEntry = entries.reduce((latest, current) => {
                        const currentDate = extractDate(current[1].itemTitle);
                        const latestDate = extractDate(latest[1].itemTitle);
                        return currentDate > latestDate ? current : latest;
                    });

                    // Assign an object that includes the index and the filtered item
                    constData.temp = {
                        index: latestEntry[0], // e.g., "6543"
                        ...latestEntry[1]      // the rest of the item properties
                    };
                } else {
                    constData.temp = {};
                }
            }
            else {
                constData.temp = {
                    ...data,
                    features: [...data.features] 
                };
            }
            

            async function dataTypefetch(constdatatype, response) {
                const rawdata = await response.json();
                
                const resultObj = typeof rawdata.result === "string" 
                    ? JSON.parse(rawdata.result) 
                    : (rawdata.results || rawdata);
            
                if (["esrimap", "event"].includes(constdatatype)) {
                    return resultObj;
                }
            
                if (["vessel", "airspace", "warfare"].includes(constdatatype)) {
                    const resultSet = Array.isArray(resultObj) ? resultObj[0]?.results : resultObj.results;
                    
                    if (!resultSet || !resultSet.columns || !resultSet.rows) {
                        console.warn(`Unexpected data format for ${constdatatype}`);
                        return { type: "FeatureCollection", features: [] };
                    }
            
                    const { columns, rows } = resultSet;
            
                    const items = rows.map(row => {
                        const obj = {};
                        columns.forEach((col, index) => {
                            obj[col] = row[index];
                        });
                        return obj;
                    });
            
                    const features = items.map(item => ({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [Number(item.longitude || 0), Number(item.latitude || 0)]
                        },
                        properties: { ...item }
                    }));
            
                    return {
                        type: "FeatureCollection",
                        features: features
                    };
                }
            }
        } catch (error) {
            console.error(`Secure fetch failed for ${constData.type}:`, error);
        }
    });
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





