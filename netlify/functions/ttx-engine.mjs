// File path in GitHub repo: netlify/functions/ttx-engine.mjs

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { mode, config, turn, totalTurns, metrics, history, clientApiKey } = body;

    // Priority: 1. Client-supplied session key -> 2. Netlify Environment Variable GEMINI_API_KEY
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
- Security Stack (Use exact syntax for logs!): ${config.stack}
- Threat Actor Profile: ${config.threatActor}
- Initial Access Vector: ${config.initialVector}
- Regulatory Framework: ${config.regulation}
- Participant Role Lens: ${config.role}
- Pressure / Difficulty Level: ${config.difficulty}
- Special Scenario Focus / Custom Notes: ${config.customNotes || "Standard full kill-chain progression"}

### CURRENT LIVE METRICS (0-100):
- Technical Containment: ${metrics.containment}%
- Business Continuity / Uptime: ${metrics.uptime}%
- Regulatory Compliance (${config.regulation}): ${metrics.compliance}%
- Board & Public Trust: ${metrics.trust}%

### PREVIOUS DECISIONS IN THIS EXERCISE (MUST DIRECTLY SHAPE THIS INJECT!):
${historySummary}

### INSTRUCTIONS FOR INJECT #${turn} OF ${totalTurns}:
1. Make this inject a direct, logical continuation of the participant's previous choice. Progress the attack lifecycle realistically across the ${totalTurns} turns (e.g., Turn 1: Initial Access/Identity -> Middle Turns: Lateral Movement, Privilege Escalation, Staging/Exfiltration, Backup Sabotage -> Final Turns: Extortion Demand, Regulatory Notification Clock, Clean-Room Recovery).
2. Write an authentic, non-generic "telemetryArtifact" matching ${config.stack} (e.g., if Microsoft Sentinel/Defender/Entra ID is selected, write a realistic multi-line KQL query with realistic output rows, IP addresses, process command lines, or Entra sign-in properties).
3. Write a realistic "commsArtifact" showing urgent internal Slack/Teams messages from SOC leads, General Counsel, CEO, or Threat Actor Tor negotiation chat.
4. Provide EXACTLY 4 strategic decision options. DO NOT make 1 obvious good option and 3 stupid options. Every option must be a realistic operational trade-off (e.g., aggressive isolation boosts containment but hurts uptime; silent monitoring preserves uptime but risks exfiltration; premature disclosure hurts trust; delaying notification violates ${config.regulation}).

Return ONLY a valid JSON object matching this exact schema:
{
  "phase": "String (e.g., Lateral Movement & Credential Harvesting)",
  "mitre": "String (e.g., T1021.002 - SMB/Windows Admin Shares / T1003 - OS Credential Dumping)",
  "nist": "String (e.g., DETECT [DE.CM] & RESPOND [RS.MI])",
  "timeJumpMinutes": 45,
  "severity": "CRITICAL | HIGH | ELEVATED",
  "title": "String (Headline of this inject)",
  "narrative": "String (2-3 rich paragraphs describing the exact situation unfolding right now based on their last decision)",
  "telemetryArtifact": "String (8-14 lines of realistic KQL / SPL / UDM query + alert output)",
  "commsArtifact": "String (Realistic timestamped war-room messages from executives, legal, or threat actor)",
  "dilemmaSummary": "String (1 sentence summarizing the core tension the participant must resolve right now)",
  "options": [
    {
      "id": "A",
      "label": "String (Action title, 6-12 words)",
      "tacticTag": "String (e.g., Aggressive Containment | Forensic Preservation | Business Continuity | Regulatory Shield)",
      "desc": "String (Detailed explanation of the action and trade-off)",
      "impact": {
        "containment": 20,
        "uptime": -15,
        "compliance": 10,
        "trust": 5
      },
      "estimatedCostDeltaUSD": 45000,
      "outcome": "String (What immediately happens when they execute this choice and how the threat actor reacts)",
      "critique": "String (Senior Cybersecurity Consultant critique referencing NIST CSF 2.0, MITRE, or ${config.regulation})"
    }
  ]
}`;
    } else if (mode === "generate_aar") {
      userPrompt = `Generate a comprehensive, Big-4 Consultant-Grade Executive After-Action Report (AAR) for ${config.orgName} (${config.industry}) following their ${totalTurns}-inject tabletop exercise.

### EXERCISE CONTEXT:
- Stack: ${config.stack}
- Threat Actor: ${config.threatActor} via ${config.initialVector}
- Crown Jewels: ${config.crownJewels}
- Regulation: ${config.regulation}
- Final Metrics: Containment ${metrics.containment}%, Uptime ${metrics.uptime}%, Compliance ${metrics.compliance}%, Trust ${metrics.trust}%

### COMPLETE CHRONOLOGICAL DECISION LOG:
${JSON.stringify(history, null, 2)}

Return ONLY a valid JSON object matching this exact schema:
{
  "executiveSummary": "String (2-3 authoritative paragraphs analyzing the team's end-to-end handling of the crisis, trade-offs made, and whether ${config.crownJewels} and ${config.regulation} obligations were safeguarded)",
  "crownJewelsVerdict": "PROTECTED | PARTIALLY EXPOSED | COMPROMISED",
  "regulatoryVerdict": "COMPLIANT & DEFENSIBLE | AUDIT EXPOSURE | STATUTORY VIOLATION RISK",
  "simulatedMTTD": "String (e.g., 16 Minutes)",
  "simulatedMTTR": "String (e.g., 4.2 Hours)",
  "nistScores": {
    "govern": 80,
    "identify": 75,
    "protect": 70,
    "detect": 85,
    "respond": 80,
    "recover": 75
  },
  "strengths": ["String (Specific strength based on their actual choices)", "String", "String"],
  "blindSpots": ["String (Specific gap or trade-off vulnerability exposed by their choices)", "String", "String"],
  "roadmap": {
    "days30": ["String (Concrete technical/SOAR action for ${config.stack})", "String", "String"],
    "days60": ["String (Concrete architecture/identity/segmentation action)", "String", "String"],
    "days90": ["String (Concrete governance/${config.regulation} compliance action)", "String", "String"]
  }
}`;
    }

    const endpoint = `${baseUrl}/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      })
    });

    const rawData = await response.json();
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: rawData?.error?.message || `API Error (${response.status})`,
          details: rawData
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const textOutput = rawData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleanedJson = JSON.parse(textOutput.replace(/```json|```/g, "").trim());

    return new Response(JSON.stringify(cleanedJson), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal Function Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
