/**
 * Painel de instruções e botões (o arquivo visual é public/ui/painel.uikitml).
 */

import {
  AudioUtils,
  createSystem,
  UIKit,
  UIKitMLAsset,
  VisibilityState,
} from '@iwsdk/core';
import { PecasSystem } from './pecas.js';
import { SalaSystem } from './sala.js';

/**
 * A fonte padrão dos painéis só tem letras sem acento. Estes arquivos são a
 * mesma fonte (Inter) gerada com ç, ã, é, õ... (licença em public/fonts/OFL.txt).
 */
const FONTE_COM_ACENTOS = {
  inter: {
    medium: `${import.meta.env.BASE_URL}fonts/inter-pt-medium.json`,
    bold: `${import.meta.env.BASE_URL}fonts/inter-pt-bold.json`,
  },
};

export class PainelSystem extends createSystem({}) {
  private status: UIKit.Text | null = null;
  private totalMostrado = -1;
  private imersivoMostrado = false;

  init(): void {
    const painel = this.world.getSceneObject<UIKitMLAsset>('painel');
    if (painel == null) {
      return;
    }
    painel.document.rootElement.setProperties({
      fontFamilies: FONTE_COM_ACENTOS,
    });

    const entrar = painel.getElementById('xr-button');
    const reiniciar = painel.getElementById('reset-button');
    const sair = painel.getElementById('exit-button');
    this.status = painel.getElementById<UIKit.Text>('status');

    const aoReiniciar = () => {
      this.world.getSystem(PecasSystem)?.reiniciarTodas();
      const entidadePainel = this.world.getSceneEntity('painel');
      if (entidadePainel != null) {
        AudioUtils.play(entidadePainel);
      }
    };
    reiniciar?.addEventListener('click', aoReiniciar);
    this.cleanupFuncs.push(() =>
      reiniciar?.removeEventListener('click', aoReiniciar),
    );

    if (entrar == null || sair == null) {
      return;
    }
    if (!this.world.xrEnabled) {
      entrar.setProperties({ display: 'none' });
      sair.setProperties({ display: 'none' });
      return;
    }

    const aoEntrar = () => this.world.launchXR();
    const aoSair = () => this.world.exitXR();
    entrar.addEventListener('click', aoEntrar);
    sair.addEventListener('click', aoSair);
    this.cleanupFuncs.push(
      () => entrar.removeEventListener('click', aoEntrar),
      () => sair.removeEventListener('click', aoSair),
      this.world.visibilityState.subscribe((estado) => {
        const em2D = estado === VisibilityState.NonImmersive;
        entrar.setProperties({ display: em2D ? 'flex' : 'none' });
        sair.setProperties({ display: em2D ? 'none' : 'flex' });
      }),
    );
  }

  update(): void {
    if (this.status == null) {
      return;
    }
    const imersivo =
      this.world.visibilityState.peek() !== VisibilityState.NonImmersive;
    const total = this.world.getSystem(SalaSystem)?.totalSuperficies ?? 0;
    if (total === this.totalMostrado && imersivo === this.imersivoMostrado) {
      return;
    }
    this.totalMostrado = total;
    this.imersivoMostrado = imersivo;

    let texto: string;
    if (!imersivo) {
      texto = 'No Quest, toque em "Entrar na realidade mista" para ver as peças na sua sala.';
    } else if (total === 0) {
      texto = 'Procurando as superfícies da sua sala... Se demorar, refaça a Configuração do espaço no Quest.';
    } else {
      texto = `Sua sala já é sólida: as peças batem em ${total} ${
        total === 1 ? 'superfície real' : 'superfícies reais'
      }.`;
    }
    this.status.setProperties({ text: texto });
  }
}
