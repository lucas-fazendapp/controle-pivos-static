const { getLatestNdvi } = require('../_lib/earthEngineNdvi');

module.exports = async function latestNdvi(request, response) {
  try {
    const data = await getLatestNdvi();
    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    response.status(200).json(data);
  } catch (error) {
    response.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
};
