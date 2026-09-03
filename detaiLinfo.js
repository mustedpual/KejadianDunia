import { map,listevent} from './displayEvents.js'; // Adjust path accordingly

const menu =  document.getElementById('menu');
// 2. Handle Opening the Detail Panel & Menu Clicks
menu.addEventListener('click', function(event) {
    const button = event.target.closest('button');
    if (!button) return;

    const buttonId = button.getAttribute('id');
    
    // Action A: Reset Map Camera
    if (buttonId === "resetmap") {
        map.flyTo({
            center:[0,0],
            zoom: 2,        
            essential: true,  
            speed: 1.2        
        });
    }
    
    // Action B: Go to History
    if (buttonId === "history") {
        window.open('/history/');
    }
    
    // Action C: Display Event List from Memory (NO FETCH REQUIRED)
    if (buttonId === "events") {
        const tutorialPointer = document.querySelectorAll(".tutorial-pointer");
        tutorialPointer.forEach(pointer => {
            pointer.remove();
        });
        listevent();
    }
});


