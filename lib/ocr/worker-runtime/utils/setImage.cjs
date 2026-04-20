'use strict';

const bmp = require('bmp-js');

module.exports = (TessModule, api, image, angle = 0) => {
  const isBmp = (image[0] === 66 && image[1] === 77) || (image[1] === 66 && image[0] === 77);
  const exif = parseInt(image.slice(0, 500).join(' ').match(/1 18 0 3 0 0 0 1 0 (\d)/)?.[1], 10) || 1;

  if (isBmp) {
    const buf = Buffer.from(Array.from({ ...image, length: Object.keys(image).length }));
    const bmpBuf = bmp.decode(buf);
    TessModule.FS.writeFile('/input', bmp.encode(bmpBuf).data);
  } else {
    TessModule.FS.writeFile('/input', image);
  }

  const res = api.SetImageFile(exif, angle);
  if (res === 1) throw Error('Error attempting to read image.');
};
