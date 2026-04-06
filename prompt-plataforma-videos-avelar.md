# Prompt — Plataforma de Gestão de Vídeos (Editor ↔ Dono do Canal)

## Contexto

Preciso de uma aplicação web (React, single-file JSX com Tailwind) que funcione como uma plataforma de gestão de vídeos entre um **editor de vídeo** e o **dono de um canal no YouTube**.

O fluxo é: o dono do canal sobe briefings de vídeos para edição, o editor edita e entrega na plataforma, e o dono aprova ou solicita ajustes. Além disso, a plataforma gerencia ideias de vídeos e testes A/B de thumbnails.

**Não há sistema de login/cadastro.** O acesso é diferenciado por duas rotas/modos distintos:
- **Modo Editor** (acessado por um link/botão)
- **Modo Dono do Canal** (acessado por outro link/botão)

Toda a persistência de dados deve usar a **Storage API** (`window.storage`).

---

## Estrutura da Aplicação

### Tela Inicial
Uma tela simples com dois botões de acesso:
- "Entrar como Editor"
- "Entrar como Dono do Canal"

Cada botão leva ao respectivo dashboard com funcionalidades diferentes.

---

## Funcionalidades por Modo

### 🎬 MODO DONO DO CANAL

#### 1. Dashboard
- Visão geral dos vídeos em andamento (status: enviado, em edição, entregue, em revisão, aprovado)
- Contadores rápidos por status
- Últimas atividades/notificações

#### 2. Novo Briefing de Vídeo (formulário)
O dono preenche:
- **Título do vídeo**
- **Link do vídeo bruto no Google Drive**
- **3 opções de texto para thumbnail** (para teste A/B — campos de texto separados: Opção A, Opção B, Opção C)
- **Descrição / briefing do vídeo** (textarea — o que espera da edição)
- **Quantidade de inserções desejada** (select: Poucas / Moderadas / Muitas / A critério do editor)
- **Observações adicionais** (textarea opcional)
- Data de envio automática

#### 3. Revisão de Entregas
- Lista de vídeos entregues pelo editor
- Para cada entrega, o dono pode:
  - **Assistir o vídeo** (link do Drive enviado pelo editor)
  - **Ver as thumbnails** enviadas pelo editor (imagens hospedadas ou links)
  - **Aprovar o vídeo** ✅
  - **Solicitar ajustes** com campo de observações/feedback ✍️
- Histórico de feedbacks por vídeo

#### 4. Banco de Ideias de Vídeos
- Criar nova ideia com: título, descrição breve, prioridade (Alta / Média / Baixa), status (Ideia / Aprovada / Em produção / Descartada)
- Lista de ideias com filtro por status e prioridade
- Editar ou excluir ideias

#### 5. Histórico
- Lista completa de todos os vídeos com todos os status e datas
- Filtro por status, mês, busca por título

---

### ✂️ MODO EDITOR

#### 1. Dashboard
- Vídeos pendentes (briefings recebidos que ainda não foram entregues)
- Vídeos em revisão (aguardando aprovação ou com ajustes solicitados)
- Vídeos aprovados recentemente
- Contadores rápidos

#### 2. Fila de Edição
- Lista de todos os briefings enviados pelo dono do canal
- Cada card mostra: título, data de envio, link do drive, nível de inserções, status
- Ao clicar, abre os detalhes completos do briefing

#### 3. Entregar Vídeo (formulário por vídeo)
Para cada briefing, o editor pode:
- **Link do vídeo editado no Google Drive**
- **Upload/link das thumbnails** (até 3 imagens, correspondendo às opções A, B, C do briefing)
- **Observações do editor** (textarea opcional)
- Marcar como "Entregue"

#### 4. Gestão de Testes A/B de Thumbnails
Esta aba é para gerenciar testes A/B **pós-publicação**, independente do fluxo de edição:
- **Criar novo teste A/B**: selecionar vídeo (do histórico), descrever o teste, upload/link de 2 novas thumbnails que vão disputar com a atual
- Campos do teste:
  - Vídeo vinculado (select do histórico)
  - Thumbnail atual (referência / link)
  - Nova Thumb Opção 1 (link)
  - Nova Thumb Opção 2 (link)
  - Data de início do teste
  - Status: Ativo / Encerrado
  - Resultado/vencedora (preenchido ao encerrar)
- Lista de todos os testes com filtros (ativos / encerrados)
- Histórico de testes por vídeo

#### 5. Banco de Ideias (visualização)
- Mesma lista de ideias do dono do canal (dados compartilhados via `shared: true`)
- Editor pode **adicionar ideias** também
- Editor pode comentar nas ideias existentes

#### 6. Histórico
- Mesmo histórico geral, com visão de todas as entregas e aprovações

---

## Modelo de Dados (Storage API)

Usar chaves hierárquicas com `window.storage`. Dados compartilhados entre editor e dono usam `shared: true`.

```
videos:{id}          → shared: true  → { id, titulo, linkDrive, textoThumbA, textoThumbB, textoThumbC, descricao, insercoes, observacoes, status, dataEnvio, entrega: { linkEditado, thumbs: [], obsEditor, dataEntrega }, revisoes: [{ feedback, data, tipo }] }

ideias:{id}          → shared: true  → { id, titulo, descricao, prioridade, status, criadoPor, dataCriacao, comentarios: [] }

testes-ab:{id}       → shared: true  → { id, videoId, thumbAtual, novaThumb1, novaThumb2, dataInicio, status, resultado, dataEncerramento }
```

Consolidar dados relacionados em chaves únicas para minimizar chamadas à API.

---

## Regras de Negócio

1. **Fluxo de status do vídeo**: `Enviado` → `Em Edição` → `Entregue` → `Em Revisão` → `Aprovado` (ou volta para `Em Edição` se ajustes forem solicitados)
2. Quando o editor marca como "Entregue", o status muda automaticamente para "Entregue"
3. Quando o dono abre a revisão, o status muda para "Em Revisão"
4. Aprovação é irreversível
5. Cada feedback de revisão fica salvo no histórico do vídeo
6. Testes A/B são independentes do fluxo de edição — são gerenciados apenas pelo editor
7. Ideias são compartilhadas entre ambos os modos

---

## Design e UX

- **Tema escuro** como base, com acentos em cores vibrantes (sugestão: azul elétrico ou verde neon como cor de destaque)
- Sidebar de navegação lateral com ícones + labels
- Cards com status coloridos e badges visuais
- Indicadores visuais claros de quem precisa agir (editor ou dono)
- Design responsivo (funcionar bem no celular)
- Transições suaves entre telas
- Empty states amigáveis com ilustrações ou ícones
- Tipografia moderna e legível
- Componentes: Tabs, Modais, Toasts de confirmação, Badges de status

---

## Requisitos Técnicos

- React JSX single-file com Tailwind CSS
- Persistência via `window.storage` (get, set, delete, list)
- Dados compartilhados entre modos usando `shared: true`
- Sem autenticação — apenas seleção de modo na tela inicial
- Sem dependências externas além das disponíveis (React, Tailwind, lucide-react)
- Tratar loading states e erros da Storage API
- IDs gerados com `Date.now().toString(36) + Math.random().toString(36).substr(2)`
