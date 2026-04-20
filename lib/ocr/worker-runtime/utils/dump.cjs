'use strict';

const arrayBufferToBase64 = require('./arrayBufferToBase64.cjs');
const imageType = require('../constants/imageType.cjs');

const deindent = (html) => {
  const lines = html.split('\n');
  if (lines[0]?.substring(0, 2) === '  ') {
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].substring(0, 2) === '  ') {
        lines[i] = lines[i].slice(2);
      }
    }
  }
  return lines.join('\n');
};

module.exports = (TessModule, api, output, options) => {
  const enumToString = (value, prefix) => (
    Object.keys(TessModule)
      .filter((entry) => (entry.startsWith(`${prefix}_`) && TessModule[entry] === value))
      .map((entry) => entry.slice(prefix.length + 1))[0]
  );

  const getImage = (type) => {
    api.WriteImage(type, '/image.png');
    const pngBuffer = TessModule.FS.readFile('/image.png');
    const pngStr = `data:image/png;base64,${arrayBufferToBase64(pngBuffer.buffer)}`;
    TessModule.FS.unlink('/image.png');
    return pngStr;
  };

  const getPDFInternal = (title, textonly) => {
    const pdfRenderer = new TessModule.TessPDFRenderer('tesseract-ocr', '/', textonly);
    pdfRenderer.BeginDocument(title);
    pdfRenderer.AddImage(api);
    pdfRenderer.EndDocument();
    TessModule._free(pdfRenderer);

    return TessModule.FS.readFile('/tesseract-ocr.pdf');
  };

  return {
    text: output.text ? api.GetUTF8Text() : null,
    hocr: output.hocr ? deindent(api.GetHOCRText()) : null,
    tsv: output.tsv ? api.GetTSVText() : null,
    box: output.box ? api.GetBoxText() : null,
    unlv: output.unlv ? api.GetUNLVText() : null,
    osd: output.osd ? api.GetOsdText() : null,
    pdf: output.pdf ? getPDFInternal(options.pdfTitle ?? 'Tesseract OCR Result', options.pdfTextOnly ?? false) : null,
    imageColor: output.imageColor ? getImage(imageType.COLOR) : null,
    imageGrey: output.imageGrey ? getImage(imageType.GREY) : null,
    imageBinary: output.imageBinary ? getImage(imageType.BINARY) : null,
    confidence: !options.skipRecognition ? api.MeanTextConf() : null,
    blocks: output.blocks && !options.skipRecognition ? JSON.parse(api.GetJSONText()).blocks : null,
    layoutBlocks: output.layoutBlocks && options.skipRecognition ? JSON.parse(api.GetJSONText()).blocks : null,
    psm: enumToString(api.GetPageSegMode(), 'PSM'),
    oem: enumToString(api.oem(), 'OEM'),
    version: api.Version(),
    debug: output.debug ? TessModule.FS.readFile('/debugInternal.txt', { encoding: 'utf8', flags: 'a+' }) : null,
  };
};
