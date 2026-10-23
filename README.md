# Kutxi — Plataforma SaaS de Convites de Casamento Digitais & Eventos

Kutxi é uma solução SaaS completa e moderna para gestão de casamentos e eventos sociais, oferecendo convites digitais interativos de alta conversão, confirmação de presença (RSVP) em tempo real, credenciais de portaria por QR Code, lista de presentes, álbum colaborativo de fotos e mensageria WhatsApp via Twilio.

---

## 1. Arquitetura da Aplicação

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend / API:** Express 4 rodando como middleware Vite em desenvolvimento e adaptado para Serverless Functions na Vercel (`api/index.ts`).
- **Build & Bundler:** Vite 8.
- **Segurança:** Arquitetura Zero-Leakage — todas as credenciais de serviços externos (Twilio, Supabase, IA) são consumidas estritamente no ambiente do servidor através de `process.env`. Nenhum segredo é enviado ao cliente ou exposto no bundle estático.

---

## 2. Requisitos de Sistema

- **Node.js:** Versão 20.x LTS ou 22.x LTS (mínimo Node.js 18.18+).
- **Gerenciador de Pacotes:** `npm` (versão 9 ou superior) ou `bun` / `pnpm`.
- **Editor Recomendado:** Visual Studio Code com extensões ESLint e Tailwind CSS IntelliSense.
- **Sistema Operacional:** Windows 10/11, macOS ou Linux.

---

## 3. Instalação e Execução Local no Windows (VS Code)

### Passo 1: Clonar ou abrir o projeto no VS Code
Abra o Visual Studio Code e selecione a pasta do projeto Kutxi (`File > Open Folder`). Abra o terminal integrado (`Ctrl + \``).

### Passo 2: Instalar as dependências
Execute no terminal:
```bash
npm install
```

### Passo 3: Configurar as variáveis de ambiente
Copie o arquivo de exemplo para criar seu arquivo `.env` local:
```powershell
# No PowerShell do Windows:
Copy-Item .env.example .env

# Ou no Prompt de Comando (CMD) / Bash:
cp .env.example .env
```

Abra o arquivo `.env` e preencha com suas credenciais reais da Twilio (obtidas no Console da Twilio):
```env
# Twilio WhatsApp Integration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=+14155238886

# Porta local do servidor (padrão: 3000)
PORT=3000
```
> **Aviso de Segurança:** O arquivo `.env` já está listado no `.gitignore` e **nunca** deve ser enviado ao GitHub.

### Passo 4: Iniciar em Modo de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no navegador em: **`http://localhost:3000`**

### Passo 5: Testar e Validar
- Verificação de tipos TypeScript:
  ```bash
  npm run lint
  ```
- Gerar compilação de produção:
  ```bash
  npm run build
  ```
- Testar o build de produção localmente:
  ```bash
  npm start
  ```

---

## 4. Publicação na Vercel (Sem Erro 404)

### Por que ocorria o erro 404 anteriormente?
1. O projeto é uma Single Page Application (SPA) com rotas dinâmicas e endpoints de backend Express (`/api/*`). Sem um arquivo `vercel.json` declarando o diretório de saída (`dist`) e os redirecionamentos de SPA (`/(.*) -> /index.html`), a Vercel não conseguia rotear as páginas e devolvia HTTP 404.
2. A Vercel opera sobre funções Serverless e não executa processos `start` contínuos. O endpoint `/api/index.ts` foi configurado especificamente para processar as chamadas à API da Twilio como função Serverless nativa da Vercel.

### Configuração incluída (`vercel.json`)
O arquivo `vercel.json` já está configurado na raiz com a estrutura oficial:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Passos para publicar na Vercel:
1. Conecte seu repositório GitHub ao painel da Vercel (`New Project > Import Git Repository`).
2. Mantenha o **Framework Preset** como **Vite** (detectado automaticamente pelo `vercel.json`).
3. Nas configurações do projeto na Vercel (**Settings > Environment Variables**), adicione:
   - `TWILIO_ACCOUNT_SID` = Seu Account SID da Twilio
   - `TWILIO_AUTH_TOKEN` = Seu Auth Token da Twilio
   - `TWILIO_WHATSAPP_FROM` = Seu número remetente (ex: `+14155238886` ou número aprovado)
   - `VITE_SUPABASE_URL` = (Opcional, se utilizar nuvem Supabase)
   - `VITE_SUPABASE_ANON_KEY` = (Opcional, se utilizar nuvem Supabase)
4. Clique em **Deploy**. A página inicial será carregada na raiz `/` e os endpoints `/api/twilio/*` responderão normalmente sem erro 404.

---

## 5. Instruções para Carregamento Seguro no GitHub

Para que o GitHub Secret Scanner não bloqueie o seu envio:

1. **Confirmação de Arquivos Ignorados:**
   Verifique se o seu `.env` está de fato ignorado antes de adicionar arquivos:
   ```bash
   git status
   ```
   Certifique-se de que o `.env` **não** aparece na lista de arquivos rastreados (`Untracked files`). Apenas `.env.example` deve aparecer.

2. **Revogação de Credenciais Expostas Anteriormente:**
   Se credenciais da Twilio foram enviadas em commits anteriores para o repositório remoto, elas devem ser **revogadas e substituídas** diretamente no Console da Twilio pelo administrador da conta. A proteção do Git local não apaga o histórico de commits já enviados no passado.

3. **Comandos para Envio Manual:**
   ```bash
   git add .
   git commit -m "feat: seguranca de credenciais twilio, configuracao vercel e rotas api"
   git push origin main
   ```

---

## 6. Solução de Problemas Comuns (Troubleshooting)

| Sintoma / Erro | Causa Provável | Solução |
| :--- | :--- | :--- |
| **Página 404 na Vercel** | Falta do arquivo `vercel.json` ou Output Directory incorreto. | O arquivo `vercel.json` agora força `outputDirectory: "dist"` e rewrites para `/index.html`. |
| **Erro "Credenciais da Twilio não configuradas"** | Variáveis `TWILIO_ACCOUNT_SID` ou `TWILIO_AUTH_TOKEN` ausentes no `.env` ou na Vercel. | Defina as variáveis no arquivo `.env` local ou no painel Environment Variables da Vercel. |
| **Sandbox Twilio erro 63015** | O número destinatário ainda não realizou o opt-in no Sandbox. | O convidado ou testador deve enviar a mensagem de adesão da Twilio (ex: `join <code>`) para o número do Sandbox antes do primeiro disparo. |
| **Porta 3000 ocupada no Windows** | Outro processo local está usando a porta 3000. | Finalize o processo ou altere a porta no `.env` (`PORT=3001`). |
