"use strict";

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
        errors.push(`The sequence is shorter than the prototype minimum of ${MIN_ACCEPTED_LENGTH} nt.`);
    }

    if (sequence.length > MAX_ACCEPTED_LENGTH) {
        errors.push(`The sequence is longer than the prototype maximum of ${MAX_ACCEPTED_LENGTH} nt.`);
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
        sequenceFeedback.textContent = "The nucleotide characters and sequence length pass the prototype validation rules.";
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

function createTemporaryRequestCode() {
    const now = new Date();
    const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("");
    const time = [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0")
    ].join("");

    return `DMX-PRRS-LOCAL-${date}-${time}`;
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

function updateResults(evaluation) {
    document.getElementById("resultRequestCode").textContent =
        `Temporary request code: ${createTemporaryRequestCode()} (not stored)`;
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
    const syntheticSequence = "ACGT".repeat(150) + "ACG";
    sequenceInput.value = `>synthetic_ORF5_length_example_not_for_scientific_use\n${syntheticSequence.match(/.{1,70}/g).join("\n")}`;
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

form.addEventListener("submit", (event) => {
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

    updateResults(evaluation);
    analysisResults.hidden = false;
    showFormMessage("The request passed front-end validation. No data were transmitted or stored.", "success");
    analysisResults.scrollIntoView({ behavior: "smooth", block: "start" });
});

setSequenceFeedback(evaluateSequence(""));
