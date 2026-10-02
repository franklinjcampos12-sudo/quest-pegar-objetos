# Pegar objetos — seu primeiro app de realidade mista (Meta Quest 3)

**▶ Abrir no Quest:** no navegador do óculos, acesse
<https://franklinjcampos12-sudo.github.io/quest-pegar-objetos/> e toque em
**"Entrar na realidade mista"**.

Peças virtuais (cubos, bolas, um cilindro e uma tábua) numa bancada de vidro à
sua frente, **dentro da sua sala de verdade**. Você pega com as mãos (pinça) ou
com os controles (botão lateral), empilha e arremessa — e as peças batem no
piso, nas paredes e nos móveis reais.

Feito com o **Immersive Web SDK (IWSDK)**, o kit oficial da Meta para WebXR: o
app roda no navegador do Quest, sem instalar nada no óculos e sem modo
desenvolvedor.

---

## 1. Preparar o PC (só na primeira vez)

1. Instale o **Node.js LTS** em <https://nodejs.org> (botão "LTS" → avançar até
   concluir). Precisa ser a versão 22.12 ou mais nova.
2. Abra um terminal **nesta pasta**: no Explorador de Arquivos, entre em
   `C:\projetos_claude\oculos\oculos_1`, clique na barra de endereço, digite
   `cmd` e aperte Enter.
3. Rode:

   ```
   npm install
   ```

   Leva 1–2 minutos: ele baixa as bibliotecas do projeto.

## 2. Rodar no PC, com um Quest simulado

```
npm run dev
```

- Na primeira vez ele baixa um navegador próprio (Chromium, ~150 MB).
- Abre uma janela com o app e um **Quest 3 simulado** (IWER): dá para entrar na
  realidade mista e mexer mãos e controles virtuais com mouse e teclado.
  Comandos do simulador: <https://iwsdk.dev/guides/02-testing-experience.html#iwer-controls>
- Se o Windows perguntar se o Node.js pode usar a rede, **permita em "Redes
  privadas"** — é isso que deixa o Quest acessar o seu PC.
- Para parar: `Ctrl + C` no terminal.

## 3. Abrir no seu Quest 3

1. Deixe o Quest e o PC **na mesma rede Wi-Fi** e o `npm run dev` rodando.
2. No terminal aparece uma linha **`Network: https://192.168.x.x:8081/`**
   (se não achar, rode `npm run dev:status` em outro terminal e procure
   `network`).
3. No Quest, abra o app **Navegador** e digite esse endereço.
4. Vai aparecer o aviso **"Sua conexão não é particular"**. É normal: o
   certificado é do seu próprio PC. Toque em **Avançado → Continuar**.
5. Toque em **"Entrar na realidade mista"** e **permita o acesso aos dados do
   espaço** — é assim que o app enxerga a sua sala.

> Se as peças atravessarem móveis ou o chão, refaça a **Configuração do
> espaço** do Quest (Configurações → Ambiente físico → Configuração do espaço).

## 4. Como usar

- **Mãos:** aproxime a mão de uma peça e faça pinça (polegar + indicador) para
  pegar. Abra os dedos para soltar. Soltar em movimento = arremesso.
- **Controles:** segure o botão lateral (grip) perto da peça.
- **Botões do painel:** aponte o raio da mão (ou do controle) e faça pinça (ou
  aperte o gatilho).
- **Reiniciar peças:** tudo volta para a bancada. Peças que caírem num buraco
  ou forem parar muito longe voltam sozinhas.

## 5. Evoluir o app com o Claude Code

O IWSDK foi feito para trabalhar junto com o Claude Code: ele traz instruções,
*skills* e um servidor MCP que deixa o Claude **testar o app num Quest
simulado** (tirar print, mexer as mãos virtuais, conferir a física) antes de te
entregar. Para ligar isso, rode uma vez nesta pasta (depois do `npm install`):

```
npx iwsdk adapter sync
xcopy .agents\skills .claude\skills /E /I
```

- O primeiro comando é o oficial do IWSDK: cria a configuração do Claude Code
  para este projeto (o arquivo `.mcp.json` e as permissões das ferramentas do
  IWSDK em `.claude\settings.json`).
- O segundo copia as *skills* do IWSDK para onde o Claude Code procura.

Depois, abra o **Claude Code nesta pasta** e peça em português, por exemplo:

- "Adicione mais quatro cubos e uma pirâmide na bancada."
- "Faça as bolas quicarem mais."
- "Toque um som quando uma peça bater no chão."
- "Mostre no painel a altura da torre que eu montar."
- "Publique o app no GitHub Pages para eu abrir no Quest sem o PC."

## Onde fica cada coisa

| Arquivo | O que controla |
| --- | --- |
| `iwsdk.config.json` | Configurações gerais: realidade mista, mãos, física, leitura da sala |
| `public/scenes/main.iwsdk.scene.json` | Posição, tamanho e física de cada peça e da bancada |
| `src/scene-assets/pecas.scene-asset.ts` | Formato, tamanho e cor das peças |
| `src/pecas.ts` | Brilho na mão, "Reiniciar peças" e resgate de peças perdidas |
| `src/sala.ts` | Transforma piso, paredes e móveis reais em superfícies sólidas |
| `src/painel.ts` e `public/ui/painel.uikitml` | Painel de instruções e botões |
| `public/fonts/` | Fonte Inter com os acentos do português (licença em `OFL.txt`) |

## Publicar (abrir no Quest sem o PC ligado)

Este projeto já está publicado no GitHub Pages, no repositório
[quest-pegar-objetos](https://github.com/franklinjcampos12-sudo/quest-pegar-objetos):
o GitHub serve a pasta `docs/`. Para atualizar o link depois de mudar o app:

```
npm run publicar
```

Isso gera o site pronto na pasta `docs/`. Depois envie as mudanças para o
repositório (`git add -A`, `git commit -m "..."`, `git push`) — ou peça ao
Claude Code: "publique a nova versão no GitHub". Em 1–2 minutos o link mostra
a versão nova.

Se preferir outra hospedagem, `npm run build` gera o mesmo site na pasta
`dist/`; qualquer serviço com HTTPS serve (Vercel, Netlify...).

## Observações

- O projeto inclui o `@meta-quest/metavr`, ferramenta da Meta que controla o
  Quest pela linha de comando (vem no modelo oficial). Ele envia dados de uso
  para a Meta; para remover: `npm uninstall @meta-quest/metavr`.
- Baseado no modelo inicial do Immersive Web SDK (licença MIT, Meta).
