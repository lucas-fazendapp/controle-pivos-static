const ee = require('@google/earthengine');

const ASSET_ID = 'projects/app-lotes-491719/assets/FH';
const DATASET = 'COPERNICUS/S2_SR_HARMONIZED';
const NDVI_VIS = {
  min: 0,
  max: 1,
  palette: ['red', 'yellow', 'green'],
};
const CACHE_TTL_MS = 45 * 60 * 1000;

let initializationPromise;
let memoryCache;

function readServiceAccount() {
  if (process.env.EE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.EE_SERVICE_ACCOUNT_JSON);
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  }

  if (process.env.EE_CLIENT_EMAIL && process.env.EE_PRIVATE_KEY) {
    return {
      client_email: process.env.EE_CLIENT_EMAIL,
      private_key: process.env.EE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  throw new Error('Configure EE_SERVICE_ACCOUNT_JSON ou EE_CLIENT_EMAIL + EE_PRIVATE_KEY na Vercel.');
}

function initializeEarthEngine() {
  if (!initializationPromise) {
    initializationPromise = new Promise((resolve, reject) => {
      const key = readServiceAccount();

      ee.data.authenticateViaPrivateKey(
        key,
        () => {
          ee.initialize(null, null, resolve, reject);
        },
        reject,
      );
    });
  }

  return initializationPromise;
}

function maskSentinel2Clouds(image) {
  const scl = image.select('SCL');
  const validMask = scl
    .neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));

  return image.updateMask(validMask);
}

function evaluate(eeObject) {
  return new Promise((resolve, reject) => {
    eeObject.evaluate((result, error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
}

function getMap(image, visParams) {
  return new Promise((resolve, reject) => {
    let settled = false;

    function finish(map, error) {
      if (settled) return;
      settled = true;

      if (error) {
        reject(error);
        return;
      }

      if (!map) {
        reject(new Error('Earth Engine não retornou dados de tile.'));
        return;
      }

      resolve(map);
    }

    try {
      const maybeMap = image.getMap(visParams, (...args) => {
        const error = args.find((arg) => arg instanceof Error || (arg && arg.message && !arg.mapid && !arg.urlFormat));
        const map = args.find((arg) => arg && (arg.urlFormat || arg.tile_fetcher || arg.mapid));
        finish(map, error);
      });

      if (maybeMap && (maybeMap.urlFormat || maybeMap.tile_fetcher || maybeMap.mapid)) {
        finish(maybeMap);
      }
    } catch (error) {
      finish(null, error);
    }
  });
}

function getTileUrl(map) {
  if (map.urlFormat) return map.urlFormat;
  if (map.tile_fetcher?.url_format) return map.tile_fetcher.url_format;
  if (map.mapid && map.token) return `https://earthengine.googleapis.com/map/${map.mapid}/{z}/{x}/{y}?token=${map.token}`;

  throw new Error('Formato de tile do Earth Engine não reconhecido.');
}

async function getLeafletBounds(geometry) {
  const coordinates = await evaluate(geometry.bounds().coordinates());
  const ring = coordinates?.[0] || [];
  const lngs = ring.map((point) => point[0]);
  const lats = ring.map((point) => point[1]);

  if (!lngs.length || !lats.length) return null;

  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

async function getLatestNdvi({ force = false } = {}) {
  if (!force && memoryCache && Date.now() - memoryCache.cachedAt < CACHE_TTL_MS) {
    const { cachedAt, ...cachedData } = memoryCache;
    return cachedData;
  }

  await initializeEarthEngine();

  const area = ee.FeatureCollection(ASSET_ID);
  const geometry = area.geometry();
  const end = ee.Date(Date.now()).advance(1, 'day');
  const start = end.advance(-90, 'day');
  const collection = ee
    .ImageCollection(DATASET)
    .filterBounds(geometry)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(maskSentinel2Clouds)
    .sort('system:time_start', false);

  const imageCount = await evaluate(collection.size());
  if (!imageCount) {
    throw new Error('Nenhuma imagem Sentinel-2 válida encontrada nos últimos 90 dias.');
  }

  const image = ee.Image(collection.first());
  const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI').clip(geometry);
  const [imageDate, cloudPercentage, meanResult, map, bounds] = await Promise.all([
    evaluate(ee.Date(image.get('system:time_start')).format('YYYY-MM-dd')),
    evaluate(image.get('CLOUDY_PIXEL_PERCENTAGE')),
    evaluate(
      ndvi.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry,
        scale: 10,
        maxPixels: 1e13,
        bestEffort: true,
      }),
    ),
    getMap(ndvi, NDVI_VIS),
    getLeafletBounds(geometry),
  ]);

  const data = {
    tileUrl: getTileUrl(map),
    meanNdvi: Number(meanResult.NDVI),
    imageDate,
    updatedAt: new Date().toISOString(),
    assetId: ASSET_ID,
    cloudPercentage: Number(cloudPercentage),
    status: 'ok',
    bounds,
  };

  memoryCache = {
    ...data,
    cachedAt: Date.now(),
  };

  return data;
}

module.exports = {
  getLatestNdvi,
};
