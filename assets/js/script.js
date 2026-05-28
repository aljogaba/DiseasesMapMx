const map = L.map('map').setView([20.7, -103.5], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

Promise.all([
    fetch('maps/jalisco_municipios.geojson').then(res => res.json()),
    fetch('assets/data/sequences.csv').then(res => res.text())
])

.then(([geojsonData, csvData]) => {

    // ======================
    // PARSE CSV
    // ======================

    const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true
    });

    const allData = parsed.data;


// ======================
// FILTER CONFIG
// ======================

const filtersConfig = [

    {
        id: 'virusFilter',
        field: 'virus',
        label: 'All Viruses'
    },

    {
        id: 'yearFilter',
        field: 'year',
        label: 'All Years'
    },

    {
        id: 'lineageFilter',
        field: 'lineage',
        label: 'All Lineages/Genotypes'
    },

    {
        id: 'regionFilter',
        field: 'region',
        label: 'All Regions'
    },

    {
        id: 'stageFilter',
        field: 'production_stage',
        label: 'All Stages'
    },

    {
        id: 'geneFilter',
        field: 'gene',
        label: 'All Genes'
    },

    {
        id: 'vaccineFilter',
        field: 'vaccine',
        label: 'All Vaccine Status'
    },

    {
        id: 'detectionFilter',
        field: 'detection',
        label: 'All Detection Methods'
    },

    {
        id: 'rflpFilter',
        field: 'RFLP',
        label: 'All RFLP Patterns'
    }

];

function populateFilter(id, values, label) {

    const select = document.getElementById(id);

    select.innerHTML = '';

    // Default option

    const defaultOption =
        document.createElement('option');

    defaultOption.value = '';

    defaultOption.textContent = label;

    select.appendChild(defaultOption);

    // Unique values

    [...new Set(values)]

        .filter(Boolean)

        .sort()

        .forEach(value => {

            const option =
                document.createElement('option');

            option.value = value;

            option.textContent = value;

            select.appendChild(option);

        });

}

// ======================
// GENERATE FILTERS
// ======================

filtersConfig.forEach(filter => {

    populateFilter(

        filter.id,

        allData.map(row => row[filter.field]),

        filter.label

    );

});

    // ======================
    // NORMALIZE TEXT
    // ======================

    function normalizeText(text) {

        return text
            ?.trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    }

    // ======================
    // RENDER KPIs
    // ======================

function renderKPIs(data) {

    // ======================
    // GLOBAL KPIs
    // ======================

    const municipalitySet = new Set();

    const virusSet = new Set();

    data.forEach(row => {

        if (row.municipality) {

            municipalitySet.add(
                normalizeText(row.municipality)
            );

        }

        if (row.virus) {

            virusSet.add(row.virus);

        }

    });

    document.getElementById('totalSequences')
        .innerText = data.length;

    document.getElementById('totalMunicipalities')
        .innerText = municipalitySet.size;

    document.getElementById('totalViruses')
        .innerText = virusSet.size;

    // ======================
    // PRRSV KPIs
    // ======================

    const prrsvData = data.filter(row =>

        row.virus ===
        "Porcine reproductive and respiratory syndrome virus"

    );

    const prrsvMunicipalities = new Set();

    const prrsvLineages = {};

    prrsvData.forEach(row => {

        if (row.municipality) {

            prrsvMunicipalities.add(
                normalizeText(row.municipality)
            );

        }

        if (row.lineage) {

            prrsvLineages[row.lineage] =

                (prrsvLineages[row.lineage] || 0) + 1;

        }

    });

    const dominantPRRSV =

        Object.entries(prrsvLineages)

        .sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    document.getElementById('prrsvSequences')
        .innerText = prrsvData.length;

    document.getElementById('prrsvMunicipalities')
        .innerText = prrsvMunicipalities.size;

    document.getElementById('prrsvLineage')
        .innerText = dominantPRRSV;

    // ======================
    // PCV2 KPIs
    // ======================

    const pcv2Data = data.filter(row =>

        row.virus ===
        "Porcine Circovirus Type 2"

    );

    const pcv2Municipalities = new Set();

    const pcv2Genotypes = {};

    pcv2Data.forEach(row => {

        if (row.municipality) {

            pcv2Municipalities.add(
                normalizeText(row.municipality)
            );

        }

        if (row.lineage) {

            pcv2Genotypes[row.lineage] =

                (pcv2Genotypes[row.lineage] || 0) + 1;

        }

    });

    const dominantPCV2 =

        Object.entries(pcv2Genotypes)

        .sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    document.getElementById('pcv2Sequences')
        .innerText = pcv2Data.length;

    document.getElementById('pcv2Municipalities')
        .innerText = pcv2Municipalities.size;

    document.getElementById('pcv2Genotype')
        .innerText = dominantPCV2;

}

    // ======================
    // RENDER CHARTS
    // ======================

    function renderCharts(data) {

        // ======================
        // LINEAGE CHART
        // ======================

        const lineageCounts = {};

        data.forEach(row => {

            const lineage = row.lineage;

            if (lineage) {

                lineageCounts[lineage] =
                    (lineageCounts[lineage] || 0) + 1;

            }

        });

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

        data.forEach(row => {

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
        // STAGE CHART
        // ======================

        const stageCounts = {};

        data.forEach(row => {

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

    }

    // ======================
    // RENDER TABLE
    // ======================

    function renderTable(data) {

        if ($.fn.DataTable.isDataTable('#sequenceTable')) {

            $('#sequenceTable').DataTable().destroy();

        }

        $('#sequenceTable tbody').empty();

        const tableData = data.map(row => [

            row.accession,

            row.municipality,

            row.year,

            row.lineage,

            row.production_stage,

            row.gene,

            row.detection,

            row.vaccine,

            row.RFLP,

            `<a href="${row.genbank_url}"
                target="_blank">View</a>`

        ]);

        $('#sequenceTable').DataTable({

            responsive: true,
            
            data: tableData,

            pageLength: 10,

            columns: [
                { title: "Accession" },
                { title: "Municipality" },
                { title: "Year" },
                { title: "Lineage" },
                { title: "Production Stage" },
                { title: "Gene" },
                { title: "Detection" },
                { title: "Vaccine" },
                { title: "RFLP" },
                { title: "GenBank" }
            ]

        });

    }

    // ======================
    // MUNICIPALITY COUNTS
    // ======================

    const municipalityCounts = {};

    allData.forEach(row => {

        const municipality =
            normalizeText(row.municipality);

        if (municipality) {

            municipalityCounts[municipality] =
                (municipalityCounts[municipality] || 0) + 1;

        }

    });

    // ======================
    // COLOR SCALE
    // ======================

    function getColor(count) {

    return count > 50 ? '#4a1486' :
           count > 25 ? '#08519c' :
           count > 10 ? '#2171b5' :
           count > 5  ? '#4292c6' :
           count > 1  ? '#6baed6' :
           count > 0  ? '#c6dbef' :
                        '#f7fbff';

    }

// ======================
// MAP LAYER
// ======================

let geojsonLayer;

let legend;

// ======================
// RENDER MAP
// ======================

function renderMap(data) {

    // Remove old layer
    if (geojsonLayer) {

        map.removeLayer(geojsonLayer);

    }

    // Municipality counts
    const municipalityCounts = {};

    data.forEach(row => {

        const municipality =
            normalizeText(row.municipality);

        if (municipality) {

            municipalityCounts[municipality] =
                (municipalityCounts[municipality] || 0) + 1;

        }

    });

    // Create new layer
    geojsonLayer = L.geoJSON(geojsonData, {

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

        const municipalityData = data.filter(row =>

            normalizeText(row.municipality) ===
            municipality

        );

        const totalCount =
            municipalityData.length;

        // ======================
        // VIRUS SUMMARY
        // ======================

        const virusGroups = {};

        municipalityData.forEach(row => {

            const virusName =
                row.virus || "Unknown virus";

            if (!virusGroups[virusName]) {

                virusGroups[virusName] = [];

            }

            virusGroups[virusName].push(row);

        });

        function getShortVirusName(virusName) {

            const normalizedVirus =
                normalizeText(virusName);

            if (
                normalizedVirus.includes("reproductive") ||
                normalizedVirus.includes("prrs")
            ) {

                return "PRRSV";

            }

            if (
                normalizedVirus.includes("circovirus") ||
                normalizedVirus.includes("pcv")
            ) {

                return "PCV2";

            }

            return virusName;

        }

        function getDominantValue(rows, field) {

            const counts = {};

            rows.forEach(row => {

                const value =
                    row[field];

                if (value) {

                    counts[value] =
                        (counts[value] || 0) + 1;

                }

            });

            return Object.entries(counts)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

        }

        function getUniqueValues(rows, field) {

            return [

                ...new Set(

                    rows.map(row => row[field])

                )

            ]

            .filter(Boolean)

            .sort();

        }

        let virusSummaryHTML = "";

        Object.entries(virusGroups).forEach(([virusName, rows]) => {

            const shortVirusName =
                getShortVirusName(virusName);

            const dominantLineage =
                getDominantValue(rows, "lineage");

            const years =
                getUniqueValues(rows, "year");

            const genes =
                getUniqueValues(rows, "gene");

            const label =
                shortVirusName === "PCV2"
                    ? "Dominant genotype"
                    : "Dominant lineage";

            virusSummaryHTML += `

                <div style="margin-top:12px; padding-top:10px; border-top:1px solid #e5e7eb;">

                    <strong>${shortVirusName}</strong><br>

                    <span>Sequences:</span>
                    ${rows.length}<br>

                    <span>${label}:</span>
                    ${dominantLineage}<br>

                    <span>Years:</span>
                    ${years.join(', ') || '-'}<br>

                    <span>Genes:</span>
                    ${genes.join(', ') || '-'}<br>

                </div>

            `;

        });

        if (!virusSummaryHTML) {

            virusSummaryHTML = `

                <div style="margin-top:12px; padding-top:10px; border-top:1px solid #e5e7eb;">

                    No records available for the current filters.

                </div>

            `;

        }

        // ======================
        // POPUP
        // ======================

        layer.bindPopup(`

            <div style="min-width:240px">

                <h3 style="margin:0 0 10px 0;">
                    ${municipalityOriginal}
                </h3>

                <strong>Total sequences:</strong>
                ${totalCount}<br>

                <strong>Viruses detected:</strong>
                ${Object.keys(virusGroups).length}<br>

                ${virusSummaryHTML}

            </div>

        `);

        // ======================
        // HOVER EFFECT
        // ======================

        layer.on({

            mouseover: function(e) {

                const layer = e.target;

                layer.setStyle({

                    weight: 3,

                    color: '#111827',

                    fillOpacity: 0.9

                });

                layer.bringToFront();

            },

            mouseout: function(e) {

                geojsonLayer.resetStyle(e.target);

            },

            click: function(e) {

                map.fitBounds(
                    e.target.getBounds()
                );

            }

        });

    }

           
    }).addTo(map);

// ======================
// LEGEND
// ======================

if (legend) {

    map.removeControl(legend);

}

legend = L.control({
    position: 'bottomright'
});

legend.onAdd = function() {

    const div = L.DomUtil.create('div', 'info legend');

    const grades = [1, 5, 10, 25, 50];

    div.innerHTML +=
        '<strong>Sequences</strong><br>';

    for (let i = 0; i < grades.length; i++) {

        div.innerHTML +=

            '<i style="background:' +

            getColor(grades[i] + 1) +

            '; width:18px; height:18px; display:inline-block; margin-right:8px;"></i> ' +

            grades[i] +

            (grades[i + 1]
                ? '&ndash;' + grades[i + 1] + '<br>'
                : '+');

    }

    return div;

};

legend.addTo(map);
}

// ======================
// APPLY FILTERS
// ======================

// ======================
// UPDATE FILTER OPTIONS
// ======================

function updateFilterOptions(filteredData) {

    filtersConfig.forEach(currentFilter => {

        const select =
            document.getElementById(currentFilter.id);

        // Preserve current selection

        const currentValue = select.value;

        // Dataset excluding current filter

        const partiallyFilteredData = allData.filter(row => {

            return filtersConfig.every(filter => {

                // Skip current filter

                if (filter.id === currentFilter.id) {

                    return true;

                }

                const selectedValue =
                    document.getElementById(filter.id).value;

                if (!selectedValue) {

                    return true;

                }

                return normalizeText(

                    String(row[filter.field])

                ) === normalizeText(selectedValue);

            });

        });

        // Available values

        const availableValues = partiallyFilteredData.map(

            row => row[currentFilter.field]

        );

        // Rebuild filter

        populateFilter(

            currentFilter.id,

            availableValues,

            currentFilter.label

        );

        // Restore selection if still valid

        if (

            availableValues.includes(currentValue)

        ) {

            select.value = currentValue;

        }

    });

}

function applyFilters() {

    const filteredData = allData.filter(row => {

        return filtersConfig.every(filter => {

            const selectedValue =
                document.getElementById(filter.id).value;

            if (!selectedValue) {

                return true;

            }

            return normalizeText(

                String(row[filter.field])

            ) === normalizeText(selectedValue);

        });

    });

    renderKPIs(filteredData);

    renderCharts(filteredData);

    renderTable(filteredData);

    renderMap(filteredData);

    updateFilterOptions(filteredData);

}

    // ======================
    // INITIAL RENDER
    // ======================

    renderKPIs(allData);

    renderCharts(allData);

    renderTable(allData);

    renderMap(allData);

// ======================
// FILTER EVENTS
// ======================

filtersConfig.forEach(filter => {

    document
        .getElementById(filter.id)
        .addEventListener(
            'change',
            applyFilters
        );

});

// ======================
// CLOSE PROMISE
// ======================

});