export function showContentWfr(feature) {
    // Clear previous sub-details and external containers when switching pins
    const subcontainer = document.getElementById('subdetail');
    const targetSection = document.getElementById('externalchannel');
    if (targetSection) targetSection.innerHTML = "";
    if (subcontainer) subcontainer.style.display = "none";

    const props = feature.properties || {};
    const detail = document.getElementById("detail");
    const content = document.querySelector("section");
   
    if (!detail || !content) return;

    detail.style.display = "inline-block";
    content.textContent = ""; // Clear out previous view

    // 1. Get the template and clone its structure
    const template = document.getElementById("detail-template");
    if (!template) return;
    const clone = document.importNode(template.content, true);

    // 2. Map core fields directly from your GeoJSON properties
    const titleEl = clone.querySelector(".title");
    if (titleEl) {
        // Use location as the card title, with a safe fallback
        titleEl.textContent = props.location || "Liveuamap Update";
    }

    const bodyEl = clone.querySelector(".body-text");
    if (bodyEl) {
        // Your GeoJSON stores the event description in `props.title`
        bodyEl.textContent = props.title || "";
    }

    // 3. Handle metadata (Date & Location)
    const dateEl = clone.querySelector(".date");
    if (dateEl) {
        if (props.date) dateEl.textContent = props.date;
        else dateEl.remove();
    }

    const locEl = clone.querySelector(".location");
    if (locEl) {
        if (props.location) locEl.textContent = props.location;
        else locEl.remove();
    }

    // 4. Handle thumbnail
    const thmEl = clone.querySelector(".thumbnail");
    if (thmEl) {
        if (props.athumbnail) {
            thmEl.src = props.athumbnail;
            thmEl.style.display = "block";
            thmEl.setAttribute("referrerpolicy", "no-referrer");
        } else {
            thmEl.style.display = "none";
        }
    }

    // 5. Remove unused channel button since it's not in your GeoJSON
    const channelBtn = clone.querySelector(".channel-link");
    if (channelBtn) channelBtn.remove();

    // 6. Build references directly using `id` and `reference`
    let dynamicRefs = [];
    if (props.id) {
        dynamicRefs.push({ url: props.id, name: props.id });
    }
    if (props.reference) {
        dynamicRefs.push({ url: props.reference, name: props.reference });
    }

    const refsBtn = clone.querySelector(".refs-list");
    if (refsBtn) {
        if (dynamicRefs.length > 0) {
            refsBtn.textContent = `Lihat Referensi (${dynamicRefs.length})`;
            refsBtn.addEventListener('click', () => rendersubdetail(dynamicRefs));
        } else {
            refsBtn.remove();
        }
    }
   
    function rendersubdetail(listToProcess) {
        const subcontainerEl = document.getElementById('subdetail');
        const targetSec = document.getElementById('externalchannel');
        const refTemplate = document.getElementById('ref-link-template');
       
        if (!targetSec || !refTemplate) return;
        targetSec.innerHTML = "";
       
        listToProcess.forEach(item => {
            const refClone = document.importNode(refTemplate.content, true);
            const linkref = refClone.querySelector("a");
            const textEl = refClone.querySelector(".link-text");
   
            if (linkref) {
                linkref.href = item.url;
            }
            if (textEl) {
                textEl.textContent = item.name;
            }
           
            targetSec.appendChild(refClone);
        });
       
        if (subcontainerEl) {
            subcontainerEl.style.display = "block";
        }
    }

    // 7. Mount layout to DOM
    content.appendChild(clone);
}