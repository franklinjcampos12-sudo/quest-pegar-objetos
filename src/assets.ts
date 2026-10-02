/**
 * Catálogo de tudo que pode aparecer na cena (peças 3D e o painel).
 * Cada item recebe um ID; a cena (public/scenes/main.iwsdk.scene.json)
 * usa esses IDs para posicionar as coisas.
 */

import { AssetType, defineAssets } from '@iwsdk/core';
import {
  bancada,
  bolaLaranja,
  bordaCurta,
  bordaLonga,
  bolaRoxa,
  cilindro,
  cuboAmarelo,
  cuboAzul,
  cuboVerde,
  cuboVermelho,
  tabua,
} from './scene-assets/pecas.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

export default defineAssets({
  bancada,
  'borda-longa': bordaLonga,
  'borda-curta': bordaCurta,
  'cubo-vermelho': cuboVermelho,
  'cubo-azul': cuboAzul,
  'cubo-amarelo': cuboAmarelo,
  'cubo-verde': cuboVerde,
  'bola-laranja': bolaLaranja,
  'bola-roxa': bolaRoxa,
  cilindro,
  tabua,
  painel: {
    url: publicAssetUrl('ui/painel.uikitml'),
    type: AssetType.UIKitML,
    name: 'Painel',
  },
});
