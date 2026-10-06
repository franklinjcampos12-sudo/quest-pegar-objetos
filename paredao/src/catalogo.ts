/**
 * Catálogo de bolas e raquetes com medidas reais.
 *
 * Medidas das regras oficiais (ITF para tênis e beach tennis, ITTF para
 * pingue-pongue) e da pesquisa de física do tênis (poder da raquete).
 * Este arquivo só tem dados: os modelos 3D e a física leem daqui, então
 * mudar um número aqui muda o desenho e o comportamento juntos.
 */

/** Densidade do ar ao nível do mar, 20 °C (kg/m³). */
export const DENSIDADE_DO_AR = 1.2;

export interface TesteDeQueda {
  /** Altura de onde a bola é solta, medida pela parte de baixo da bola (m). */
  alturaQueda: number;
  /** Faixa oficial da altura que a bola deve voltar (m). */
  quiqueMin: number;
  quiqueMax: number;
}

export interface Bola {
  id: string;
  nome: string;
  /** Massa (kg). */
  massa: number;
  /** Raio (m). */
  raio: number;
  /**
   * Quique usado pelo motor de física (coeficiente de restituição).
   * É calibrado pelo teste oficial de queda, não chutado.
   */
  quique: number;
  /** Atrito da superfície da bola (0 a 1). */
  atrito: number;
  /** Coeficiente de arrasto do ar (resistência do ar). */
  arrasto: number;
  teste: TesteDeQueda;
}

export interface Raquete {
  id: string;
  nome: string;
  /** Comprimento total, da ponta do cabo à ponta da cabeça (m). */
  comprimento: number;
  /** Distância do fim do cabo até o centro da mão, que é a origem do modelo (m). */
  recuoDoCabo: number;
  /** Centro da área de batida, no eixo do cabo (z local; a cabeça fica em -z). */
  centroFaceZ: number;
  /** Semi-eixo da área de batida ao longo do cabo (m). */
  semiEixoZ: number;
  /** Semi-eixo da área de batida na largura da cabeça (m). */
  semiEixoY: number;
  /** Largura do aro no plano da face (m). */
  larguraAro: number;
  /** Espessura do aro, perpendicular à face (m). */
  espessuraAro: number;
  /**
   * Poder da raquete (coeficiente de restituição aparente) no ponto doce
   * e na borda da área de batida. Na pesquisa com raquetes de tênis ele vai
   * de cerca de 0,13 (perto da ponta) a 0,54.
   */
  poderMax: number;
  poderMin: number;
  /** Ponto doce: deslocamento a partir do centro da face, rumo ao cabo (m). */
  pontoDoceZ: number;
  /**
   * Quanto da velocidade de raspão a bola mantém depois de tocar a face
   * (1 = escorrega sem atrito, 0 = gruda). Primeira aproximação; o efeito
   * (giro) da bola entra numa etapa futura.
   */
  retencaoTangencial: number;
  /** Massa (kg). */
  massa: number;
}

export const BOLAS = {
  tenis: {
    id: 'tenis',
    nome: 'Tênis',
    massa: 0.0577, // regra ITF: 56,0 a 59,4 g
    raio: 0.0335, // regra ITF: 6,54 a 6,86 cm de diâmetro
    quique: 0.775,
    atrito: 0.6,
    arrasto: 0.55,
    teste: { alturaQueda: 2.54, quiqueMin: 1.35, quiqueMax: 1.47 },
  },
} satisfies Record<string, Bola>;

export const RAQUETES = {
  tenis: {
    id: 'tenis',
    nome: 'Tênis',
    comprimento: 0.685, // padrão de 27 polegadas (limite da regra: 73,7 cm)
    recuoDoCabo: 0.08,
    centroFaceZ: -0.4275,
    semiEixoZ: 0.165, // área de cordas de cerca de 650 cm² (100 pol²)
    semiEixoY: 0.125,
    larguraAro: 0.0125,
    espessuraAro: 0.024,
    poderMax: 0.5,
    poderMin: 0.15,
    pontoDoceZ: 0.02,
    retencaoTangencial: 0.7,
    massa: 0.3,
  },
} satisfies Record<string, Raquete>;

export type IdBola = keyof typeof BOLAS;
export type IdRaquete = keyof typeof RAQUETES;
