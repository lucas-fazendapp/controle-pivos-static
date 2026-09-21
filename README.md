# Controle ERVA / FazendApp FH

Painel estatico publicado na Vercel para acompanhar irrigacao, gado, rebanho, NDVI e os brincos do Arroba Plus.

## Integracao Arroba Plus

A coleta roda somente no backend. As credenciais nunca devem ser adicionadas ao HTML, ao JavaScript do navegador ou ao repositorio.

Variaveis de ambiente necessarias na Vercel:

- `ARROBAPLUS_EMAIL`: usuario do portal Arroba Plus.
- `ARROBAPLUS_PASSWORD`: senha do portal Arroba Plus.
- `ARROBAPLUS_FARM_ID`: ID da fazenda, opcional quando o usuario possui apenas uma fazenda.
- `ARROBAPLUS_REFRESH_SECRET`: senha usada no botao de atualizacao manual.
- `ARROBAPLUS_READ_SECRET`: senha de acesso aos brincos; se omitida, usa `ARROBAPLUS_REFRESH_SECRET`.
- `CRON_SECRET`: segredo usado pela Vercel para autenticar os agendamentos.

Crie tambem um Vercel Blob privado conectado ao projeto. A Vercel fornece automaticamente `BLOB_STORE_ID` e a autenticacao OIDC; para execucao fora da Vercel, use `BLOB_READ_WRITE_TOKEN`.

O agendamento definido em `vercel.json` atualiza os brincos diariamente as 09:30 UTC. A primeira coleta tambem pode ser iniciada pelo botao `Atualizar Arroba Plus` no painel.

Endpoints:

- `GET /api/arrobaplus/latest`: consulta paginada do ultimo snapshot; exige `x-arrobaplus-secret`.
- `GET|POST /api/arrobaplus/update`: cria um snapshot novo; exige autenticacao do cron ou `x-refresh-secret`.

O campo exibido como brinco e `codeSisboV`, pois `codeEarring` estava vazio na coleta de referencia.

O modulo Brincos possui quatro visoes:

- `Gado Geral`: animais ativos, sexo, peso, busca por SISBOV e faixas etarias calculadas pela data de nascimento.
- `Mortes`: todos os animais inativos registrados como morte.
- `Entradas`: cabecalhos de entrada e quantidade de animais associados a cada registro.
- `Saidas`: registros e animais associados; permanece vazio quando a API informa que nao existem saidas.

Antes da coleta, o backend consulta `RoutineProfile/GetAcessById` e envia o cabecalho `UserPermitions` exigido pelo Arroba Plus para as rotinas de entrada e saida.
