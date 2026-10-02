/**
 * Transforma a sua sala de verdade em algo "sólido" para as peças virtuais.
 *
 * O Quest 3 já conhece o seu ambiente (piso, paredes, mesas, sofá...) a partir
 * da "Configuração do espaço". O Immersive Web SDK entrega essas superfícies
 * como entidades XRPlane (superfícies planas) e XRMesh (malhas 3D). Este
 * sistema dá um corpo físico a cada uma, para as peças baterem e pararem
 * em cima delas em vez de atravessá-las.
 */

import {
  BoxGeometry,
  createSystem,
  Entity,
  Mesh,
  Object3D,
  PhysicsBody,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsState,
  Vector3,
  XRMesh,
  XRPlane,
} from '@iwsdk/core';

/**
 * Espessura (metros) do "bloco" sólido criado atrás de cada superfície plana.
 * Um bloco grosso evita que peças rápidas atravessem a superfície.
 */
const ESPESSURA = 0.1;
const ATRITO = 0.8;
const QUIQUE = 0.2;

export class SalaSystem extends createSystem({
  planos: { required: [XRPlane] },
  malhas: { required: [XRMesh] },
}) {
  /** Quantas superfícies reais já colidem com as peças. */
  totalSuperficies = 0;

  private colisores = new Map<Entity, Entity>();
  private pendentes = new Set<Entity>();
  private deslocamento = new Vector3();
  private normal = new Vector3();
  private cabeca = new Vector3();

  init(): void {
    this.criarPisoDeSeguranca();

    const agendar = (superficie: Entity) => this.pendentes.add(superficie);
    this.queries.planos.entities.forEach(agendar);
    this.queries.malhas.entities.forEach(agendar);

    this.cleanupFuncs.push(
      this.queries.planos.subscribe('qualify', agendar),
      this.queries.malhas.subscribe('qualify', agendar),
      this.queries.planos.subscribe('disqualify', (s) => this.remover(s)),
      this.queries.malhas.subscribe('disqualify', (s) => this.remover(s)),
    );
  }

  update(): void {
    if (this.pendentes.size === 0) {
      return;
    }
    for (const superficie of this.pendentes) {
      if (superficie.hasComponent(XRPlane)) {
        this.solidificarPlano(superficie);
      } else if (superficie.hasComponent(XRMesh)) {
        this.solidificarMalha(superficie);
      }
    }
    this.pendentes.clear();
    this.totalSuperficies = this.colisores.size;
  }

  /**
   * Piso invisível na altura do chão (y = 0). Garante que nada caia para
   * sempre, mesmo antes de o Quest entregar as superfícies da sala.
   */
  private criarPisoDeSeguranca(): void {
    const piso = new Object3D();
    piso.name = 'Piso de segurança';
    piso.position.set(0, -0.25, 0);
    const entidade = this.world.createTransformEntity(piso);
    entidade.addComponent(PhysicsBody, { state: PhysicsState.Static });
    entidade.addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Box,
      dimensions: [40, 0.5, 40],
      friction: ATRITO,
      restitution: QUIQUE,
    });
  }

  /** Superfície plana (piso, parede, tampo de mesa): bloco sólido atrás dela. */
  private solidificarPlano(plano: Entity): void {
    const visual = plano.object3D;
    if (
      this.colisores.has(plano) ||
      !(visual instanceof Mesh) ||
      !(visual.geometry instanceof BoxGeometry)
    ) {
      return;
    }
    const { width, depth } = visual.geometry.parameters;
    const corpo = new Object3D();
    corpo.name = 'Superfície real';
    corpo.quaternion.copy(visual.quaternion);

    // O bloco precisa ficar do lado de "dentro" da superfície (embaixo do
    // piso, atrás da parede). Como a direção da normal do plano varia entre
    // aparelhos, usamos a sua cabeça como referência: o bloco vai sempre
    // para o lado oposto ao seu.
    this.normal.set(0, 1, 0).applyQuaternion(visual.quaternion);
    this.player.head.getWorldPosition(this.cabeca).sub(visual.position);
    const lado = this.normal.dot(this.cabeca) >= 0 ? -1 : 1;
    this.deslocamento.copy(this.normal).multiplyScalar((lado * ESPESSURA) / 2);
    corpo.position.copy(visual.position).add(this.deslocamento);

    const colisor = this.world.createTransformEntity(corpo);
    colisor.addComponent(PhysicsBody, { state: PhysicsState.Static });
    colisor.addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Box,
      dimensions: [width, ESPESSURA, depth],
      friction: ATRITO,
      restitution: QUIQUE,
    });
    this.colisores.set(plano, colisor);
  }

  /**
   * Malha 3D: móveis viram volumes sólidos; a malha geral da sala vira uma
   * "casca" que acompanha cada detalhe do ambiente.
   */
  private solidificarMalha(malha: Entity): void {
    if (this.colisores.has(malha) || malha.hasComponent(PhysicsBody)) {
      return;
    }
    const movel = malha.getValue(XRMesh, 'isBounded3D') === true;
    malha.addComponent(PhysicsBody, { state: PhysicsState.Static });
    malha.addComponent(PhysicsShape, {
      shape: movel ? PhysicsShapeType.ConvexHull : PhysicsShapeType.TriMesh,
      friction: ATRITO,
      restitution: QUIQUE,
    });
    this.colisores.set(malha, malha);
  }

  private remover(superficie: Entity): void {
    this.pendentes.delete(superficie);
    const colisor = this.colisores.get(superficie);
    this.colisores.delete(superficie);
    if (colisor != null && colisor !== superficie) {
      colisor.dispose();
    }
    this.totalSuperficies = this.colisores.size;
  }
}
