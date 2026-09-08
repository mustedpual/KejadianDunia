let subdetail = {};
export function showContentVsl(feature) {
    // FIXED: Bersihkan data pin sebelumnya agar pin tanpa data tidak menampilkan data lama
    subdetail = {}; 

    const props = feature.properties;
    const detail = document.getElementById("detail");
    const content = document.querySelector("section");
    
    detail.style.display = "inline-block";
    content.textContent = ""; // Kosongkan tampilan sebelumnya

    // 1. Ambil template dan kloning struktur nodenya
    const template = document.getElementById("detail-template");
    const clone = document.importNode(template.content, true);

    // 2. Tentukan teks dengan prioritas Bahasa Indonesia terlebih dahulu
    const titleText = `[#${props.incidentNumber || ''}] ${props.incidentTypeNameId || props.incidentTypeName || "Tidak Ada Judul"}`;
    const bodyText = props.otherDetailsId || props.otherDetails || "";
    const placeText = props.place ? `Lokasi: ${props.place}` : "";
    const dateText = props.utcDateOfIncident ? new Date(props.utcDateOfIncident).toLocaleString('id-ID') : "";

    // Hidrasi teks inti wajib
    clone.querySelector(".title").textContent = titleText;
    clone.querySelector(".body-text").textContent = bodyText;

    // 3. Tangani string opsional secara mandiri (Tanggal & Tempat)
    const dateEl = clone.querySelector(".date");
    if (dateEl) {
        if (dateText) dateEl.textContent = dateText;
        else dateEl.remove();
    }

    const locEl = clone.querySelector(".location");
    if (locEl) {
        if (placeText) locEl.textContent = placeText;
        else locEl.remove();
    }

    // HELPER: Parsing array dengan aman dari string JSON atau array langsung
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

    // 4. Tangani tautan & gambar kondisional (Channel)
    const parsedChannels = safeParseArray(props.channel);
    const channelBtn = clone.querySelector(".channel-link");
    
    if (channelBtn) {
        channelBtn.textContent = `Saluran (${parsedChannels.length})`;
        
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
        if (thmEl) {
            thmEl.src = props.thumbnail;
            thmEl.style.display = "block";
        }
    }

    // Tangani Referensi
    const parsedReferences = safeParseArray(props.references);
    const refsBtn = clone.querySelector(".refs-list");
    
    if (refsBtn) {
        refsBtn.textContent = `Lihat Referensi (${parsedReferences.length})`;
        
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
        
        targetSection.innerHTML = ""; // Bersihkan tautan lama
        
        listToProcess.forEach(item => {
            if (!item || !item.url) return;
    
            const cloneRef = document.importNode(templateRef.content, true);
            const linkref = cloneRef.querySelector("a");
            const iconImg = cloneRef.querySelector(".link-icon");
            const textEl = cloneRef.querySelector(".link-text");
    
            linkref.href = item.url.startsWith('http') ? item.url : `https://${item.url}`;
            textEl.textContent = item.name || item.url;
            
            if (item.icon_url && iconImg) {
                iconImg.src = item.icon_url;
                iconImg.style.display = "inline-block";
            }
            
            targetSection.appendChild(cloneRef);
        });
        
        if (subcontainer) {
            subcontainer.style.display = "block"; 
        }
    }

    // 6. Pasang layout yang terisi penuh langsung ke DOM yang terlihat
    content.appendChild(clone);
}