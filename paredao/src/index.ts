/**
 * Paredão: jogo de bola na parede em realidade mista.
 * A ordem dos sistemas importa: a raquete detecta a batida antes de a bola
 * aplicar a nova velocidade no mesmo quadro.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { BolaSystem } from './bola.js';
import { PainelSystem } from './painel.js';
import { RaqueteSystem } from './raquete.js';
import { SalaSystem } from './sala.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(SalaSystem);
  world.registerSystem(RaqueteSystem);
  world.registerSystem(BolaSystem);
  world.registerSystem(PainelSystem);
});
