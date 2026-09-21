const { filterSnapshot, isReadAuthorized, readSnapshot } = require('../_lib/arrobaPlus');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Metodo nao permitido.' });
  }
  if (!isReadAuthorized(request)) return response.status(401).json({ error: 'Acesso nao autorizado.' });

  try {
    const snapshot = await readSnapshot();
    if (!snapshot) return response.status(404).json({ error: 'Ainda nao existe uma coleta do Arroba Plus.' });

    response.setHeader('Cache-Control', 'private, no-store');
    return response.status(200).json(filterSnapshot(snapshot, request.query));
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Erro ao ler os dados do Arroba Plus.' });
  }
};
