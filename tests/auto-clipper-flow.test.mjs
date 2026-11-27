import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('Auto-Clipper Rust: Pipeline executa GStreamer real (splitmuxsink/splitmuxsrc) e flush de clipe', () => {
  const pipelineRs = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src-tauri/src/capture/pipeline.rs'),
    'utf8'
  );
  const libRs = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src-tauri/src/lib.rs'),
    'utf8'
  );

  assert.ok(pipelineRs.includes('system_command("gst-launch-1.0")'));
  assert.ok(pipelineRs.includes('parse_xrandr_monitors'));
  assert.ok(pipelineRs.includes('d3d11screencapturesrc'));
  assert.ok(pipelineRs.includes('splitmuxsink'));
  assert.ok(pipelineRs.includes('splitmuxsrc'));
  assert.ok(pipelineRs.includes('pub fn flush_highlight_clip'));
  assert.ok(libRs.includes('commands::list_monitors'));
  assert.ok(libRs.includes('commands::flush_highlight_clip'));
  assert.ok(libRs.includes('commands::get_capture_details'));
  assert.ok(libRs.includes('commands::update_capture_config'));
});

test('Auto-Clipper Frontend: Configurações na página de perfil, captura rápida e postagem automática no Feed', () => {
  const profileTsx = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/components/PlayerProfileView.tsx'),
    'utf8'
  );
  const contextTsx = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/context/AutoClipperContext.tsx'),
    'utf8'
  );
  const hookTs = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/hooks/useNativeClipper.ts'),
    'utf8'
  );
  const clipCardTsx = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/components/ClipCard.tsx'),
    'utf8'
  );
  const theaterTsx = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/components/ArenaTheaterModal.tsx'),
    'utf8'
  );

  assert.ok(profileTsx.includes("setActiveTab('settings')"));
  assert.ok(profileTsx.includes('Configurações do Auto-Clipper'));
  assert.ok(profileTsx.includes('scheduledStartTime'));
  assert.ok(profileTsx.includes('autoPostToFeed'));

  assert.ok(contextTsx.includes('triggerQuickClipAndPost'));
  assert.ok(contextTsx.includes("videoType: 'video'"));
  assert.ok(contextTsx.includes('onPublishClip(persistedClip)'));

  assert.ok(hookTs.includes('getDisplayMedia'));
  assert.ok(hookTs.includes('MediaRecorder'));
  assert.ok(hookTs.includes("flush_highlight_clip"));

  assert.ok(clipCardTsx.includes('<video'));
  assert.ok(clipCardTsx.includes("clip.videoType === 'video'"));
  assert.ok(theaterTsx.includes('<video'));
});

test('Auto-Clipper Persistência: Vídeos gravados persistem em disco Tauri e IndexedDB após reiniciar', () => {
  const libRs = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src-tauri/src/lib.rs'),
    'utf8'
  );
  const clipStorageTs = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/utils/clipStorage.ts'),
    'utf8'
  );
  const appTsx = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/App.tsx'),
    'utf8'
  );

  assert.ok(libRs.includes('app_data_dir'));
  assert.ok(libRs.includes('commands::save_permanent_clip'));
  assert.ok(libRs.includes('commands::load_clip_data'));
  assert.ok(clipStorageTs.includes('wespace_saved_clips_v1'));
  assert.ok(clipStorageTs.includes('wespace_clips_db'));
  assert.ok(appTsx.includes('loadPersistedClips'));
  assert.ok(appTsx.includes('MonitorSelectModal'));
});

test('Auto-Clipper Multi-Monitor e Indicador REC: Detecção de monitores e bloqueio de getDisplayMedia no Tauri', () => {
  const hookTs = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/hooks/useNativeClipper.ts'),
    'utf8'
  );
  const contextTsx = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/context/AutoClipperContext.tsx'),
    'utf8'
  );
  const navbarTsx = fs.readFileSync(
    path.join(rootDir, 'apps/desktop/src/components/Navbar.tsx'),
    'utf8'
  );

  assert.ok(hookTs.includes('checkIsTauri()'));
  assert.ok(hookTs.includes("invokeTauriCommand<MonitorInfo[]>('list_monitors')"));
  assert.ok(hookTs.includes('selectedMonitorId'));
  assert.ok(contextTsx.includes('isMonitorPromptOpen'));
  assert.ok(contextTsx.includes('confirmMonitorSelection'));
  assert.ok(navbarTsx.includes('REC'));
});
