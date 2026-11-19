Stack: HTML5 semántico, CSS nativo(con nesting, variables CSS y medidas REM), y JavaScript Vanilla mediante módulos ESM.
Estilos: Prohibido usar Tailwind CSS. Los estilos deben ser puramente nativos y limpios.
Accesibilidad: Cumplimiento riguroso de WCAG AA. No uses atributos ARIA si existe un elemento HTML semántico nativo que cumpla la función.
Gestor de paquetes: Utiliza exclusivamente pnpm en lugar de npm.
Idioma de código: Todos los nombres de clases, identificadores (IDs) y funciones deben estar estrictamente en inglés.
Control y ejecución:
* No ejecutes linters ni formateadores (los ejecuto yo manualmente).
* No hagas build ni levantes servidores de desarrollo automáticamente.
Metodología: Si tienes cualquier duda o necesitas tomar una decisión de diseño/arquitectura, pregúntame primero.
- **No** ejecutes Google Chrome en modo `--headless` ni scripts con `--screenshot` o carpetas `uitest` en `/tmp` o `/var/folders`.
- **No** inspecciones imágenes de capturas de pantalla salvo que te lo pida explícitamente en el turno.
- Verifica los cambios de estilos y layout revisando directamente el código HTML/CSS/JS o pidiéndome que compruebe el resultado en mi navegador local.
