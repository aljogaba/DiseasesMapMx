/* =========================================================
   COINFECTIONS DASHBOARD
   DiseasesMapMx
   PRRSV / PCV2 pool-level and farm-level exploratory module
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const CSV_PATH = "assets/data/pools.csv";

const FILTERS = [
    { id: "filter-region-com", field: "region_com" },
    { id: "filter-region", field: "region" },
    { id: "filter-funcion", field: "funcion" },
    { id: "filter-tipo", field: "tipo" },
    { id: "filter-origen-muestra", field: "origen_muestra" },
    { id: "filter-etapa", field: "etapa" },
    { id: "filter-sitio-muestra", field: "sitio_muestra" },
    { id: "filter-prrs-muestra", field: "resul_prrs_muestra" },
    { id: "filter-prrs-granja", field: "resul_prrs_granja" },
    { id: "filter-pcv2-muestra", field: "resul_pcv2_muestra" },
    { id: "filter-pcv2-granja", field: "resul_pcv2_granja" },
    { id: "filter-prrs-vaccine", derived: "_prrsVaccination" },
    { id: "filter-pcv2-vaccine", derived: "_pcv2Vaccination" }
];

let rawData = [];
let filteredData = [];
let coinfectionsTable = null;

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    Papa.parse(CSV_PATH, {
        download: true,
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,

        complete: function (results) {

            if (results.errors && results.errors.length > 0) {
                console.warn("CSV parsing warnings:", results.errors);
            }

            rawData = results.data
                .map(cleanAndDeriveRow)
                .filter(row => row.num_granja !== "");

            populateFilters(rawData);
            attachEvents();
            applyFiltersAndRender();
        },

        error: function (error) {
            console.error("Error loading CSV:", error);
            showLoadError();
        }
    });

});

/* =========================================================
   DATA CLEANING AND DERIVED VARIABLES
   ========================================================= */

function cleanAndDeriveRow(inputRow) {

    const row = {};

    Object.keys(inputRow).forEach(key => {
        const cleanKey = String(key).replace(/\uFEFF/g, "").trim();
        row[cleanKey] = cleanValue(inputRow[key]);
    });

    row._farm = row.num_granja;
    row._region = row.region || "Unknown";
    row._regionCom = row.region_com || "Unknown";
    row._stage = row.etapa || "Unknown";

    row._prrsPoolPositive = isPositivePool(row.resul_prrs_muestra);
    row._pcv2PoolPositive = isPositivePool(row.resul_pcv2_muestra);

    row._prrsFarmPositive = isPositiveFarm(row.resul_prrs_granja);
    row._pcv2FarmPositive = isPositiveFarm(row.resul_pcv2_granja);

    row._coinfectedPool = row._prrsPoolPositive && row._pcv2PoolPositive;
    row._coinfectedFarm = row._prrsFarmPositive && row._pcv2FarmPositive;

    /*
       Original exposure coding:
       prrs = 1  -> no PRRSV vaccination
       prrs = 0  -> PRRSV vaccination

       circo = 1 -> no PCV2 vaccination
       circo = 0 -> PCV2 vaccination
    */

    row._prrsVaccination = getVaccinationStatus(row.prrs);
    row._pcv2Vaccination = getVaccinationStatus(row.circo);

    row._prrsVaccinationLabel = formatVaccination(row._prrsVaccination);
    row._pcv2VaccinationLabel = formatVaccination(row._pcv2Vaccination);

    row._diagnosticProfile = getDiagnosticProfile(row);

    return row;
}

function cleanValue(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}

function normalizeText(value) {
    return cleanValue(value).toLowerCase();
}

function isPositivePool(value) {
    return normalizeText(value) === "pos";
}

function isPositiveFarm(value) {
    const v = normalizeText(value);
    return v === "pos" || v === "pos_clin";
}

function getVaccinationStatus(value) {

    const v = normalizeText(value);

    if (v === "0" || v === "0.0") {
        return "vaccinated";
    }

    if (v === "1" || v === "1.0") {
        return "not_vaccinated";
    }

    return "unknown";
}

function getDiagnosticProfile(row) {

    if (row._prrsPoolPositive && row._pcv2PoolPositive) {
        return "PRRSV+/PCV2+";
    }

    if (row._prrsPoolPositive && !row._pcv2PoolPositive) {
        return "PRRSV+/PCV2-";
    }

    if (!row._prrsPoolPositive && row._pcv2PoolPositive) {
        return "PRRSV-/PCV2+";
    }

    return "PRRSV-/PCV2-";
}

/* =========================================================
   FILTERS
   ========================================================= */

function populateFilters(data) {

    FILTERS.forEach(filter => {

        const select = document.getElementById(filter.id);

        if (!select) {
            return;
        }

        const values = getUniqueValues(data, filter);
        const sortedValues = sortFilterValues(filter, values);

        select.innerHTML = "";

        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All";
        select.appendChild(allOption);

        sortedValues.forEach(value => {

            if (value === "") {
                return;
            }

            const option = document.createElement("option");
            option.value = value;
            option.textContent = formatFilterValue(filter, value);
            select.appendChild(option);
        });

    });

}

function getUniqueValues(data, filter) {

    const values = new Set();

    data.forEach(row => {
        const value = filter.derived ? row[filter.derived] : row[filter.field];

        if (value !== undefined && value !== null && value !== "") {
            values.add(value);
        }
    });

    return Array.from(values);
}

function sortFilterValues(filter, values) {

    const preferredOrders = {
        region: ["A", "B1", "B2", "B3"],
        region_com: ["A2", "A3", "A4", "A5", "B1", "B2", "B3"],
        etapa: [
            "1gestacion",
            "2lactancia",
            "3destete",
            "4crecimiento",
            "5desarrollo",
            "6finalizacion"
        ],
        sitio_muestra: ["UNO", "DOS", "TRES"],
        resul_prrs_muestra: ["POS", "NEG"],
        resul_pcv2_muestra: ["POS", "NEG"],
        resul_prrs_granja: ["pos", "pos_clin", "neg"],
        resul_pcv2_granja: ["pos", "pos_clin", "neg"],
        _prrsVaccination: ["vaccinated", "not_vaccinated", "unknown"],
        _pcv2Vaccination: ["vaccinated", "not_vaccinated", "unknown"]
    };

    const key = filter.derived || filter.field;
    const order = preferredOrders[key];

    if (!order) {
        return values.sort((a, b) => String(a).localeCompare(String(b)));
    }

    return values.sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);

        if (ia === -1 && ib === -1) {
            return String(a).localeCompare(String(b));
        }

        if (ia === -1) {
            return 1;
        }

        if (ib === -1) {
            return -1;
        }

        return ia - ib;
    });
}

function attachEvents() {

    FILTERS.forEach(filter => {
        const select = document.getElementById(filter.id);

        if (select) {
            select.addEventListener("change", applyFiltersAndRender);
        }
    });

    const resetButton = document.getElementById("reset-filters");

    if (resetButton) {
        resetButton.addEventListener("click", resetFilters);
    }

    const downloadButton = document.getElementById("download-filtered-csv");

    if (downloadButton) {
        downloadButton.addEventListener("click", downloadFilteredCSV);
    }
}

function resetFilters() {

    FILTERS.forEach(filter => {
        const select = document.getElementById(filter.id);

        if (select) {
            select.value = "all";
        }
    });

    applyFiltersAndRender();
}

function applyFiltersAndRender() {

    filteredData = rawData.filter(row => {

        return FILTERS.every(filter => {

            const select = document.getElementById(filter.id);

            if (!select || select.value === "all") {
                return true;
            }

            const rowValue = filter.derived ? row[filter.derived] : row[filter.field];

            return rowValue === select.value;
        });

    });

    renderKPIs(filteredData);
    renderCharts(filteredData);
    renderTable(filteredData);
}

/* =========================================================
   KPIs
   ========================================================= */

function renderKPIs(data) {

    setText("kpi-total-pools", data.length);
    setText("kpi-total-farms", uniqueFarmCount(data));

    setText("kpi-prrs-pools", countRowsWhere(data, row => row._prrsPoolPositive));
    setText("kpi-pcv2-pools", countRowsWhere(data, row => row._pcv2PoolPositive));
    setText("kpi-coinfected-pools", countRowsWhere(data, row => row._coinfectedPool));

    setText("kpi-prrs-farms", uniqueFarmCountWhere(data, row => row._prrsFarmPositive));
    setText("kpi-pcv2-farms", uniqueFarmCountWhere(data, row => row._pcv2FarmPositive));
    setText("kpi-coinfected-farms", uniqueFarmCountWhere(data, row => row._coinfectedFarm));

    setText(
        "kpi-prrs-vaccinated-farms",
        uniqueFarmCountWhere(data, row => row._prrsVaccination === "vaccinated")
    );

    setText(
        "kpi-prrs-not-vaccinated-farms",
        uniqueFarmCountWhere(data, row => row._prrsVaccination === "not_vaccinated")
    );

    setText(
        "kpi-pcv2-vaccinated-farms",
        uniqueFarmCountWhere(data, row => row._pcv2Vaccination === "vaccinated")
    );

    setText(
        "kpi-pcv2-not-vaccinated-farms",
        uniqueFarmCountWhere(data, row => row._pcv2Vaccination === "not_vaccinated")
    );
}

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = formatNumber(value);
    }
}

function countRowsWhere(data, predicate) {
    return data.filter(predicate).length;
}

function uniqueFarmCount(data) {
    return uniqueFarmCountWhere(data, () => true);
}

function uniqueFarmCountWhere(data, predicate) {

    const farms = new Set();

    data.forEach(row => {
        if (row._farm !== "" && predicate(row)) {
            farms.add(row._farm);
        }
    });

    return farms.size;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US");
}

/* =========================================================
   CHARTS
   ========================================================= */

function renderCharts(data) {

    renderPoolsByRegionChart(data);
    renderFarmsByRegionChart(data);
    renderPRRSVaccinationChart(data);
    renderPCV2VaccinationChart(data);
    renderCoinfectionByStageChart(data);
    renderDiagnosticProfileChart(data);
}

function getCommonLayout(titleY = "Count") {

    return {
        margin: {
            l: 55,
            r: 25,
            t: 20,
            b: 80
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: {
            family: "Arial, sans-serif",
            color: "#1f2937"
        },
        yaxis: {
            title: titleY,
            rangemode: "tozero",
            gridcolor: "#e5e7eb"
        },
        xaxis: {
            tickangle: -35
        },
        legend: {
            orientation: "h",
            y: -0.28
        },
        barmode: "group"
    };
}

function getPlotConfig() {
    return {
        responsive: true,
        displaylogo: false
    };
}

function renderPoolsByRegionChart(data) {

    const regions = getOrderedCategories(data, "_region", ["A", "B1", "B2", "B3"]);

    const traces = [
        {
            x: regions,
            y: regions.map(region => countRowsWhere(data, row => row._region === region && row._prrsPoolPositive)),
            type: "bar",
            name: "PRRSV+ pools"
        },
        {
            x: regions,
            y: regions.map(region => countRowsWhere(data, row => row._region === region && row._pcv2PoolPositive)),
            type: "bar",
            name: "PCV2+ pools"
        },
        {
            x: regions,
            y: regions.map(region => countRowsWhere(data, row => row._region === region && row._coinfectedPool)),
            type: "bar",
            name: "PRRSV+/PCV2+ pools"
        }
    ];

    Plotly.newPlot(
        "chart-pools-region",
        traces,
        getCommonLayout("Number of pools"),
        getPlotConfig()
    );
}

function renderFarmsByRegionChart(data) {

    const regions = getOrderedCategories(data, "_region", ["A", "B1", "B2", "B3"]);

    const traces = [
        {
            x: regions,
            y: regions.map(region => uniqueFarmCountWhere(data, row => row._region === region && row._prrsFarmPositive)),
            type: "bar",
            name: "PRRSV+ farms"
        },
        {
            x: regions,
            y: regions.map(region => uniqueFarmCountWhere(data, row => row._region === region && row._pcv2FarmPositive)),
            type: "bar",
            name: "PCV2+ farms"
        },
        {
            x: regions,
            y: regions.map(region => uniqueFarmCountWhere(data, row => row._region === region && row._coinfectedFarm)),
            type: "bar",
            name: "PRRSV+/PCV2+ farms"
        }
    ];

    Plotly.newPlot(
        "chart-farms-region",
        traces,
        getCommonLayout("Number of farms"),
        getPlotConfig()
    );
}

function renderPRRSVaccinationChart(data) {

    const statuses = getVaccinationCategories(data, "_prrsVaccination");

    const totalFarms = statuses.map(status =>
        uniqueFarmCountWhere(data, row => row._prrsVaccination === status)
    );

    const positiveFarms = statuses.map(status =>
        uniqueFarmCountWhere(data, row => row._prrsVaccination === status && row._prrsFarmPositive)
    );

    const traces = [
        {
            x: statuses.map(formatVaccination),
            y: totalFarms,
            type: "bar",
            name: "Evaluated farms"
        },
        {
            x: statuses.map(formatVaccination),
            y: positiveFarms,
            type: "bar",
            name: "PRRSV+ farms"
        }
    ];

    Plotly.newPlot(
        "chart-prrs-vaccine",
        traces,
        getCommonLayout("Number of farms"),
        getPlotConfig()
    );
}

function renderPCV2VaccinationChart(data) {

    const statuses = getVaccinationCategories(data, "_pcv2Vaccination");

    const totalFarms = statuses.map(status =>
        uniqueFarmCountWhere(data, row => row._pcv2Vaccination === status)
    );

    const positiveFarms = statuses.map(status =>
        uniqueFarmCountWhere(data, row => row._pcv2Vaccination === status && row._pcv2FarmPositive)
    );

    const traces = [
        {
            x: statuses.map(formatVaccination),
            y: totalFarms,
            type: "bar",
            name: "Evaluated farms"
        },
        {
            x: statuses.map(formatVaccination),
            y: positiveFarms,
            type: "bar",
            name: "PCV2+ farms"
        }
    ];

    Plotly.newPlot(
        "chart-pcv2-vaccine",
        traces,
        getCommonLayout("Number of farms"),
        getPlotConfig()
    );
}

function renderCoinfectionByStageChart(data) {

    const stages = getOrderedCategories(data, "_stage", [
        "1gestacion",
        "2lactancia",
        "3destete",
        "4crecimiento",
        "5desarrollo",
        "6finalizacion"
    ]);

    const traces = [
        {
            x: stages.map(formatStage),
            y: stages.map(stage => countRowsWhere(data, row => row._stage === stage)),
            type: "bar",
            name: "Total pools"
        },
        {
            x: stages.map(formatStage),
            y: stages.map(stage => countRowsWhere(data, row => row._stage === stage && row._coinfectedPool)),
            type: "bar",
            name: "PRRSV+/PCV2+ pools"
        }
    ];

    Plotly.newPlot(
        "chart-coinfection-stage",
        traces,
        getCommonLayout("Number of pools"),
        getPlotConfig()
    );
}

function renderDiagnosticProfileChart(data) {

    const profiles = [
        "PRRSV-/PCV2-",
        "PRRSV+/PCV2-",
        "PRRSV-/PCV2+",
        "PRRSV+/PCV2+"
    ];

    const trace = {
        x: profiles,
        y: profiles.map(profile => countRowsWhere(data, row => row._diagnosticProfile === profile)),
        type: "bar",
        name: "Pools"
    };

    Plotly.newPlot(
        "chart-diagnostic-profile",
        [trace],
        getCommonLayout("Number of pools"),
        getPlotConfig()
    );
}

function getOrderedCategories(data, field, preferredOrder) {

    const values = Array.from(
        new Set(
            data
                .map(row => row[field])
                .filter(value => value !== undefined && value !== null && value !== "")
        )
    );

    return values.sort((a, b) => {
        const ia = preferredOrder.indexOf(a);
        const ib = preferredOrder.indexOf(b);

        if (ia === -1 && ib === -1) {
            return String(a).localeCompare(String(b));
        }

        if (ia === -1) {
            return 1;
        }

        if (ib === -1) {
            return -1;
        }

        return ia - ib;
    });
}

function getVaccinationCategories(data, field) {

    const preferredOrder = ["vaccinated", "not_vaccinated", "unknown"];

    const values = Array.from(
        new Set(
            data
                .map(row => row[field])
                .filter(value => value !== undefined && value !== null && value !== "")
        )
    );

    return values.sort((a, b) => preferredOrder.indexOf(a) - preferredOrder.indexOf(b));
}

/* =========================================================
   TABLE
   ========================================================= */

function renderTable(data) {

    const tableData = data.map(row => [
        escapeHtml(row.num_granja),
        escapeHtml(row.region_com),
        escapeHtml(row.region),
        escapeHtml(row.funcion),
        escapeHtml(row.tipo),
        escapeHtml(row.origen_muestra),
        escapeHtml(formatStage(row.etapa)),
        escapeHtml(row.sitio_muestra),
        resultLabel(row.resul_prrs_muestra, "pool"),
        resultLabel(row.resul_prrs_granja, "farm"),
        resultLabel(row.resul_pcv2_muestra, "pool"),
        resultLabel(row.resul_pcv2_granja, "farm"),
        vaccinationLabel(row._prrsVaccination),
        vaccinationLabel(row._pcv2Vaccination),
        coinfectionLabel(row._coinfectedPool)
    ]);

    if (!coinfectionsTable) {

        coinfectionsTable = $("#coinfections-table").DataTable({
            data: tableData,
            pageLength: 25,
            lengthMenu: [10, 25, 50, 100],
            order: [[0, "asc"]],
            autoWidth: false,
            deferRender: true,
            language: {
                search: "Search:",
                lengthMenu: "Show _MENU_ records",
                info: "Showing _START_ to _END_ of _TOTAL_ records",
                infoEmpty: "Showing 0 to 0 of 0 records",
                zeroRecords: "No matching records found",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            }
        });

    } else {

        coinfectionsTable.clear();
        coinfectionsTable.rows.add(tableData);
        coinfectionsTable.draw();
    }
}

/* =========================================================
   DOWNLOAD FILTERED CSV
   ========================================================= */

function downloadFilteredCSV() {

    const exportRows = filteredData.map(row => ({
        id_pool: row.id_pool,
        num_granja: row.num_granja,
        region_com: row.region_com,
        region: row.region,
        funcion: row.funcion,
        tipo: row.tipo,
        origen_muestra: row.origen_muestra,
        etapa: row.etapa,
        sitio_muestra: row.sitio_muestra,
        resul_prrs_muestra: row.resul_prrs_muestra,
        resul_prrs_granja: row.resul_prrs_granja,
        resul_pcv2_muestra: row.resul_pcv2_muestra,
        resul_pcv2_granja: row.resul_pcv2_granja,
        prrs_original: row.prrs,
        circo_original: row.circo,
        prrs_vaccination: row._prrsVaccinationLabel,
        pcv2_vaccination: row._pcv2VaccinationLabel,
        prrs_pool_positive: row._prrsPoolPositive ? "Yes" : "No",
        pcv2_pool_positive: row._pcv2PoolPositive ? "Yes" : "No",
        coinfection_pool: row._coinfectedPool ? "Yes" : "No",
        prrs_farm_positive: row._prrsFarmPositive ? "Yes" : "No",
        pcv2_farm_positive: row._pcv2FarmPositive ? "Yes" : "No",
        coinfection_farm: row._coinfectedFarm ? "Yes" : "No"
    }));

    const csv = Papa.unparse(exportRows);

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "filtered_coinfections.csv";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/* =========================================================
   FORMATTERS
   ========================================================= */

function formatFilterValue(filter, value) {

    const key = filter.derived || filter.field;

    if (key === "_prrsVaccination" || key === "_pcv2Vaccination") {
        return formatVaccination(value);
    }

    if (key === "etapa") {
        return formatStage(value);
    }

    if (
        key === "resul_prrs_muestra" ||
        key === "resul_pcv2_muestra" ||
        key === "resul_prrs_granja" ||
        key === "resul_pcv2_granja"
    ) {
        return formatResult(value);
    }

    return value;
}

function formatStage(value) {

    const labels = {
        "1gestacion": "Gestation",
        "2lactancia": "Lactation",
        "3destete": "Weaning",
        "4crecimiento": "Growing",
        "5desarrollo": "Development",
        "6finalizacion": "Finishing"
    };

    return labels[value] || value || "Unknown";
}

function formatResult(value) {

    const v = normalizeText(value);

    if (v === "pos") {
        return "Positive";
    }

    if (v === "pos_clin") {
        return "Positive clinical";
    }

    if (v === "neg") {
        return "Negative";
    }

    if (v === "POS".toLowerCase()) {
        return "Positive";
    }

    if (v === "NEG".toLowerCase()) {
        return "Negative";
    }

    return value || "Unknown";
}

function formatVaccination(status) {

    if (status === "vaccinated") {
        return "Vaccinated";
    }

    if (status === "not_vaccinated") {
        return "Not vaccinated";
    }

    return "Unknown";
}

function resultLabel(value, level) {

    const v = normalizeText(value);
    const text = formatResult(value);

    if (v === "pos" || v === "pos_clin") {
        return `<span class="status-label status-positive">${escapeHtml(text)}</span>`;
    }

    if (v === "neg") {
        return `<span class="status-label status-negative">${escapeHtml(text)}</span>`;
    }

    return `<span class="status-label">${escapeHtml(text)}</span>`;
}

function vaccinationLabel(status) {

    const text = formatVaccination(status);

    if (status === "vaccinated") {
        return `<span class="status-label status-vaccinated">${text}</span>`;
    }

    if (status === "not_vaccinated") {
        return `<span class="status-label status-not-vaccinated">${text}</span>`;
    }

    return `<span class="status-label">${text}</span>`;
}

function coinfectionLabel(isCoinfected) {

    if (isCoinfected) {
        return `<span class="status-label status-coinfection">Yes</span>`;
    }

    return `<span class="status-label status-negative">No</span>`;
}

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
   ERROR MESSAGE
   ========================================================= */

function showLoadError() {

    const main = document.querySelector(".page-content");

    if (!main) {
        return;
    }

    const section = document.createElement("section");
    section.className = "info-section dashboard-section";

    section.innerHTML = `
        <h3>CSV loading error</h3>
        <p>
            The file <strong>${CSV_PATH}</strong> could not be loaded.
            Check that the file exists, that the name is exactly
            <strong>pools.csv</strong>, and that you are running the project
            with Live Server or GitHub Pages.
        </p>
    `;

    main.prepend(section);
}