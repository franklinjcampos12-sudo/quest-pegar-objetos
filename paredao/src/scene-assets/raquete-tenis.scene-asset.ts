/**
 * Raquete de tênis com medidas reais (ver src/catalogo.ts).
 *
 * Eixos do modelo (importantes para a física da batida):
 *  - origem: centro da mão, no cabo (onde o controle fica);
 *  - -Z: direção da cabeça da raquete;
 *  - ±X: perpendicular às cordas (normal da face);
 *  - ±Y: largura da cabeça.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Path,
  Shape,
} from '@iwsdk/core';
import { RAQUETES } from '../catalogo.js';
import { LoftSurface, sampleRange } from './lib/hardsurface.js';

const R = RAQUETES.tenis;
/** Topo do cabo, onde a empunhadura termina e a garganta começa (z local). */
const TOPO_DO_CABO = -0.115;

const materialAro = new MeshStandardMaterial({
  color: 0x1f5fd6,
  roughness: 0.38,
  metalness: 0.15,
});
const materialEmpunhadura = new MeshStandardMaterial({
  color: 0x161616,
  roughness: 0.85,
});
const materialTampa = new MeshStandardMaterial({
  color: 0x8a8f98,
  roughness: 0.4,
  metalness: 0.5,
});
const materialCordas = new MeshStandardMaterial({
  color: 0xf1eee4,
  roughness: 0.6,
});

/** Prisma octogonal ao longo de Z, com as faces planas voltadas para X e Y. */
function octogono(
  zIni: number,
  zFim: number,
  meiaLarguraX: number,
  meiaLarguraY: number,
  afinamento = 1,
): CylinderGeometry {
  const g = new CylinderGeometry(afinamento, 1, Math.abs(zFim - zIni), 8);
  g.rotateY(Math.PI / 8);
  g.rotateX(-Math.PI / 2); // eixo do cilindro (+Y) passa a apontar para -Z
  g.scale(meiaLarguraX, meiaLarguraY, 1);
  g.translate(0, 0, (zIni + zFim) / 2);
  return g;
}

function criarCabo(): Group {
  const cabo = new Group();
  cabo.name = 'Cabo';

  const empunhadura = new Mesh(
    octogono(R.recuoDoCabo - 0.008, TOPO_DO_CABO, 0.0128, 0.0152),
    materialEmpunhadura,
  );
  empunhadura.name = 'Empunhadura';

  const tampa = new Mesh(
    octogono(R.recuoDoCabo, R.recuoDoCabo - 0.012, 0.0142, 0.0168, 0.94),
    materialTampa,
  );
  tampa.name = 'Tampa';

  const colar = new Mesh(
    octogono(TOPO_DO_CABO + 0.012, TOPO_DO_CABO - 0.02, 0.0131, 0.0156, 0.8),
    materialAro,
  );
  colar.name = 'Colar';

  cabo.add(empunhadura, tampa, colar);
  return cabo;
}

/**
 * Um braço da garganta (garganta aberta): sai do colar do cabo e se abre
 * até entrar no aro. Construído como um tubo contínuo (loft) e girado
 * para que a largura fique no plano da face e a espessura em X.
 */
function criarBraco(lado: 1 | -1): Mesh {
  const zIni = TOPO_DO_CABO + 0.01;
  const zFim = -0.3;
  const secoes = sampleRange(0, 1, 9).map((s) => ({
    z: zIni + (zFim - zIni) * s,
    cx: lado * (0.009 + 0.0785 * Math.pow(s, 1.25)),
    halfW: 0.0074 + 0.0009 * s,
    hUp: (R.espessuraAro / 2) * (0.88 + 0.12 * s),
    power: 2.6,
  }));
  const geometria = LoftSurface.tube(secoes).build(
    secoes.map((s) => s.z),
    16,
    true,
  );
  // loft: X = lateral, Y = espessura. Raquete: lateral = Y, espessura = X.
  geometria.rotateZ(Math.PI / 2);
  const braco = new Mesh(geometria, materialAro);
  braco.name = lado === 1 ? 'BracoEsquerdo' : 'BracoDireito';
  return braco;
}

/** Aro oval da cabeça: um anel elíptico com bordas arredondadas. */
function criarAro(): Mesh {
  const a = R.semiEixoZ;
  const b = R.semiEixoY;
  const zc = R.centroFaceZ;
  const forma = new Shape();
  forma.absellipse(0, zc, b + R.larguraAro, a + R.larguraAro, 0, Math.PI * 2, false);
  const furo = new Path();
  furo.absellipse(0, zc, b, a, 0, Math.PI * 2, true);
  forma.holes.push(furo);

  const chanfro = 0.002;
  const profundidade = R.espessuraAro - 2 * chanfro;
  const geometria = new ExtrudeGeometry(forma, {
    depth: profundidade,
    bevelEnabled: true,
    bevelThickness: chanfro,
    bevelSize: 0.0016,
    bevelSegments: 2,
    curveSegments: 72,
  });
  // forma: (x = largura, y = comprimento, z = extrusão)
  // raquete: (X = espessura, Y = largura, Z = comprimento)
  geometria.applyMatrix4(
    new Matrix4().set(0, 0, 1, -profundidade / 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1),
  );
  geometria.computeVertexNormals();
  const aro = new Mesh(geometria, materialAro);
  aro.name = 'Aro';
  return aro;
}

/** Cordas: 16 principais (ao longo do cabo) e 19 cruzadas. */
function criarCordas(): Group {
  const cordas = new Group();
  cordas.name = 'Cordas';
  const a = R.semiEixoZ;
  const b = R.semiEixoY;
  const espessura = 0.0013;
  const sobra = 0.004; // as cordas entram um pouco no aro

  sampleRange(-b * 0.92, b * 0.92, 16).forEach((y, i) => {
    const meio = a * Math.sqrt(1 - (y / b) ** 2) + sobra;
    const corda = new Mesh(new BoxGeometry(espessura, espessura, meio * 2), materialCordas);
    corda.position.set(0.0004, y, R.centroFaceZ);
    corda.name = `Principal${String(i + 1).padStart(2, '0')}`;
    cordas.add(corda);
  });

  sampleRange(-a * 0.94, a * 0.94, 19).forEach((dz, i) => {
    const meio = b * Math.sqrt(1 - (dz / a) ** 2) + sobra;
    const corda = new Mesh(new BoxGeometry(espessura, meio * 2, espessura), materialCordas);
    corda.position.set(-0.0004, 0, R.centroFaceZ + dz);
    corda.name = `Cruzada${String(i + 1).padStart(2, '0')}`;
    cordas.add(corda);
  });
  return cordas;
}

export function criarRaqueteTenis(): Object3D {
  const raquete = new Group();
  raquete.name = 'RaqueteTenis';

  const garganta = new Group();
  garganta.name = 'Garganta';
  garganta.add(criarBraco(1), criarBraco(-1));

  raquete.add(criarCabo(), garganta, criarAro(), criarCordas());
  return raquete;
}
