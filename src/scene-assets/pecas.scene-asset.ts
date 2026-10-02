/**
 * Peças virtuais que você pega com as mãos.
 *
 * Tudo é medido em METROS (0.07 = 7 cm). Se mudar o tamanho de uma peça aqui,
 * mude também as "dimensions" do PhysicsShape dela em
 * public/scenes/main.iwsdk.scene.json — o formato que você vê e o formato que
 * colide precisam ser iguais.
 *
 * Este arquivo é lido duas vezes (pelo app e pelo editor), então ele só cria
 * objetos 3D: nada de timers, DOM ou World aqui.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from '@iwsdk/core';

export const MEDIDAS = {
  cubo: 0.07, // aresta: 7 cm
  bolaRaio: 0.04, // raio: 4 cm
  cilindro: { raio: 0.035, altura: 0.1 },
  tabua: { largura: 0.18, altura: 0.025, profundidade: 0.06 },
  bancada: { largura: 0.6, altura: 0.03, profundidade: 0.35 },
} as const;

function material(cor: number, rugosidade = 0.45): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: cor,
    roughness: rugosidade,
    metalness: 0,
  });
}

function peca(nome: string, mesh: Mesh): Mesh {
  mesh.name = nome;
  return mesh;
}

const geoCubo = new BoxGeometry(MEDIDAS.cubo, MEDIDAS.cubo, MEDIDAS.cubo);
const geoBola = new SphereGeometry(MEDIDAS.bolaRaio, 32, 16);
const geoCilindro = new CylinderGeometry(
  MEDIDAS.cilindro.raio,
  MEDIDAS.cilindro.raio,
  MEDIDAS.cilindro.altura,
  32,
);
const geoTabua = new BoxGeometry(
  MEDIDAS.tabua.largura,
  MEDIDAS.tabua.altura,
  MEDIDAS.tabua.profundidade,
);

export const cuboVermelho = peca(
  'Cubo vermelho',
  new Mesh(geoCubo, material(0xe53935)),
);
export const cuboAzul = peca('Cubo azul', new Mesh(geoCubo, material(0x1e88e5)));
export const cuboAmarelo = peca(
  'Cubo amarelo',
  new Mesh(geoCubo, material(0xfdd835)),
);
export const cuboVerde = peca(
  'Cubo verde',
  new Mesh(geoCubo, material(0x43a047)),
);
export const bolaLaranja = peca(
  'Bola laranja',
  new Mesh(geoBola, material(0xfb8c00, 0.3)),
);
export const bolaRoxa = peca(
  'Bola roxa',
  new Mesh(geoBola, material(0x8e24aa, 0.3)),
);
export const cilindro = peca(
  'Cilindro',
  new Mesh(geoCilindro, material(0x00acc1)),
);
export const tabua = peca('Tábua', new Mesh(geoTabua, material(0xa1887f, 0.7)));

const vidro = new MeshStandardMaterial({
  color: 0xbfe3ff,
  roughness: 0.1,
  metalness: 0,
  transparent: true,
  opacity: 0.45,
});

/** Bancada de vidro flutuante onde as peças começam. */
export const bancada = peca(
  'Bancada',
  new Mesh(
    new BoxGeometry(
      MEDIDAS.bancada.largura,
      MEDIDAS.bancada.altura,
      MEDIDAS.bancada.profundidade,
    ),
    vidro,
  ),
);

/** Bordinhas de 2 cm em volta da bancada, para as bolas não rolarem para fora. */
export const bordaLonga = peca(
  'Borda longa',
  new Mesh(new BoxGeometry(MEDIDAS.bancada.largura, 0.05, 0.01), vidro),
);
export const bordaCurta = peca(
  'Borda curta',
  new Mesh(new BoxGeometry(0.01, 0.05, MEDIDAS.bancada.profundidade - 0.02), vidro),
);
