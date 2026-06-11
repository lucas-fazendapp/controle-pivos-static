const { getLatestNdvi } = require('../_lib/earthEngineNdvi');

module.exports = async function updateNdvi(request, response) {
  try {
    const data = await getLatestNdvi({ force: true });
    response.status(200).json(data);
  } catch (error) {
    response.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
};
