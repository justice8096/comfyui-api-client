# Attribution

> Record of human and AI contributions to this project.

## Project

- **Name:** comfyui-api-client
- **Repository:** https://github.com/justice8096/comfyui-api-client
- **Started:** 2025 (embedded in TarotCardProject and clothing project)

---

## Contributors

### Human

| Name | Role | Areas |
|------|------|-------|
| Justice E. Chase | Lead developer | Architecture, design, domain logic, review, integration |

### AI Tools Used

| Tool | Model/Version | Purpose |
|------|---------------|---------|
| Claude | Claude Opus 4.6 | Code generation, documentation, testing, research |
| Claude Code | — | Agentic development, refactoring, extraction |
| ComfyUI | API/Docs | Target platform domain knowledge |

---

## Contribution Log

### Original Source Code
Extracted from TarotCardProject/n8n/ and clothing/server/services/. Justice designed the submit→poll→download pattern used in two separate projects and has deep understanding of ComfyUI's HTTP API.

| Date | Tag | Description | AI Tool | Human Review |
|------|-----|-------------|---------|--------------|
| 2025-2026 | `human-only` | submit→poll→download pattern, ComfyUI HTTP API integration | — | Justice E. Chase |

### Standalone Extraction

| Date | Tag | Description | AI Tool | Human Review |
|------|-----|-------------|---------|--------------|
| 2026-03-21 | `ai-assisted` | Unified two implementations, extracted into standalone repo | Claude Code | Architecture decisions, reviewed all code |
| 2026-03-21 | `ai-assisted` | TypeScript rewrite, WebSocket progress tracking | Claude Code | Reviewed and approved |
| 2026-03-21 | `ai-generated` | Package config, CI/CD workflows, LICENSE | Claude Code | Reviewed and approved |
| 2026-03-21 | `ai-generated` | README documentation | Claude Code | Reviewed, edited |

### Improvements (2026-03-23)

| Date | Tag | Description | AI Tool | Human Review |
|------|-----|-------------|---------|--------------|
| 2026-03-23 | `ai-generated` | Image upload and queue management features | Claude Code | Reviewed and approved |
| 2026-03-23 | `ai-generated` | TypeScript type definitions (18+ types) | Claude Code | Reviewed and approved |
| 2026-03-23 | `ai-generated` | Comprehensive test suite (40+ tests) with API mocking | Claude Code | Reviewed and approved |

---

## Commit Convention

Include `[ai:claude]` tag in commit messages for AI-assisted or AI-generated changes. Example:
```
Unify ComfyUI implementations with WebSocket support [ai:claude]
```

---

## Disclosure Summary

| Category | Approximate % |
|----------|---------------|
| Human-only code | 20% |
| AI-assisted code | 30% |
| AI-generated (reviewed) | 50% |
| Documentation | 85% AI-assisted |
| Tests | 95% AI-generated |

---

## Notes

- All AI-generated or AI-assisted code is reviewed by a human contributor before merging.
- AI tools do not have repository access or commit privileges.
- This file is maintained manually and may not capture every interaction.
- Original source code was embedded in TarotCardProject and clothing project before extraction.

---

## License Considerations

AI-generated content may have different copyright implications depending on jurisdiction. See [LICENSE](./LICENSE) for this project's licensing terms. Contributors are responsible for ensuring AI-assisted work complies with applicable policies.
