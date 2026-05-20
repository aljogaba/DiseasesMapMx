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

// ======================
// KPI CALCULATIONS
// ======================

const totalSequences = parsed.data.length;

const totalMunicipalities =
    Object.keys(municipalityCounts).length;

// Lineage counts
const lineageCounts = {};

parsed.data.forEach(row => {

    const lineage = row.lineage;

    if (lineage) {

        lineageCounts[lineage] =
            (lineageCounts[lineage] || 0) + 1;

    }

});

// Top lineage
const topLineage =
    Object.entries(lineageCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

// Update dashboard KPIs
document.getElementById('totalSequences').innerText =
    totalSequences;

document.getElementById('totalMunicipalities').innerText =
    totalMunicipalities;

document.getElementById('topLineage').innerText =
    topLineage;

// ======================
// LINEAGE CHART
// ======================

Plotly.newPlot('lineageChart', [

    {
        x: Object.keys(lineageCounts),
        y: Object.values(lineageCounts),
        type: 'bar'
    }

], {

    margin: { t: 30 }

});

// ======================
// YEAR CHART
// ======================

const yearCounts = {};

parsed.data.forEach(row => {

    const year = row.year;

    if (year) {

        yearCounts[year] =
            (yearCounts[year] || 0) + 1;

    }

});

Plotly.newPlot('yearChart', [

    {
        x: Object.keys(yearCounts),
        y: Object.values(yearCounts),
        type: 'scatter',
        mode: 'lines+markers'
    }

], {

    margin: { t: 30 }

});

// ======================
// PRODUCTION STAGE CHART
// ======================

const stageCounts = {};

parsed.data.forEach(row => {

    const stage = row.production_stage;

    if (stage) {

        stageCounts[stage] =
            (stageCounts[stage] || 0) + 1;

    }

});

Plotly.newPlot('stageChart', [

    {
        labels: Object.keys(stageCounts),
        values: Object.values(stageCounts),
        type: 'pie'
    }

], {

    margin: { t: 30 }

});

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