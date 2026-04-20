'use strict';

const isURL = require('is-url');
const dump = require('./utils/dump.cjs');
const env = require('./utils/getEnvironment.cjs')('type');
const setImage = require('./utils/setImage.cjs');
const defaultOutput = require('./constants/defaultOutput.cjs');
const { log, setLogging } = require('./utils/log.cjs');
const PSM = require('./constants/PSM.cjs');

let TessModule;
let api = null;
let latestJob;
let adapter = {};
let params = {};
let loadLanguageLangsWorker;
let loadLanguageOptionsWorker;
let dataFromCache = false;

const load = async ({ workerId, jobId, payload: { options: { lstmOnly, corePath, logging } } }, res) => {
  setLogging(logging);

  const statusText = 'initializing tesseract';

  if (!TessModule) {
    const Core = await adapter.getCore(lstmOnly, corePath, res);

    res.progress({ workerId, status: statusText, progress: 0 });

    Core({
      TesseractProgress(percent) {
        latestJob.progress({
          workerId,
          jobId,
          status: 'recognizing text',
          progress: Math.max(0, (percent - 30) / 70),
        });
      },
    }).then((tessModule) => {
      TessModule = tessModule;
      res.progress({ workerId, status: statusText, progress: 1 });
      res.resolve({ loaded: true });
    });
  } else {
    res.resolve({ loaded: true });
  }
};

const FS = async ({ workerId, payload: { method, args } }, res) => {
  log(`[${workerId}]: FS.${method}`);
  res.resolve(TessModule.FS[method](...args));
};

const loadLanguage = async ({
  workerId,
  payload: {
    langs,
    options: {
      langPath,
      dataPath,
      cachePath,
      cacheMethod,
      gzip = true,
      lstmOnly,
    },
  },
}, res) => {
  loadLanguageLangsWorker = langs;
  loadLanguageOptionsWorker = {
    langPath,
    dataPath,
    cachePath,
    cacheMethod,
    gzip,
    lstmOnly,
  };

  const statusText = 'loading language traineddata';
  const langsArr = typeof langs === 'string' ? langs.split('+') : langs;
  let progress = 0;

  const loadAndGunzipFile = async (_lang) => {
    const lang = typeof _lang === 'string' ? _lang : _lang.code;
    const readCache = ['refresh', 'none'].includes(cacheMethod)
      ? () => Promise.resolve()
      : adapter.readCache;
    let data = null;
    let newData = false;

    try {
      const cachedData = await readCache(`${cachePath || '.'}/${lang}.traineddata`);
      if (typeof cachedData !== 'undefined') {
        log(`[${workerId}]: Load ${lang}.traineddata from cache`);
        data = cachedData;
        dataFromCache = true;
      } else {
        throw Error('Not found in cache');
      }
    } catch {
      newData = true;
      log(`[${workerId}]: Load ${lang}.traineddata from ${langPath}`);
      if (typeof _lang === 'string') {
        let filePath = null;
        const langPathDownload = langPath || (lstmOnly
          ? `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int`
          : `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0`);

        if (
          env !== 'node' ||
          isURL(langPathDownload) ||
          langPathDownload.startsWith('moz-extension://') ||
          langPathDownload.startsWith('chrome-extension://') ||
          langPathDownload.startsWith('file://')
        ) {
          filePath = langPathDownload.replace(/\/$/, '');
        }

        if (filePath !== null) {
          const fetchUrl = `${filePath}/${lang}.traineddata${gzip ? '.gz' : ''}`;
          const resp = await (env === 'webworker' ? fetch : adapter.fetch)(fetchUrl);
          if (!resp.ok) {
            throw Error(`Network error while fetching ${fetchUrl}. Response code: ${resp.status}`);
          }
          data = new Uint8Array(await resp.arrayBuffer());
        } else {
          data = await adapter.readCache(`${langPathDownload}/${lang}.traineddata${gzip ? '.gz' : ''}`);
        }
      } else {
        data = _lang.data;
      }
    }

    progress += 0.5 / langsArr.length;
    if (res) res.progress({ workerId, status: statusText, progress });

    const isGzip = (data[0] === 31 && data[1] === 139) || (data[1] === 31 && data[0] === 139);

    if (isGzip) {
      data = adapter.gunzip(data);
    }

    if (TessModule) {
      if (dataPath) {
        try {
          TessModule.FS.mkdir(dataPath);
        } catch (err) {
          if (res) res.reject(err.toString());
        }
      }
      TessModule.FS.writeFile(`${dataPath || '.'}/${lang}.traineddata`, data);
    }

    if (newData && ['write', 'refresh', undefined].includes(cacheMethod)) {
      try {
        await adapter.writeCache(`${cachePath || '.'}/${lang}.traineddata`, data);
      } catch (err) {
        log(`[${workerId}]: Failed to write ${lang}.traineddata to cache due to error:`);
        log(err.toString());
      }
    }

    progress += 0.5 / langsArr.length;
    if (Math.round(progress * 100) === 100) progress = 1;
    if (res) res.progress({ workerId, status: statusText, progress });
  };

  if (res) res.progress({ workerId, status: statusText, progress: 0 });
  try {
    await Promise.all(langsArr.map(loadAndGunzipFile));
    if (res) res.resolve(langs);
  } catch (err) {
    if (res) res.reject(err.toString());
  }
};

const setParameters = async ({ payload: { params: inputParams } }, res) => {
  const initParamNames = ['ambigs_debug_level', 'user_words_suffix', 'user_patterns_suffix', 'user_patterns_suffix',
    'load_system_dawg', 'load_freq_dawg', 'load_unambig_dawg', 'load_punc_dawg', 'load_number_dawg', 'load_bigram_dawg',
    'tessedit_ocr_engine_mode', 'tessedit_init_config_only', 'language_model_ngram_on', 'language_model_use_sigmoidal_certainty'];

  const initParamStr = Object.keys(inputParams)
    .filter((key) => initParamNames.includes(key))
    .join(', ');

  if (initParamStr.length > 0) {
    console.log(`Attempted to set parameters that can only be set during initialization: ${initParamStr}`);
  }

  Object.keys(inputParams)
    .filter((key) => !key.startsWith('tessjs_'))
    .forEach((key) => {
      api.SetVariable(key, inputParams[key]);
    });
  params = { ...params, ...inputParams };

  if (typeof res !== 'undefined') {
    res.resolve(params);
  }
};

const initialize = async ({ workerId, payload: { langs: inputLangs, oem, config } }, res) => {
  const langs = (typeof inputLangs === 'string')
    ? inputLangs
    : inputLangs.map((lang) => ((typeof lang === 'string') ? lang : lang.data)).join('+');

  const statusText = 'initializing api';

  try {
    res.progress({ workerId, status: statusText, progress: 0 });
    if (api !== null) {
      api.End();
    }
    let configFile;
    let configStr;
    if (config && typeof config === 'object' && Object.keys(config).length > 0) {
      configStr = JSON.stringify(config).replace(/,/g, '\n').replace(/:/g, ' ').replace(/["'{}]/g, '');
    } else if (config && typeof config === 'string') {
      configStr = config;
    }
    if (typeof configStr === 'string') {
      configFile = '/config';
      TessModule.FS.writeFile(configFile, configStr);
    }

    api = new TessModule.TessBaseAPI();
    let status = api.Init(null, langs, oem, configFile);
    if (status === -1) {
      if (['write', 'refresh', undefined].includes(loadLanguageOptionsWorker.cacheMethod)) {
        const langsArr = langs.split('+');
        const deleteCachePromise = langsArr.map((lang) => adapter.deleteCache(`${loadLanguageOptionsWorker.cachePath || '.'}/${lang}.traineddata`));
        await Promise.all(deleteCachePromise);

        const debugStr = TessModule.FS.readFile('/debugDev.txt', { encoding: 'utf8', flags: 'a+' });
        if (dataFromCache && /components are not present/.test(debugStr)) {
          log('Data from cache missing requested OEM model. Attempting to refresh cache with new language data.');
          await loadLanguage({ workerId, payload: { langs: loadLanguageLangsWorker, options: loadLanguageOptionsWorker } });
          status = api.Init(null, langs, oem, configFile);
          if (status === -1) {
            log('Language data refresh failed.');
            const deleteCachePromise2 = langsArr.map((lang) => adapter.deleteCache(`${loadLanguageOptionsWorker.cachePath || '.'}/${lang}.traineddata`));
            await Promise.all(deleteCachePromise2);
          } else {
            log('Language data refresh successful.');
          }
        }
      }
    }

    if (status === -1) {
      res.reject('initialization failed');
    }

    res.progress({ workerId, status: statusText, progress: 1 });
    res.resolve();
  } catch (err) {
    res.reject(err.toString());
  }
};

const processOutput = (output) => {
  const workingOutput = JSON.parse(JSON.stringify(defaultOutput));
  const nonRecOutputs = ['imageColor', 'imageGrey', 'imageBinary', 'layoutBlocks', 'debug'];
  let recOutputCount = 0;

  for (const prop of Object.keys(output)) {
    workingOutput[prop] = output[prop];
  }
  for (const prop of Object.keys(workingOutput)) {
    if (workingOutput[prop] && !nonRecOutputs.includes(prop)) {
      recOutputCount += 1;
    }
  }

  return { workingOutput, skipRecognition: recOutputCount === 0 };
};

const tessjsOptions = ['rectangle', 'pdfTitle', 'pdfTextOnly', 'rotateAuto', 'rotateRadians'];

const recognize = async ({ payload: { image, options, output } }, res) => {
  try {
    const optionsTess = {};
    if (typeof options === 'object' && Object.keys(options).length > 0) {
      for (const param of Object.keys(options)) {
        if (!param.startsWith('tessjs_') && !tessjsOptions.includes(param)) {
          optionsTess[param] = options[param];
        }
      }
    }
    if (output.debug) {
      optionsTess.debug_file = '/debugInternal.txt';
      TessModule.FS.writeFile('/debugInternal.txt', '');
    }
    if (Object.keys(optionsTess).length > 0) {
      api.SaveParameters();
      for (const prop of Object.keys(optionsTess)) {
        api.SetVariable(prop, optionsTess[prop]);
      }
    }

    const { workingOutput, skipRecognition } = processOutput(output);

    let rotateRadiansFinal;
    if (options.rotateAuto) {
      const psmInit = api.GetPageSegMode();
      let psmEdit = false;
      if (![PSM.AUTO, PSM.AUTO_ONLY, PSM.OSD_ONLY].includes(String(psmInit))) {
        psmEdit = true;
        api.SetVariable('tessedit_pageseg_mode', String(PSM.AUTO));
      }

      setImage(TessModule, api, image);
      api.FindLines();

      const rotateRadiansCalc = api.GetGradient ? api.GetGradient() : api.GetAngle();

      if (psmEdit) {
        api.SetVariable('tessedit_pageseg_mode', String(psmInit));
      }

      if (Math.abs(rotateRadiansCalc) >= 0.005) {
        rotateRadiansFinal = rotateRadiansCalc;
        setImage(TessModule, api, image, rotateRadiansFinal);
      } else {
        if (psmEdit) {
          setImage(TessModule, api, image);
        }
        rotateRadiansFinal = 0;
      }
    } else {
      rotateRadiansFinal = options.rotateRadians || 0;
      setImage(TessModule, api, image, rotateRadiansFinal);
    }

    const rect = options.rectangle;
    if (typeof rect === 'object') {
      api.SetRectangle(rect.left, rect.top, rect.width, rect.height);
    }

    if (!skipRecognition) {
      api.Recognize(null);
    } else {
      if (output.layoutBlocks) {
        api.AnalyseLayout();
      }
      log('Skipping recognition: all output options requiring recognition are disabled.');
    }

    const result = dump(TessModule, api, workingOutput, {
      pdfTitle: options.pdfTitle,
      pdfTextOnly: options.pdfTextOnly,
      skipRecognition,
    });
    result.rotateRadians = rotateRadiansFinal;

    if (output.debug) TessModule.FS.unlink('/debugInternal.txt');
    if (Object.keys(optionsTess).length > 0) {
      api.RestoreParameters();
    }

    res.resolve(result);
  } catch (err) {
    res.reject(err.toString());
  }
};

const detect = async ({ payload: { image } }, res) => {
  try {
    setImage(TessModule, api, image);
    const results = new TessModule.OSResults();

    if (!api.DetectOS(results)) {
      res.resolve({
        tesseract_script_id: null,
        script: null,
        script_confidence: null,
        orientation_degrees: null,
        orientation_confidence: null,
      });
    } else {
      const best = results.best_result;
      const oid = best.orientation_id;
      const sid = best.script_id;

      res.resolve({
        tesseract_script_id: sid,
        script: results.unicharset.get_script_from_script_id(sid),
        script_confidence: best.sconfidence,
        orientation_degrees: [0, 270, 180, 90][oid],
        orientation_confidence: best.oconfidence,
      });
    }
  } catch (err) {
    res.reject(err.toString());
  }
};

const terminate = async (_, res) => {
  try {
    if (api !== null) {
      api.End();
    }
    res.resolve({ terminated: true });
  } catch (err) {
    res.reject(err.toString());
  }
};

exports.dispatchHandlers = (packet, send) => {
  const res = (status, data) => {
    const packetRes = {
      jobId: packet.jobId,
      workerId: packet.workerId,
      action: packet.action,
    };
    send({
      ...packetRes,
      status,
      data,
    });
  };
  res.resolve = res.bind(this, 'resolve');
  res.reject = res.bind(this, 'reject');
  res.progress = res.bind(this, 'progress');

  latestJob = res;

  ({
    load,
    FS,
    loadLanguage,
    initialize,
    setParameters,
    recognize,
    detect,
    terminate,
  })[packet.action](packet, res)
    .catch((err) => res.reject(err.toString()));
};

exports.setAdapter = (_adapter) => {
  adapter = _adapter;
};
