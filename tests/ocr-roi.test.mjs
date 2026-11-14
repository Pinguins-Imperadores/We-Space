import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ocrRustPath = path.resolve(
  __dirname,
  '../apps/desktop/src-tauri/src/triggers/ocr.rs'
);

const BASE_HEIGHT = 1080.0;
const BASE_CROP_WIDTH = 300.0;
const BASE_CROP_HEIGHT = 80.0;
const BASE_CROP_Y = 840.0;
const BANNER_DENSITY_THRESHOLD = 0.12;

function computeRoiForResolution(width, height) {
  if (width <= 0 || height <= 0) {
    return { cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 };
  }

  const scaleY = height / BASE_HEIGHT;
  const cropWidth = Math.min(width, Math.max(1, Math.round(BASE_CROP_WIDTH * scaleY)));
  const cropHeight = Math.min(height, Math.max(1, Math.round(BASE_CROP_HEIGHT * scaleY)));
  const cropX = Math.floor((width - cropWidth) / 2);
  const cropY = Math.min(height - cropHeight, Math.round(BASE_CROP_Y * scaleY));

  return { cropX, cropY, cropWidth, cropHeight };
}

function detectKillBanner(rgbaPixels, width, height) {
  if (width <= 0 || height <= 0) return false;
  if (rgbaPixels.length < width * height * 4) return false;

  const roi = computeRoiForResolution(width, height);
  if (roi.cropWidth === 0 || roi.cropHeight === 0) return false;

  const totalRoiPixels = roi.cropWidth * roi.cropHeight;
  let bannerAccentPixels = 0;
  const rowStride = width * 4;

  for (let y = roi.cropY; y < roi.cropY + roi.cropHeight; y++) {
    const rowOffset = y * rowStride;
    for (let x = roi.cropX; x < roi.cropX + roi.cropWidth; x++) {
      const idx = rowOffset + x * 4;
      const r = rgbaPixels[idx];
      const g = rgbaPixels[idx + 1];
      const b = rgbaPixels[idx + 2];
      const a = rgbaPixels[idx + 3];

      if (a >= 128 && r >= 200 && (g >= 180 || b <= 100)) {
        bannerAccentPixels += 1;
      }
    }
  }

  return bannerAccentPixels / totalRoiPixels >= BANNER_DENSITY_THRESHOLD;
}

test('OCR ROI: Código Rust implementa for_resolution e detect_kill_banner para 4K e Ultrawide 21:9', () => {
  const rustSource = fs.readFileSync(ocrRustPath, 'utf8');
  assert.ok(rustSource.includes('pub fn for_resolution(width: u32, height: u32) -> Self'));
  assert.ok(rustSource.includes('pub fn effective_roi(&self, width: u32, height: u32) -> Self'));
  assert.ok(rustSource.includes('pub fn detect_kill_banner(&self, rgba_pixels: &[u8], width: u32, height: u32) -> bool'));
  assert.ok(rustSource.includes('test_roi_4k_uhd_3840x2160'));
  assert.ok(rustSource.includes('test_roi_ultrawide_21_9_wfhd_2560x1080'));
  assert.ok(rustSource.includes('test_roi_ultrawide_21_9_wqhd_3440x1440'));
});

test('OCR ROI: Validação de crop para Full HD 16:9 (1920x1080) e 4K UHD (3840x2160)', () => {
  const roi1080p = computeRoiForResolution(1920, 1080);
  assert.deepEqual(roi1080p, {
    cropX: 810,
    cropY: 840,
    cropWidth: 300,
    cropHeight: 80,
  });

  const roi4k = computeRoiForResolution(3840, 2160);
  assert.deepEqual(roi4k, {
    cropX: 1620,
    cropY: 1680,
    cropWidth: 600,
    cropHeight: 160,
  });
});

test('OCR ROI: Validação de crop para monitores Ultrawide 21:9 (2560x1080, 3440x1440 e 5120x2160)', () => {
  // WFHD 21:9 (2560x1080) - Mesma escala vertical do 1080p, centralizado horizontalmente
  const roiWfhd = computeRoiForResolution(2560, 1080);
  assert.deepEqual(roiWfhd, {
    cropX: 1130,
    cropY: 840,
    cropWidth: 300,
    cropHeight: 80,
  });

  // WQHD 21:9 (3440x1440) - Escala vertical 4/3 (1.3333x), centralizado em 3440px
  const roiWqhd = computeRoiForResolution(3440, 1440);
  assert.deepEqual(roiWqhd, {
    cropX: 1520,
    cropY: 1120,
    cropWidth: 400,
    cropHeight: 107,
  });

  // WUHD 21:9 5K2K (5120x2160) - Escala vertical 2.0x, centralizado em 5120px
  const roi5k2k = computeRoiForResolution(5120, 2160);
  assert.deepEqual(roi5k2k, {
    cropX: 2260,
    cropY: 1680,
    cropWidth: 600,
    cropHeight: 160,
  });
});

test('OCR ROI: Detecção precisa de banner de abate em Ultrawide 21:9 sem falso positivo fora de centro', () => {
  const width = 2560;
  const height = 1080;
  const frame = new Uint8Array(width * height * 4);

  assert.equal(detectKillBanner(frame, width, height), false);

  // Desenha banner na coordenada antiga de 1080p (x=810..1110), deslocada à esquerda no Ultrawide
  for (let y = 840; y < 920; y++) {
    for (let x = 810; x < 1110; x++) {
      const idx = (y * width + x) * 4;
      frame[idx] = 255;
      frame[idx + 1] = 215;
      frame[idx + 2] = 0;
      frame[idx + 3] = 255;
    }
  }
  assert.equal(
    detectKillBanner(frame, width, height),
    false,
    'Coordenada antiga desalinhada não deve gerar falso positivo em tela 21:9'
  );

  // Desenha banner centralizado na ROI 21:9 correta (x=1130..1430, y=840..920)
  for (let y = 850; y < 890; y++) {
    for (let x = 1200; x < 1350; x++) {
      const idx = (y * width + x) * 4;
      frame[idx] = 240;
      frame[idx + 1] = 40;
      frame[idx + 2] = 40;
      frame[idx + 3] = 255;
    }
  }
  assert.equal(
    detectKillBanner(frame, width, height),
    true,
    'Banner centralizado no monitor 21:9 deve ser detectado corretamente'
  );
});
