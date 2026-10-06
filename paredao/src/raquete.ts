/**
 * A raquete na mão:
 *  - segue o controle da mão escolhida, com o encaixe ajustado no painel;
 *  - detecta a batida pelo caminho da bola em relação à raquete entre dois
 *    quadros (src/fisica-batida.ts) e entrega a nova velocidade à bola;
 *  - vibra o controle e toca o som da batida.
 *
 * A raquete acompanha a "pegada" do controle (grip): o ponto onde a mão
 * fecha em volta dele, e não o raio de apontar.
 */

import {
  createSystem,
  Entity,
  Euler,
  Matrix4,
  PhysicsBody,
  Vector3,
  VisibilityState,
} from '@iwsdk/core';
import { ajustes, leituraBatida, type Mao } from './ajustes.js';
import { BOLAS, RAQUETES, type IdBola, type IdRaquete } from './catalogo.js';
import { Bola, Raquete } from './componentes.js';
import {
  detectarContato,
  distanciaDoPontoDoce,
  MEIA_ESPESSURA_CORDAS,
  poderNoPonto,
  velocidadeDeSaida,
  type Contato,
} from './fisica-batida.js';
import { BolaSystem } from './bola.js';
import { tocarBatida } from './som.js';

const GRAU = Math.PI / 180;
/** Tempo mínimo entre duas batidas, para a mesma não contar duas vezes (s). */
const ESPERA_ENTRE_BATIDAS = 0.08;
/**
 * Acima disso é falha de rastreio do controle, não um golpe (m/s). Um golpe
 * forte de amador fica entre 15 e 25 m/s; o saque de um profissional chega
 * perto disso na ponta. Quando o controle sai da vista das câmeras do óculos
 * (por exemplo, atrás das costas), o rastreio pode "pular" e gerar valores
 * absurdos, que este limite corta.
 */
const VELOCIDADE_MAX_RAQUETE = 35;

interface Atuador {
  pulse(intensidade: number, duracaoMs: number): Promise<boolean>;
}

export class RaqueteSystem extends createSystem({
  raquetes: { required: [Raquete] },
  bolas: { required: [Bola, PhysicsBody] },
}) {
  private encaixe = new Matrix4();
  private euler = new Euler(0, 0, 0, 'ZXY');
  private encaixeAtual = [Number.NaN, Number.NaN, Number.NaN];
  private atual = new Matrix4();
  private anterior = new Matrix4();
  private inversaAtual = new Matrix4();
  private inversaAnterior = new Matrix4();
  private local = new Matrix4();
  private escala = new Vector3();
  private temAnterior = false;
  private maoAnterior: Mao = ajustes.maoRaquete;

  private bolaAtual = new Vector3();
  private bolaAnterior = new Vector3();
  private temBolaAnterior = false;
  private naRaqueteAntes = new Vector3();
  private naRaqueteAgora = new Vector3();
  private contato: Contato = { t: 0, lado: 1, z: 0, y: 0 };
  private ponto = new Vector3();
  private pontoAntes = new Vector3();
  private pontoAgora = new Vector3();
  private vRaquete = new Vector3();
  private vBola = new Vector3();
  private normal = new Vector3();
  private vSaida = new Vector3();
  private posicaoNaFace = new Vector3();
  private esperando = 0;

  update(delta: number): void {
    const raquete = this.queries.raquetes.entities.values().next().value as Entity | undefined;
    const objeto = raquete?.object3D;
    if (raquete == null || objeto == null) {
      return;
    }
    const imersivo = this.world.visibilityState.peek() !== VisibilityState.NonImmersive;
    const mao = ajustes.maoRaquete;
    const controle = imersivo ? this.input.xr.gamepads[mao] : undefined;
    if (controle == null || mao !== this.maoAnterior) {
      objeto.visible = !imersivo;
      this.temAnterior = false;
      this.maoAnterior = mao;
      return;
    }
    objeto.visible = true;

    const pegada = this.player.gripSpaces[mao];
    pegada.updateWorldMatrix(true, false);
    this.atualizarEncaixe();
    this.atual.multiplyMatrices(pegada.matrixWorld, this.encaixe);
    this.inversaAtual.copy(this.atual).invert();
    if (objeto.parent != null) {
      objeto.parent.updateWorldMatrix(true, false);
      this.local.copy(objeto.parent.matrixWorld).invert().multiply(this.atual);
    } else {
      this.local.copy(this.atual);
    }
    this.local.decompose(objeto.position, objeto.quaternion, this.escala);

    if (this.esperando > 0) {
      this.esperando -= delta;
    }
    const bola = this.queries.bolas.entities.values().next().value as Entity | undefined;
    if (bola?.object3D != null) {
      bola.object3D.getWorldPosition(this.bolaAtual);
      const sistemaBola = this.world.getSystem(BolaSystem);
      if (
        sistemaBola != null &&
        sistemaBola.estaLivre() &&
        this.temAnterior &&
        this.temBolaAnterior &&
        this.esperando <= 0 &&
        delta > 0 &&
        delta < 0.5
      ) {
        this.testarBatida(raquete, bola, sistemaBola, delta);
      }
      this.bolaAnterior.copy(this.bolaAtual);
      this.temBolaAnterior = true;
    }
    this.anterior.copy(this.atual);
    this.inversaAnterior.copy(this.inversaAtual);
    this.temAnterior = true;
  }

  private testarBatida(raquete: Entity, bola: Entity, sistemaBola: BolaSystem, delta: number): void {
    const R = RAQUETES[raquete.getValue(Raquete, 'tipo') as IdRaquete] ?? RAQUETES.tenis;
    const B = BOLAS[bola.getValue(Bola, 'tipo') as IdBola] ?? BOLAS.tenis;

    // Caminho da bola visto pela raquete: antes (pose anterior) e agora (pose atual).
    this.naRaqueteAntes.copy(this.bolaAnterior).applyMatrix4(this.inversaAnterior);
    this.naRaqueteAgora.copy(this.bolaAtual).applyMatrix4(this.inversaAtual);
    if (!detectarContato(this.naRaqueteAntes, this.naRaqueteAgora, R, B.raio, this.contato)) {
      return;
    }

    // Velocidade da raquete no ponto exato do contato (a ponta anda mais rápido que o cabo).
    this.ponto.set(0, this.contato.y, this.contato.z);
    this.pontoAntes.copy(this.ponto).applyMatrix4(this.anterior);
    this.pontoAgora.copy(this.ponto).applyMatrix4(this.atual);
    this.vRaquete.subVectors(this.pontoAgora, this.pontoAntes).divideScalar(delta);
    if (this.vRaquete.length() > VELOCIDADE_MAX_RAQUETE) {
      this.vRaquete.setLength(VELOCIDADE_MAX_RAQUETE);
    }

    // Normal da face no mundo, apontando para o lado de onde a bola veio.
    this.normal.set(this.contato.lado, 0, 0).transformDirection(this.atual);
    const v = bola.getVectorView(PhysicsBody, '_linearVelocity');
    this.vBola.set(v[0], v[1], v[2]);
    const poder = poderNoPonto(R, this.contato.z, this.contato.y);
    if (!velocidadeDeSaida(this.vBola, this.vRaquete, this.normal, poder, R.retencaoTangencial, this.vSaida)) {
      return;
    }

    // A bola sai encostada na face, do lado certo, na posição atual da raquete.
    this.posicaoNaFace
      .set(this.contato.lado * (B.raio + MEIA_ESPESSURA_CORDAS + 0.002), this.contato.y, this.contato.z)
      .applyMatrix4(this.atual);
    sistemaBola.receberBatida(this.posicaoNaFace, this.vSaida);
    this.esperando = ESPERA_ENTRE_BATIDAS;

    const dvx = this.vSaida.x - this.vBola.x;
    const dvy = this.vSaida.y - this.vBola.y;
    const dvz = this.vSaida.z - this.vBola.z;
    const impulso = B.massa * Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
    const forca = Math.min(1, impulso / 1.2);
    leituraBatida.numero++;
    leituraBatida.velocidadeRaquete = this.vRaquete.length();
    leituraBatida.velocidadeBolaChegando = this.vBola.length();
    leituraBatida.velocidadeBolaSaindo = this.vSaida.length();
    leituraBatida.poder = poder;
    leituraBatida.distanciaDoPontoDoce = distanciaDoPontoDoce(R, this.contato.z, this.contato.y);
    this.vibrar(forca);
    tocarBatida('raquete', forca);
  }

  /** Reconstrói o encaixe quando os ângulos do painel mudam. */
  private atualizarEncaixe(): void {
    const face = ajustes.aberturaFace;
    const lado = ajustes.inclinacaoLateral;
    const frente = ajustes.inclinacaoFrente;
    if (
      face === this.encaixeAtual[0] &&
      lado === this.encaixeAtual[1] &&
      frente === this.encaixeAtual[2]
    ) {
      return;
    }
    // Abertura da face: gira em torno do cabo (Z). Lateral: no plano das
    // cordas (em torno de X). Frente/trás: para fora do plano (em torno de Y).
    this.euler.set(lado * GRAU, frente * GRAU, face * GRAU, 'ZXY');
    this.encaixe.makeRotationFromEuler(this.euler);
    this.encaixeAtual[0] = face;
    this.encaixeAtual[1] = lado;
    this.encaixeAtual[2] = frente;
  }

  private vibrar(forca: number): void {
    const controle = this.input.xr.gamepads[ajustes.maoRaquete];
    const gamepad = controle?.gamepad as unknown as { hapticActuators?: Atuador[] } | undefined;
    void gamepad?.hapticActuators?.[0]?.pulse(Math.max(0.25, forca), 30);
  }
}
