/**
 * utils/slotMutex.js
 * Exclusión mutua distribuida para la reserva de citas.
 *
 * PROBLEMA: Dos pacientes pueden solicitar el mismo slot simultáneamente.
 * Sin control, ambas transacciones podrían leer el slot como 'available'
 * y ambas lo reservarían — condición de carrera clásica.
 *
 * SOLUCIÓN (dos capas de protección):
 *
 * Capa 1 — Mutex en memoria (async-mutex):
 *   Un Mutex por slot_id garantiza que solo un hilo de Node.js
 *   procese ese slot a la vez dentro de esta instancia del servidor.
 *
 * Capa 2 — SELECT FOR UPDATE en PostgreSQL:
 *   Dentro de la transacción, se bloquea la fila del slot a nivel de BD.
 *   Si en un escenario multi-servidor Capa 1 no aplica, Capa 2 protege.
 *
 * NOTA: Para un despliegue de múltiples nodos se reemplazaría Capa 1
 * por un lock distribuido en Redis (redlock). Para el alcance académico
 * de este proyecto (un nodo), async-mutex es suficiente y demostrable.
 */

'use strict';

const { Mutex } = require('async-mutex');

// Mapa de mutexes por slot_id
const mutexMap = new Map();

/**
 * Devuelve (o crea) el Mutex asociado a un slot específico.
 * @param {string} slotId - UUID del slot de cita
 * @returns {Mutex}
 */
function getMutexForSlot(slotId) {
  if (!mutexMap.has(slotId)) {
    mutexMap.set(slotId, new Mutex());
  }
  return mutexMap.get(slotId);
}

/**
 * Ejecuta fn bajo exclusión mutua del slot indicado.
 * Garantiza que fn no se ejecute concurrentemente para el mismo slotId.
 *
 * @param {string}   slotId  - UUID del slot
 * @param {Function} fn      - Función async con la lógica de reserva
 * @returns {Promise<*>}     - Resultado de fn
 */
async function withSlotLock(slotId, fn) {
  const mutex   = getMutexForSlot(slotId);
  const release = await mutex.acquire();
  try {
    return await fn();
  } finally {
    release();
    // Limpieza: si el mutex ya no tiene waiters, eliminarlo del mapa
    if (!mutex.isLocked()) {
      mutexMap.delete(slotId);
    }
  }
}

module.exports = { withSlotLock };
