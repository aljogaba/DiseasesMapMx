"use strict";

const API_ENDPOINT = "http://127.0.0.1:8000/analyze";

const form = document.getElementById("sequenceAnalysisForm");
const sequenceInput = document.getElementById("sequenceInput");
const sequenceLengthBadge = document.getElementById("sequenceLengthBadge");
const sequenceFeedback = document.getElementById("sequenceFeedback");
const formMessage = document.getElementById("formMessage");
const analysisResults = document.getElementById("analysisResults");
const exampleSequenceButton = document.getElementById("exampleSequenceButton");
const clearSequenceButton = document.getElementById("clearSequenceButton");
const collectionDateInput = document.getElementById("collectionDate");
const collectionYearInput = document.getElementById("collectionYear");
const submitButton = form.querySelector("button[type='submit']");
const downloadReportButton = document.getElementById("downloadReportButton");

let latestAnalysisResult = null;

const COMPLETE_ORF5_LENGTH = 603;
const MIN_ACCEPTED_LENGTH = 250;
const MAX_ACCEPTED_LENGTH = 750;

function extractSequence(rawInput) {
    const lines = rawInput.split(/\r?\n/);
    const sequenceLines = lines.filter((line) => !line.trim().startsWith(">"));

    return sequenceLines
        .join("")
        .replace(/[\s\d-]/g, "")
        .toUpperCase();
}

function evaluateSequence(rawInput) {
    const sequence = extractSequence(rawInput);
    const invalidCharacters = [...new Set(sequence.replace(/[ACGTN]/g, "").split(""))]
        .filter(Boolean);
    const ambiguousCount = (sequence.match(/N/g) || []).length;
    const ambiguousPercent = sequence.length
        ? (ambiguousCount / sequence.length) * 100
        : 0;
    const coverage = sequence.length
        ? (sequence.length / COMPLETE_ORF5_LENGTH) * 100
        : 0;

    const errors = [];
    const warnings = [];

    if (!sequence.length) {
        errors.push("Enter an ORF5 nucleotide sequence before continuing.");
    }

    if (invalidCharacters.length) {
        errors.push(`Invalid characters detected: ${invalidCharacters.join(", ")}.`);
    }

    if (sequence.length && sequence.length < MIN_ACCEPTED_LENGTH) {
        errors.push(`The sequence is shorter than the accepted minimum of ${MIN_ACCEPTED_LENGTH} nt.`);
    }

    if (sequence.length > MAX_ACCEPTED_LENGTH) {
        errors.push(`The sequence is longer than the accepted maximum of ${MAX_ACCEPTED_LENGTH} nt.`);
    }

    if (sequence.length >= MIN_ACCEPTED_LENGTH && sequence.length < 450) {
        warnings.push("The sequence is partial and may support only a lower-confidence classification.");
    } else if (sequence.length >= 450 && sequence.length < COMPLETE_ORF5_LENGTH) {
        warnings.push("The sequence is partial but may be suitable for preliminary reference screening.");
    } else if (sequence.length > COMPLETE_ORF5_LENGTH) {
        warnings.push("The input is longer than the expected 603 nt ORF5 coding region and may include flanking sequence.");
    }

    if (ambiguousPercent > 5) {
        warnings.push("More than 5% of the sequence contains ambiguous N bases.");
    } else if (ambiguousPercent > 1) {
        warnings.push("The sequence contains more than 1% ambiguous N bases.");
    }

    return {
        sequence,
        length: sequence.length,
        invalidCharacters,
        ambiguousCount,
        ambiguousPercent,
        coverage,
        errors,
        warnings
    };
}

function setSequenceFeedback(evaluation) {
    sequenceLengthBadge.textContent = `${evaluation.length.toLocaleString()} nt`;
    sequenceFeedback.className = "analysis-inline-feedback";

    if (evaluation.errors.length) {
        sequenceFeedback.classList.add("is-error");
        sequenceFeedback.textContent = evaluation.errors.join(" ");
        sequenceInput.setAttribute("aria-invalid", "true");
        return;
    }

    sequenceInput.removeAttribute("aria-invalid");

    if (evaluation.warnings.length) {
        sequenceFeedback.classList.add("is-warning");
        sequenceFeedback.textContent = evaluation.warnings.join(" ");
        return;
    }

    if (evaluation.length) {
        sequenceFeedback.classList.add("is-valid");
        sequenceFeedback.textContent = "The nucleotide characters and sequence length pass the input validation rules.";
        return;
    }

    sequenceFeedback.textContent = "Accepted characters: A, C, G, T, and N. FASTA headers beginning with “>” are allowed.";
}

function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `analysis-form-message is-visible is-${type}`;
}

function clearFormMessage() {
    formMessage.textContent = "";
    formMessage.className = "analysis-form-message";
}

function determineQualityStatus(evaluation) {
    if (evaluation.errors.length) {
        return "Not accepted";
    }

    if (evaluation.ambiguousPercent > 5 || evaluation.length < 450) {
        return "Review required";
    }

    if (evaluation.warnings.length) {
        return "Acceptable with warnings";
    }

    return "Suitable for API submission";
}

function updateLocalQcResults(evaluation) {
    document.getElementById("resultLength").textContent = `${evaluation.length.toLocaleString()} nt`;
    document.getElementById("resultCoverage").textContent = `${evaluation.coverage.toFixed(1)}%`;
    document.getElementById("resultAmbiguous").textContent =
        `${evaluation.ambiguousCount.toLocaleString()} (${evaluation.ambiguousPercent.toFixed(2)}%)`;
    document.getElementById("resultQuality").textContent = determineQualityStatus(evaluation);
}

function validateRequiredFields() {
    const requiredFields = [...form.querySelectorAll("[required]")];
    let firstInvalidField = null;

    requiredFields.forEach((field) => {
        const isCheckbox = field.type === "checkbox";
        const isValid = isCheckbox ? field.checked : field.value.trim() !== "";

        if (!isValid) {
            field.setAttribute("aria-invalid", "true");
            firstInvalidField ||= field;
        } else {
            field.removeAttribute("aria-invalid");
        }
    });

    return firstInvalidField;
}

function normalizeSelectValue(selectElement, fallback = "Not specified") {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    return selectedOption && selectedOption.value ? selectedOption.textContent.trim() : fallback;
}

function buildApiPayload(evaluation) {
    return {
        sample_id: document.getElementById("sampleId").value.trim(),
        sequence: evaluation.sequence,
        country: document.getElementById("country").value.trim(),
        state: document.getElementById("state").value.trim(),
        municipality: document.getElementById("municipality").value.trim() || "Not specified",
        collection_date: collectionDateInput.value || null,
        sample_type: normalizeSelectValue(document.getElementById("sampleType")),
        production_stage: normalizeSelectValue(document.getElementById("productionStage")),
        institution: document.getElementById("institution").value.trim(),
        contact_email: document.getElementById("contactEmail").value.trim(),
        allow_private_storage: document.getElementById("storageConsent").checked,
        allow_public_use: document.getElementById("publicationConsent").checked
    };
}

function setApiStatus(status, title, text) {
    const alert = document.getElementById("apiStatusAlert");
    alert.className = `analysis-result-alert analysis-result-alert-${status}`;
    document.getElementById("apiStatusTitle").textContent = title;
    document.getElementById("apiStatusText").textContent = text;
}

function clearApiOutput() {
    latestAnalysisResult = null;
    updateReportButtonState(false);
    document.getElementById("resultRequestCode").textContent = "Analysis request: pending";
    document.getElementById("resultLineage").textContent = "—";
    const lineageCard = document.querySelector(".analysis-lineage-card");
    if (lineageCard) {
        lineageCard.classList.remove("analysis-lineage-card-success", "analysis-lineage-card-warning", "analysis-lineage-card-neutral");
    }
    document.getElementById("resultBestMatch").textContent = "—";
    document.getElementById("resultBestMatchDetails").textContent = "Reference metadata will appear here";
    document.getElementById("resultIdentity").textContent = "—";
    document.getElementById("resultIdentityDetails").textContent = "Comparable positions and mismatches";
    document.getElementById("resultOrientation").textContent = "—";
    document.getElementById("resultOrientationDetails").textContent = "Orientation used for closest-reference screening";
    document.getElementById("resultConfidence").textContent = "—";
    document.getElementById("resultGap").textContent = "Gap to closest different lineage";
    document.getElementById("resultTopMatchesBody").innerHTML =
        `<tr><td colspan="7">Waiting for API response.</td></tr>`;
    resetTreeContextOutput();
    document.getElementById("resultJson").textContent = "No API response yet.";
}

function formatPercent(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }
    return `${Number(value).toFixed(2).replace(/\.00$/, "")}%`;
}

function formatOrientation(value) {
    if (!value) {
        return "—";
    }

    const normalized = String(value).toLowerCase();

    if (normalized.includes("reverse")) {
        return "Reverse complement";
    }

    if (normalized.includes("forward")) {
        return "Forward";
    }

    return String(value).replace(/_/g, " ");
}

function reportValue(value, fallback = "Not provided") {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }

    return String(value);
}

function sanitizeFilename(value) {
    return reportValue(value, "analysis")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 120) || "analysis";
}

function escapeHtml(value) {
    return reportValue(value, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function treeGroupClass(group, colorMap) {
    const key = reportValue(group, "Unassigned");
    if (colorMap && colorMap.has(key)) {
        return `analysis-tree-color-${colorMap.get(key)}`;
    }

    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
    }
    return `analysis-tree-color-${Math.abs(hash) % 12}`;
}

function renderTreeLegend(legend = [], colorMap = new Map()) {
    const legendContainer = document.getElementById("treeLegend");
    if (!legendContainer) {
        return;
    }

    if (!legend.length) {
        legendContainer.innerHTML = "";
        legendContainer.hidden = true;
        return;
    }

    legendContainer.hidden = false;
    legendContainer.innerHTML = legend.map((item) => {
        const group = item.display_group || "Unassigned";
        const colorClass = treeGroupClass(group, colorMap);
        return `
            <span class="analysis-tree-legend-item">
                <i class="${colorClass}" aria-hidden="true"></i>
                ${escapeHtml(group)} <small>${item.count ?? 0}</small>
            </span>
        `;
    }).join("");
}

function renderLocalTreeGraphic(treeContext = {}) {
    const container = document.getElementById("treeGraphicContainer");
    const svg = document.getElementById("masterTreeSvg");
    const caption = document.getElementById("treeGraphicCaption");
    const badge = document.getElementById("treeGraphicBadge");

    if (!container || !svg) {
        return;
    }

    const view = treeContext.local_tree_view || {};
    const nodes = Array.isArray(view.nodes) ? view.nodes : [];
    const segments = Array.isArray(view.segments) ? view.segments : [];
    const leaves = nodes.filter((node) => node.is_leaf);

    if (!view.available || !nodes.length || !leaves.length) {
        container.hidden = true;
        svg.innerHTML = "";
        renderTreeLegend([]);
        return;
    }

    container.hidden = false;

    const legend = Array.isArray(view.legend) ? view.legend : [];
    const colorMap = new Map();
    legend.forEach((item, index) => {
        colorMap.set(item.display_group || "Unassigned", index % 12);
    });
    renderTreeLegend(legend, colorMap);

    const width = 980;
    const rowHeight = 34;
    const topPadding = 26;
    const bottomPadding = 26;
    const leftPadding = 28;
    const rightLabelWidth = 360;
    const treeWidth = width - leftPadding - rightLabelWidth;
    const height = Math.max(220, topPadding + bottomPadding + Math.max(1, leaves.length - 1) * rowHeight);
    const maxX = Number(view.x_max) > 0 ? Number(view.x_max) : 1;
    const maxY = Number(view.y_max) > 0 ? Number(view.y_max) : Math.max(1, leaves.length - 1);

    const scaleX = (value) => leftPadding + (Number(value || 0) / maxX) * treeWidth;
    const scaleY = (value) => topPadding + (Number(value || 0) / maxY) * Math.max(rowHeight, (leaves.length - 1) * rowHeight);

    const segmentMarkup = segments.map((segment) => {
        return `<line class="analysis-tree-segment" x1="${scaleX(segment.x1).toFixed(2)}" y1="${scaleY(segment.y1).toFixed(2)}" x2="${scaleX(segment.x2).toFixed(2)}" y2="${scaleY(segment.y2).toFixed(2)}" />`;
    }).join("");

    const leafMarkup = leaves.map((leaf) => {
        const x = scaleX(leaf.x);
        const y = scaleY(leaf.y);
        const group = leaf.display_group || leaf.sublineage || leaf.lineage || "Unassigned";
        const colorClass = treeGroupClass(group, colorMap);
        const isBest = Boolean(leaf.is_best_match);
        const label = leaf.display_label || leaf.tree_id || "Reference";
        const subtitle = [leaf.tree_id, leaf.lineage].filter(Boolean).join(" · ");
        return `
            <g class="analysis-tree-tip ${isBest ? "analysis-tree-tip-best" : ""}" transform="translate(${x.toFixed(2)}, ${y.toFixed(2)})">
                <circle class="analysis-tree-tip-dot ${colorClass}" r="${isBest ? 5.5 : 4.2}"></circle>
                <text class="analysis-tree-tip-label" x="12" y="-2">${escapeHtml(label)}${isBest ? "  ← best match" : ""}</text>
                <text class="analysis-tree-tip-sublabel" x="12" y="12">${escapeHtml(subtitle)}</text>
            </g>
        `;
    }).join("");

    const rootX = Math.min(...nodes.map((node) => scaleX(node.x)));
    const rootLine = `<line class="analysis-tree-root-line" x1="${rootX.toFixed(2)}" y1="${topPadding - 10}" x2="${rootX.toFixed(2)}" y2="${height - bottomPadding + 10}" />`;

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.innerHTML = `${rootLine}${segmentMarkup}${leafMarkup}`;

    if (caption) {
        const cladeText = view.mrca_leaf_count_in_full_tree
            ? `Pruned local view around ${view.focal_reference_id || treeContext.tree_id || "the closest reference"}; the connecting ancestor contains ${view.mrca_leaf_count_in_full_tree} taxa in the full master tree.`
            : "Pruned local view around the closest reference.";
        caption.textContent = `${cladeText} The full Newick tree and alignment are not exposed.`;
    }

    if (badge) {
        badge.textContent = `${view.selected_leaf_count || leaves.length} displayed taxa`;
    }
}

function buildPublicSummaryReport(result) {
    const qc = result.qc || {};
    const metadata = result.submitted_metadata || {};
    const bestMatch = result.closest_reference_match || result.best_match || {};
    const mexicanMatch = result.closest_mexican_reference_match || null;
    const topMatches = Array.isArray(result.top_matches) ? result.top_matches : [];
    const treeContext = result.tree_context || {};
    const treeNeighborhood = Array.isArray(treeContext.local_display_neighborhood) ? treeContext.local_display_neighborhood : [];
    const warnings = Array.isArray(qc.warnings) ? qc.warnings : [];
    const errors = Array.isArray(qc.errors) ? qc.errors : [];
    const now = new Date();

    const lines = [
        "DISEASESMAPMX PRRSV-2 ORF5 ANALYSIS REPORT",
        "Preliminary closest-reference screening with master-tree context",
        "",
        "============================================================",
        "1. ANALYSIS IDENTIFICATION",
        "============================================================",
        `Analysis ID: ${reportValue(result.analysis_id, "Not available")}`,
        `Report generated: ${now.toISOString()}`,
        `Engine version: ${reportValue(result.engine_version, "Not available")}`,
        `API target: PRRSV-2 ORF5`,
        "",
        "============================================================",
        "2. SUBMITTED METADATA",
        "============================================================",
        `Sample ID: ${reportValue(metadata.sample_id)}`,
        `Country: ${reportValue(metadata.country)}`,
        `State / administrative area: ${reportValue(metadata.state)}`,
        `Municipality: ${reportValue(metadata.municipality)}`,
        `Collection date: ${reportValue(metadata.collection_date)}`,
        `Sample type: ${reportValue(metadata.sample_type)}`,
        `Production stage: ${reportValue(metadata.production_stage)}`,
        `Submitting institution/laboratory: ${reportValue(metadata.institution)}`,
        `Contact email: ${reportValue(metadata.contact_email)}`,
        `Private storage authorized: ${metadata.allow_private_storage ? "Yes" : "No"}`,
        `Future public use authorized: ${metadata.allow_public_use ? "Yes" : "No"}`,
        "",
        "============================================================",
        "3. QUERY QUALITY CONTROL",
        "============================================================",
        `Valid sequence input: ${qc.valid ? "Yes" : "No"}`,
        `Sequence length after cleaning: ${reportValue(qc.length, "Not available")} nt`,
        `Estimated ORF5 coverage: ${formatPercent(qc.coverage_percent)}`,
        `Ambiguous bases: ${reportValue(qc.ambiguous_bases, "0")} (${Number(qc.ambiguous_percent ?? 0).toFixed(2)}%)`,
        "",
        "Warnings:",
        ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ["- None"]),
        "",
        "Errors:",
        ...(errors.length ? errors.map((error) => `- ${error}`) : ["- None"]),
        "",
        "============================================================",
        "4. CLOSEST-REFERENCE SCREENING",
        "============================================================",
        `Lineage screening result: ${reportValue(result.lineage_screening_result || result.closest_lineage_candidate, "Not available")}`,
        `Classification status: ${reportValue(result.classification_status, "Not available")}`,
        `Confidence: ${reportValue(result.confidence, "Not available")}`,
        `Interpretation: ${reportValue(result.interpretation, "Not available")}`,
        `Gap to closest different lineage: ${result.lineage_gap_to_closest_different_lineage_percent === null || result.lineage_gap_to_closest_different_lineage_percent === undefined ? "Not available" : formatPercent(result.lineage_gap_to_closest_different_lineage_percent)}`,
        "",
        "Best reference match:",
        `- Reference ID: ${reportValue(bestMatch.reference_id, "Not available")}`,
        `- GenBank accession: ${reportValue(bestMatch.accession, "Not available")}`,
        `- Lineage: ${reportValue(bestMatch.lineage, "Not available")}`,
        `- Sublineage: ${reportValue(bestMatch.sublineage, "Not available")}`,
        `- Identity: ${formatPercent(bestMatch.identity_percent)}`,
        `- Comparable positions: ${reportValue(bestMatch.comparable_positions, "Not available")}`,
        `- Matches: ${reportValue(bestMatch.matches, "Not available")}`,
        `- Mismatches: ${reportValue(bestMatch.mismatches, "Not available")}`,
        `- Query start in reference: ${reportValue(bestMatch.query_start_in_reference, "Not available")}`,
        `- Orientation: ${formatOrientation(bestMatch.orientation)}`,
        "",
        "Closest Mexican reference:",
        mexicanMatch
            ? `- ${reportValue(mexicanMatch.reference_id, "Not available")} | ${reportValue(mexicanMatch.accession, "No accession")} | ${reportValue(mexicanMatch.lineage, "No lineage")} | ${formatPercent(mexicanMatch.identity_percent)} identity`
            : "- Not available",
        "",
        "Top closest references returned by the engine:",
        ...(topMatches.length
            ? topMatches.map((match, index) => {
                return [
                    `${index + 1}. ${reportValue(match.reference_id, "Not available")}`,
                    `   Accession: ${reportValue(match.accession, "Not available")}`,
                    `   Lineage: ${reportValue(match.lineage, "Not available")}`,
                    `   Sublineage: ${reportValue(match.sublineage, "Not available")}`,
                    `   Identity: ${formatPercent(match.identity_percent)}`,
                    `   Mismatches: ${reportValue(match.mismatches, "Not available")}`,
                    `   Orientation: ${formatOrientation(match.orientation)}`
                ].join("\n");
            })
            : ["No closest references were returned."]),
        "",
        "============================================================",
        "5. MASTER TREE CONTEXT",
        "============================================================",
        `Master tree available: ${treeContext.master_tree_available ? "Yes" : "No"}`,
        `Best reference present in tree: ${treeContext.best_match_present_in_tree ? "Yes" : "No"}`,
        `Tree ID: ${reportValue(treeContext.tree_id, "Not available")}`,
        `Tree display label: ${reportValue(treeContext.display_label, "Not available")}`,
        `Tree display group: ${reportValue(treeContext.display_group, "Not available")}`,
        `Tree group size in metadata: ${reportValue(treeContext.group_size_in_tree_metadata, "Not available")}`,
        `Tree interpretation: ${reportValue(treeContext.interpretation, "Not available")}`,
        `Local tree view: ${treeContext.local_tree_view?.available ? "Available" : "Not available"}`,
        `Displayed taxa in local tree view: ${reportValue(treeContext.local_tree_view?.selected_leaf_count, "Not available")}`,
        `MRCA taxa in full master tree: ${reportValue(treeContext.local_tree_view?.mrca_leaf_count_in_full_tree, "Not available")}`,
        "",
        "Local display neighborhood:",
        ...(treeNeighborhood.length
            ? treeNeighborhood.map((item, index) => {
                const marker = item.is_best_match === "yes" ? "*" : "-";
                return `${marker} ${index + 1}. ${reportValue(item.tree_id, "Not available")} | ${reportValue(item.accession, "No accession")} | ${reportValue(item.display_group, "No group")} | ${reportValue(item.lineage, "No lineage")}`;
            })
            : ["- Not available"]),
        "",
        "============================================================",
        "6. DATA PROTECTION NOTE",
        "============================================================",
        "This report is limited to a public analysis summary.",
        "It does not include the submitted nucleotide sequence, the complete reference FASTA,",
        "the curated metadata table, alignments, or the master Newick tree file.",
        "GenBank accessions may be shown because they correspond to public sequence records.",
        "",
        "============================================================",
        "7. METHODOLOGICAL NOTE",
        "============================================================",
        "This result corresponds to preliminary closest-reference screening based on nucleotide identity.",
        "It should not be interpreted as a formal phylogenetic lineage assignment.",
        "Formal interpretation should consider sequence quality, reference-panel coverage,",
        "phylogenetic context, epidemiological information, and expert review.",
        ""
    ];

    return lines.join("\n");
}

function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

function updateReportButtonState(enabled) {
    if (!downloadReportButton) {
        return;
    }

    downloadReportButton.disabled = !enabled;
}

function setLineageCardState(result) {
    const lineageCard = document.querySelector(".analysis-lineage-card");
    if (!lineageCard) {
        return;
    }

    const status = result?.classification_status || "";
    const confidence = result?.confidence || "";

    lineageCard.classList.remove("analysis-lineage-card-success", "analysis-lineage-card-warning", "analysis-lineage-card-neutral");

    if (status.includes("no_reliable") || confidence.includes("No reliable")) {
        lineageCard.classList.add("analysis-lineage-card-warning");
        return;
    }

    if (status.includes("ambiguous") || confidence.includes("Low")) {
        lineageCard.classList.add("analysis-lineage-card-warning");
        return;
    }

    lineageCard.classList.add("analysis-lineage-card-success");
}

function renderTopMatches(matches = []) {
    const tbody = document.getElementById("resultTopMatchesBody");

    if (!matches.length) {
        tbody.innerHTML = `<tr><td colspan="7">No closest references were returned.</td></tr>`;
        return;
    }

    tbody.innerHTML = matches.map((match, index) => {
        const metadata = [
            match.accession,
            match.country,
            match.state,
            match.year,
            match.sample_type || match.source,
            match.reference_scope,
            match.rflp ? `RFLP ${match.rflp}` : ""
        ].filter(Boolean).join(" · ");

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${match.reference_id || "—"}</td>
                <td>${match.lineage || "—"}</td>
                <td>${formatPercent(match.identity_percent)}</td>
                <td>${match.mismatches ?? "—"}</td>
                <td>${match.orientation || "—"}</td>
                <td>${metadata || "—"}</td>
            </tr>
        `;
    }).join("");
}

function resetTreeContextOutput() {
    const section = document.getElementById("treeContextSection");
    const neighborhoodContainer = document.getElementById("treeNeighborhoodContainer");
    const neighborhoodBody = document.getElementById("resultTreeNeighborhoodBody");
    const treeGraphicContainer = document.getElementById("treeGraphicContainer");
    const treeSvg = document.getElementById("masterTreeSvg");

    if (treeGraphicContainer) {
        treeGraphicContainer.hidden = true;
    }
    if (treeSvg) {
        treeSvg.innerHTML = "";
    }
    renderTreeLegend([]);

    if (section) {
        section.hidden = true;
    }
    if (neighborhoodContainer) {
        neighborhoodContainer.hidden = true;
    }
    if (neighborhoodBody) {
        neighborhoodBody.innerHTML = `<tr><td colspan="5">Tree neighborhood will appear after analysis.</td></tr>`;
    }

    const defaults = {
        resultTreeRepresentation: "—",
        resultTreeRepresentationDetails: "Best reference presence in the master tree",
        resultTreeGroup: "—",
        resultTreeGroupSize: "Group size in tree metadata",
        resultTreeLabel: "—",
        treeContextSummary: "Tree context will appear when the closest reference is represented in the local master tree."
    };

    Object.entries(defaults).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function renderTreeContext(result) {
    const treeContext = result.tree_context || {};
    const section = document.getElementById("treeContextSection");
    const neighborhoodContainer = document.getElementById("treeNeighborhoodContainer");
    const neighborhoodBody = document.getElementById("resultTreeNeighborhoodBody");

    if (!section) {
        return;
    }

    section.hidden = false;

    const available = Boolean(treeContext.master_tree_available);
    const represented = Boolean(treeContext.best_match_present_in_tree);

    document.getElementById("resultTreeRepresentation").textContent = represented
        ? "Represented"
        : available
            ? "Not represented"
            : "Not available";

    document.getElementById("resultTreeRepresentationDetails").textContent = available
        ? `${treeContext.tree_taxa_count ?? "—"} taxa in the local master tree context`
        : (treeContext.tree_context_error || "Master-tree context is not available.");

    document.getElementById("resultTreeGroup").textContent = treeContext.display_group || "—";
    document.getElementById("resultTreeGroupSize").textContent = treeContext.group_size_in_tree_metadata !== null && treeContext.group_size_in_tree_metadata !== undefined
        ? `${treeContext.group_size_in_tree_metadata} references in this display group`
        : "Group size unavailable";
    document.getElementById("resultTreeLabel").textContent = treeContext.display_label || treeContext.tree_id || "—";
    document.getElementById("treeContextSummary").textContent = treeContext.interpretation || "Master-tree context returned by the analysis engine.";

    renderLocalTreeGraphic(treeContext);

    const neighborhood = Array.isArray(treeContext.local_display_neighborhood)
        ? treeContext.local_display_neighborhood
        : [];

    if (!neighborhood.length || !neighborhoodBody || !neighborhoodContainer) {
        if (neighborhoodContainer) {
            neighborhoodContainer.hidden = true;
        }
        return;
    }

    neighborhoodContainer.hidden = false;
    neighborhoodBody.innerHTML = neighborhood.map((item) => {
        const isBest = item.is_best_match === "yes";
        return `
            <tr class="${isBest ? "analysis-tree-best-match-row" : ""}">
                <td>${escapeHtml(item.tree_id || item.reference_id || "—")}</td>
                <td>${escapeHtml(item.accession || "—")}</td>
                <td>${escapeHtml(item.display_group || item.sublineage || item.lineage || "—")}</td>
                <td>${escapeHtml(item.lineage || "—")}</td>
                <td>${isBest ? "Yes" : "No"}</td>
            </tr>
        `;
    }).join("");
}

function getAlertType(result) {
    const status = result.classification_status || "";
    const confidence = result.confidence || "";

    if (status.includes("no_reliable") || confidence.includes("No reliable")) {
        return "warning";
    }

    if (status.includes("ambiguous") || confidence.includes("Low")) {
        return "warning";
    }

    return "success";
}

function getResultTitle(result) {
    const status = result.classification_status || "";

    if (status.includes("no_reliable")) {
        return "No reliable lineage candidate identified.";
    }

    if (status.includes("ambiguous")) {
        return "Ambiguous closest-reference signal.";
    }

    return "Preliminary closest-reference screening completed.";
}

function renderApiResult(result) {
    latestAnalysisResult = result;
    updateReportButtonState(true);
    const qc = result.qc || {};
    const bestMatch = result.closest_reference_match || result.best_match || {};
    const mexicanMatch = result.closest_mexican_reference_match || null;
    const lineageResult = result.lineage_screening_result || result.closest_lineage_candidate || "—";
    const isNoReliable = String(lineageResult).toLowerCase().includes("no reliable");

    document.getElementById("resultRequestCode").textContent =
        `Analysis ID: ${result.analysis_id || "—"}${result.engine_version ? ` · Engine ${result.engine_version}` : ""}`;

    document.getElementById("resultLength").textContent = `${(qc.length ?? "—").toLocaleString?.() || qc.length || "—"} nt`;
    document.getElementById("resultCoverage").textContent = formatPercent(qc.coverage_percent);
    document.getElementById("resultAmbiguous").textContent =
        `${qc.ambiguous_bases ?? "—"} (${Number(qc.ambiguous_percent ?? 0).toFixed(2)}%)`;
    document.getElementById("resultQuality").textContent = qc.valid ? "Valid sequence input" : "Review required";

    document.getElementById("resultLineage").textContent = lineageResult;
    setLineageCardState(result);
    document.getElementById("resultBestMatch").textContent = bestMatch.reference_id || "—";

    const metadataParts = [
        bestMatch.accession,
        bestMatch.lineage ? `Reference lineage ${bestMatch.lineage}` : "",
        bestMatch.country,
        bestMatch.state,
        bestMatch.year,
        bestMatch.sample_type || bestMatch.source,
        bestMatch.rflp ? `RFLP ${bestMatch.rflp}` : ""
    ].filter(Boolean);

    const mexicanReferenceText = mexicanMatch && mexicanMatch.reference_id && mexicanMatch.reference_id !== bestMatch.reference_id
        ? ` Closest Mexican reference: ${mexicanMatch.reference_id} (${formatPercent(mexicanMatch.identity_percent)}).`
        : "";

    const contextOnlyText = isNoReliable
        ? " Closest reference is reported for context only."
        : "";

    document.getElementById("resultBestMatchDetails").textContent =
        `${metadataParts.join(" · ") || "Reference metadata unavailable"}.${contextOnlyText}${mexicanReferenceText}`;

    document.getElementById("resultIdentity").textContent = formatPercent(bestMatch.identity_percent);
    document.getElementById("resultIdentityDetails").textContent =
        `${bestMatch.comparable_positions ?? "—"} comparable positions · ${bestMatch.mismatches ?? "—"} mismatches`;

    const orientation = bestMatch.orientation || result.orientation || "";
    const orientationLabel = formatOrientation(orientation);
    document.getElementById("resultOrientation").textContent = orientationLabel;
    document.getElementById("resultOrientationDetails").textContent = orientationLabel === "Reverse complement"
        ? "The submitted sequence was analyzed as reverse complement."
        : orientationLabel === "Forward"
            ? "The submitted sequence was analyzed in forward orientation."
            : "Orientation information was not returned by the analysis engine.";

    document.getElementById("resultConfidence").textContent = result.confidence || "—";

    const gapValue = result.lineage_gap_to_closest_different_lineage_percent ?? result.lineage_gap_to_second_best_percent;
    document.getElementById("resultGap").textContent =
        gapValue !== undefined && gapValue !== null
            ? `${formatPercent(gapValue)} gap to closest different lineage`
            : "Gap to closest different lineage unavailable";

    renderTopMatches(result.top_matches || []);
    renderTreeContext(result);
    document.getElementById("resultJson").textContent = JSON.stringify(result, null, 2);

    const warnings = qc.warnings && qc.warnings.length ? ` Warnings: ${qc.warnings.join(" ")}` : "";
    setApiStatus(
        getAlertType(result),
        getResultTitle(result),
        `${result.interpretation || "Preliminary closest-reference screening result returned."}${warnings}`
    );
}

function renderApiError(error) {
    latestAnalysisResult = null;
    updateReportButtonState(false);
    setApiStatus(
        "error",
        "The analysis engine could not complete the request.",
        error.message || "Check that the analysis engine is running at http://127.0.0.1:8000 and try again."
    );
    document.getElementById("resultJson").textContent = error.raw || error.message || "Unknown error";
}

async function submitToApi(payload) {
    const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let data;

    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
        throw new Error(`The API returned a non-JSON response: ${responseText.slice(0, 240)}`);
    }

    if (!response.ok) {
        const detail = data.detail || data;
        const message = typeof detail === "string"
            ? detail
            : JSON.stringify(detail, null, 2);
        const apiError = new Error(message);
        apiError.raw = JSON.stringify(data, null, 2);
        throw apiError;
    }

    return data;
}

function setLoadingState(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "Running sequence analysis..." : "Run sequence analysis";
}

sequenceInput.addEventListener("input", () => {
    clearFormMessage();
    setSequenceFeedback(evaluateSequence(sequenceInput.value));
});

collectionDateInput.addEventListener("change", () => {
    if (!collectionDateInput.value || collectionYearInput.value) {
        return;
    }

    const selectedDate = new Date(`${collectionDateInput.value}T00:00:00`);
    if (!Number.isNaN(selectedDate.getTime())) {
        collectionYearInput.value = selectedDate.getFullYear();
    }
});

exampleSequenceButton.addEventListener("click", () => {
    const testSequence = "ATGTTGGGGAAATGCTTGACAGGTGCCTGCTGCTCGCGGTCGCTTTCTTTGTGGTATATCGTGCCGTTCTGTTTTACTGTGATCGGCAGCGCCCACAGCAACAGCAGCTCCCATTTGCAGTTGATTTATAACTTGACGCTATGCGAGCTGAACGGTACAGACTGGCTAACTAATAAATTTGATTGGGCCGTGGAAACTTTTGTCATTTTTCCTGTGCTGACTCACATTGTCTCCTACGGTGCACTTACTACCAGCCATTTCCTTGACACAGTTGGCTTGGCCACTGTGTCCACCGCCGGATTTTATCACGGACGGTACGTTTTGAGCAGCATTTATGCGGTTTGTGCTCTGGCGGCTTTGACTTGCTTCGTCATCAGGCTTGCGAAGAACTGCATGTCTTGGCGCTACTCGTGCACCAGATATACCAATTTCCTTCTGGACACCAAAGGCAGACTCTATCGTTGGCGGTCGCCCGTCATCATAGAGAAAGGAGGGAAAGTTGAGGTCGAGGGTCACCTAATTGACCTCAAAAGGGTAGTGCTTGATGGTTCGGGCGAAACCCCTATAACCAGAGTTTCAGCGGAACAATGGGGTCGTCCTTAG";
    sequenceInput.value = `>PZ201037-L8D\n${testSequence.match(/.{1,70}/g).join("\n")}`;
    document.getElementById("sampleId").value ||= "PZ201037-L8D";
    document.getElementById("state").value ||= "Jalisco";
    document.getElementById("collectionYear").value ||= "2023";
    document.getElementById("sampleType").value ||= "serum";
    setSequenceFeedback(evaluateSequence(sequenceInput.value));
    sequenceInput.focus();
});

clearSequenceButton.addEventListener("click", () => {
    sequenceInput.value = "";
    analysisResults.hidden = true;
    clearFormMessage();
    setSequenceFeedback(evaluateSequence(""));
    sequenceInput.focus();
});


if (downloadReportButton) {
    downloadReportButton.addEventListener("click", () => {
        if (!latestAnalysisResult) {
            showFormMessage("Run an analysis before downloading the report.", "error");
            return;
        }

        const analysisId = sanitizeFilename(latestAnalysisResult.analysis_id || "analysis");
        const sampleId = sanitizeFilename(latestAnalysisResult.submitted_metadata?.sample_id || "sample");
        const filename = `DiseasesMapMx_PRRSV_ORF5_report_${sampleId}_${analysisId}.txt`;
        const report = buildPublicSummaryReport(latestAnalysisResult);

        downloadTextFile(filename, report);
    });
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormMessage();

    const firstInvalidField = validateRequiredFields();
    const evaluation = evaluateSequence(sequenceInput.value);
    setSequenceFeedback(evaluation);

    if (firstInvalidField) {
        showFormMessage("Complete all required metadata fields and authorize preliminary analysis before continuing.", "error");
        firstInvalidField.focus();
        return;
    }

    if (evaluation.errors.length) {
        showFormMessage("The sequence did not pass validation. Correct the nucleotide input and try again.", "error");
        sequenceInput.focus();
        return;
    }

    analysisResults.hidden = false;
    updateLocalQcResults(evaluation);
    clearApiOutput();
    setApiStatus("info", "Sending request to analysis engine.", `Endpoint: ${API_ENDPOINT}`);
    showFormMessage("The request passed front-end validation and is being sent to the analysis engine.", "success");
    analysisResults.scrollIntoView({ behavior: "smooth", block: "start" });

    setLoadingState(true);

    try {
        const payload = buildApiPayload(evaluation);
        const result = await submitToApi(payload);
        renderApiResult(result);
        showFormMessage("Reference screening completed successfully.", "success");
    } catch (error) {
        renderApiError(error);
        showFormMessage("The request passed front-end validation, but the analysis engine did not return a valid result.", "error");
    } finally {
        setLoadingState(false);
    }
});
