// Plantillas de anamnesis y examen físico: se rellenan al elegirlas y se
// completan escribiendo encima.

export const TEMPLATES = {
  general: {
    name: 'Control general',
    anamnesis: 'Motivo: control de rutina.\nApetito: \nAgua: \nVómitos / diarrea: \nActividad: \nAlimentación: ',
    exam: 'Condición corporal (1-9): \nHidratación: \nLinfonodos: \nAuscultación cardiopulmonar: \nAbdomen: \nPiel y pelaje: \nOjos y oídos: \nBoca y dientes: ',
  },
  piel: {
    name: 'Dermatológica',
    anamnesis: 'Picazón desde hace: \nZonas afectadas: \nTratamientos previos: \nAntiparasitario externo al día: \nAlimentación: \nOtros animales en casa: ',
    exam: 'Lesiones (tipo y distribución): \nAlopecia: \nOídos: \nPulgas / garrapatas: \nRaspado / citología: ',
  },
  digestivo: {
    name: 'Gastrointestinal',
    anamnesis: 'Vómitos (frecuencia, aspecto): \nDiarrea (frecuencia, aspecto): \nApetito: \nÚltima comida: \nPosible ingesta de cuerpo extraño: \nCambios de alimento: ',
    exam: 'Hidratación: \nDolor abdominal a la palpación: \nRuidos intestinales: \nTemperatura: \nMucosas: ',
  },
  cirugia: {
    name: 'Pre-quirúrgica',
    anamnesis: 'Procedimiento: \nAyuno desde: \nEnfermedades previas: \nReacciones a anestesia: \nMedicamentos actuales: ',
    exam: 'Riesgo anestésico (ASA): \nAuscultación cardiopulmonar: \nExámenes preoperatorios: \nPeso para dosis: ',
  },
  vacuna: {
    name: 'Vacunación',
    anamnesis: 'Sin reacciones a vacunas anteriores.\nEstado general: bueno.',
    exam: 'Examen general sin hallazgos.',
  },
};

/** Nombres frecuentes, para sugerir al escribir. */
export const VACCINE_NAMES = {
  vacuna: ['Antirrábica', 'Óctuple', 'Séxtuple', 'Triple felina', 'Leucemia felina', 'KC (tos de las perreras)'],
  desparasitacion_interna: ['Desparasitación interna'],
  desparasitacion_externa: ['Antipulgas y garrapatas'],
};

/** Próxima dosis sugerida, en meses, según el tipo. */
export const NEXT_MONTHS = { vacuna: 12, desparasitacion_interna: 3, desparasitacion_externa: 1 };
