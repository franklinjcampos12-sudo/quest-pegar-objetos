/**
 * Componentes do jogo. Só declarações (sem sistemas), para o editor
 * também conseguir ler.
 */

import { createComponent, Types } from '@iwsdk/core';

/** Marca a bola em jogo. `tipo` é a chave em BOLAS (src/catalogo.ts). */
export const Bola = createComponent('Bola', {
  tipo: { type: Types.String, default: 'tenis' },
});

/** Marca a raquete. `tipo` é a chave em RAQUETES (src/catalogo.ts). */
export const Raquete = createComponent('Raquete', {
  tipo: { type: Types.String, default: 'tenis' },
});

/** Parede da sala que pode ser escolhida (criada pelo jogo, não pela cena). */
export const ParedeCandidata = createComponent('ParedeCandidata', {});
