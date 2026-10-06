// Términos de uso de Kiltrazo Clínica (#/terminos). Se aceptan al crear una
// clínica. Si cambia algo importante, sube TERMS_VERSION en src/config.js.

export default async function terms(el) {
  el.innerHTML = `
    <div class="card legal">
      <h1>Términos de uso de Kiltrazo Clínica</h1>
      <p class="muted small">Vigentes desde el 2 de octubre de 2026.</p>

      <h2>Qué es</h2>
      <p>Kiltrazo Clínica es una herramienta para veterinarias y veterinarios: agenda, fichas, vacunas, horas a domicilio y una página donde los tutores te encuentran y piden hora. Kiltrazo no atiende mascotas ni participa en la atención.</p>

      <h2>Quién puede usarla</h2>
      <ul>
        <li>Clínicas veterinarias y médicos veterinarios con título.</li>
        <li>Quien crea la clínica declara que la atención la dan veterinarios titulados y que la clínica tiene los permisos que pide la ley (por ejemplo, la patente municipal).</li>
        <li>Cada persona del equipo entra con su propia cuenta y cuida su clave.</li>
      </ul>

      <h2>Revisión de Kiltrazo</h2>
      <p>Antes de mostrar una clínica en el mapa, en el buscador o en su página pública, Kiltrazo revisa el RUT y el título del veterinario a cargo. Es una revisión básica, no una certificación. Kiltrazo puede pedir más antecedentes, no aprobar o dar de baja una clínica si los datos no son verdaderos o si hay reclamos serios.</p>

      <h2>Responsabilidad por la atención</h2>
      <p>La clínica y cada veterinario responden por los diagnósticos, tratamientos, recetas, precios y el trato con los tutores. Kiltrazo no responde por la atención veterinaria.</p>

      <h2>Datos de tutores y pacientes</h2>
      <ul>
        <li>Las fichas son de la clínica. La clínica es responsable de esos datos y debe usarlos solo para atender y avisar a los tutores, cumpliendo la Ley 19.628 y, desde el 1 de diciembre de 2026, la Ley 21.719.</li>
        <li>Kiltrazo los guarda por encargo de la clínica, solo para que el sistema funcione. No los vende, no los entrega a otras empresas y no los usa para publicidad.</li>
        <li>Si un tutor pide ver, corregir o borrar sus datos, la clínica lo atiende y Kiltrazo ayuda en lo técnico.</li>
        <li>Si la clínica se elimina, se borran sus fichas. Antes puede pedirle a Kiltrazo una copia.</li>
      </ul>

      <h2>Uso correcto</h2>
      <p>No se permite usar datos falsos, hacerse pasar por otra persona o veterinaria, ni publicar información engañosa en la página de la clínica.</p>

      <h2>Precio</h2>
      <p>Hoy Kiltrazo Clínica es gratis. Si algún día tiene costo, lo avisaremos con al menos 30 días y nadie pagará sin aceptarlo. La app para los tutores sigue siendo gratis.</p>

      <h2>Funcionamiento</h2>
      <p>Hacemos lo posible para que funcione siempre, pero puede haber caídas o errores. Si algo es importante, guarda también tu propio respaldo.</p>

      <h2>Cambios y contacto</h2>
      <p>Si estos términos cambian, lo avisaremos en la app, y si el cambio es importante pediremos aceptarlos de nuevo. Se rigen por las leyes de Chile. Para cualquier duda, escríbele al administrador de Kiltrazo desde la app (Perfil → Ayuda).</p>
      <p><a href="#/privacidad">Política de privacidad</a></p>
    </div>`;
}
