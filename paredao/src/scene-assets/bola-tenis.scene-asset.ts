/**
 * Bola de tênis com medidas reais (ver src/catalogo.ts): feltro amarelo
 * e a costura branca na curva clássica. Origem no centro da bola.
 */

import {
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from '@iwsdk/core';
import { BOLAS } from '../catalogo.js';

const materialFeltro = new MeshStandardMaterial({
  color: 0xd2ee1e,
  roughness: 0.95,
});
const materialCostura = new MeshStandardMaterial({
  color: 0xf5f5ee,
  roughness: 0.7,
});

/**
 * Curva da costura sobre a esfera:
 * x = a·cos t + b·cos 3t, y = a·sin t − b·sin 3t, z = 2·√(ab)·sin 2t,
 * com a + b = 1, o que mantém todos os pontos sobre a esfera de raio 1.
 */
function curvaDaCostura(raio: number): CatmullRomCurve3 {
  const a = 0.72;
  const b = 1 - a;
  const c = 2 * Math.sqrt(a * b);
  const pontos: Vector3[] = [];
  const passos = 96;
  for (let i = 0; i < passos; i++) {
    const t = (i / passos) * Math.PI * 2;
    pontos.push(
      new Vector3(
        a * Math.cos(t) + b * Math.cos(3 * t),
        a * Math.sin(t) - b * Math.sin(3 * t),
        c * Math.sin(2 * t),
      ).multiplyScalar(raio),
    );
  }
  return new CatmullRomCurve3(pontos, true);
}

export function criarBolaTenis(): Object3D {
  const { raio } = BOLAS.tenis;
  const bola = new Group();
  bola.name = 'BolaTenis';

  const feltro = new Mesh(new SphereGeometry(raio, 32, 20), materialFeltro);
  feltro.name = 'Feltro';

  const costura = new Mesh(
    new TubeGeometry(curvaDaCostura(raio * 1.004), 192, 0.0017, 6, true),
    materialCostura,
  );
  costura.name = 'Costura';

  bola.add(feltro, costura);
  return bola;
}
