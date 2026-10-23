export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { mode, config, turn, totalTurns, metrics, history, clientApiKey } = body;

    const apiKey = (clientApiKey && clientApiKey.trim()) || process.env.GEMINI_API_KEY;
    const baseUrl = process.env.GOOGLE_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing API Key. Set GEMINI_API_KEY in Netlify Environment Variables or paste your key in the UI settings."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a Principal Incident Response Director and Cyber Range Architect (Deloitte / Mandiant / Immersive Labs caliber).
You design hyper-realistic, technically accurate Cybersecurity Tabletop Exercises (TTX).
Always respond with STRICT, valid JSON only. Never wrap JSON in markdown fences.`;

    let userPrompt = "";

    if (mode === "generate_inject") {
      const historySummary =
        history && history.length > 0
          ? history
              .map(
                (h, i) =>
                  `Turn ${i + 1} (${h.phase}): Incident was "${h.title}". Participant chose Option "${h.selectedOption.label}" (${h.selectedOption.desc}). Consequence was: "${h.selectedOption.outcome}".`
              )
              .join("\n")
          : "This is Turn 1 (Initial Detection). No prior actions taken yet.";

      userPrompt = `Generate Inject #${turn} of ${totalTurns} for a live Cybersecurity Tabletop Exercise.

### TAILORED CLIENT PROFILE:
- Organization Name: ${config.orgName}
- Industry Vertical: ${config.industry}
- Infrastructure Footprint: ${config.infra}
- Crown Jewels at Risk: ${config.crownJewels}
- Security Stack: ${config.stack}
- Threat Actor Profile: ${config.threatActor}
- Initial Access Vector: ${config.initialVector}
- Regulatory Framework: ${config.regulation}
- Participant Role Lens: ${config.role}
- Pressure / Difficulty Level: ${config.difficulty}
- Special Scenario Focus: ${config.customNotes || "Standard full kill-chain progression"}

### CURRENT LIVE METRICS (0-100):
- Technical Containment: ${metrics.containment}%
- Business Continuity / Uptime: ${metrics.uptime}%
- Regulatory Compliance (${config.regulation}): ${metrics.compliance}%
- Board & Public Trust: ${metrics.trust}%

### PREVIOUS DECISIONS:
${historySummary}

### INSTRUCTIONS FOR INJECT #${turn} OF ${totalTurns}:
1. Make this inject a direct, logical continuation of the participant's previous choice. Progress the attack lifecycle realistically across the ${totalTurns} turns.
2. Write an authentic, non-generic "telemetryArtifact" matching ${config.stack}.
3. Write a realistic "commsArtifact" showing urgent internal war-room messages.
4. Provide EXACTLY 4 strategic decision options with realistic operational trade-offs.

Return ONLY a valid JSON object matching this exact schema:
{
  "phase": "String",
  "mitre": "String",
  "nist": "String",
  "timeJumpMinutes": 45,
  "severity": "CRITICAL | HIGH | ELEVATED",
  "title": "String",
  "narrative": "String",
  "telemetryArtifact": "String",
  "commsArtifact": "String",
  "dilemmaSummary": "String",
  "options": [
    {
      "id": "A",
      "label": "String",
      "tacticTag": "String",
      "desc": "String",
      "impact": { "containment": 20, "uptime": -15, "compliance": 10, "trust": 5 },
      "estimatedCostDeltaUSD": 45000,
      "outcome": "String",
      "critique": "String"
    }
  ]
}`;
    } else if (mode === "generate_aar") {
      userPrompt = `Generate a comprehensive Executive After-Action Report (AAR) for ${config.orgName} (${config.industry}) following their ${totalTurns}-inject tabletop exercise.

### EXERCISE CONTEXT:
- Stack: ${config.stack}
- Threat Actor: ${config.threatActor} via ${config.initialVector}
- Crown Jewels: ${config.crownJewels}
- Regulation: ${config.regulation}
- Final Metrics: Containment ${metrics.containment}%, Uptime ${metrics.uptime}%, Compliance ${metrics.compliance}%, Trust ${metrics.trust}%

### COMPLETE DECISION LOG:
${JSON.stringify(history, null, 2)}

Return ONLY a valid JSON object matching this exact schema:
{
  "executiveSummary": "String",
  "crownJewelsVerdict": "PROTECTED | PARTIALLY EXPOSED | COMPROMISED",
  "regulatoryVerdict": "COMPLIANT & DEFENSIBLE | AUDIT EXPOSURE | STATUTORY VIOLATION RISK",
  "simulatedMTTD": "String",
  "simulatedMTTR": "String",
  "nistScores": { "govern": 80, "identify": 75, "protect": 70, "detect": 85, "respond": 80, "recover": 75 },
  "strengths": ["String", "String", "String"],
  "blindSpots": ["String", "String", "String"],
  "roadmap": {
    "days30": ["String", "String", "String"],
    "days60": ["String", "String", "String"],
    "days90": ["String", "String", "String"]
  }
}`;
    }

    const candidateModels = ["gemini-3.0-flash", "gemini-3-flash-preview", "gemini-flash-latest"];
    let lastError = null;

    for (const modelName of candidateModels) {
      const endpoint = `${baseUrl}/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        })
      });

      const rawData = await response.json();
      if (response.ok) {
        const textOutput = rawData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleanedJson = JSON.parse(textOutput.replace(/```json|```/g, "").trim());
        return new Response(JSON.stringify(cleanedJson), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      lastError = rawData?.error?.message || `API Error (${response.status}) on ${modelName}`;
    }

    return new Response(JSON.stringify({ error: lastError }), { status: 400, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal Function Error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
