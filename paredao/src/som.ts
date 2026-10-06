/**
 * Sons de batida gerados na hora (sem arquivos de áudio): um estalo curto
 * filtrado, com volume conforme a força do impacto.
 *  - raquete: "pock" agudo das cordas;
 *  - parede: batida média;
 *  - chão: batida mais grave.
 */

export type TipoDeSom = 'raquete' | 'parede' | 'chao';

const TOM: Record<TipoDeSom, { frequencia: number; duracao: number; q: number }> = {
  raquete: { frequencia: 1400, duracao: 0.06, q: 6 },
  parede: { frequencia: 650, duracao: 0.07, q: 4 },
  chao: { frequencia: 380, duracao: 0.08, q: 3 },
};

let contexto: AudioContext | null = null;
let ruido: AudioBuffer | null = null;

/** Prepara o áudio. Chamar depois de um toque do usuário (ex.: ao entrar no XR). */
export function prepararSom(): void {
  if (contexto == null) {
    contexto = new AudioContext();
    const amostras = Math.floor(contexto.sampleRate * 0.12);
    ruido = contexto.createBuffer(1, amostras, contexto.sampleRate);
    const dados = ruido.getChannelData(0);
    for (let i = 0; i < amostras; i++) {
      dados[i] = (Math.random() * 2 - 1) * (1 - i / amostras);
    }
  }
  if (contexto.state === 'suspended') {
    void contexto.resume();
  }
}

/** Toca uma batida. `forca` vai de 0 a 1. */
export function tocarBatida(tipo: TipoDeSom, forca: number): void {
  if (contexto == null || ruido == null || forca <= 0.02) {
    return;
  }
  const tom = TOM[tipo];
  const agora = contexto.currentTime;
  const volume = Math.min(1, forca) * 0.9;

  const fonte = contexto.createBufferSource();
  fonte.buffer = ruido;
  const filtro = contexto.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = tom.frequencia;
  filtro.Q.value = tom.q;
  const ganho = contexto.createGain();
  ganho.gain.setValueAtTime(volume, agora);
  ganho.gain.exponentialRampToValueAtTime(0.0001, agora + tom.duracao);
  fonte.connect(filtro).connect(ganho).connect(contexto.destination);
  fonte.start(agora);
  fonte.stop(agora + tom.duracao + 0.02);
}
