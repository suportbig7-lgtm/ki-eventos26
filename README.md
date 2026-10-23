# Kutxi — aplicação web

## Requisitos
- Node.js 20 ou superior (recomendado Node.js 22)
- npm

## Executar localmente
1. Extraia o ZIP e abra esta pasta no VS Code.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e preencha apenas os serviços que realmente utilizar. Não publique `.env.local`.
4. Execute `npm run dev` e abra `http://localhost:3000`.
5. Valide a compilação com `npm run build`.

A aplicação pode abrir sem credenciais Twilio, mas o envio real de WhatsApp ficará desativado até configurar as variáveis no servidor. Nenhum envio real é executado durante o build.

## Publicar no GitHub
Carregue os ficheiros e pastas desta pasta para o repositório, incluindo `api/`, `lib/`, `vercel.json` e `package.json`. Não carregue `node_modules`, `dist`, `.env.local` nem outros ficheiros `.env`.

## Publicar na Vercel
Importe o repositório no painel da Vercel. O projeto usa Vite e gera a pasta `dist`. Configure as variáveis necessárias em Project Settings → Environment Variables. Para Twilio, use `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` (preferível) ou `TWILIO_AUTH_TOKEN`, e `TWILIO_WHATSAPP_FROM`. Depois de alterar variáveis, faça novo deployment.

## Supabase e Gemini
Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para o Supabase, se necessário. Use somente a chave anon/public no frontend, com Row Level Security ativada. Nunca coloque chaves service_role no frontend. Configure `GEMINI_API_KEY` apenas no servidor se alguma funcionalidade de backend precisar dela.

## Segurança
As credenciais anteriormente incluídas no projeto foram removidas desta versão. Se eram reais, revogue-as/rote-as no fornecedor. A remoção do código não invalida uma credencial exposta.
