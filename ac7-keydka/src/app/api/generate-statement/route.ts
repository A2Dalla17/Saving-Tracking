import { NextRequest, NextResponse } from "next/server";
import { formatCurrency } from "@/lib/calculations";
import { GROUP_NAME, GROUP_NAME_SOMALI, MONTHLY_FEE } from "@/lib/constants";

interface StatementRequest {
  groupStats: {
    totalSavings: number;
    totalDebt: number;
    memberCount: number;
    monthsElapsed: number;
  };
  memberStats: Array<{
    name: string;
    totalPaid: number;
    debt: number;
    sharePercent: number;
    isCurrentMonthPaid: boolean;
  }>;
  selectedMember?: string;
}

function generateFallbackStatement(data: StatementRequest): { somali: string; english: string } {
  const { groupStats, memberStats, selectedMember } = data;
  const targetMembers = selectedMember
    ? memberStats.filter((m) => m.name === selectedMember)
    : memberStats;

  const somali = `Warbixintan waxay ku saabsan tahay kooxda ${GROUP_NAME_SOMALI} (${GROUP_NAME}).

DULMAR GUUD:
Wadarta kaydka kooxdu waa ${formatCurrency(groupStats.totalSavings)}. Wadarta deynta guud waa ${formatCurrency(groupStats.totalDebt)}. Kooxdu waxay leedahay ${groupStats.memberCount} xubnood, lacagta bishii waa ${formatCurrency(MONTHLY_FEE)}, waxaana la soo dhaafay ${groupStats.monthsElapsed} bilood.

XUBNAHA:
${targetMembers.map((m) =>
  `• ${m.name}: Wuxuu bixiyay ${formatCurrency(m.totalPaid)}, deyntiisu waa ${formatCurrency(m.debt)}, qaybtiisu waa ${m.sharePercent.toFixed(1)}%. Bishan: ${m.isCurrentMonthPaid ? "Bixiyay ✓" : "Ma bixin ✗"}`
).join("\n")}

TALO:
${groupStats.totalDebt > 0
  ? "Waxaa jira deyn aan la bixin. Fadlan xubnaha aan bixin bishan ayaa loo baahan yahay inay bixiyaan si loo ilaaliyo caafimaadka maaliyadeed ee kooxda."
  : "Kooxdu waxay ku jirtaa xaalad wanaagsan! Dhammaan xubnaha way bixiyeen lacagta bishii."}`;

  const english = `This statement covers the ${GROUP_NAME} (${GROUP_NAME_SOMALI}) savings group.

GROUP OVERVIEW:
Total group savings amount to ${formatCurrency(groupStats.totalSavings)}. Total outstanding debt is ${formatCurrency(groupStats.totalDebt)}. The group has ${groupStats.memberCount} members, with a monthly fee of ${formatCurrency(MONTHLY_FEE)} over ${groupStats.monthsElapsed} elapsed months.

MEMBERS:
${targetMembers.map((m) =>
  `• ${m.name}: Paid ${formatCurrency(m.totalPaid)}, debt of ${formatCurrency(m.debt)}, share of ${m.sharePercent.toFixed(1)}%. This month: ${m.isCurrentMonthPaid ? "Paid ✓" : "Unpaid ✗"}`
).join("\n")}

RECOMMENDATION:
${groupStats.totalDebt > 0
  ? "There is outstanding debt. Members who haven't paid this month should settle their dues to maintain the group's financial health."
  : "The group is in excellent standing! All members have paid their monthly contributions."}`;

  return { somali, english };
}

export async function POST(request: NextRequest) {
  try {
    const data: StatementRequest = await request.json();
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      const fallback = generateFallbackStatement(data);
      return NextResponse.json({
        ...fallback,
        generatedAt: new Date().toISOString(),
        source: "template",
      });
    }

    const prompt = `You are a financial advisor for the AC7 Group (Aragti Cad), a Somali savings group.
Generate a professional financial summary in BOTH Somali and English.

Group Data:
- Total Savings: $${data.groupStats.totalSavings}
- Total Debt: $${data.groupStats.totalDebt}
- Members: ${data.groupStats.memberCount}
- Monthly Fee: $${MONTHLY_FEE}
- Months Elapsed: ${data.groupStats.monthsElapsed}

Member Details:
${data.memberStats.map((m) =>
  `- ${m.name}: Paid $${m.totalPaid}, Debt $${m.debt}, Share ${m.sharePercent.toFixed(1)}%, Current Month: ${m.isCurrentMonthPaid ? "Paid" : "Unpaid"}`
).join("\n")}

${data.selectedMember ? `Focus on member: ${data.selectedMember}` : "Cover all members."}

Respond in this exact JSON format:
{
  "somali": "Full statement in Somali language",
  "english": "Full statement in English language"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const fallback = generateFallbackStatement(data);
      return NextResponse.json({
        ...fallback,
        generatedAt: new Date().toISOString(),
        source: "template",
      });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          somali: parsed.somali,
          english: parsed.english,
          generatedAt: new Date().toISOString(),
          source: "ai",
        });
      }
    } catch {
      // fall through to template
    }

    const fallback = generateFallbackStatement(data);
    return NextResponse.json({
      ...fallback,
      generatedAt: new Date().toISOString(),
      source: "template",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate statement" },
      { status: 500 }
    );
  }
}
