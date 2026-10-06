/**
 * Catálogo de recursos do jogo, lido pelo app e pelo editor.
 * Deve ser determinístico e sem efeitos colaterais.
 */

import { AssetType, defineAssets } from '@iwsdk/core';
import { criarBolaTenis } from './scene-assets/bola-tenis.scene-asset.js';
import { criarRaqueteTenis } from './scene-assets/raquete-tenis.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

export default defineAssets({
  'raquete-tenis': criarRaqueteTenis(),
  'bola-tenis': criarBolaTenis(),
  painel: {
    url: publicAssetUrl('ui/painel.uikitml'),
    type: AssetType.UIKitML,
    name: 'Painel do Paredão',
  },
});
