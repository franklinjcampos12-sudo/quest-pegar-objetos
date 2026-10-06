/**
 * Painel do jogo: instruções, ajustes (distância e encaixe da raquete),
 * leituras da última batida e do teste de queda, e o medidor de desempenho
 * (quadros por segundo e frequência da física).
 */

import {
  createSystem,
  Entity,
  PhysicsSystem,
  UIKit,
  UIKitMLAsset,
  Vector3,
  VisibilityState,
} from '@iwsdk/core';
import {
  ajustes,
  br,
  DISTANCIA_MAX,
  DISTANCIA_MIN,
  leituraBatida,
  leituraTeste,
  PASSO_ANGULO,
  PASSO_DISTANCIA,
} from './ajustes.js';
import { BOLAS } from './catalogo.js';
import { BolaSystem } from './bola.js';
import { SalaSystem } from './sala.js';
import { prepararSom } from './som.js';

/**
 * A fonte padrão dos painéis não tem acentos. Estes arquivos são a mesma
 * fonte (Inter) gerada com ç, ã, é, õ... (licença em public/fonts/OFL.txt).
 */
const FONTE_COM_ACENTOS = {
  inter: {
    medium: `${import.meta.env.BASE_URL}fonts/inter-pt-medium.json`,
    bold: `${import.meta.env.BASE_URL}fonts/inter-pt-bold.json`,
  },
};

const ANGULO_MAX = 90;

export class PainelSystem extends createSystem({}) {
  private painel: UIKitMLAsset | null = null;
  private entidade: Entity | null = null;
  private status: UIKit.Text | null = null;
  private desempenho: UIKit.Text | null = null;
  private batida: UIKit.Text | null = null;
  private queda: UIKit.Text | null = null;
  private statusMostrado = '';
  private batidaMostrada = -1;
  private testeMostrado = -1;
  private escolhaMostrada = -1;
  private quadros = 0;
  private tempoQuadros = 0;
  private posicao = new Vector3();
  private alvo = new Vector3();

  init(): void {
    const painel = this.world.getSceneObject<UIKitMLAsset>('painel');
    if (painel == null) {
      return;
    }
    this.painel = painel;
    this.entidade = this.world.getSceneEntity('painel') ?? null;
    painel.document.rootElement.setProperties({ fontFamilies: FONTE_COM_ACENTOS });

    this.status = painel.getElementById<UIKit.Text>('status') ?? null;
    this.desempenho = painel.getElementById<UIKit.Text>('desempenho') ?? null;
    this.batida = painel.getElementById<UIKit.Text>('batida') ?? null;
    this.queda = painel.getElementById<UIKit.Text>('queda') ?? null;

    const passo = (valor: number, delta: number, min: number, max: number) =>
      Math.min(max, Math.max(min, Math.round((valor + delta) * 100) / 100));
    this.aoClicar('dist-menos', () => {
      ajustes.distancia = passo(ajustes.distancia, -PASSO_DISTANCIA, DISTANCIA_MIN, DISTANCIA_MAX);
    });
    this.aoClicar('dist-mais', () => {
      ajustes.distancia = passo(ajustes.distancia, PASSO_DISTANCIA, DISTANCIA_MIN, DISTANCIA_MAX);
    });
    this.aoClicar('face-menos', () => {
      ajustes.aberturaFace = passo(ajustes.aberturaFace, -PASSO_ANGULO, -ANGULO_MAX, ANGULO_MAX);
    });
    this.aoClicar('face-mais', () => {
      ajustes.aberturaFace = passo(ajustes.aberturaFace, PASSO_ANGULO, -ANGULO_MAX, ANGULO_MAX);
    });
    this.aoClicar('lado-menos', () => {
      ajustes.inclinacaoLateral = passo(ajustes.inclinacaoLateral, -PASSO_ANGULO, -ANGULO_MAX, ANGULO_MAX);
    });
    this.aoClicar('lado-mais', () => {
      ajustes.inclinacaoLateral = passo(ajustes.inclinacaoLateral, PASSO_ANGULO, -ANGULO_MAX, ANGULO_MAX);
    });
    this.aoClicar('frente-menos', () => {
      ajustes.inclinacaoFrente = passo(ajustes.inclinacaoFrente, -PASSO_ANGULO, -ANGULO_MAX, ANGULO_MAX);
    });
    this.aoClicar('frente-mais', () => {
      ajustes.inclinacaoFrente = passo(ajustes.inclinacaoFrente, PASSO_ANGULO, -ANGULO_MAX, ANGULO_MAX);
    });
    this.aoClicar('btn-parede', () => this.world.getSystem(SalaSystem)?.mostrarCandidatas());
    this.aoClicar('btn-queda', () => this.world.getSystem(BolaSystem)?.iniciarTesteDeQueda());
    this.aoClicar('btn-mao', () => {
      ajustes.maoRaquete = ajustes.maoRaquete === 'right' ? 'left' : 'right';
    });
    this.aoClicar('btn-xr', () => {
      prepararSom();
      void this.world.launchXR();
    });
    this.aoClicar('btn-sair', () => this.world.exitXR());

    const entrar = painel.getElementById('btn-xr');
    const sair = painel.getElementById('btn-sair');
    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe((estado) => {
        const tela = estado === VisibilityState.NonImmersive;
        entrar?.setProperties({ display: tela ? 'flex' : 'none' });
        sair?.setProperties({ display: tela ? 'none' : 'flex' });
        if (!tela) {
          prepararSom();
        }
      }),
    );
    this.mostrarAjustes();
  }

  update(delta: number): void {
    if (this.painel == null) {
      return;
    }
    // Medidor de desempenho, atualizado duas vezes por segundo.
    this.quadros++;
    this.tempoQuadros += delta;
    if (this.tempoQuadros >= 0.5) {
      const qps = Math.round(this.quadros / this.tempoQuadros);
      const hz = this.world.getSystem(PhysicsSystem)?.config.updateFrequency.peek() ?? 0;
      this.desempenho?.setProperties({ text: `${qps} qps · física ${Math.round(hz)} Hz` });
      this.quadros = 0;
      this.tempoQuadros = 0;
    }

    const status = this.textoStatus();
    if (status !== this.statusMostrado) {
      this.status?.setProperties({ text: status });
      this.statusMostrado = status;
    }
    if (leituraBatida.numero !== this.batidaMostrada) {
      this.batidaMostrada = leituraBatida.numero;
      this.batida?.setProperties({ text: this.textoBatida() });
    }
    if (leituraTeste.numero !== this.testeMostrado) {
      this.testeMostrado = leituraTeste.numero;
      this.queda?.setProperties({ text: this.textoTeste() });
    }
    const sala = this.world.getSystem(SalaSystem);
    if (sala != null && sala.versaoEscolha !== this.escolhaMostrada) {
      this.escolhaMostrada = sala.versaoEscolha;
      this.posicionarPainel(sala);
    }
  }

  /**
   * Liga um botão. Reage no instante em que o gatilho é apertado
   * ("pointerdown"): o "click" só conta se você soltar em menos de 0,3 s,
   * e um aperto mais demorado seria ignorado. Entrar no modo imersivo
   * continua no "click", porque o navegador exige um clique completo.
   */
  private aoClicar(id: string, acao: () => void): void {
    const elemento = this.painel?.getElementById(id);
    if (elemento == null) {
      return;
    }
    const evento = id === 'btn-xr' ? 'click' : 'pointerdown';
    const aoClicar = () => {
      acao();
      this.mostrarAjustes();
    };
    elemento.addEventListener(evento, aoClicar);
    this.cleanupFuncs.push(() => elemento.removeEventListener(evento, aoClicar));
  }

  private mostrarAjustes(): void {
    const texto = (id: string, valor: string) =>
      this.painel?.getElementById<UIKit.Text>(id)?.setProperties({ text: valor });
    texto('dist-valor', `${br(ajustes.distancia, 2)} m`);
    texto('face-valor', `${ajustes.aberturaFace}°`);
    texto('lado-valor', `${ajustes.inclinacaoLateral}°`);
    texto('frente-valor', `${ajustes.inclinacaoFrente}°`);
    texto(
      'btn-mao-rotulo',
      ajustes.maoRaquete === 'right' ? 'Raquete: mão direita' : 'Raquete: mão esquerda',
    );
  }

  /** Depois de escolher a parede, o painel vai para a sua frente-esquerda, fora da área de jogo. */
  private posicionarPainel(sala: SalaSystem): void {
    const parede = sala.parede();
    const objeto = this.entidade?.object3D;
    if (parede == null || objeto == null) {
      return;
    }
    this.posicao
      .copy(sala.pontoDaLinha)
      .addScaledVector(parede.normal, -0.5)
      .addScaledVector(parede.tangente, -1.0);
    this.posicao.y = sala.alturaChao + 1.2;
    this.alvo.copy(sala.pontoDaLinha).addScaledVector(parede.normal, 0.4);
    this.alvo.y = sala.alturaChao + 1.5;
    objeto.position.copy(this.posicao);
    objeto.rotation.set(0, Math.atan2(this.alvo.x - this.posicao.x, this.alvo.z - this.posicao.z), 0);
  }

  private textoStatus(): string {
    if (this.world.visibilityState.peek() === VisibilityState.NonImmersive) {
      return 'Toque em "Entrar na realidade mista" com o óculos no rosto.';
    }
    const sala = this.world.getSystem(SalaSystem);
    if (sala == null || sala.quantidadeDeParedes() === 0) {
      return 'Lendo a sala... Se nenhuma parede aparecer em azul, refaça a configuração do espaço do Quest.';
    }
    if (sala.parede() == null) {
      return 'Aponte para uma parede azul e aperte o gatilho para escolher.';
    }
    if (leituraTeste.etapa === 'caindo' || leituraTeste.etapa === 'subindo') {
      return 'Teste de queda em andamento: deixe a bola quicar.';
    }
    const livre = ajustes.maoRaquete === 'right' ? 'esquerda' : 'direita';
    if (this.world.getSystem(BolaSystem)?.estaLivre() === false) {
      return 'Solte o botão lateral para largar ou jogar a bola.';
    }
    return `Fique atrás da linha. Botão lateral da mão ${livre}: pega a bola; solte para jogar.`;
  }

  private textoBatida(): string {
    if (leituraBatida.numero === 0) {
      return 'Última batida: ainda nenhuma';
    }
    const ponto =
      leituraBatida.distanciaDoPontoDoce < 0.35
        ? ', no ponto doce'
        : leituraBatida.distanciaDoPontoDoce > 0.8
          ? ', na borda'
          : '';
    return (
      `Última batida: raquete a ${br(leituraBatida.velocidadeRaquete, 1)} m/s; ` +
      `bola chegou a ${br(leituraBatida.velocidadeBolaChegando, 1)} e saiu a ` +
      `${br(leituraBatida.velocidadeBolaSaindo, 1)} m/s (poder ${br(leituraBatida.poder, 2)}${ponto}).`
    );
  }

  private textoTeste(): string {
    const regra = BOLAS.tenis.teste;
    const faixa = `regra: ${br(regra.quiqueMin, 2)} a ${br(regra.quiqueMax, 2)} m`;
    switch (leituraTeste.etapa) {
      case 'caindo':
      case 'subindo':
        return 'Teste de queda: medindo...';
      case 'pronto': {
        const { alturaQueda, alturaVolta, alturaOficial } = leituraTeste;
        const equivalente = alturaOficial
          ? alturaVolta
          : alturaVolta * (regra.alturaQueda / alturaQueda);
        const veredito =
          equivalente < regra.quiqueMin
            ? 'quicou menos que a bola real'
            : equivalente > regra.quiqueMax
              ? 'quicou mais que a bola real'
              : 'igual à bola real';
        const origem = alturaOficial
          ? `soltou de ${br(alturaQueda, 2)} m e voltou ${br(alturaVolta, 2)} m`
          : `teto baixo: soltou de ${br(alturaQueda, 2)} m e voltou ${br(alturaVolta, 2)} m; ` +
            `de ${br(regra.alturaQueda, 2)} m voltaria ${br(equivalente, 2)} m`;
        return `Teste de queda: ${origem} (${faixa}). Resultado: ${veredito}.`;
      }
      default:
        return leituraTeste.numero === 0
          ? 'Teste de queda: ainda não feito'
          : 'Teste de queda: interrompido';
    }
  }
}
