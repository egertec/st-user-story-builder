import type { UserStory } from "@/data/sampleData";

const esc = (s: string | number | undefined): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function exportToExcel(stories: UserStory[], filename = "User_Story_Catalogue") {
  const headerStyle =
    "background:#1e3a5f;color:white;font-weight:bold;padding:10px 14px;white-space:nowrap;font-family:Calibri,Arial,sans-serif;font-size:11pt;";
  const cellStyle =
    "padding:8px 12px;border:1px solid #d1d5db;vertical-align:top;font-family:Calibri,Arial,sans-serif;font-size:10pt;";
  const altStyle =
    "padding:8px 12px;border:1px solid #d1d5db;vertical-align:top;background:#f8fafc;font-family:Calibri,Arial,sans-serif;font-size:10pt;";

  const headers = [
    "Story ID",
    "Process Step",
    "Title",
    "User Story",
    "Acceptance Criteria",
    "Primary System",
    "Secondary System",
    "Priority",
    "Status",
  ];

  const rows = stories
    .map((s, i) => {
      const cs = i % 2 === 0 ? cellStyle : altStyle;
      const ac = s.acceptanceCriteria
        .map((c, idx) => `${idx + 1}. ${esc(c)}`)
        .join("<br>");
      const priorityColor =
        s.priority === "High"
          ? "#fee2e2"
          : s.priority === "Medium"
          ? "#fef3c7"
          : "#dcfce7";
      return `<tr>
        <td style="${cs}white-space:nowrap;font-weight:600;">${esc(s.id)}</td>
        <td style="${cs}white-space:nowrap;">${esc(s.processStepName)}</td>
        <td style="${cs}min-width:200px;">${esc(s.title)}</td>
        <td style="${cs}min-width:300px;font-style:italic;">${esc(s.fullStory)}</td>
        <td style="${cs}min-width:320px;white-space:pre-wrap;">${ac}</td>
        <td style="${cs}white-space:nowrap;color:#1d4ed8;">${esc(s.primarySystem)}</td>
        <td style="${cs}white-space:nowrap;">${esc(s.secondarySystem)}</td>
        <td style="${cs}background:${priorityColor};text-align:center;font-weight:600;">${esc(s.priority)}</td>
        <td style="${cs}white-space:nowrap;">${esc(s.status)}</td>
      </tr>`;
    })
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; }
</style></head>
<body>
  <h2 style="color:#1e3a5f;font-family:Calibri;margin-bottom:4px;">User Story Catalogue</h2>
  <p style="color:#64748b;font-size:10pt;margin-top:0;margin-bottom:16px;">
    ${stories.length} stories &bull; Sales Transformation User Story Generator
  </p>
  <table border="0" cellspacing="0" cellpadding="0">
    <thead>
      <tr>
        ${headers.map((h) => `<th style="${headerStyle}">${h}</th>`).join("")}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
