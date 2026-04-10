# Home Assistant — CLAUDE.md

Read the PIF first: `F:\obsidian\AgentVault\AgentVault\Home Assistant\PROJECT.pif.yaml`
Then check the handoff: `F:\obsidian\AgentVault\AgentVault\Home Assistant\SESSION_HANDOFF.md`
Then scan the KB: `F:\jjdev\claude\.claude\kb\`

## Project Overview
Home Assistant integration for the Command Center ecosystem. Repo: jjmcmahon/ha-command-center
Local path: F:\jjdev\projects\Command Center\home-assistant

## PPM — Portfolio Contribution Protocol

At the end of every session:

### 1. Write a PIF Handoff
Save to: `F:\obsidian\AgentVault\AgentVault\Home Assistant\SESSION_HANDOFF.md`
Template: `F:\jjdev\projects\PPM - Personal Project Manager\templates\pif-template.md`

### 2. Update Project Status
Update `projects.ts` in the command-center repo and push to main.

### 3. Log Cost Changes
Update COST_LINE_ITEMS in `projects.ts` + note in handoff "Cost Impact" section.

### 4. Flag Cross-Project Impacts
Note in handoff "Cross-Project Notes" + add row to PIF Index at `F:\jjdev\projects\PPM - Personal Project Manager\handoffs\PIF-INDEX.md`

### 5. Contribute to KB (If Applicable)
Write to `F:\jjdev\claude\.claude\kb\{category}\{topic}.md` — syncs to Firestore at 8 AM.

### PPM Compliance
Daily check at 9 AM validates: recent handoff, PIF exists, status synced. Non-compliant = YELLOW/RED on dashboard.

## GitHub Issues — Task Tracking Protocol

This project uses **GitHub Issues as the single source of truth** for task status.
Do NOT manually edit task arrays in `projects.ts`. Use GitHub Issues instead.

**Repo:** `jjmcmahon/ha-command-center`

**Issue prefix:** `HA-`

### Before Starting Work
```bash
gh issue list --repo jjmcmahon/ha-command-center --state open 
```

### During Work — Reference Issues in Commits
```bash
git commit -m "feat: description here, fixes #42"
```

### End of Session
1. **Close completed Issues:** `gh issue close {N} --repo jjmcmahon/ha-command-center --comment "Completed {date}"`
2. **Create new Issues:** `gh issue create --repo jjmcmahon/ha-command-center --title "HA-{id}: {title}" --label "phase:{Pn},agent:cowork" --body "..."`
3. **Label in-progress:** `gh issue edit {N} --repo jjmcmahon/ha-command-center --add-label "status:in-progress"`
4. **Flag cross-project impacts:** Add `ppm:cross-project` label

### What This Replaces
- ~~Editing projects.ts task arrays~~ → Close/create Issues instead
- A sync pipeline updates projects.ts → Vercel → Dashboard automatically

### Still Required (PPM Protocol)
GitHub Issues handles task tracking only. You still must:
1. Write a PIF handoff at end of session
2. Log cost changes in the handoff
3. Contribute to KB if reusable knowledge was produced
