import fs from "fs";
import csv from "csv-parser";

/** =========================
 * Extract Exam Parts
 * ========================= */
const getExamParts = (examNumber = "") => {
  const parts = String(examNumber).replace(/\./g, "").split("/");

  return {
    levelCode: parts[0]?.trim().toUpperCase(),
    departmentCode: parts[1]?.trim().toUpperCase(),
  };
};

/** =========================
 * Programme Level Mapping
 * ========================= */
const levelMap = {
  ND: "NATIONAL DIPLOMA",
  HD: "HIGHER DIPLOMA",
  PD: "POST DIPLOMA",
  BSC: "BACHELOR OF SCIENCE",
  "B.SC": "BACHELOR OF SCIENCE",
  MSC: "MASTER OF SCIENCE",
  "M.SC": "MASTER OF SCIENCE",
  PHD: "DOCTOR OF PHILOSOPHY",
  "PH.D": "DOCTOR OF PHILOSOPHY",
};

/** =========================
 * Department Mapping
 * ========================= */
const departmentMap = 
{
  "MB": "MEDICAL BIOINFORMATICS",
  "BA": "BUSINESS ADMINISTRATION",
  "ET": "EDUCATIONAL TECHNOLOGY",
  "UY": "UNKNOWN_DPT",
  "OB": "OBSTETRICS",
  "DN": "DIETETICS AND NUTRITION",
  "UMT": "UNKNOWN_DPT",
  "AB": "ANESTHESIOLOGY",
  "NG": "NEUROLOGY",
  "GA": "GASTROENTEROLOGY",
  "MY": "MYCOLOGY",
  "MS": "MEDICAL SURGICAL",
  "ALK": "UNKNOWN_DPT",
  "TU": "TUBERCULOSIS",
  "GB": "GALLBLADDER SURGERY",
  "MA": "MATERNAL HEALTH",
  "CAL": "UNKNOWN_DPT",
  "UC": "URGENT CARE",
  "UF": "UNKNOWN_DPT",
  "DUT": "UNKNOWN_DPT",
  "EB": "EVIDENCE BASED MEDICINE",
  "EZ": "UNKNOWN_DPT",
  "ZA": "UNKNOWN_DPT",
  "UBT": "UNKNOWN_DPT",
  "JE": "JOURNAL EDITING",
  "FB": "FINANCE AND BUDGETING",
  "EN": "ENDOCRINOLOGY",
  "KAL": "UNKNOWN_DPT",
  "LD": "LEARNING AND DEVELOPMENT",
  "GMB": "GENERAL MEDICINE B",
  "JA": "JUVENILE AFFAIRS",
  "KAZ": "UNKNOWN_DPT",
  "ALM": "ALLIED MEDICINE",
  "CY": "CYTOLOGY",
  "DF": "DENTAL FACULTY",
  "KG": "KINESIOLOGY AND GERONTOLOGY",
  "ELI": "UNKNOWN_DPT",
  "MO": "MOLECULAR ONCOLOGY",
  "IM": "INTERNAL MEDICINE",
  "SK": "SKELETAL RADIOLOGY",
  "KD": "KIDNEY DISEASES",
  "YA": "YOUTH AFFAIRS",
  "LA": "LABORATORY ADMINISTRATION",
  "ER": "EMERGENCY ROOM",
  "FS": "FORENSIC SCIENCES",
  "KE": "KERATOLOGY",
  "ALA": "UNKNOWN_DPT",
  "ED": "EPIDEMIOLOGY",
  "NE": "NEONATOLOGY",
  "MN": "MENTAL NURSING",
  "ZM": "ZOONOTIC MEDICINE",
  "PG": "PROSTHETICS AND GERIATRICS",
  "SE": "SURGICAL EPIDEMIOLOGY",
  "RI": "RADIOLOGY AND IMAGING",
  "AU": "AUDIOLOGY",
  "ML": "MEDICAL LABORATORY",
  "AK": "ANATOMY AND KINESIOLOGY",
  "AD": "ADDICTION DISORDERS",
  "CR": "CARDIAC REHABILITATION",
  "FE": "FERTILITY AND EMBRYOLOGY",
  "TT": "TRANSFUSION TECHNOLOGY",
  "EL": "ELECTROPHYSIOLOGY",
  "IB": "IMMUNOBIOLOGY",
  "ZN": "ZONULOPATHY NEUROLOGY",
  "PH": "PUBLIC HEALTH",
  "PHC": "PRIMARY HEALTH CARE",
  "CP": "CLINICAL PATHOLOGY",
  "GM": "GENERAL MEDICINE",
  "GW": "GENERAL WELLNESS",
  "US": "ULTRASOUND SONOGRAPHY",
  "MW": "MATERNAL WELFARE",
  "BZ": "BACTERIOLOGY"
}
const expectedSubjectCount = 20;

/** =========================
 * Processor
 * ========================= */
export const processCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))

      .on("data", (data) => {
        try {
          const examNumber = data.examination_number?.trim() || "";

          const { levelCode, departmentCode } = getExamParts(examNumber);

          const programmeLevel = levelMap[levelCode] || levelCode;
          const department = departmentMap[departmentCode] || departmentCode;

          const month = data.month || "";
          const year = data.year || "";

          /** =========================
           * Build Subjects
           * ========================= */
          const subjects = [];

          for (let i = 0; i < expectedSubjectCount; i++) {
            const course = data[`results/${i}/course_code`];
            const rawScore = data[`results/${i}/score`];

            const score =
              rawScore === "" || rawScore === undefined
                ? null
                : Number(rawScore);

            if (course) {
              subjects.push({
                courseCode: course,
                score: isNaN(score) ? null : score,
              });
            }
          }

          /** =========================
           * Resit Detection (PER STUDENT)
           * ========================= */
          const isResit = subjects.some(
            (s) => s.score === null || s.score === undefined || isNaN(s.score),
          );

          /** =========================
           * Compute Total & Average
           * ========================= */
          const validScores = subjects
            .map((s) => s.score)
            .filter((s) => typeof s === "number" && !isNaN(s));

          const total = validScores.reduce((a, b) => a + b, 0);

          const average = validScores.length
            ? Number((total / validScores.length).toFixed(1))
            : 0;

          /** =========================
           * Status (HRORBN RULE)
           * ========================= */
          const status =  average >= 50 ? "PASS" : "FAIL";

          /** =========================
           * Grade
           * ========================= */
          let grade = "F";
          if (average >= 70) grade = "A";
          else if (average >= 60) grade = "B";
          else if (average >= 50) grade = "C";
          else if (average >= 45) grade = "D";

          /** =========================
           * Push Result
           * ========================= */
          results.push({
            examNumber,
            programmeLevel,
            levelCode,
            department,
            departmentCode,

            month,
            year,

            subjects,

            totalScore: total,
            average,
            grade,
            status,

            isResit, // ✅ CLEAN & CORRECT
          });
        } catch (err) {
          console.error("Row Error:", err);
        }
      })

      .on("end", () => resolve(results))
      .on("error", reject);
  });
};
