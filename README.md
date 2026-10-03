# Kiltrazo 🐾

App (PWA) para registrar mascotas con reconocimiento facial y ayudar a que vuelvan a casa si se pierden.
Registrar una mascota es gratis.

## Pantallas

| Pantalla | Qué hace |
| --- | --- |
| **Inicio** | Botones grandes *Perdí mi mascota*, *Encontré una mascota* y *Ya encontré mi mascota*, acceso a *Registrar mascota* y los últimos 6 reencuentros con foto y comentarios. |
| **1 · Registrar mascota** | Escaneo en video, como Face ID: mientras se filma, la app guarda sola 5 capturas nítidas de la cara en ángulos distintos y luego una de la nariz (también acepta fotos de la galería, con el mismo control de calidad) y luego pide nombre de la mascota, nombre del dueño, enfermedades y vacunas. |
| **Perdí mi mascota** | Activa el aviso y busca entre los avisos de "encontré". Si hay coincidencia, notifica al dueño. |
| **2 · Mascota encontrada** | Solo para el dueño: llamar o escribir por WhatsApp a quien la encontró, mapa con la ubicación y botones *cómo llegar* en auto, bicicleta, a pie o transporte. |
| **3 · Encontré una mascota** | Escanea la cara. Si está registrada se avisa al dueño y al que la encontró **solo** se le muestran vacunas y enfermedades (ningún dato del dueño, para evitar pedidos de recompensa). |
| **Ya encontré mi mascota** | Quita el aviso y publica el reencuentro en el inicio. |
| **Administrador** | Modificar, cerrar o eliminar alertas, enviar mensajes a un usuario o a todos, moderar reencuentros y comentarios. PIN de prueba: `1234` (cambiar con `VITE_ADMIN_PIN`). |

## Cómo correrla

```bash
npm install
npm run dev      # desarrollo, abre http://localhost:5173
npm run build    # versión de producción en dist/
```

La cámara y las notificaciones requieren HTTPS (o `localhost`). Al hacer push a `main` se publica en GitHub Pages
(activar en *Settings → Pages → Source: GitHub Actions*).

## Estado del prototipo

- **Reconocimiento facial** (`src/biometrics.js`), en el propio celular con ONNX Runtime Web (un solo motor para
  los dos modelos, para no llenar la memoria del iPhone):
  1. *Detección*: un detector YOLO11n propio (`public/models/pet-head.onnx`) encuentra la cabeza y se recorta
     justo la cara. Si no ve una cabeza, avisa y deja repetir la captura.
  2. *Huella*: DINOv2-small convierte el recorte en un vector de 384 números (token CLS, con la imagen y su espejo).
  3. *Búsqueda*: similitud coseno con pgvector en Supabase (o en el navegador en modo local), contra cada ángulo guardado.

  Cada captura pasa un control de luz, nitidez y "¿es una mascota?"; al final se revisa que las 5 sean del mismo
  animal. También se guarda una foto de la nariz (opcional): si las narices se parecen mucho, alcanza con una cara
  algo menos parecida. Los modelos (~40 MB) se descargan la primera vez. El umbral de DINOv2 (0.78) es inicial y
  hay que calibrarlo con pruebas reales. Próximo paso: ajuste fino con metric learning
  (ArcFace). Si los modelos no se pueden descargar, se usa un descriptor simple de
  color (mucho menos preciso).
- **Servidor de reconocimiento (opcional)**: `server/` hace la detección y la huella en un servidor (un Space
  gratis de Hugging Face o un VPS), así el celular no descarga los modelos. Se activa con `VITE_BIO_SERVER` en
  `.env.production`; si el servidor no responde, la app vuelve a hacerlo en el celular. Da las mismas huellas que
  el celular (mismos modelos ONNX), así que los registros de uno y otro se pueden comparar.
- **Entrenar el detector de cabezas**: abrir
  [`training/entrenar_detector.ipynb` en Colab](https://colab.research.google.com/github/andresmaturana-ui/petsafe/blob/main/training/entrenar_detector.ipynb),
  elegir GPU y *Ejecutar todo*. Usa Oxford-IIIT Pet (cajas de cabezas) y Ultralytics YOLO11n (AGPL-3.0); al final
  descarga `pet-head.onnx` (entrada 320x320, salida `[1, 5, 2100]`), que va en `public/models/`. Al activarlo cambia
  el recorte de la cara, así que conviene registrar de nuevo las mascotas de prueba.
- **Medir el acierto**: abrir
  [`training/medir_reconocimiento.ipynb` en Colab](https://colab.research.google.com/github/andresmaturana-ui/petsafe/blob/main/training/medir_reconocimiento.ipynb)
  y *Ejecutar todo* (no necesita GPU). Pasa unos 1.400 perros del set público DogFaceNet por el mismo detector,
  el mismo DINOv2 y la misma comparación de la app, y entrega el porcentaje de acierto con el umbral actual y un
  umbral sugerido.
- **Datos**: con Supabase configurado (`VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` en `.env.production`) se
  comparten entre celulares (`src/data-remote.js`); si no, se guardan en el navegador (IndexedDB,
  `src/data-local.js`) y en *Perfil → Agregar otro usuario* se simula al dueño y a quien encuentra en un mismo celular.

## Supabase

1. Crear el proyecto y activar *Authentication → Sign In / Providers → Allow anonymous sign-ins*.
2. Pegar `supabase/schema.sql` en *SQL Editor* y ejecutarlo (se puede repetir sin problemas). Crea las tablas,
   las reglas de seguridad y las funciones de búsqueda biométrica (pgvector).
3. Poner la *Project URL* y la clave *publishable/anon* en `.env.production`. Son públicas por diseño; nunca usar
   la clave *secret/service_role* en la app.
4. El primer usuario que entra a *Administrador* y toca "Soy el administrador" queda como admin.

Quien encuentra una mascota nunca puede leer datos del dueño: la comparación biométrica y la respuesta con los
cuidados ocurren en la base de datos (`report_found`), y las reglas RLS solo dejan ver cada aviso a quien lo hizo,
al dueño de la mascota que coincidió y al administrador.
- **Notificaciones**: se muestran con el Service Worker del dispositivo. El Service Worker ya escucha `push`;
  falta el servidor que envíe Web Push al celular del dueño.
- **Búsqueda de pago**: pendiente para una versión futura.

## Licencia

AGPL-3.0 (ver `LICENSE`). El detector de cabezas se entrena con Ultralytics YOLO, que usa esta misma licencia:
quien publique una versión modificada de la app debe compartir su código.

## Notificaciones push (con la app cerrada)

Los avisos se guardan en la tabla `notifications`. Cada aviso nuevo llama (con `pg_net`) a la función
`send-push` de Supabase, que lo envía por Web Push a los celulares del usuario. Pasos, una sola vez:

1. Correr `supabase/schema.sql` en el SQL Editor.
2. En la app: **Administrador → Datos → Notificaciones push → Generar claves**.
3. En Supabase → **Edge Functions → Secrets**, crear `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`
   (`mailto:` + un correo) con los valores que muestra la app.
4. En Supabase → **Edge Functions → Deploy a new function → Via Editor**, nombre `send-push`, pegar
   `supabase/functions/send-push/index.ts` y publicar. En sus ajustes, desactivar **Verify JWT** (la base de
   datos la llama sin sesión; la función solo envía avisos que existen, una vez).
5. En cada celular: abrir la app (en iPhone, instalada en la pantalla de inicio) y activar las notificaciones en Perfil.

## Cuenta con correo y clave, y administrador en cualquier dispositivo

Al crear su perfil cada persona elige una clave; con su correo y clave entra desde cualquier dispositivo y ve
sus datos y mascotas (**Perfil → ¿Ya tienes cuenta?**). Quien ya usaba la app sin clave la crea en
**Perfil → Tu cuenta**. "Olvidé mi contraseña" envía un correo con un enlace para crear una clave nueva.
Quien entra con un correo de la tabla `admin_emails` es administrador.

**Cambio de dominio**: el celular guarda la sesión por dirección. Cuando GitHub Pages empieza a redirigir
la dirección antigua a la nueva, la app que ya estaba en el celular sigue abriendo la antigua desde el caché
y lleva la sesión a la nueva (`src/move.js`); allá se retoma la misma cuenta y se muestra `#/mudanza`. Configuración, una vez:

1. Correr `supabase/schema.sql` y luego `insert into public.admin_emails values ('tu-correo@ejemplo.com');` (en minúsculas).
2. En Supabase → **Authentication → URL Configuration**: Site URL `https://andresmaturana-ui.github.io/petsafe/`
   y en Redirect URLs agregar `https://andresmaturana-ui.github.io/petsafe/**` (para el enlace de "Olvidé mi
   contraseña"). Con dominio propio, agregar también `https://kiltrazo.cl/**` y dejar la dirección nueva en Site URL.
3. En Supabase → **Authentication → Sign In / Providers → Email**, apagar **Confirm email**: así la cuenta queda
   lista al tiro, sin correo de confirmación (el correo gratis de Supabase permite muy pocos envíos por hora).
   Con eso nadie comprueba que el correo sea de quien lo escribe, así que el administrador debe crear su
   cuenta con su correo de `admin_emails` antes que nadie. Si se deja encendido, la app pide confirmar el
   correo con el enlace que llega.
