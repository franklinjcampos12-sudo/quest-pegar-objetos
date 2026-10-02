/**
 * Ponto de partida do app.
 *
 * As configurações (realidade mista, mãos, física, cena) ficam em
 * iwsdk.config.json. Aqui só ligamos os "sistemas" — os trechos de código
 * que rodam a cada quadro e dão comportamento ao app.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { PainelSystem } from './painel.js';
import { PecasSystem } from './pecas.js';
import { SalaSystem } from './sala.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(SalaSystem); // sua sala vira sólida
  world.registerSystem(PecasSystem); // brilho, reinício e resgate das peças
  world.registerSystem(PainelSystem); // painel com instruções e botões
});
