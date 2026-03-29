# ⚠️ DEPRECADO: import-yaml

> **¡ATENCIÓN!**
>
> Este paquete (`import-yaml`) está **DEPRECADÍSIMO** y solo se mantiene por compatibilidad interna.
>
> **NO INICIES NUEVOS FLUJOS USANDO YAML.**
>
> El flujo recomendado y soportado es **pt-control-v2** (control en tiempo real). Consulta la guía en [`docs/PT_CONTROL_QUICKSTART.md`](../../docs/PT_CONTROL_QUICKSTART.md) y la documentación del paquete [`pt-control-v2`](../pt-control-v2/README.md).
>
> - El parser YAML sigue disponible para casos internos o migraciones, pero **no debe usarse para nuevos desarrollos**.
> - La lógica de parsing se conserva solo para compatibilidad y posibles reutilizaciones internas.

---

## ¿Por qué está deprecado?

El flujo basado en archivos YAML fue reemplazado por **pt-control-v2**, que permite control en tiempo real de Packet Tracer y una integración mucho más robusta y flexible.

- **Ventajas de pt-control-v2:**
  - Control directo y en vivo de laboratorios
  - Menos errores y mayor velocidad
  - Mejor integración con la CLI y asistentes IA

---

## Alternativa recomendada

- **Usa [`pt-control-v2`](../pt-control-v2/)** para cualquier flujo nuevo.
- Consulta la guía rápida: [`docs/PT_CONTROL_QUICKSTART.md`](../../docs/PT_CONTROL_QUICKSTART.md)

---

## Uso legado (NO recomendado)

Si por alguna razón necesitas parsear YAML, puedes usar las funciones exportadas, pero **no se garantiza soporte futuro**.

```typescript
import { YAMLParser, loadLab, parseLab } from '@cisco-auto/import-yaml';

// ⚠️ Solo para compatibilidad interna
const lab = loadLab('ruta/al/archivo.yaml');
```

---

## Estado del paquete

- **DEPRECADÍSIMO**
- Solo para compatibilidad interna
- No recomendado para nuevos proyectos
- No se garantiza soporte ni actualizaciones

---

## Migración

Para migrar tus flujos, revisa la documentación de [`pt-control-v2`](../pt-control-v2/README.md) y la guía rápida en [`docs/PT_CONTROL_QUICKSTART.md`](../../docs/PT_CONTROL_QUICKSTART.md).

---

## Contacto

¿Dudas sobre la migración? Abre un issue o consulta en el canal de soporte del proyecto.
