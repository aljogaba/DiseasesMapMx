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
        warnings.push("The sequence is partial but may be suitable for preliminary phylogenetic placement.");
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
    document.getElementById("resultJson").textContent = JSON.stringify(result, null, 2);

    const warnings = qc.warnings && qc.warnings.length ? ` Warnings: ${qc.warnings.join(" ")}` : "";
    setApiStatus(
        getAlertType(result),
        getResultTitle(result),
        `${result.interpretation || "Preliminary closest-reference screening result returned."}${warnings}`
    );
}

function renderApiError(error) {
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
