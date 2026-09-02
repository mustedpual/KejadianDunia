// 1. Re-export directly (Imports and exports in one step to prevent duplication)
export { showContentEvt } from './showContentEvt.js';
export { showContentVsl } from './showContentVsl.js';
export { showContentAsp } from './showContentAsp.js';
export { showContentWfr } from './showContentWfr.js';
export { EvtData, VslData, AspData, WfrData } from './storagedata.js';

// 2. Import them normally for use within this current file
import { showContentEvt } from './showContentEvt.js';
import { showContentVsl } from './showContentVsl.js';
import { EvtData, VslData, AspData, WfrData } from './storagedata.js';
import { showContentAsp } from './showContentAsp.js';
import { showContentWfr } from './showContentWfr.js';


export const map = new maplibregl.Map({
    container: 'map',
    style: '/mapStyle.json', 
    center: [55, 25], 
    zoom: 4
});          

map.addControl(new maplibregl.NavigationControl(), 'top-right');

map.on('load', async () => {

    // 1. Add your GeoJSON sources
    map.addSource('evt-source', {
        type: 'geojson',
        data: EvtData.temp || { type: 'FeatureCollection', features: [] }
    });

    map.addSource('vsl-source', {
        type: 'geojson',
        data: VslData.temp || { type: 'FeatureCollection', features: [] }
    });

    map.addSource('asp-source', {
        type: 'geojson',
        data: AspData.temp || { type: 'FeatureCollection', features: [] }
    });

    map.addSource('wfr-source', {
        type: 'geojson',
        data: WfrData.temp || { type: 'FeatureCollection', features: [] }
    });

    try {
        // 2. Load image ONLY for vessels
        const vesselImage = await map.loadImage('/icons/diamond.png');
        if (!map.hasImage('vessel-icon')) {
            map.addImage('vessel-icon', vesselImage.data, { sdf: true }); // Enables dynamic coloring
        }

        const airspaceImage = await map.loadImage('/icons/EASA.png');
        if (!map.hasImage('airspace-icon')) {
            map.addImage('airspace-icon', airspaceImage.data, { sdf: true }); // Enables dynamic coloring
        }

        const warfareImage = await map.loadImage('/icons/sword.png');
        if (!map.hasImage('warfare-icon')) {
            map.addImage('warfare-icon', warfareImage.data, { sdf: true }); // Enables dynamic coloring
        }

        // 3. LAYER 1: Events as CIRCLES (Your working style)
        map.addLayer({
            id: 'evt-layer',
            type: 'circle',
            source: 'evt-source',
            paint: {
                'circle-color': [
                    'match',
                    ['get', 'crime'],
                    'Pembunuhan', '#D32F2F',        
                    'Pencurian', '#8E24AA',        
                    'Aktivitas Illegal', '#1976D2', 
                    '#808080'                      
                ],
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF'
            }
        });

        // 4. LAYER 2: Vessels as SYMBOL icons
        map.addLayer({
            id: 'vsl-layer',
            type: 'symbol',
            source: 'vsl-source',
            layout: {
                'icon-image': 'vessel-icon',
                'icon-size': 1.5,
                'icon-overlap': 'always',
                'icon-ignore-placement': true
            },
            paint: {
                // Dynamically colors the icon based on your data property 
                // (Change 'status' or 'warningType' to match your actual GeoJSON property name)
                'icon-color': [
                    'match',
                    ['get', 'pinColour'], // <-- Replace 'status' with your data's property key (e.g. 'warningLevel', 'category', etc.)
                    'Red', '#FF5252',       // Red for attacks/high threat
                    'Yellow', '#FFD700',      // Yellow/Orange for warnings
                    '#808080'                  // Default fallback color (Green)
                ],
                "icon-halo-color": "#FFFFFF",
                "icon-halo-width": 7
            }
        });

        map.addLayer({
            id: 'asp-layer',
            type: 'symbol',
            source: 'asp-source',
            layout: {
                'icon-image': 'airspace-icon',
                'icon-size': 1.5,
                'icon-overlap': 'always',
                'icon-ignore-placement': true
            },
            paint: {
                // Dynamically colors the icon based on your data property 
                // (Change 'status' or 'warningType' to match your actual GeoJSON property name)
                'icon-color': [
                    'match',
                    ['get', 'type'], // <-- Replace 'status' with your data's property key (e.g. 'warningLevel', 'category', etc.)
                    'easa_conflict_zone', '#FF1744',       // Red for attacks/high threat
                    'conflict_zone_information_notes', '#00E5FF',      // Yellow/Orange for warnings
                    '#FF9100'                  // Default fallback color (Green)
                ],
                "icon-halo-color": "#FFFFFF",
                "icon-halo-width": 7
            }
        });

        map.addLayer({
            id: 'wfr-layer',
            type: 'symbol',
            source: 'wfr-source',
            layout: {
                'icon-image': 'warfare-icon',
                'icon-size': 1.5,
                'icon-overlap': 'always',
                'icon-ignore-placement': true
            },
            paint: {
                // Dynamically colors the icon based on your status property
                'icon-color': [
                    'match',
                    ['get', 'status'],
                    'bomb-1', '#FF4500',     // Orange-Red
                    'elect-1', '#FFD700',    // Gold / Yellow
                    'speech-10', '#4169E1',  // Royal Blue
                    'phone-2', '#1E90FF',    // Dodger Blue
                    'dead-2', '#8B0000',     // Dark Red
                    'shahed-1', '#FF8C00',   // Dark Orange
                    'medicine-2', '#32CD32', // Lime Green
                    'fires-1', '#FF0000',    // Red
                    'medicine-1', '#228B22', // Forest Green
                    'ak-1', '#A52A2A',       // Brown
                    'drone-2', '#9370DB',    // Medium Purple
                    'aa-2', '#4682B4',       // Steel Blue
                    '#CCCCCC'                // Default fallback color (Gray)
                ],
                "icon-halo-color": "#FFFFFF",
                "icon-halo-width": 7
            }
        });

        console.log("Layers loaded successfully!");

    } catch (err) {
        console.error("Failed to load vessel icon:", err);
    }

    // 5. Data updates
    window.addEventListener('EvtDataUpdated', () => {
        const source = map.getSource('evt-source');
        if (source && EvtData.temp) source.setData(EvtData.temp); 
    });

    window.addEventListener('VslDataUpdated', () => {
        const source = map.getSource('vsl-source');
        if (source && VslData.temp) source.setData(VslData.temp); 
    });

    window.addEventListener('AspDataUpdated', () => {
        const source = map.getSource('asp-source');
        if (source && AspData.temp) source.setData(AspData.temp); 
    });

    window.addEventListener('WfrDataUpdated', () => {
        const source = map.getSource('wfr-source');
        if (source && WfrData.temp) source.setData(WfrData.temp); 
    });

    setTimeout(() => {
        if (EvtData.temp) map.getSource('evt-source')?.setData(EvtData.temp);
        if (VslData.temp) map.getSource('vsl-source')?.setData(VslData.temp);
        if (AspData.temp) map.getSource('asp-source')?.setData(AspData.temp);
        if (WfrData.temp) map.getSource('wfr-source')?.setData(WfrData.temp);
    }, 1000);

    // 6. Interactivity for both
    map.on('click', 'evt-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        showContentEvt(e.features[0]);
    });

    map.on('click', 'vsl-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        showContentVsl(e.features[0]);
    });

    map.on('click', 'asp-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        showContentAsp(e.features[0]);
    });

    map.on('click', 'wfr-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        showContentWfr(e.features[0]);
    });

    map.on('mouseenter', 'evt-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'evt-layer', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'vsl-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'vsl-layer', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'asp-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'asp-layer', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'wfr-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'wfr-layer', () => map.getCanvas().style.cursor = '');
});