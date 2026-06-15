import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDateTime } from "./calculations";
import { GROUP_NAME, GROUP_NAME_SOMALI, BRAND_COLOR } from "./constants";
import type { MemberStats, GroupStats } from "@/types";

const BRAND_RGB: [number, number, number] = [105, 9, 87];
const GOLD_RGB: [number, number, number] = [244, 182, 63];

interface MemberPdfData {
  memberStats: MemberStats;
  groupStats: GroupStats;
  generatedAt: string;
}

interface FullPdfData {
  groupStats: GroupStats;
  memberStats: MemberStats[];
  statementSomali?: string;
  statementEnglish?: string;
  generatedAt: string;
}

export function generateMemberPdf(data: MemberPdfData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const { memberStats: ms, groupStats } = data;

  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(...GOLD_RGB);
  doc.setFontSize(20);
  doc.text(GROUP_NAME, 14, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(`${GROUP_NAME_SOMALI} — Warbixin Shaqsiyeed`, 14, 28);
  doc.setFontSize(10);
  doc.text(ms.member.name, 14, 38);

  doc.setTextColor(...BRAND_RGB);
  doc.setFontSize(10);
  doc.text(`Generated: ${formatDateTime(data.generatedAt)}`, 14, 55);

  doc.setFontSize(14);
  doc.setTextColor(...BRAND_RGB);
  doc.text("Xogtaada / Your Stats", 14, 68);

  autoTable(doc, {
    startY: 74,
    head: [["Metric", "Value"]],
    body: [
      ["Total Paid / Wadarta La Bixiyay", formatCurrency(ms.totalPaid)],
      ["Share % / Qaybta Kooxda", `${ms.sharePercent.toFixed(1)}%`],
      ["Ownership / Hantida", formatCurrency(ms.ownershipValue)],
      ["Debt / Deynta", formatCurrency(ms.debt)],
      ["Months Paid / Bilaha La Bixiyay", String(ms.monthsPaid)],
      ["Current Month / Bishan", ms.isCurrentMonthPaid ? "Paid ✓" : `Due: ${formatCurrency(ms.currentMonthDue)}`],
    ],
    headStyles: { fillColor: BRAND_RGB, textColor: GOLD_RGB },
    alternateRowStyles: { fillColor: [250, 247, 252] },
    margin: { left: 14, right: 14 },
  });

  const tableY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  doc.setFontSize(14);
  doc.text("Kooxda / Group Overview", 14, tableY);

  autoTable(doc, {
    startY: tableY + 6,
    head: [["", ""]],
    body: [
      ["Group Total Savings", formatCurrency(groupStats.totalSavings)],
      ["Group Goal", formatCurrency(groupStats.groupGoal)],
      ["Your Share", `${ms.sharePercent.toFixed(1)}% of ${formatCurrency(groupStats.totalSavings)}`],
    ],
    headStyles: { fillColor: BRAND_RGB, textColor: GOLD_RGB },
    margin: { left: 14, right: 14 },
  });

  const somaliText = `Warbixintan waxay muujinaysaa xogta ${ms.member.name} ee kooxda ${GROUP_NAME_SOMALI}.
Wuxuu bixiyay ${formatCurrency(ms.totalPaid)} oo ah ${ms.sharePercent.toFixed(1)}% kaydka guud ee ${formatCurrency(groupStats.totalSavings)}.
${ms.debt > 0 ? `Deyntiisa hadda waa ${formatCurrency(ms.debt)}.` : "Ma lahan deyn hadda."}`;

  const engY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(somaliText, pageWidth - 28);
  doc.text(lines, 14, engY);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `${GROUP_NAME} — Private Statement | ${BRAND_COLOR}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  return doc;
}

export function generateFinancialPdf(data: FullPdfData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(...GOLD_RGB);
  doc.setFontSize(22);
  doc.text(GROUP_NAME, 14, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(`${GROUP_NAME_SOMALI} — Warbixin Maaliyadeed`, 14, 28);

  autoTable(doc, {
    startY: 50,
    head: [["Metric", "Value"]],
    body: [
      ["Total Savings", formatCurrency(data.groupStats.totalSavings)],
      ["Total Debt", formatCurrency(data.groupStats.totalDebt)],
      ["Group Goal", formatCurrency(data.groupStats.groupGoal)],
      ["Members", String(data.groupStats.memberCount)],
      ["Monthly Fee", formatCurrency(data.groupStats.monthlyFee)],
    ],
    headStyles: { fillColor: BRAND_RGB, textColor: GOLD_RGB },
    alternateRowStyles: { fillColor: [250, 247, 252] },
    margin: { left: 14, right: 14 },
  });

  const memberY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  autoTable(doc, {
    startY: memberY,
    head: [["Name", "Paid", "Debt", "Share %"]],
    body: data.memberStats.map((ms) => [
      ms.member.name,
      formatCurrency(ms.totalPaid),
      formatCurrency(ms.debt),
      `${ms.sharePercent.toFixed(1)}%`,
    ]),
    headStyles: { fillColor: BRAND_RGB, textColor: GOLD_RGB },
    margin: { left: 14, right: 14 },
  });

  return doc;
}

export function downloadMemberPdf(data: MemberPdfData): void {
  const doc = generateMemberPdf(data);
  const name = data.memberStats.member.name.replace(/\s+/g, "-");
  doc.save(`AC7-${name}-${new Date().toISOString().split("T")[0]}.pdf`);
}

export async function shareMemberPdf(data: MemberPdfData): Promise<boolean> {
  const doc = generateMemberPdf(data);
  const blob = doc.output("blob");
  const name = `AC7-${data.memberStats.member.name.replace(/\s+/g, "-")}.pdf`;
  const file = new File([blob], name, { type: "application/pdf" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `AC7 Warbixin — ${data.memberStats.member.name}`,
      text: `Warbixintayda AC7 Group — ${formatCurrency(data.memberStats.totalPaid)}`,
      files: [file],
    });
    return true;
  }

  const whatsappText = encodeURIComponent(
    `AC7 Group Warbixin — ${data.memberStats.member.name}\n` +
    `Wadarta: ${formatCurrency(data.memberStats.totalPaid)}\n` +
    `Qaybta: ${data.memberStats.sharePercent.toFixed(1)}%`
  );
  window.open(`https://wa.me/?text=${whatsappText}`, "_blank");
  doc.save(name);
  return false;
}

export function downloadPdf(data: FullPdfData, filename?: string): void {
  const doc = generateFinancialPdf(data);
  doc.save(filename ?? `AC7-Warbixin-${new Date().toISOString().split("T")[0]}.pdf`);
}
