import {processAndRender} from './render.js'; // Adjust path accordingly
import {syncFormWithUrl} from './sortFilter.js'; // Adjust path accordingly
import {setupMenuControls} from './menuFilter.js'; // Adjust path accordingly
export { map, EvtData} from './mapinit.js'; // Adjust path accordingly

export const container = document.getElementById('detail');

// 1. Handle Closing the Detail Panel
container.addEventListener('click', function(event) {
    const button = event.target.closest('button');
    if (!button) return;
  
    const workAction = button.getAttribute('work');
    if (workAction === "closeEvent") {
        container.style.display = "none";
        const section = container.querySelector("section");
        if (section) section.textContent = "";
    }
  
    if (workAction === "closeDetail"){
      button.setAttribute("work","closeEvent")
      listevent();
    }
});

// Main Exported Entry Point
export function listevent() {
    container.style.display = "inline-block";
    const section = container.querySelector("section");
    section.textContent = ""; // Clear old list before rendering
    
    // Inject Menu Controls from Template
    const menuTemplate = document.getElementById("menuEvent");
    const menuClone = document.importNode(menuTemplate.content, true);
    section.appendChild(menuClone);

    // Create fixed container for dynamic listings below controls
    const listContainer = document.createElement("div");
    section.appendChild(listContainer);

    // Synchronize input elements with existing URL states
    syncFormWithUrl(section);

    // Setup interactive state management listeners
    setupMenuControls(section, listContainer);

    // Initial query string parsing and data array painting
    processAndRender(listContainer);
}


