# Tacómetro Digital PIC II — desarrollo organizado

Este repositorio reorganiza un proyecto existente en tres hitos técnicos verificables. Las fechas de los commits corresponden a esta reconstrucción y no al comienzo original del proyecto.

## Hito 1 — Dashboard básico

Primera versión funcional de la interfaz web:

- Lectura de RPM simulada.
- Indicador visual del rango de funcionamiento.
- Servidor HTTP local sin dependencias externas.

Para ejecutarlo:

```bash
cd web
npm run dev
```

Abre `http://127.0.0.1:4173/`.
