import {openCalendar} from "./sortFilter.js"
import {processAndRender} from "./render.js"
export function setupMenuControls(section, listContainer) {
    const searchInput = section.querySelector("#eventSearch");
    const searchLink = section.querySelector("#filterJudul");
    const resetLink = section.querySelector("#resetFilterSort");
    const sortSelect = section.querySelector("#sortEvent");
    const modeSelect = section.querySelector("#sortMode");
    const eventSelect = section.querySelector("#eventOccur");
    const calendarTrigger = section.querySelector("#calendarTrigger")
    const strictDateInput = section.querySelector("#strictDateInput")

    // Helper function to update the URL and re-render
    function updateUrlAndRender(modifyUrlFn) {
        const currentUrl = new URL(window.location.href);
        modifyUrlFn(currentUrl);
        window.history.pushState({}, "", currentUrl);
        processAndRender(listContainer);
    }

    // 1. Handle Search
    searchLink.addEventListener("click", (e) => {
        e.preventDefault();
        updateUrlAndRender((url) => {
            const query = searchInput.value.trim();
            if (query) {
                url.searchParams.set("cari", query);
            } else {
                url.searchParams.delete("cari");
            }
        });
    });

    calendarTrigger.addEventListener("click", (e) => {e.preventDefault();openCalendar();})

// 2. Handle Reset
resetLink.addEventListener("click", (e) => {
    e.preventDefault();
    calendarTrigger.textContent = "📅 Pilih Tanggal";
    strictDateInput.value = 
    searchInput.value = "";
    sortSelect.value = "?sort=tanggal";
    modeSelect.value = "?sortM=ascend";
    eventSelect.value = "common"
    updateUrlAndRender((url) => {
        url.search = ""; 
    });
});

// 3. Handle Sorting Dropdowns (Combined Logic)
function handleSortChange() {
    const sortValue = sortSelect.value; // "?sort=judul", "?sort=tanggal", or empty/null
    const modeValue = modeSelect.value; // "?sortM=ascend", "?sortM=descend", or empty/null

    updateUrlAndRender((url) => {
        // Parse the parameters safely
        let sortParam = sortValue ? new URLSearchParams(sortValue).get("sort") : null;
        let modeParam = modeValue ? new URLSearchParams(modeValue).get("sortM") : null;

        // Fallback 1: If mode is chosen but sort is missing, default sort to "tanggal"
        if (modeParam && !sortParam) {
            sortParam = "tanggal";
            sortSelect.value = "?sort=tanggal"; // Sync the dropdown UI
        }

        // Fallback 2: If sort is chosen but mode is missing, default mode to "ascend"
        if (sortParam && !modeParam) {
            modeParam = "ascend";
            modeSelect.value = "?sortM=ascend"; // Sync the dropdown UI
        }

        // Apply to URL only if we have a valid sort key now
        if (sortParam) {
            const direction = (modeParam === "descend") ? "desc" : "asc";
            url.searchParams.set("sort", `${sortParam}_${direction}`);
        } else {
            url.searchParams.delete("sort");
        }

        // Keep the active search criteria intact
        const activeSearch = new URLSearchParams(window.location.search).get("cari");
        if (activeSearch) {
            url.searchParams.set("cari", activeSearch);
        }
    });
}

sortSelect.addEventListener("change", handleSortChange);
modeSelect.addEventListener("change", handleSortChange);
strictDateInput.addEventListener("change", (e) => {
    const dateValue = e.target.value; // Format: "2026-08-04"

    updateUrlAndRender((url) => {
        if (dateValue) {
            // Split the YYYY-MM-DD string by the hyphen
            const [year, month, day] = dateValue.split("-");
            

            
            // Construct the final custom format: DD-MM-YY
            const formattedDate = `${day}-${month}-${year}`;
            calendarTrigger.innerHTML = formattedDate;

            url.searchParams.set("date", formattedDate);
        } else {
            url.searchParams.delete("date");
            calendarTrigger.innerHTML = `📅 Pilih Tanggal`;
        }

        // 2. Keep the active search criteria intact
        const activeSearch = new URLSearchParams(window.location.search).get("cari");
        if (activeSearch) {
            url.searchParams.set("cari", activeSearch);
        }

        // 3. Keep the active sorting criteria intact
        const activeSort = new URLSearchParams(window.location.search).get("sort");
        if (activeSort) {
            url.searchParams.set("sort", activeSort);
        }
    });
});

eventSelect.addEventListener("change", (e) => {
    const eventValue = e.target.value;

    updateUrlAndRender((url) => {
        if (eventValue) {
            url.searchParams.set("occur",eventValue);
        } else {
            url.searchParams.delete("occur");
        }

        // 2. Keep the active search criteria intact
        const activeSearch = new URLSearchParams(window.location.search).get("cari");
        if (activeSearch) {
            url.searchParams.set("cari", activeSearch);
        }

        // 3. Keep the active sorting criteria intact
        const activeSort = new URLSearchParams(window.location.search).get("sort");
        if (activeSort) {
            url.searchParams.set("sort", activeSort);
        }

        const activeDate = new URLSearchParams(window.location.search).get("date");
        if (activeDate) {
            url.searchParams.set("date", activeDate);
        }
    });
});
}
