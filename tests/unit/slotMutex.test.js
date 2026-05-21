/**
 * tests/unit/slotMutex.test.js
 * Prueba unitaria del mutex de slots.
 * Verifica que la ejecución sea secuencial, no concurrente.
 */

'use strict';

const { withSlotLock } = require('../../src/backend/src/utils/slotMutex');

describe('slotMutex — exclusión mutua por slot', () => {

  test('ejecuta funciones del mismo slot de forma secuencial', async () => {
    const order  = [];
    const slotId = 'test-slot-001';

    // Lanzar 3 operaciones "simultáneas" sobre el mismo slot
    const ops = [1, 2, 3].map((i) =>
      withSlotLock(slotId, async () => {
        order.push(`start-${i}`);
        await new Promise((r) => setTimeout(r, 10)); // simula trabajo async
        order.push(`end-${i}`);
      })
    );

    await Promise.all(ops);

    // Verificar que no hay solapamiento: cada end-N ocurre antes del start-N+1
    for (let i = 0; i < order.length - 1; i += 2) {
      const start = order[i];
      const end   = order[i + 1];
      expect(end.replace('start', 'end')).toBe(end); // trivial — asegura el patrón
      // El número de start debe coincidir con el de end consecutivo
      const startNum = start.split('-')[1];
      const endNum   = end.split('-')[1];
      expect(startNum).toBe(endNum);
    }
  });

  test('permite concurrencia entre slots DISTINTOS', async () => {
    const times = {};

    const record = (slotId) =>
      withSlotLock(slotId, async () => {
        times[slotId] = { start: Date.now() };
        await new Promise((r) => setTimeout(r, 50));
        times[slotId].end = Date.now();
      });

    // Slots distintos deben ejecutarse en paralelo
    const t0 = Date.now();
    await Promise.all([record('slot-A'), record('slot-B')]);
    const elapsed = Date.now() - t0;

    // Si fueran secuenciales tardarían ~100 ms; paralelos ~50 ms
    expect(elapsed).toBeLessThan(90);
  });

  test('propaga errores y libera el lock correctamente', async () => {
    const slotId = 'slot-error';
    let secondRan = false;

    await expect(
      withSlotLock(slotId, async () => { throw new Error('error simulado'); })
    ).rejects.toThrow('error simulado');

    // El lock debe liberarse para que la siguiente llamada pueda ejecutarse
    await withSlotLock(slotId, async () => { secondRan = true; });
    expect(secondRan).toBe(true);
  });
});
