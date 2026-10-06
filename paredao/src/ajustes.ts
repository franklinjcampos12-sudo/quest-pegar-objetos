/**
 * Ajustes do jogo (mudados pelo painel) e leituras ao vivo (mostradas no
 * painel). Um objeto simples compartilhado pelos sistemas.
 */

export type Mao = 'left' | 'right';

export const ajustes = {
  /** Distância da parede até a linha no chão (m). */
  distancia: 2.0,
  /** Mão que segura a raquete; a outra pega a bola. */
  maoRaquete: 'right' as Mao,
  /** Encaixe da raquete na mão (graus). */
  aberturaFace: 0,
  inclinacaoLateral: 0,
  inclinacaoFrente: 0,
};

export const DISTANCIA_MIN = 0.5;
export const DISTANCIA_MAX = 6;
export const PASSO_DISTANCIA = 0.25;
export const PASSO_ANGULO = 5;

export interface LeituraBatida {
  /** Contador de batidas, para o painel saber quando atualizar. */
  numero: number;
  velocidadeRaquete: number;
  velocidadeBolaChegando: number;
  velocidadeBolaSaindo: number;
  poder: number;
  /** Posição do contato na face: 0 = ponto doce, 1 = borda. */
  distanciaDoPontoDoce: number;
}

export const leituraBatida: LeituraBatida = {
  numero: 0,
  velocidadeRaquete: 0,
  velocidadeBolaChegando: 0,
  velocidadeBolaSaindo: 0,
  poder: 0,
  distanciaDoPontoDoce: 0,
};

export type EtapaTeste = 'parado' | 'caindo' | 'subindo' | 'pronto';

export interface LeituraTeste {
  numero: number;
  etapa: EtapaTeste;
  alturaQueda: number;
  alturaVolta: number;
  velocidadeChegada: number;
  velocidadeSaida: number;
  /** A sala permitiu a altura oficial de 2,54 m? */
  alturaOficial: boolean;
}

export const leituraTeste: LeituraTeste = {
  numero: 0,
  etapa: 'parado',
  alturaQueda: 0,
  alturaVolta: 0,
  velocidadeChegada: 0,
  velocidadeSaida: 0,
  alturaOficial: true,
};

/** Formata um número no padrão brasileiro (vírgula decimal). */
export function br(valor: number, casas: number): string {
  return valor.toFixed(casas).replace('.', ',');
}
