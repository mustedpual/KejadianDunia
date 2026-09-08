let subdetail = {};
export function showContentAsp(feature) {
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

    // 2. Petunjuk Teks Utama dengan prioritas Bahasa Indonesia
    const czibNum = props.czib_number ? `[${props.czib_number}]` : (props.nid ? `[NID: ${props.nid}]` : "");
    const titleText = `${czibNum} Status: ${props.status || 'Aktif'}`.trim();
    
    // Menggunakan description bahasa Indonesia jika ada, fallback ke _en
    const bodyText = props.description || props.description_en || "";

    // Hidrasi teks inti wajib
    clone.querySelector(".title").textContent = props.airspace;
    clone.querySelector(".body-text").textContent = bodyText;

    // 3. Tangani field opsional (Tanggal, Wilayah Udara / Airspace)
    const dateEl = clone.querySelector(".date");
    if (dateEl) {
        if (props.date_start && props.date_end) {
            dateEl.textContent = `Periode: ${props.date_start} s.d. ${props.date_end}`;
        } else if (props.date_start) {
            dateEl.textContent = `Mulai: ${props.date_start}`;
        } else {
            dateEl.remove();
        }
    }

    const locEl = clone.querySelector(".location");
    if (titleText) {
        if (props.airspace) {
            locEl.textContent = titleText;
        } else {
            locEl.remove();
        }
    }

    // HELPER: Parsing array dengan aman jika ada properti berupa string JSON/array
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

    // 4. Tangani tautan detail eksternal (menggunakan detail_url sebagai tombol referensi jika tersedia)
    const refsList = safeParseArray(props.references);
    
    // Jika detail_url ada dan references kosong, kita bisa buatkan tombol tautan otomatis ke sumber aslinya
    if (props.detail_url && refsList.length === 0) {
        refsList.push({
            name: "Detail Resmi EASA (CZIB)",
            url: props.detail_url
        });
    }

    const refsBtn = clone.querySelector(".refs-list");
    if (refsBtn) {
        refsBtn.textContent = `Lihat Referensi (${refsList.length})`;
        
        if (refsList.length > 0) {
            subdetail.references = refsList;
            refsBtn.addEventListener('click', function() {
                rendersubdetail(subdetail.references);
            });
        } else {
            refsBtn.remove();
        }
    }

    // Tangani Channel/Rekomendasi tambahan jika diperlukan melalui tombol lain (opsional)
    const channelBtn = clone.querySelector(".channel-link");
    if (channelBtn) {
        // Contoh: Menyimpan rekomendasi dalam bentuk array objek jika ingin ditampilkan di subdetail
        const recommendations = [];
        const recText = props.recommendation || props.recommendation_en;
        if (recText) {
            recommendations.push({ name: "Rekomendasi Operator", url: props.detail_url || "#", desc: recText });
        }

        channelBtn.textContent = `Rekomendasi (${recommendations.length})`;
        if (recommendations.length > 0) {
            subdetail.channel = recommendations;
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

    // 6. Pasang layout ke DOM yang terlihat
    content.appendChild(clone);
}