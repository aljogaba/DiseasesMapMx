const map = L.map('map').setView([20.7, -103.5], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

Promise.all([
    fetch('maps/jalisco_municipios.geojson').then(res => res.json()),
    fetch('assets/data/sequences.csv').then(res => res.text())
])

.then(([geojsonData, csvData]) => {

    // Parse CSV
    const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true
    });

    // Normalize function
    function normalizeText(text) {
        return text
            ?.trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    // Count sequences per municipality
    const municipalityCounts = {};

    parsed.data.forEach(row => {

        const municipality =
            normalizeText(row.municipality);

        if (municipality) {

            municipalityCounts[municipality] =
                (municipalityCounts[municipality] || 0) + 1;

        }

    });

    console.log(municipalityCounts);

    // Color scale
    function getColor(count) {
        return count > 15 ? '#08306b' :
               count > 10 ? '#2171b5' :
               count > 5  ? '#6baed6' :
               count > 0  ? '#c6dbef' :
                            '#f7fbff';
    }

    // Add GeoJSON
    L.geoJSON(geojsonData, {

        style: function(feature) {

            const municipality =
                normalizeText(feature.properties.NOMGEO);

            const count =
                municipalityCounts[municipality] || 0;

            return {
                fillColor: getColor(count),
                weight: 1,
                opacity: 1,
                color: '#1f2937',
                fillOpacity: 0.7
            };

        },

        onEachFeature: function(feature, layer) {

            const municipalityOriginal =
                feature.properties.NOMGEO;

            const municipality =
                normalizeText(municipalityOriginal);

            const count =
                municipalityCounts[municipality] || 0;

            layer.bindPopup(`
                <strong>${municipalityOriginal}</strong><br>
                Sequences: ${count}
            `);

        }

    }).addTo(map);

});