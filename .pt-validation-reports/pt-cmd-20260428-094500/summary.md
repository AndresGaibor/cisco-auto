# PT cmd validation report

- Fecha: Tue Apr 28 09:45:00 -05 2026
- Repo: /Users/andresgaibor/code/javascript/cisco-auto
- Device PT: SW-SRV-DIST
- RUN_PT: 0
- RUN_DEPLOY: 0


## Tests enfocados
- ✅ pt-control terminal-plan-builder test
- ✅ pt-control terminal-command-service plan-run test
- ❌ pt-runtime execution-engine auto-attach test — exit 1
- ✅ pt-runtime terminal-plan-run handler test
- ✅ pt-runtime terminal-plan-run poll integration test
- ✅ pt-runtime poll-deferred test
- ✅ pt-runtime deferred-poll-handler test
- ✅ pt-runtime command-state-machine test

## Typecheck
- ❌ pt-runtime typecheck — exit 2
- ❌ pt-control typecheck — exit 2

## Generate
- ✅ pt-runtime generate

## Diff y archivos cambiados
