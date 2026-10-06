/**
 * Física da batida, sem dependências (dá para testar sozinha).
 *
 * O motor de física cuida de parede, chão e móveis. A batida da raquete é
 * calculada aqui porque a raquete é fina e rápida: entre um quadro e outro
 * ela pode pular a bola inteira. Por isso olhamos o CAMINHO da bola em
 * relação à raquete entre os dois quadros, e não só as duas fotos.
 *
 * Espaço local da raquete: X = normal da face, Y = largura, Z = cabo
 * (a cabeça fica em -Z).
 */

export interface Vetor {
  x: number;
  y: number;
  z: number;
}

export interface FaceDaRaquete {
  centroFaceZ: number;
  semiEixoZ: number;
  semiEixoY: number;
  poderMax: number;
  poderMin: number;
  pontoDoceZ: number;
}

export interface Contato {
  /** Momento do contato entre o quadro anterior (0) e o atual (1). */
  t: number;
  /** Lado da face de onde a bola veio: +1 (lado +X) ou -1. */
  lado: 1 | -1;
  /** Ponto de contato na face: z (ao longo do cabo) e y (largura). */
  z: number;
  y: number;
}

/** Meia espessura das cordas usada no contato (m). */
export const MEIA_ESPESSURA_CORDAS = 0.004;

/**
 * Procura o contato da bola com a face entre dois quadros.
 * `p0` e `p1` são o centro da bola no espaço local da raquete: `p0` com a
 * pose anterior da raquete e `p1` com a pose atual. Assim o movimento da
 * raquete (inclusive o giro) e o da bola entram juntos.
 */
export function detectarContato(
  p0: Vetor,
  p1: Vetor,
  face: FaceDaRaquete,
  raio: number,
  saida: Contato,
): boolean {
  const alcance = raio + MEIA_ESPESSURA_CORDAS;
  const d0 = p0.x;
  const d1 = p1.x;
  if ((d0 > alcance && d1 > alcance) || (d0 < -alcance && d1 < -alcance)) {
    return false;
  }
  let t: number;
  let lado: 1 | -1;
  if (d0 >= alcance) {
    lado = 1;
    t = (d0 - alcance) / (d0 - d1);
  } else if (d0 <= -alcance) {
    lado = -1;
    t = (-alcance - d0) / (d1 - d0);
  } else {
    // Já estava encostando no quadro anterior: só vale se estiver se aproximando.
    lado = d0 >= 0 ? 1 : -1;
    if (lado === 1 ? d1 >= d0 : d1 <= d0) {
      return false;
    }
    t = 0;
  }
  if (!(t >= 0 && t <= 1)) {
    return false;
  }
  const z = p0.z + (p1.z - p0.z) * t;
  const y = p0.y + (p1.y - p0.y) * t;
  const a = face.semiEixoZ + raio * 0.5;
  const b = face.semiEixoY + raio * 0.5;
  const dz = z - face.centroFaceZ;
  if ((dz / a) ** 2 + (y / b) ** 2 > 1) {
    return false;
  }
  saida.t = t;
  saida.lado = lado;
  saida.z = z;
  saida.y = y;
  return true;
}

/**
 * Distância normalizada do ponto de contato até o ponto doce
 * (0 = no ponto doce, 1 = na borda da área de batida).
 */
export function distanciaDoPontoDoce(face: FaceDaRaquete, z: number, y: number): number {
  const dz = (z - (face.centroFaceZ + face.pontoDoceZ)) / face.semiEixoZ;
  const dy = y / face.semiEixoY;
  return Math.min(1, Math.sqrt(dz * dz + dy * dy));
}

/**
 * Poder da raquete no ponto (coeficiente de restituição aparente): máximo
 * no ponto doce, caindo até o mínimo na ponta e nas laterais.
 */
export function poderNoPonto(face: FaceDaRaquete, z: number, y: number): number {
  const dz = (z - (face.centroFaceZ + face.pontoDoceZ)) / face.semiEixoZ;
  const dy = y / face.semiEixoY;
  const queda = Math.min(1, 0.85 * dz * dz + 0.6 * dy * dy);
  return face.poderMax - (face.poderMax - face.poderMin) * queda;
}

/**
 * Velocidade da bola depois da batida.
 *
 * Regra da física do tênis: na direção da normal, a velocidade relativa
 * entre bola e raquete inverte e é multiplicada pelo poder `e`, o que dá
 * v_saída = (1 + e)·V_raquete + e·v_chegada. Na direção da face (raspão),
 * a bola mantém a fração `retencao` da velocidade relativa.
 *
 * `normal` é unitária e aponta para o lado de onde a bola veio.
 * Retorna false se a bola não estiver se aproximando da face.
 */
export function velocidadeDeSaida(
  vBola: Vetor,
  vRaquete: Vetor,
  normal: Vetor,
  e: number,
  retencao: number,
  saida: Vetor,
): boolean {
  const rx = vBola.x - vRaquete.x;
  const ry = vBola.y - vRaquete.y;
  const rz = vBola.z - vRaquete.z;
  const vn = rx * normal.x + ry * normal.y + rz * normal.z;
  if (vn >= 0) {
    return false;
  }
  const tx = rx - vn * normal.x;
  const ty = ry - vn * normal.y;
  const tz = rz - vn * normal.z;
  const vnSaida = -e * vn;
  saida.x = vRaquete.x + vnSaida * normal.x + retencao * tx;
  saida.y = vRaquete.y + vnSaida * normal.y + retencao * ty;
  saida.z = vRaquete.z + vnSaida * normal.z + retencao * tz;
  return true;
}
