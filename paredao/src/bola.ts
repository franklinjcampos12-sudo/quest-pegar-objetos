/**
 * A bola:
 *  - botão lateral (grip) da mão livre segura a bola; soltar joga com a
 *    velocidade da sua mão (dá para só largar, como num saque);
 *  - resistência do ar real, que cresce com o quadrado da velocidade;
 *  - som dos quiques na parede e no chão;
 *  - teste oficial de queda, que mostra se o quique está igual ao real;
 *  - bola perdida (fora da sala) volta para perto de você.
 */

import {
  createSystem,
  Entity,
  InputComponent,
  PhysicsBody,
  PhysicsManipulation,
  PhysicsSystem,
  Quaternion,
  Vector3,
  VisibilityState,
} from '@iwsdk/core';
import { ajustes, leituraTeste } from './ajustes.js';
import { BOLAS, DENSIDADE_DO_AR, type Bola as DadosBola, type IdBola } from './catalogo.js';
import { Bola } from './componentes.js';
import { SalaSystem } from './sala.js';
import { tocarBatida } from './som.js';

/** O kit ignora velocidade (0, 0, 0); este valor "zera" de verdade. */
const QUASE_ZERO = 1e-5;
/** Quadros usados para medir a velocidade da mão ao soltar a bola. */
const QUADROS_DA_MAO = 4;
/** Passos de física por quadro no máximo (limite do kit). */
const PASSOS_MAX_POR_QUADRO = 4;
/** Variação de velocidade num quadro que conta como quique (m/s). */
const LIMIAR_QUIQUE = 1.2;

export class BolaSystem extends createSystem({
  bolas: { required: [Bola, PhysicsBody] },
}) {
  private segurando = false;
  private maoLivreAnterior: 'left' | 'right' = 'left';
  private temVelocidadePendente = false;
  private velocidadePendente = new Vector3();
  private temPosicaoPendente = false;
  private posicaoPendente = new Vector3();
  private vAnterior = new Vector3();
  private temVAnterior = false;
  private naMao = new Vector3();
  private posicoesMao = Array.from({ length: QUADROS_DA_MAO }, () => new Vector3());
  private temposMao = new Array<number>(QUADROS_DA_MAO).fill(0);
  private indiceMao = 0;
  private quadrosMao = 0;
  private velocidadeMao = new Vector3();
  private rotacaoNeutra = new Quaternion();
  private rotacaoCabeca = new Quaternion();
  private cabeca = new Vector3();
  private frente = new Vector3();
  private posicao = new Vector3();
  private alturaMaxima = 0;
  private relogio = 0;

  /** A bola está solta (não está na mão)? */
  estaLivre(): boolean {
    return !this.segurando;
  }

  /** Chamado pela raquete quando há batida. */
  receberBatida(posicao: Vector3, velocidade: Vector3): void {
    this.posicaoPendente.copy(posicao);
    this.velocidadePendente.copy(velocidade);
    this.temPosicaoPendente = true;
    this.temVelocidadePendente = true;
    if (leituraTeste.etapa === 'caindo' || leituraTeste.etapa === 'subindo') {
      leituraTeste.etapa = 'parado';
      leituraTeste.numero++;
    }
  }

  /** Teste oficial: solta a bola da altura da regra e mede quanto ela volta. */
  iniciarTesteDeQueda(): void {
    const bola = this.bola();
    const fisica = this.world.getSystem(PhysicsSystem);
    const sala = this.world.getSystem(SalaSystem);
    if (bola == null || fisica == null || sala == null) {
      return;
    }
    const B = this.dados(bola);
    const espaco = sala.alturaTeto - sala.alturaChao - 2 * B.raio - 0.1;
    const altura = Math.min(B.teste.alturaQueda, espaco);
    leituraTeste.etapa = 'caindo';
    leituraTeste.alturaQueda = altura;
    leituraTeste.alturaOficial = altura >= B.teste.alturaQueda - 1e-6;
    leituraTeste.alturaVolta = 0;
    leituraTeste.velocidadeChegada = 0;
    leituraTeste.velocidadeSaida = 0;
    leituraTeste.numero++;

    // 80 cm à sua frente, com a parte de baixo da bola na altura do teste.
    this.player.head.getWorldPosition(this.cabeca);
    this.player.head.getWorldQuaternion(this.rotacaoCabeca);
    this.frente.set(0, 0, -1).applyQuaternion(this.rotacaoCabeca);
    this.frente.y = 0;
    if (this.frente.lengthSq() < 1e-6) {
      this.frente.set(0, 0, -1);
    }
    this.frente.normalize().multiplyScalar(0.8);
    this.posicao.copy(this.cabeca).add(this.frente);
    this.posicao.y = sala.alturaChao + altura + B.raio;
    this.segurando = false;
    fisica.setBodyTransform(bola, { position: this.posicao, quaternion: this.rotacaoNeutra });
    this.definirVelocidade(bola, QUASE_ZERO, QUASE_ZERO, QUASE_ZERO);
    bola.setValue(PhysicsBody, 'gravityFactor', 1);
    this.temVAnterior = false;
  }

  update(delta: number): void {
    const bola = this.bola();
    const fisica = this.world.getSystem(PhysicsSystem);
    if (bola?.object3D == null || fisica == null) {
      return;
    }
    if (this.world.visibilityState.peek() === VisibilityState.NonImmersive) {
      return; // fora do óculos a bola fica parada onde está
    }
    this.relogio += delta;
    const B = this.dados(bola);

    // 1) Mão livre: o botão lateral segura a bola; soltar joga.
    const maoLivre = ajustes.maoRaquete === 'right' ? 'left' : 'right';
    if (maoLivre !== this.maoLivreAnterior) {
      // Trocou a mão da raquete: a bola que estava na mão cai.
      this.maoLivreAnterior = maoLivre;
      this.quadrosMao = 0;
      if (this.segurando) {
        this.segurando = false;
        bola.setValue(PhysicsBody, 'gravityFactor', 1);
      }
    }
    const controle = this.input.xr.gamepads[maoLivre];
    const pegada = this.player.gripSpaces[maoLivre];
    pegada.updateWorldMatrix(true, false);
    this.naMao.set(0, 0, -0.07).applyMatrix4(pegada.matrixWorld);
    this.registrarMao();
    if (controle?.getButtonDown(InputComponent.Squeeze)) {
      this.segurando = true;
      leituraTeste.etapa = 'parado';
      bola.setValue(PhysicsBody, 'gravityFactor', 0);
    }
    if (this.segurando) {
      fisica.setBodyTransform(bola, { position: this.naMao, quaternion: this.rotacaoNeutra });
      if (controle == null || controle.getButtonUp(InputComponent.Squeeze)) {
        this.segurando = false;
        bola.setValue(PhysicsBody, 'gravityFactor', 1);
        this.medirVelocidadeMao();
        this.definirVelocidade(
          bola,
          this.velocidadeMao.x || QUASE_ZERO,
          this.velocidadeMao.y || QUASE_ZERO,
          this.velocidadeMao.z || QUASE_ZERO,
        );
      } else {
        this.definirVelocidade(bola, QUASE_ZERO, QUASE_ZERO, QUASE_ZERO);
      }
      this.temVAnterior = false;
      return;
    }

    // 2) Batida da raquete: posição e velocidade novas.
    if (this.temPosicaoPendente) {
      fisica.setBodyTransform(bola, {
        position: this.posicaoPendente,
        quaternion: bola.object3D.quaternion,
      });
      this.temPosicaoPendente = false;
    }
    if (this.temVelocidadePendente) {
      bola.setValue(PhysicsBody, 'gravityFactor', 1);
      this.definirVelocidade(
        bola,
        this.velocidadePendente.x,
        this.velocidadePendente.y,
        this.velocidadePendente.z,
      );
      this.temVelocidadePendente = false;
      this.temVAnterior = false;
      return;
    }

    const v = bola.getVectorView(PhysicsBody, '_linearVelocity');
    const rapidez = Math.hypot(v[0], v[1], v[2]);

    // 3) Resistência do ar: força = ½·ρ·Cd·A·v², contra o movimento.
    const frequencia = fisica.config.updateFrequency.peek() || 120;
    const tempoFisica = Math.min(delta, PASSOS_MAX_POR_QUADRO / frequencia);
    if (rapidez > 0.05 && tempoFisica > 0 && bola.getValue(PhysicsBody, 'gravityFactor') !== 0) {
      const k = 0.5 * DENSIDADE_DO_AR * B.arrasto * Math.PI * B.raio * B.raio;
      const fator = -k * rapidez * tempoFisica;
      if (!bola.hasComponent(PhysicsManipulation)) {
        bola.addComponent(PhysicsManipulation);
      }
      const impulso = bola.getVectorView(PhysicsManipulation, 'force');
      impulso[0] += v[0] * fator;
      impulso[1] += v[1] * fator;
      impulso[2] += v[2] * fator;
    }

    // 4) Som do quique: mudança brusca de velocidade sem batida de raquete.
    if (this.temVAnterior) {
      const dx = v[0] - this.vAnterior.x;
      const dy = v[1] - this.vAnterior.y;
      const dz = v[2] - this.vAnterior.z;
      const variacao = Math.hypot(dx, dy, dz);
      if (variacao > LIMIAR_QUIQUE) {
        tocarBatida(Math.abs(dy) > 0.7 * variacao ? 'chao' : 'parede', Math.min(1, variacao / 12));
      }
    }
    this.vAnterior.set(v[0], v[1], v[2]);
    this.temVAnterior = true;

    // 5) Teste de queda em andamento.
    if (leituraTeste.etapa === 'caindo' || leituraTeste.etapa === 'subindo') {
      this.acompanharTeste(bola, v[1], B);
    }

    // 6) Bola perdida volta para perto de você.
    const sala = this.world.getSystem(SalaSystem);
    bola.object3D.getWorldPosition(this.posicao);
    this.player.head.getWorldPosition(this.cabeca);
    const chao = sala?.alturaChao ?? 0;
    if (this.posicao.y < chao - 1.5 || this.posicao.distanceTo(this.cabeca) > 15) {
      this.estacionar(bola, fisica);
    }
  }

  private acompanharTeste(bola: Entity, vy: number, B: DadosBola): void {
    bola.object3D!.getWorldPosition(this.posicao);
    if (leituraTeste.etapa === 'caindo') {
      if (vy < 0) {
        leituraTeste.velocidadeChegada = Math.max(leituraTeste.velocidadeChegada, -vy);
      } else if (vy > 0.2 && leituraTeste.velocidadeChegada > 0.5) {
        leituraTeste.etapa = 'subindo';
        leituraTeste.velocidadeSaida = vy;
        leituraTeste.numero++;
        this.alturaMaxima = this.posicao.y;
      }
      return;
    }
    this.alturaMaxima = Math.max(this.alturaMaxima, this.posicao.y);
    if (vy <= 0) {
      const chao = this.world.getSystem(SalaSystem)?.alturaChao ?? 0;
      leituraTeste.alturaVolta = this.alturaMaxima - chao - B.raio;
      leituraTeste.etapa = 'pronto';
      leituraTeste.numero++;
    }
  }

  /** Coloca a bola parada no ar, meio metro à sua frente. */
  private estacionar(bola: Entity, fisica: PhysicsSystem): void {
    this.player.head.getWorldQuaternion(this.rotacaoCabeca);
    this.frente.set(0, 0, -1).applyQuaternion(this.rotacaoCabeca);
    this.frente.y = 0;
    this.frente.normalize().multiplyScalar(0.5);
    this.posicao.copy(this.cabeca).add(this.frente);
    this.posicao.y -= 0.4;
    fisica.setBodyTransform(bola, { position: this.posicao, quaternion: this.rotacaoNeutra });
    bola.setValue(PhysicsBody, 'gravityFactor', 0);
    this.definirVelocidade(bola, QUASE_ZERO, QUASE_ZERO, QUASE_ZERO);
    leituraTeste.etapa = 'parado';
    this.temVAnterior = false;
  }

  /** Troca a velocidade da bola (e descarta forças pendentes deste quadro). */
  private definirVelocidade(bola: Entity, x: number, y: number, z: number): void {
    if (!bola.hasComponent(PhysicsManipulation)) {
      bola.addComponent(PhysicsManipulation);
    }
    const velocidade = bola.getVectorView(PhysicsManipulation, 'linearVelocity');
    velocidade[0] = x;
    velocidade[1] = y;
    velocidade[2] = z;
    const forca = bola.getVectorView(PhysicsManipulation, 'force');
    forca[0] = 0;
    forca[1] = 0;
    forca[2] = 0;
  }

  private registrarMao(): void {
    this.posicoesMao[this.indiceMao].copy(this.naMao);
    this.temposMao[this.indiceMao] = this.relogio;
    this.indiceMao = (this.indiceMao + 1) % QUADROS_DA_MAO;
    this.quadrosMao = Math.min(this.quadrosMao + 1, QUADROS_DA_MAO);
  }

  private medirVelocidadeMao(): void {
    this.velocidadeMao.set(0, 0, 0);
    if (this.quadrosMao < 2) {
      return;
    }
    const maisNovo = (this.indiceMao + QUADROS_DA_MAO - 1) % QUADROS_DA_MAO;
    const maisVelho = (this.indiceMao + QUADROS_DA_MAO - this.quadrosMao) % QUADROS_DA_MAO;
    const intervalo = this.temposMao[maisNovo] - this.temposMao[maisVelho];
    if (intervalo > 0) {
      this.velocidadeMao
        .subVectors(this.posicoesMao[maisNovo], this.posicoesMao[maisVelho])
        .divideScalar(intervalo);
    }
  }

  private bola(): Entity | undefined {
    return this.queries.bolas.entities.values().next().value as Entity | undefined;
  }

  private dados(bola: Entity): DadosBola {
    return BOLAS[bola.getValue(Bola, 'tipo') as IdBola] ?? BOLAS.tenis;
  }
}
