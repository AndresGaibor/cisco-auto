# Fase 8: Quick Reference Guide

## 📊 Los 12 Pasos en 60 Segundos

```
PASO 1 ➝ PASO 2 ➝ PASO 3  (Fundación - Secuencial)
       ↓
  PASOS 4,5,6        (Integración - Secuencial)
       ↓
  PASOS 7,8,9        (Validación Runtime - PARALELOS)
       ↓
  PASO 10 ➝ PASO 11  (Hardening - Secuencial)
       ↓
  PASO 12            (Documentación)
```

## 🎯 Cada Paso en 1 Línea

| Paso | Objetivo | Archivos | Líneas |
|------|----------|----------|--------|
| 1 | Validar LeaseManager | 2 | 350 |
| 2 | Completar CrashRecovery Fase 3 | 2 | 500 |
| 3 | Reforzar CommandProcessor | 2 | 600 |
| 4 | Integrar BridgeDiagnostics | 2 | 300 |
| 5 | Auto-GC timer en ciclo | 1 | 250 |
| 6 | Exponer backpressure en port | 1 | 100 |
| 7 | Validar lease en runtime PT | 2 | 300 |
| 8 | Validar checksum de resultados | 1 | 250 |
| 9 | Auto-snapshot + heartbeat | 2 | 400 |
| 10 | Retry logic con backoff | 1 | 350 |
| 11 | Event log rotation | 1 | 300 |
| 12 | Documentación final | 4 | 2500 |
| | **TOTAL** | **23** | **~6800** |

## ⏱️ Timeline

- **Paso 1:** 1 día
- **Paso 2:** 1.5 días
- **Paso 3:** 1.5 días
- **Pasos 4-6:** 2-3 días
- **Pasos 7-9:** 3-4 días (pueden parallelizar)
- **Pasos 10-11:** 2-3 días
- **Paso 12:** 1-2 días
- **TOTAL:** 10-15 jornadas (~2-3 semanas)

## 🔑 Key Dependencies

```
✓ Paso 1 necesario para: 2, 3, 4, 5, 6, 7, 8, 9
✓ Paso 2 necesario para: 3, 10
✓ Paso 3 necesario para: 4, 5, 6, 7, 8, 9
✓ Pasos 4-6 necesarios para: 7, 8, 9
✓ Pasos 7-9 necesarios para: 10
✓ Paso 10 necesario para: 11
✓ Pasos 1-11 necesarios para: 12
```

## 📦 Archivos a Crear

```
23 archivos nuevos:
├── 9 unit tests (~2500 líneas)
├── 3 test fixtures (~450 líneas)
├── 1 integration test (~400 líneas)
└── 4 docs (~2500 líneas)
```

## ✅ Acceptance Criteria (Summary)

- [ ] 62 unit tests pasando
- [ ] 5 integration tests pasando
- [ ] ≥ 92% code coverage
- [ ] Todos los 12 pasos implementados
- [ ] Documentación lista para Fase 9
- [ ] 0 memory leaks
- [ ] Commits organizados (1 por paso)

## 🚀 Start Here

1. Lee `FASE8_IMPLEMENTATION_PLAN.md` completo (~30 min)
2. Crea rama: `git checkout -b feat/fase-8-bridge-lease-aware`
3. Empieza con **Paso 1: LeaseManager**
4. Un commit por paso
5. Tests después de cada paso

## 🧪 Testing Strategy

```
Pasos 1-3, 5-8, 10-11: Unit tests + fixtures
Paso 4: Unit tests + code review
Paso 6: Code review (método simple)
Paso 9: Integration test + unit tests
Paso 12: Manual review + smoke test
```

## 📋 Smoke Test Checklist

```bash
# Al finalizar cada paso:
npm test -- paso-N              # Tests del paso
npm test                        # Todos los tests
tsc --noEmit                    # Type check
```

## 🎓 Important Notes

- **NO FLEXIBLE:** Orden 1→2→3→4→5→6→10→11
- **PARALLELIZABLE:** Pasos 7, 8, 9 (si 2 devs)
- **SOLO PT-SIDE:** Paso 7 (runtime.js modifications)
- **SOLO BRIDGE-SIDE:** Pasos 1-6, 8, 10-11
- **INTEGRATION:** Paso 9 (toca auto-snapshot full cycle)

## 🔄 For Teams

**1 developer:**
- Serial: 1→2→3→4→5→6→7→8→9→10→11→12 (10-15 días)

**2 developers (optimal):**
- Dev 1: 1→2→3→4→5→6 (4-5 días)
- Dev 2: 7→8→9 (3-4 días) EN PARALELO
- Both: 10→11→12 (2-3 días)
- **Total:** 8-10 días wall-clock

## 📞 Questions?

See `FASE8_IMPLEMENTATION_PLAN.md` for:
- Full step details with code examples
- Exact test implementations
- Dependency matrices
- Migration guide (v2→v3)
- Verification checklist

---

**Version:** 1.0  
**Date:** 2026-04-05  
**Status:** Ready for implementation
