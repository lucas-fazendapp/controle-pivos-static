const { collectSnapshot, isUpdateAuthorized } = require('../_lib/arrobaPlus');

module.exports = async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Metodo nao permitido.' });
  }
  if (!isUpdateAuthorized(request)) return response.status(401).json({ error: 'Atualizacao nao autorizada.' });

  try {
    const snapshot = await collectSnapshot();
    return response.status(200).json({
      status: 'ok',
      collectedAt: snapshot.collectedAt,
      summary: snapshot.summary,
    });
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Erro ao atualizar o Arroba Plus.' });
  }
};
