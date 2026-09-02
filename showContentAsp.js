let subdetail = {};
export function showContentAsp(feature) {
    // FIXED: Flush previous pin data instantly so zero-data pins don't accidentally display old data
    subdetail = {}; 

    const props = feature.properties;
    const geometry = feature.geometry;
    const detail = document.getElementById("detail");
    const content = document.querySelector("section");
    
    detail.style.display = "inline-block";
    content.textContent = ""; // Clear out previous view

    // 1. Get the template and clone its structural node tree
    const template = document.getElementById("detail-template");
    const clone = document.importNode(template.content, true);

    // Helper: Parse raw HTML string from EASA link property to extract text and href URL cleanly
    function parseEasaLink(htmlString) {
        if (!htmlString) return { text: "No Title", url: "" };
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const anchor = doc.querySelector('a');
        if (!anchor) return { text: htmlString, url: "" };
        return {
            text: anchor.textContent.trim(),
            url: anchor.getAttribute('href') || ""
        };
    }

    const parsedLink = parseEasaLink(props.link);

    // 2. Hydrate mandatory core text fields using ASP attributes
    const typeLabel = props.type ? props.type.replace(/_/g, ' ').toUpperCase() : "AIRSPACE ADVISORY";
    clone.querySelector(".title").textContent = parsedLink.text;
    clone.querySelector(".body-text").textContent = `Classification: ${typeLabel}`;

    // 3. Handle optional strings natively using coordinates
    const dateEl = clone.querySelector(".date");
    if (dateEl) dateEl.remove(); 

    const locEl = clone.querySelector(".location");
    if (locEl) {
        if (geometry && geometry.coordinates) {
            const [lng, lat] = geometry.coordinates;
            locEl.textContent = `Coordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
        } else {
            locEl.remove();
        }
    }

    // HELPER: Map frameworks pass arrays inside features as stringified JSON strings.
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

    // 4. Handle Content Display based on Feature Type
    const channelBtn = clone.querySelector(".channel-link");
    
    if (channelBtn) {
        if (parsedLink.url) {
            const targetUrl = parsedLink.url.startsWith('http') 
                ? parsedLink.url 
                : `https://www.easa.europa.eu${parsedLink.url}`;

            // Case A: EASA Conflict Zone (Scrape PDF and embed inline via Google Docs Viewer)
            if (props.type === "easa_conflict_zone") {
                const containerDiv = document.createElement('div');
                containerDiv.style.width = "100%";
                containerDiv.style.minHeight = "450px";
                containerDiv.style.marginTop = "10px";
                containerDiv.innerHTML = `<p style="padding: 20px; text-align: center; color: #666;">Loading inline PDF document...</p>`;
                
                channelBtn.replaceWith(containerDiv);

                fetch(targetUrl)
                    .then(response => response.text())
                    .then(htmlText => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(htmlText, 'text/html');
                        
                        const pdfAnchor = doc.querySelector('a.print__link.print__link--pdf');
                        
                        if (pdfAnchor && pdfAnchor.getAttribute('href')) {
                            let pdfUrl = pdfAnchor.getAttribute('href');
                            if (!pdfUrl.startsWith('http')) {
                                pdfUrl = `https://www.easa.europa.eu${pdfUrl}`;
                            }

                            const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

                            containerDiv.innerHTML = `
                                <iframe src="${viewerUrl}" width="100%" height="550px" style="border: none; border-radius: 4px;">
                                    This browser does not support inline document viewing.
                                </iframe>
                            `;
                        } else {
                            containerDiv.innerHTML = `
                                <div style="padding: 20px; text-align: center;">
                                    <p style="color: #d9534f; margin-bottom: 10px;">PDF version not found automatically.</p>
                                    <a href="${targetUrl}" target="_blank" style="padding: 8px 16px; background: #004b87; color: #fff; text-decoration: none; border-radius: 4px;">Open Page ↗</a>
                                </div>
                            `;
                        }
                    })
                    .catch(err => {
                        console.error("Failed to fetch EASA document page:", err);
                        containerDiv.innerHTML = `
                            <div style="padding: 20px; text-align: center;">
                                <p style="color: #d9534f; margin-bottom: 10px;">Unable to load inline view due to network/security policies.</p>
                                <a href="${targetUrl}" target="_blank" style="padding: 8px 16px; background: #004b87; color: #fff; text-decoration: none; border-radius: 4px;">Open Document ↗</a>
                            </div>
                        `;
                    });

            } 
            // Case B: Conflict Zone Information Notes (Handle like a reference channel item)
            else if (props.type === "conflict_zone_information_notes") {
                channelBtn.textContent = `Information Note Reference (1)`;
                subdetail.channel = [{
                    name: parsedLink.text,
                    url: targetUrl
                }];
                channelBtn.addEventListener('click', function() {
                    rendersubdetail(subdetail.channel);
                });
            } 
            // Case C: Standard fallback (iframe)
            else {
                const iframe = document.createElement('iframe');
                iframe.src = targetUrl;
                iframe.style.width = "100%";
                iframe.style.height = "450px"; 
                iframe.style.border = "none";
                iframe.style.borderRadius = "4px";
                iframe.style.marginTop = "10px";
                
                channelBtn.replaceWith(iframe);
            }
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
        const refTemplate = document.getElementById('ref-link-template');
        
        if (!targetSection || !refTemplate) return;
        
        targetSection.innerHTML = ""; 
        
        listToProcess.forEach(item => {
            if (!item || !item.url) return;
    
            const refClone = document.importNode(refTemplate.content, true);
            const linkref = refClone.querySelector("a");
            const iconImg = refClone.querySelector(".link-icon");
            const textEl = refClone.querySelector(".link-text");
    
            linkref.href = item.url.startsWith('http') ? item.url : `https://www.easa.europa.eu${item.url}`;
            textEl.textContent = item.name || item.url;
            
            if (item.icon_url && iconImg) {
                iconImg.src = item.icon_url;
                iconImg.style.display = "inline-block";
            }
            
            targetSection.appendChild(refClone);
        });
        
        if (subcontainer) {
            subcontainer.style.display = "block";
        }
    }

    // 6. Mount the fully populated layout straight to the visible DOM
    content.appendChild(clone);
}