# Paredão — bola na parede em realidade mista (Meta Quest 3)

**▶ Abrir no Quest:** no navegador do óculos, acesse
<https://franklinjcampos12-sudo.github.io/quest-pegar-objetos/paredao/> e toque
em **"Entrar na realidade mista"**.

Você escolhe uma parede de verdade da sua sala, fica atrás de uma linha no chão
e bate uma bola de tênis contra a parede com uma raquete de tênis. A física é
a mais crua possível: medidas oficiais, quique calibrado pelo teste da ITF e
resistência do ar real. Nada de ajuda invisível corrigindo a direção.

## Como jogar

1. Faça a **configuração do espaço** do Quest (paredes e chão), se ainda não fez.
2. Abra o link, entre na realidade mista e **permita o acesso aos dados do espaço**.
3. As paredes aparecem em **azul**: aponte para uma e aperte o **gatilho**.
4. A **linha branca** no chão marca onde você fica (ajuste a distância no painel).
5. A raquete fica na **mão direita** (dá para trocar no painel). O **botão lateral
   (grip)** da outra mão pega a bola; solte para largar ou jogar.

> Dica: prenda a alça de pulso dos controles e tire objetos frágeis do caminho.

## Painel

| Item | O que faz |
| --- | --- |
| Distância da parede | Move a linha no chão, de 0,5 a 6 m |
| Abertura da face | Gira a raquete em volta do cabo (face mais aberta ou fechada) |
| Inclinação lateral | Inclina a raquete no plano das cordas |
| Frente / trás | Inclina a cabeça da raquete para frente ou para trás |
| Última batida | Velocidade da raquete, da bola chegando e saindo, e o "poder" no ponto do contato |
| Teste de queda | Solta a bola de 2,54 m e mede o quique (regra: volta entre 1,35 e 1,47 m) |
| Trocar parede | Mostra as paredes azuis de novo |
| qps · física Hz | Quadros por segundo do jogo e frequência da física |

Os botões do painel reagem no instante em que você aperta o gatilho.

## A física

- **Bola de tênis:** 57,7 g e 6,7 cm (regras da ITF). O quique foi calibrado
  pelo teste oficial: solta de 2,54 m, volta 1,42 m.
- **Resistência do ar:** força = ½ · ρ · Cd · A · v², contra o movimento (Cd = 0,55).
- **Raquete de tênis:** 68,5 cm, cabeça de cerca de 650 cm² (100 pol²).
- **Batida:** regra da física do tênis, v_saída = (1 + e) · V_raquete + e · v_chegada.
  O "poder" e vai de 0,50 no ponto doce a 0,15 na ponta.
- **A bola não atravessa a raquete:** o jogo olha o caminho da bola em relação
  à raquete entre um quadro e outro, e não só as duas "fotos".
- **Parede, chão e móveis** são calculados pelo motor de física (Havok), a 120 Hz.

Todos os números ficam em `src/catalogo.ts`.

## Medidor de desempenho da Meta

O gráfico verde que aparece nos vídeos de desenvolvedores é o **OVR Metrics
Tool** (grátis, na loja do Quest). Instale, abra e ligue **"Persistent
Overlay"** para ver quadros por segundo, processador e placa de vídeo por cima
do jogo.

## Rodar e publicar pelo PC

Dentro desta pasta (`paredao`):

```
npm install
npm run dev        # Quest simulado no PC
npm run publicar   # gera o site em ../docs/paredao
```

Depois envie ao GitHub (`git add -A`, `git commit`, `git push`) ou peça ao
Claude Code: "publique a nova versão do Paredão".

## Onde fica cada coisa

| Arquivo | O que controla |
| --- | --- |
| `src/catalogo.ts` | Medidas e física de cada bola e raquete |
| `src/fisica-batida.ts` | A conta da batida (contato, poder, velocidade de saída) |
| `src/raquete.ts` | Raquete na mão, encaixe e detecção da batida |
| `src/bola.ts` | Pegar e jogar a bola, resistência do ar, quiques e teste de queda |
| `src/sala.ts` | Paredes reais sólidas, escolha da parede e linha no chão |
| `src/painel.ts` e `public/ui/painel.uikitml` | Painel de ajustes e leituras |
| `src/som.ts` | Sons das batidas (gerados na hora) |
| `src/scene-assets/` | Desenho 3D da raquete e da bola |

## Próximas etapas

- Mais bolas (beach tennis, pingue-pongue) e raquetes (beach tennis, padel, a própria mão).
- Efeito (giro) da bola e salvar combinações de ajustes.
- Limites gráficos de segurança.

Feito com o Immersive Web SDK da Meta (licença MIT).
