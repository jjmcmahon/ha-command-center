# Home Assistant – Smart Home Integration

Custom React dashboard + Home Assistant OS on Beelink MINI S12. This repo is for the custom dashboard connecting to HA via websocket.

## Start of Session – READ THIS FIRST

1. **Read the prior handoff** → `F:\obsidian\AgentVault\AgentVault\Home Assistant\SESSION_HANDOFF.md`
   - Older numbered handoffs (`SESSION-3-HANDOFF.md` through `SESSION-6-HANDOFF.md`) exist for historical reference but are deprecated. The canonical file is `SESSION_HANDOFF.md` going forward.
2. **Skim the PIF** → `F:\obsidian\AgentVault\AgentVault\Home Assistant\PROJECT.pif.yaml`
3. **Check device inventory** if doing hardware/integration work → `F:\obsidian\AgentVault\AgentVault\Home Assistant\DEVICE-INVENTORY.md`
4. **Check open GitHub Issues** → `gh issue list --repo jjmcmahon/ha-command-center --state open --label agent:cowork`
5. **Verify git is initialized and has a remote.** Run `git status` and `git remote -v`. If this project isn't a git repo yet, initialize it: `git init`, create a GitHub repo with `gh repo create`, add the remote, and push. Every project must be version controlled — no exceptions.

## This Machine (Tooling You Already Have)

| Tool | Path | Use for |
|------|------|---------|
| GitHub CLI | `F:\jjdev\tools\gh-cli\gh.exe` | Issues, PRs, releases, repo ops |
| AWS CLI | `F:\jjdev\tools\aws-cli\aws.exe` | (not used for HA) |
| Git | system path (`git`) | Standard git ops |
| Node / npm | system path (`node`, `npm`) | Vite + React build |
| Desktop Commander | MCP (`mcp__Desktop_Commander__*`) | Read/write files on F:, run shell commands |
| Obsidian (AgentVault) | `F:\obsidian\AgentVault\AgentVault\` | Session handoffs, PIFs, project notes |
| KB | `F:\jjdev\claude\.claude\kb\` | Reusable patterns (synced to /kb daily 8 AM) |
| Cowork temp | `F:\jjdev\claude-temp\` | Throwaway working files – NOT the workspace |
| HAOS web UI | http://192.168.1.190:8123 | Home Assistant config, integrations, automations |

## When Tooling Sucks – Tell JJ, Don't Hack Around It

Surface root causes. Don't write batch wrappers, shell hacks, or polyfills without flagging the underlying issue first.

## Infrastructure Changes — Graded Rule

Infra covers Docker/Portainer, AWS (Lambda, EC2, S3, CloudFormation, IAM), Firebase (Firestore indexes, Functions, Auth, Hosting), DNS, CI/CD, DB migrations, Vercel project settings/env vars. Reads (`docker ps`, `aws s3 ls`, `firebase projects:list`) are always fine — the rule is about *changes*.

| Action | Pre-approval? | Backup? | Log to `INFRA-CHANGELOG.md`? |
|--------|---------------|---------|------------------------------|
| **Reversible modify** (stop, pause, scale-to-zero, env var tweak, DNS TTL, disable trigger) | no | no | **yes** |
| **Create** (new stack, Lambda, bucket, DNS record, Vercel project, CI workflow, GitHub repo) | **yes** | no | **yes** |
| **Delete** (single resource) | no | **yes — verified readable** | **yes, with backup path** |
| **Teardown** (multi-resource retire, DB drop, stack destroy, project-wide cleanup) | **yes** | **yes — verified readable** | **yes, with backup path** |

Secrets are separate — handled under the `secrets-policy` skill. Never bulk-delete or rotate without JJ's approval. Anything shared across projects (especially `mcmahon-mission-control`) needs per-resource confirmation even when the action would otherwise be in the no-approval lane.

`INFRA-CHANGELOG.md` entries include: date, actor (`claude-cowork`), type (modify/create/delete/teardown), resources affected, motivation, rollback steps, backup location (for deletes/teardowns). If the file doesn't exist, copy from `F:\jjdev\projects\PPM - Personal Project Manager\templates\INFRA-CHANGELOG.md`.

The full procedure — especially backup requirements and shared-resource caution — lives in the `infra-change-guard` skill.

## Directory Hygiene

- Active scratch / WIP → `F:\jjdev\claude-temp\`
- Finalized deliverables → `home-assistant\outputs\`
- HA config exports / device dumps → `F:\obsidian\AgentVault\AgentVault\Home Assistant\` (the inventory + runbook structure already exists there)

## The 30-Second Version

HAOS 17.2 running on Beelink S12 (Intel N95, 12GB RAM, 512GB SSD) at 192.168.1.190. Core integrations configured (Hue, SmartThings, Apple TV, HomePod, printer). Portainer + Uptime Kuma deployed. Custom React dashboard (this repo) is scaffolded but **not connected to HA yet**. End of Phase 1, heading into Phase 2 (automations, dashboard build).

## Where We Are (Last Updated: 2026-04-15)

### What's Pending
- Apple TV (Media Room) needs pairing
- Alexa integration needs Amazon 2FA
- Hardware arriving: SLZB-06 Zigbee coordinator, Aeotec Z-Stick 7
- Custom dashboard needs HA long-lived access token to connect

### Open GitHub Issues
**Repo:** `jjmcmahon/ha-command-center` | **Prefix:** `HA-`
```bash
gh issue list --repo jjmcmahon/ha-command-center --state open --label agent:cowork
```

## Stack
- **Dashboard:** React + Vite + TypeScript + Tailwind + home-assistant-js-websocket
- **Server:** HAOS 17.2 on Beelink (also runs Portainer, Uptime Kuma, Kali/HackThePlant)

## Critical Gotchas

- **Don't lose the HA long-lived access token** – it's in `F:\jjdev\keys\` (don't commit). Regenerating is a pain.
- **Beelink also runs HackThePlant Kali container** – don't reboot or take it offline without checking with JJ.
- **Numbered handoff files exist** (`SESSION-3-HANDOFF.md` through `SESSION-6-HANDOFF.md`) – these are historical. Going forward, use the single canonical `SESSION_HANDOFF.md`.

## Knowledge Base (KB)

Read at `F:\jjdev\claude\.claude\kb\`. Categories: `environment/`, `patterns/`, `tools/`, `troubleshooting/`, `workflows/`. Write reusable HA patterns (websocket, automation patterns, integration recipes) at end-of-session.

## Centralized Docs: jj-portfolio

The `jj-portfolio` repo (`F:\jjdev\projects\PPM - Personal Project Manager`, GitHub: `jjmcmahon/jj-portfolio`) is the **centralized, version-controlled documentation repo** for the entire portfolio. It contains:

- `ppm/` – Portfolio management (cost ledger, specs, architecture overview, archive)
- `kb/` – Version-controlled mirror of the Knowledge Base
- `agentvault/` – Backup of AgentVault session handoffs and PIFs
- `templates/` – Shared templates: ARCHITECTURE.md, INFRA-CHANGELOG.md, CLAUDE-MD-TEMPLATE.md

**When you update KB content**, update both the local copy (`F:\jjdev\claude\.claude\kb\`) and the repo copy (`F:\jjdev\projects\PPM - Personal Project Manager\kb\`). The local copy syncs to Firestore; the repo copy is the version-controlled backup.

**When you update PPM content** (cost ledger, specs), update the repo copy at `F:\jjdev\projects\PPM - Personal Project Manager\`.

## Deeper Context
- **PIF:** `F:\obsidian\AgentVault\AgentVault\Home Assistant\PROJECT.pif.yaml`
- **Latest handoff:** `F:\obsidian\AgentVault\AgentVault\Home Assistant\SESSION_HANDOFF.md`
- **Device inventory:** `F:\obsidian\AgentVault\AgentVault\Home Assistant\DEVICE-INVENTORY.md`
- **Day 1 runbook:** `F:\obsidian\AgentVault\AgentVault\Home Assistant\DAY1-RUNBOOK.md`
- **HACS install list:** `F:\obsidian\AgentVault\AgentVault\Home Assistant\HACS-INSTALL-LIST.md`
- **Cost ledger:** `F:\jjdev\projects\PPM - Personal Project Manager\costs\COST-LEDGER.md`
- **Architecture:** `ARCHITECTURE.md` in this repo root – infra map, stack details, recovery playbook
- **Infra changelog:** `INFRA-CHANGELOG.md` in this repo root – every infra change logged

## End of Session

1. **Write/update the handoff** → `F:\obsidian\AgentVault\AgentVault\Home Assistant\SESSION_HANDOFF.md` (canonical filename – don't create new `SESSION-N-HANDOFF.md` files)
2. **Push to main** – triggers Firestore sync for dashboard
3. **Track work in GitHub Issues** – prefix `HA-`, label `agent:cowork`

**If applicable:**
- Cost changed → note in handoff + update `F:\jjdev\projects\PPM - Personal Project Manager\costs\COST-LEDGER.md`
- Found a reusable pattern → write to KB
- New critical gotcha → add above
- Scratch in repo root → move to `claude-temp\` or delete
- Infrastructure changed → verify `INFRA-CHANGELOG.md` entry is complete with rollback steps
- Architecture changed → update `ARCHITECTURE.md` (stack, infra map, or recovery playbook)

## Monthly Cost: ~$3.00

Beelink amortized power + electricity. No cloud costs.
