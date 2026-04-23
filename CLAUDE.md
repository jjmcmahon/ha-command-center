# Home Assistant – Smart Home Integration

Custom React dashboard + Home Assistant OS on Beelink MINI S12. This repo is for the custom dashboard connecting to HA via websocket.

## Start of Session – READ THIS FIRST

1. **Read the prior handoff** → `SESSION_HANDOFF.md (in this repo root)`
   - Older numbered handoffs (`SESSION-3-HANDOFF.md` through `SESSION-6-HANDOFF.md`) exist for historical reference but are deprecated. The canonical file is `SESSION_HANDOFF.md` going forward.
2. **Skim the PIF** → `docs/PROJECT.pif.yaml`
3. **Check device inventory** if doing hardware/integration work → `docs\DEVICE-INVENTORY.md`
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
| PPM (shared-knowledge layer) | `F:\jjdev\projects\PPM - Personal Project Manager\` | SHARED-RESOURCES.md, patterns/, decisions/, templates/, costs/ |
| Skills | `F:\jjdev\claude\.claude\skills\` | Executable agent behavior (auto-triggered) |
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
- HA config exports / device dumps → `docs\\` (the inventory + runbook structure already exists there)

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

## Portfolio Resources

Cross-project reference lives in **PPM** at `F:\jjdev\projects\PPM - Personal Project Manager` (= `jjmcmahon/jj-portfolio` repo):

- `SHARED-RESOURCES.md` — collision-awareness catalog. Check before touching shared infra.
- `patterns/` — cross-project patterns (ex-KB): firebase-shared-project, vercel-task-type-build, firestore-rules-via-admin-sdk, etc.
- `decisions/` — portfolio ADRs (session handoff location, KB retirement, shared-knowledge scope).
- `templates/` — shared templates (CLAUDE-MD-TEMPLATE, ARCHITECTURE, INFRA-CHANGELOG).

Executable agent behavior (auto-triggered patterns) lives in skills at `F:\jjdev\claude\.claude\skills\`. If a pattern is "agent should DO X when Y happens," it belongs in a skill — not PPM, not in here.

The KB folder at `F:\jjdev\claude\.claude\kb\` is retired (ADR 0002). Don't write to it.


## Centralized Docs: PPM (= jj-portfolio)

The `jjmcmahon/jj-portfolio` repo lives locally at `F:\jjdev\projects\PPM - Personal Project Manager` and is the portfolio's shared-knowledge layer. See the "Portfolio Resources" section above for what's in it. When you update portfolio-level content (cost ledger, shared resources, ADRs, patterns), edit directly in PPM and commit.


## Deeper Context
- **PIF:** `docs/PROJECT.pif.yaml`
- **Latest handoff:** `SESSION_HANDOFF.md (in this repo root)`
- **Device inventory:** `docs\DEVICE-INVENTORY.md`
- **Day 1 runbook:** `docs\DAY1-RUNBOOK.md`
- **HACS install list:** `docs\HACS-INSTALL-LIST.md`
- **Cost ledger:** `F:\jjdev\projects\PPM - Personal Project Manager\costs\COST-LEDGER.md`
- **Architecture:** `ARCHITECTURE.md` in this repo root – infra map, stack details, recovery playbook
- **Infra changelog:** `INFRA-CHANGELOG.md` in this repo root – every infra change logged

## End of Session

1. **Write/update the handoff** → `SESSION_HANDOFF.md (in this repo root)` (canonical filename – don't create new `SESSION-N-HANDOFF.md` files)
2. **Push to main** – triggers Firestore sync for dashboard
3. **Track work in GitHub Issues** – prefix `HA-`, label `agent:cowork`

**If applicable:**
- Cost changed → note in handoff + update `F:\jjdev\projects\PPM - Personal Project Manager\costs\COST-LEDGER.md`
- Found a cross-project pattern — write to `PPM\patterns\{name}.md` (executable behavior — propose a skill)
- New critical gotcha → add above
- Scratch in repo root → move to `claude-temp\` or delete
- Infrastructure changed → verify `INFRA-CHANGELOG.md` entry is complete with rollback steps
- Architecture changed → update `ARCHITECTURE.md` (stack, infra map, or recovery playbook)

## Monthly Cost: ~$3.00

Beelink amortized power + electricity. No cloud costs.
