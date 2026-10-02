/**
 * Comportamento das peças:
 *  - brilham enquanto estão na sua mão;
 *  - voltam para a bancada quando você toca em "Reiniciar peças";
 *  - voltam sozinhas se caírem num buraco ou forem arremessadas para longe.
 *
 * Pegar, soltar e arremessar já vêm prontos do Immersive Web SDK
 * (componente OneHandGrabbable + física). Aqui só cuidamos do resto.
 */

import {
  createSystem,
  Entity,
  Grabbed,
  GrabSystem,
  Mesh,
  MeshStandardMaterial,
  PhysicsBody,
  PhysicsManipulation,
  PhysicsSystem,
  Quaternion,
  Vector3,
} from '@iwsdk/core';
import { Peca } from './peca-component.js';

interface PoseInicial {
  posicao: Vector3;
  rotacao: Quaternion;
}

/** Quanto a peça "acende" enquanto está na sua mão (0x000000 = nada). */
const BRILHO_NA_MAO = 0x4a4a4a;
/** Abaixo desta altura (em metros) a peça é considerada perdida. */
const ALTURA_MINIMA = -2;
/** Mais longe que isto (20 m, ao quadrado) a peça também volta. */
const DISTANCIA_MAXIMA_AO_QUADRADO = 20 * 20;
/**
 * Velocidade máxima (m/s) de uma peça logo depois de solta. Um arremesso
 * forte de verdade fica abaixo disso; o limite só evita que um "engasgo"
 * do aparelho no momento em que você solta faça a peça sair voando.
 */
const VELOCIDADE_MAXIMA = 8;

export class PecasSystem extends createSystem({
  pecas: { required: [Peca] },
  naMao: { required: [Peca, Grabbed] },
}) {
  private poses = new Map<Entity, PoseInicial>();
  private materiais = new Map<Entity, MeshStandardMaterial>();
  private aReposicionar = new Set<Entity>();

  init(): void {
    const registrar = (peca: Entity) => this.registrar(peca);
    // "qualify" só avisa sobre peças novas; as que já existem entram aqui.
    this.queries.pecas.entities.forEach(registrar);

    this.cleanupFuncs.push(
      this.queries.pecas.subscribe('qualify', registrar),
      this.queries.pecas.subscribe('disqualify', (peca) => {
        this.poses.delete(peca);
        this.materiais.delete(peca);
        this.aReposicionar.delete(peca);
      }),
      this.queries.naMao.subscribe('qualify', (peca) =>
        this.destacar(peca, true),
      ),
      this.queries.naMao.subscribe('disqualify', (peca) => {
        this.destacar(peca, false);
        this.limitarVelocidade(peca);
      }),
    );
  }

  update(): void {
    for (const peca of this.queries.pecas.entities) {
      const objeto = peca.object3D;
      if (objeto == null || peca.hasComponent(Grabbed)) {
        continue;
      }
      if (
        objeto.position.y < ALTURA_MINIMA ||
        objeto.position.lengthSq() > DISTANCIA_MAXIMA_AO_QUADRADO
      ) {
        this.aReposicionar.add(peca);
      }
    }

    if (this.aReposicionar.size === 0) {
      return;
    }
    const fisica = this.world.getSystem(PhysicsSystem);
    for (const peca of this.aReposicionar) {
      // Se ainda estiver presa na mão, espera o próximo quadro.
      if (peca.hasComponent(Grabbed)) {
        continue;
      }
      const pose = this.poses.get(peca);
      if (pose != null && fisica != null) {
        fisica.setBodyTransform(peca, {
          position: pose.posicao,
          quaternion: pose.rotacao,
        });
      }
      this.aReposicionar.delete(peca);
    }
  }

  /** Solta todas as peças e devolve cada uma ao seu lugar na bancada. */
  reiniciarTodas(): void {
    const pegar = this.world.getSystem(GrabSystem);
    for (const peca of this.queries.pecas.entities) {
      pegar?.forceRelease(peca);
      this.aReposicionar.add(peca);
    }
  }

  private registrar(peca: Entity): void {
    const objeto = peca.object3D;
    if (objeto == null || this.poses.has(peca)) {
      return;
    }
    this.poses.set(peca, {
      posicao: objeto.position.clone(),
      rotacao: objeto.quaternion.clone(),
    });
    // Cada peça ganha o próprio material, para o brilho não "vazar"
    // para outras cópias da mesma peça.
    if (objeto instanceof Mesh && objeto.material instanceof MeshStandardMaterial) {
      const proprio = objeto.material.clone();
      objeto.material = proprio;
      this.materiais.set(peca, proprio);
    }
  }

  private destacar(peca: Entity, naMao: boolean): void {
    this.materiais.get(peca)?.emissive.setHex(naMao ? BRILHO_NA_MAO : 0x000000);
  }

  private limitarVelocidade(peca: Entity): void {
    if (!peca.hasComponent(PhysicsBody) || peca.hasComponent(PhysicsManipulation)) {
      return;
    }
    const v = peca.getVectorView(PhysicsBody, '_linearVelocity');
    const rapidez = Math.hypot(v[0], v[1], v[2]);
    if (rapidez <= VELOCIDADE_MAXIMA) {
      return;
    }
    const fator = VELOCIDADE_MAXIMA / rapidez;
    peca.addComponent(PhysicsManipulation, {
      linearVelocity: [v[0] * fator, v[1] * fator, v[2] * fator],
    });
  }
}
