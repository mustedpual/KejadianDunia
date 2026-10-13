// ── CONFIG ───────────────────────────────────────────────────────────────────
// Your deployed Vercel URL. No secrets here.
const PROXY_URL = "https://kejadian-dunia.vercel.app/api/proxy";
// ─────────────────────────────────────────────────────────────────────────────

let fetchQueue = Promise.resolve();

// Helper to generate current month metrics dynamically based on system clock
function getCurrentMonth() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(currentYear, now.getMonth() + 1, 0).getDate();

  return {
    yearMonth: `${currentYear}-${currentMonth}`,
    startDate: `${currentYear}-${currentMonth}-01`,
    endDate: `${currentYear}-${currentMonth}-${lastDay}`,
    vesselPattern: `${currentYear}-${currentMonth}%`
  };
}

export const EsriMap = {
  type: "esrimap",
  target: "esri",
  parent: null,
  temp: null,
};

export const EvtData = {
  type: "event",
  target: "upstash",
  parent: null,
  temp: null,
};

export const VslData = {
  type: "vessel",
  target: "turso",
  parent: null,
  temp: null,
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
  target: "turso",
  parent: null,
  temp: null,
  get reqBody() {
    const month = getCurrentMonth();
    return {
      statements: [
        `SELECT * FROM easa_czibs WHERE (SUBSTR(date_start, 7, 4) || '-' || SUBSTR(date_start, 4, 2) || '-' || SUBSTR(date_start, 1, 2)) <= '${month.endDate}' AND (SUBSTR(date_end, 7, 4) || '-' || SUBSTR(date_end, 4, 2) || '-' || SUBSTR(date_end, 1, 2)) >= '${month.startDate}';`
      ]
    };
  },
};

export const WfrData = {
  type: "warfare",
  target: "turso",
  parent: null,
  temp: null,
  get reqBody() {
    const month = getCurrentMonth();
    return {
      statements: [
        `SELECT * FROM warfare_events WHERE date LIKE '${month.yearMonth}%';`
      ]
    };
  },
};

// ── Proxy call ───────────────────────────────────────────────────────────────
async function proxied(target, body) {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, body }),
  });
  if (!res.ok) throw new Error(`Proxy "${target}" failed: ${res.status}`);
  return res.json();
}

// ── Normalize upstream JSON into map-friendly shapes ─────────────────────────
function dataTypefetch(constdatatype, rawdata) {
  const resultObj = typeof rawdata.result === "string"
    ? JSON.parse(rawdata.result)
    : (rawdata.results || rawdata);

  if (["esrimap", "event"].includes(constdatatype)) {
    return resultObj;
  }

  if (["vessel", "airspace", "warfare"].includes(constdatatype)) {
    const resultSet = Array.isArray(resultObj)
      ? resultObj[0]?.results
      : resultObj.results;

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

  return { type: "FeatureCollection", features: [] };
}

// ── Queue + populate ─────────────────────────────────────────────────────────
function fetchAndPopulate(constData) {
  fetchQueue = fetchQueue.then(async () => {
    try {
      const rawdata = await proxied(constData.target, constData.reqBody);
      const data = dataTypefetch(constData.type, rawdata);

      constData.parent = data;

      if (constData.type === "esrimap") {
        const entries = Object.entries(data);

        if (entries.length > 0) {
          function extractDate(itemTitle) {
            const match = itemTitle?.match(/\d{4}-\d{2}-\d{2}/);
            return match ? new Date(match[0]) : new Date(0);
          }

          const latestEntry = entries.reduce((latest, current) => {
            const currentDate = extractDate(current[1].itemTitle);
            const latestDate = extractDate(latest[1].itemTitle);
            return currentDate > latestDate ? current : latest;
          });

          constData.temp = {
            index: latestEntry[0],
            ...latestEntry[1]
          };
        } else {
          constData.temp = {};
        }
      } else {
        constData.temp = {
          ...data,
          features: [...(data.features || [])]
        };
      }
    } catch (error) {
      console.error(`Secure fetch failed for ${constData.type}:`, error);
    }
  });
  return fetchQueue;
}

// Execute all data pipelines sequentially
await fetchAndPopulate(EvtData);
await fetchAndPopulate(VslData);
await fetchAndPopulate(AspData);
await fetchAndPopulate(WfrData);
await fetchAndPopulate(EsriMap);

// ── UI: close detail panel ───────────────────────────────────────────────────
const subcontainer = document.getElementById('subdetail');
subcontainer?.addEventListener('click', function (event) {
  const button = event.target.closest('button');
  if (!button) return;

  const workAction = button.getAttribute('work');
  if (workAction === "closesubdetail") {
    subcontainer.style.display = "none";
    const section = subcontainer.querySelector("section");
    if (section) section.textContent = "";
  }
});
