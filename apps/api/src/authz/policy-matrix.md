# Matriz de política generada

> **Generada**, no se edita a mano: `apps/api/src/authz/policy-matrix.spec.ts` la calcula con `defineAbilitiesFor` y la semilla
> de los roles del sistema (`US-024:AC5`). Si la política cambia, la prueba falla y `vitest -u` la regenera: el diff del PR
> muestra qué casos cambiaron. La fuente de lo que *debe* ser es `docs/AUTHORIZATION.md` §4–§5.

Cada rol tiene su membresía en la organización A (`OO`, `OA`), el torneo A (`TD`, `AR`, `PL`), el equipo A (`CP`) o la
plataforma (`PA`). Leyenda: `✓` sobre un recurso de su alcance · `✓ todos` también fuera de él · `—` nunca ·
`⊘` estados de AUTHORIZATION.md §5 que lo bloquean aunque tenga el permiso (`DEC-105`).

| Permiso | Sujeto | PA | OO | OA | TD | AR | CP | PL |
|---|---|---|---|---|---|---|---|---|
| `institution.manage` | Institution | ✓ todos | — | — | — | — | — | — |
| `organization.create` | Organization | ✓ todos | — | — | — | — | — | — |
| `role.manage` | Role | ✓ todos | — | — | — | — | — | — |
| `user.suspend` | User | ✓ todos | — | — | — | — | — | — |
| `trash.view` | Trash | ✓ todos | — | — | — | — | — | — |
| `trash.restore` | Trash | ✓ todos | — | — | — | — | — | — |
| `privacy.anonymize` | User | ✓ todos | — | — | — | — | — | — |
| `privacy.resolve` | DataSubjectRequest | ✓ todos | — | — | — | — | — | — |
| `tournament.archive` | Tournament | ✓ todos | — | — | — | — | — | — |
| `organization.delete` | Organization | ✓ todos | — | — | — | — | — | — |
| `player.delete` | Player | ✓ todos | — | — | — | — | — | — |
| `ruleset.delete` | RuleSet | ✓ todos | — | — | — | — | — | — |
| `championship.delete` | Championship | ✓ todos | — | — | — | — | — | — |
| `institution.delete` | Institution | ✓ todos | — | — | — | — | — | — |
| `user.delete` | User | ✓ todos | — | — | — | — | — | — |
| `report.delete` | Report | ✓ todos | — | — | — | — | — | — |
| `role.delete` | Role | ✓ todos | — | — | — | — | — | — |
| `organization.view` | Organization | ✓ todos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `organization.update` | Organization | ✓ todos | ✓ | ✓ | — | — | — | — |
| `membership.grant` | Membership | ✓ todos | ✓ | ✓ | ✓ | — | — | — |
| `membership.revoke` | Membership | ✓ todos | ✓ | ✓ | ✓ | — | — | — |
| `role_request.review` | RoleRequest | ✓ todos | ✓ | ✓ | ✓ | — | — | — |
| `championship.manage` | Championship | ✓ todos | ✓ | ✓ | — | — | — | — |
| `ruleset.create_draft` | RuleSet | ✓ todos | ✓ | ✓ | ✓ | — | — | — |
| `ruleset.approve` | RuleSet | ✓ todos | ✓ | ✓ | — | — | — | — |
| `player.view` | Player | ✓ todos | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `player.create` | Player | ✓ todos | ✓ | ✓ | ✓ | — | ✓ | — |
| `player.update` | Player | ✓ todos | ✓ | ✓ | ✓ | — | ✓ | — |
| `player.import` | Player | ✓ todos | ✓ | ✓ | ✓ | — | — | — |
| `player.link` | Player | ✓ todos | ✓ | ✓ | ✓ | — | — | ✓ |
| `rating.import` | Player | ✓ todos | ✓ | ✓ | ✓ | — | — | — |
| `tournament.create` | Tournament | ✓ todos | ✓ | ✓ | — | — | — | — |
| `tournament.configure` | Tournament | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `tournament.transition` | Tournament | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `tournament.close` | Tournament | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `tournament.reopen` | Tournament | ✓ todos | ✓ | ✓ | — | — | — | — |
| `tournament.view_private` | Tournament | ✓ todos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `game.view_own` | Game | — | — | — | — | — | — | ✓ |
| `participant.register` | Participant | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — |
| `participant.withdraw` | Participant | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — |
| `participant.reinstate` | Participant | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `participant.seed_adjust` | Participant | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `bye.request` | Participant | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `team.register` | Team | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — |
| `roster.update` | Roster | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — |
| `lineup.submit` | Lineup | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — |
| `round.schedule` | Round | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `round.checkin_manage` | Round | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `participant.checkin_mark` | Participant | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — |
| `participant.checkin_self` | Participant | — | — | — | — | — | — | ✓ ⊘ torneo CLOSED, torneo CANCELLED |
| `round.pair` | Round | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `pairing.adjust` | Pairing | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `pairing.override` | Pairing | — | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `round.publish` | Round | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `round.close` | Round | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `round.reopen` | Round | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `round.stale_ack` | Round | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `game.record` | Game | ✓ todos ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | — | — |
| `game.correct` | Game | ✓ todos ⊘ ronda CLOSED, siguiente publicada, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, siguiente publicada, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, siguiente publicada, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, siguiente publicada, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, siguiente publicada, torneo CLOSED, torneo CANCELLED | — | — |
| `game.correct_admin` | Game | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `game.forfeit` | Game | ✓ todos ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | ✓ ⊘ ronda CLOSED, torneo CLOSED, torneo CANCELLED | — | — |
| `standing.draw_lots` | Standing | ✓ todos ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | ✓ ⊘ torneo CLOSED, torneo CANCELLED | — | — | — |
| `report.generate` | Report | ✓ todos | ✓ | ✓ | ✓ | ✓ | — | — |
| `report.download` | Report | ✓ todos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `audit.view` | Audit | ✓ todos | ✓ | ✓ | ✓ | ✓ | — | — |
| `claim.file` | Claim | ✓ todos | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| `claim.resolve` | Claim | ✓ todos | ✓ | ✓ | ✓ | — | — | — |
