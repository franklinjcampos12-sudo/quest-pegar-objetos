/**
 * A sala de verdade vira o "campo":
 *  - piso, paredes, teto e móveis (lidos pelo Quest) viram superfícies sólidas;
 *  - as paredes aparecem em azul para você escolher a sua com o gatilho;
 *  - uma linha no chão marca a distância da parede escolhida.
 */

import {
  BoxGeometry,
  createSystem,
  DoubleSide,
  EdgesGeometry,
  Entity,
  Hovered,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PhysicsBody,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsState,
  PlaneGeometry,
  Pressed,
  Quaternion,
  RayInteractable,
  Vector3,
  XRMesh,
  XRPlane,
} from '@iwsdk/core';
import { ajustes } from './ajustes.js';
import { ParedeCandidata } from './componentes.js';

/** Espessura dos blocos sólidos atrás de cada superfície (m). */
const ESPESSURA = 0.1;
const ATRITO = 0.8;
/**
 * O motor usa o MAIOR quique entre os dois objetos que se tocam. Com zero
 * aqui, quem manda no quique é a bola (calibrada pelo teste oficial).
 */
const QUIQUE = 0;
const COR_PAREDE = 0x1e88e5;
const OPACIDADE_NORMAL = 0.16;
const OPACIDADE_APONTADA = 0.38;
const LARGURA_MINIMA_PAREDE = 0.8;
const COMPRIMENTO_MAX_LINHA = 3;

export interface Parede {
  candidata: Entity;
  /** Centro da parede (mundo). */
  centro: Vector3;
  /** Normal horizontal apontando para dentro da sala. */
  normal: Vector3;
  /** Direção horizontal ao longo da parede. */
  tangente: Vector3;
  largura: number;
  altura: number;
}

export class SalaSystem extends createSystem({
  planos: { required: [XRPlane] },
  malhas: { required: [XRMesh] },
  candidatas: { required: [ParedeCandidata] },
  apontadas: { required: [ParedeCandidata, Hovered] },
  clicadas: { required: [ParedeCandidata, Pressed] },
}) {
  /** Altura do piso real (m). */
  alturaChao = 0;
  /** Altura do teto real (m); infinito se não foi encontrado. */
  alturaTeto = Number.POSITIVE_INFINITY;
  /** Muda a cada escolha de parede (o painel usa para se reposicionar). */
  versaoEscolha = 0;
  /** Ponto no chão onde a linha está (mundo). */
  readonly pontoDaLinha = new Vector3();

  private escolhida: Parede | null = null;
  private colisores = new Map<Entity, Entity>();
  private candidatoDoPlano = new Map<Entity, Entity>();
  private paredes = new Map<Entity, Parede>();
  private malhasSolidas = new Set<Entity>();
  private linha!: Mesh;
  private distanciaDaLinha = -1;

  private normal = new Vector3();
  private cabeca = new Vector3();
  private eixoX = new Vector3();
  private eixoZ = new Vector3();
  private cima = new Vector3(0, 1, 0);
  private base = new Matrix4();

  init(): void {
    this.linha = new Mesh(
      new BoxGeometry(1, 0.004, 0.04),
      new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
    );
    this.linha.name = 'LinhaDistancia';
    this.linha.visible = false;
    this.world.createTransformEntity(this.linha);

    this.cleanupFuncs.push(
      this.queries.apontadas.subscribe('qualify', (e) => this.destacar(e, true)),
      this.queries.apontadas.subscribe('disqualify', (e) => this.destacar(e, false)),
      this.queries.clicadas.subscribe('qualify', (e) => this.escolher(e)),
      this.queries.planos.subscribe('disqualify', (e) => this.removerPlano(e)),
      this.queries.malhas.subscribe('disqualify', (e) => this.malhasSolidas.delete(e)),
    );
  }

  /** A parede escolhida, ou null. */
  parede(): Parede | null {
    return this.escolhida;
  }

  quantidadeDeParedes(): number {
    return this.paredes.size;
  }

  update(): void {
    for (const plano of this.queries.planos.entities) {
      if (!this.colisores.has(plano)) {
        this.processarPlano(plano);
      }
    }
    for (const malha of this.queries.malhas.entities) {
      if (!this.malhasSolidas.has(malha)) {
        this.solidificarMalha(malha);
      }
    }
    if (this.escolhida != null && this.distanciaDaLinha !== ajustes.distancia) {
      this.posicionarLinha();
    }
  }

  /** Volta a mostrar as paredes para escolher outra. */
  mostrarCandidatas(): void {
    this.escolhida = null;
    this.linha.visible = false;
    this.versaoEscolha++;
    for (const candidata of this.queries.candidatas.entities) {
      if (candidata.object3D != null) {
        candidata.object3D.visible = true;
      }
      if (!candidata.hasComponent(RayInteractable)) {
        candidata.addComponent(RayInteractable);
      }
    }
  }

  private escolher(candidata: Entity): void {
    const parede = this.paredes.get(candidata);
    if (parede == null) {
      return;
    }
    this.escolhida = parede;
    this.versaoEscolha++;
    // Esconde as paredes no quadro seguinte (não mexer no raio durante o clique).
    queueMicrotask(() => {
      for (const outra of this.queries.candidatas.entities) {
        if (outra.object3D != null) {
          outra.object3D.visible = false;
        }
        if (outra.hasComponent(RayInteractable)) {
          outra.removeComponent(RayInteractable);
        }
      }
    });
    this.posicionarLinha();
  }

  private posicionarLinha(): void {
    const parede = this.escolhida;
    if (parede == null) {
      return;
    }
    this.pontoDaLinha
      .set(parede.centro.x, this.alturaChao + 0.002, parede.centro.z)
      .addScaledVector(parede.normal, ajustes.distancia);
    this.linha.position.copy(this.pontoDaLinha);
    this.base.makeBasis(parede.tangente, this.cima, parede.normal);
    this.linha.quaternion.setFromRotationMatrix(this.base);
    this.linha.scale.set(Math.min(parede.largura, COMPRIMENTO_MAX_LINHA), 1, 1);
    this.linha.visible = true;
    this.distanciaDaLinha = ajustes.distancia;
  }

  private destacar(candidata: Entity, apontada: boolean): void {
    const visual = candidata.object3D;
    if (visual instanceof Mesh && visual.material instanceof MeshBasicMaterial) {
      visual.material.opacity = apontada ? OPACIDADE_APONTADA : OPACIDADE_NORMAL;
    }
  }

  /** Superfície plana: bloco sólido atrás dela e, se for parede, candidata. */
  private processarPlano(plano: Entity): void {
    const visual = plano.object3D;
    if (!(visual instanceof Mesh) || !(visual.geometry instanceof BoxGeometry)) {
      return;
    }
    const { width, depth } = visual.geometry.parameters;
    visual.updateWorldMatrix(true, false);
    const centro = new Vector3();
    visual.geometry.computeBoundingBox();
    visual.geometry.boundingBox!.getCenter(centro);
    visual.localToWorld(centro);
    const rotacao = visual.getWorldQuaternion(new Quaternion());

    // O bloco vai para o lado oposto ao da sua cabeça (atrás da parede,
    // embaixo do piso), porque a direção da normal varia entre aparelhos.
    this.normal.set(0, 1, 0).applyQuaternion(rotacao);
    this.player.head.getWorldPosition(this.cabeca).sub(centro);
    const lado = this.normal.dot(this.cabeca) >= 0 ? 1 : -1;

    const corpo = new Object3D();
    corpo.name = 'Superfície real';
    corpo.quaternion.copy(rotacao);
    corpo.position.copy(centro).addScaledVector(this.normal, (-lado * ESPESSURA) / 2);
    const colisor = this.world.createTransformEntity(corpo);
    colisor.addComponent(PhysicsBody, { state: PhysicsState.Static });
    colisor.addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Box,
      dimensions: [width, ESPESSURA, depth],
      friction: ATRITO,
      restitution: QUIQUE,
    });
    this.colisores.set(plano, colisor);

    const paraDentro = this.normal.clone().multiplyScalar(lado);
    if (Math.abs(paraDentro.y) > 0.8) {
      if (paraDentro.y > 0 && centro.y < 0.5) {
        this.alturaChao = centro.y;
      } else if (paraDentro.y < 0) {
        this.alturaTeto = Math.min(this.alturaTeto, centro.y);
      }
      return;
    }
    if (Math.abs(paraDentro.y) < 0.3) {
      this.criarCandidata(plano, rotacao, centro, paraDentro, width, depth);
    }
  }

  private criarCandidata(
    plano: Entity,
    rotacao: Quaternion,
    centro: Vector3,
    paraDentro: Vector3,
    width: number,
    depth: number,
  ): void {
    const real = plano.getValue(XRPlane, '_plane') as { semanticLabel?: string } | undefined;
    const rotulo = real?.semanticLabel;
    if (rotulo != null && rotulo !== '' && rotulo !== 'wall') {
      return; // janela, porta, etc.
    }
    this.eixoX.set(1, 0, 0).applyQuaternion(rotacao);
    this.eixoZ.set(0, 0, 1).applyQuaternion(rotacao);
    const xHorizontal = Math.abs(this.eixoX.y) < Math.abs(this.eixoZ.y);
    const largura = xHorizontal ? width : depth;
    const altura = xHorizontal ? depth : width;
    if (largura < LARGURA_MINIMA_PAREDE) {
      return;
    }
    const normal = new Vector3(paraDentro.x, 0, paraDentro.z).normalize();
    const tangente = new Vector3().crossVectors(this.cima, normal);

    const geometria = new PlaneGeometry(largura, altura);
    const destaque = new Mesh(
      geometria,
      new MeshBasicMaterial({
        color: COR_PAREDE,
        transparent: true,
        opacity: OPACIDADE_NORMAL,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    destaque.name = 'ParedeCandidata';
    const contorno = new LineSegments(
      new EdgesGeometry(geometria),
      new LineBasicMaterial({ color: COR_PAREDE }),
    );
    contorno.name = 'Contorno';
    destaque.add(contorno);
    this.base.makeBasis(tangente, this.cima, normal);
    destaque.quaternion.setFromRotationMatrix(this.base);
    destaque.position.copy(centro).addScaledVector(normal, 0.01);

    const candidata = this.world.createTransformEntity(destaque);
    candidata.addComponent(ParedeCandidata);
    if (this.escolhida == null) {
      candidata.addComponent(RayInteractable);
    } else {
      destaque.visible = false;
    }
    this.candidatoDoPlano.set(plano, candidata);
    this.paredes.set(candidata, {
      candidata,
      centro: centro.clone(),
      normal,
      tangente,
      largura,
      altura,
    });
  }

  /** Móveis (volumes) viram sólidos. A malha geral fica de fora: os planos já cobrem paredes e piso. */
  private solidificarMalha(malha: Entity): void {
    const visual = malha.object3D;
    if (!(visual instanceof Mesh) || (visual.geometry.attributes.position?.count ?? 0) < 4) {
      return;
    }
    this.malhasSolidas.add(malha);
    if (malha.getValue(XRMesh, 'isBounded3D') !== true) {
      return;
    }
    malha.addComponent(PhysicsBody, { state: PhysicsState.Static });
    malha.addComponent(PhysicsShape, {
      shape: PhysicsShapeType.ConvexHull,
      friction: ATRITO,
      restitution: QUIQUE,
    });
  }

  private removerPlano(plano: Entity): void {
    this.colisores.get(plano)?.dispose();
    this.colisores.delete(plano);
    const candidata = this.candidatoDoPlano.get(plano);
    if (candidata != null) {
      if (this.escolhida?.candidata === candidata) {
        this.escolhida = null;
        this.linha.visible = false;
        this.versaoEscolha++;
      }
      this.paredes.delete(candidata);
      candidata.dispose();
      this.candidatoDoPlano.delete(plano);
    }
  }
}
