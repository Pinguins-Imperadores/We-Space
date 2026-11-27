use super::ring_buffer::{EncodedGop, GopRingBuffer};
use crate::security::ClipIntegrity;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tracing::{info, warn};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HardwareEncoder {
    NvidiaNvenc,
    AmdAmf,
    IntelQsv,
    SoftwareFallback,
}

impl HardwareEncoder {
    pub fn label(&self) -> &'static str {
        match self {
            HardwareEncoder::NvidiaNvenc => "NVIDIA NVENC (Direct3D11 / H.264)",
            HardwareEncoder::AmdAmf => "AMD AMF (Direct3D11 / H.264)",
            HardwareEncoder::IntelQsv => "Intel QuickSync (QSV / H.264)",
            HardwareEncoder::SoftwareFallback => "GStreamer Software (x264 / VP8)",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MonitorInfo {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub is_primary: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureEngineConfig {
    pub target_fps: u32,
    pub width: u32,
    pub height: u32,
    pub bitrate_kbps: u32,
    pub ring_buffer_seconds: usize,
    pub selected_monitor_id: Option<String>,
}

impl Default for CaptureEngineConfig {
    fn default() -> Self {
        Self {
            target_fps: 60,
            width: 1920,
            height: 1080,
            bitrate_kbps: 12000,
            ring_buffer_seconds: 45,
            selected_monitor_id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureStatusPayload {
    pub is_active: bool,
    pub gstreamer_available: bool,
    pub encoder: String,
    pub capture_source: String,
    pub active_monitor: String,
    pub container_format: String,
    pub ring_buffer_seconds: usize,
    pub buffered_seconds: usize,
    pub memory_usage_mb: f64,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlushedClipResult {
    pub file_path: String,
    pub mime_type: String,
    pub sha256: String,
    pub duration_seconds: usize,
    pub size_bytes: usize,
    pub encoder: String,
    pub data_base64: String,
}

pub struct NativeCapturePipeline {
    config: CaptureEngineConfig,
    ring_buffer: GopRingBuffer,
    is_running: Arc<AtomicBool>,
    child_process: Option<Child>,
    buffer_dir: PathBuf,
    clips_dir: PathBuf,
    container_ext: &'static str,
    capture_source_label: String,
    active_monitor_label: String,
    encoder: HardwareEncoder,
    last_error: Option<String>,
    gstreamer_available: bool,
    next_gop_index: u64,
}

impl NativeCapturePipeline {
    pub fn new(config: CaptureEngineConfig) -> Self {
        let ring_buffer = GopRingBuffer::new(config.ring_buffer_seconds);
        let base_tmp = std::env::temp_dir().join("wespace_capture");
        let buffer_dir = base_tmp.join("ring_buffer");
        let clips_dir = base_tmp.join("clips");

        let gstreamer_available = Self::is_gstreamer_installed();
        let encoder = Self::detect_hardware_encoder();
        let initial_source = if gstreamer_available {
            if cfg!(target_os = "windows") {
                "Pronto (Windows Direct3D11 / GStreamer)"
            } else {
                "Pronto (Linux X11 / PipeWire GStreamer)"
            }
        } else {
            "GStreamer não encontrado (Fallback WebView)"
        };

        let monitors = Self::list_monitors();
        let active_monitor_label =
            Self::resolve_monitor(&monitors, config.selected_monitor_id.as_deref())
                .map(|m| format!("{} ({}x{})", m.name, m.width, m.height))
                .unwrap_or_else(|| "Tela Principal".into());

        Self {
            config,
            ring_buffer,
            is_running: Arc::new(AtomicBool::new(false)),
            child_process: None,
            buffer_dir,
            clips_dir,
            container_ext: "webm",
            capture_source_label: initial_source.into(),
            active_monitor_label,
            encoder,
            last_error: None,
            gstreamer_available,
            next_gop_index: 0,
        }
    }

    fn system_command(program: &str) -> Command {
        let mut cmd = Command::new(program);
        let in_appimage = std::env::var_os("APPIMAGE").is_some()
            || std::env::var_os("APPDIR").is_some()
            || std::env::var("LD_LIBRARY_PATH")
                .map(|v| v.contains(".mount_") || v.contains("AppDir"))
                .unwrap_or(false);
        if in_appimage {
            for var in [
                "LD_LIBRARY_PATH",
                "GST_PLUGIN_PATH",
                "GST_PLUGIN_PATH_1_0",
                "GST_PLUGIN_SYSTEM_PATH",
                "GST_PLUGIN_SYSTEM_PATH_1_0",
                "GST_PLUGIN_SCANNER",
                "GST_PLUGIN_SCANNER_1_0",
                "GST_REGISTRY",
                "GST_REGISTRY_1_0",
                "GIO_MODULE_DIR",
                "GI_TYPELIB_PATH",
                "GSETTINGS_SCHEMA_DIR",
                "GTK_PATH",
                "GTK_EXE_PREFIX",
                "GTK_IM_MODULE_FILE",
                "GDK_PIXBUF_MODULE_FILE",
                "QT_PLUGIN_PATH",
                "PYTHONPATH",
            ] {
                cmd.env_remove(var);
            }
        }
        cmd
    }

    pub fn parse_xrandr_monitors(output: &str) -> Vec<MonitorInfo> {
        let mut monitors = Vec::new();
        for line in output.lines() {
            let trimmed = line.trim();
            // Format: "0: +*eDP-1 1920/344x1080/194+0+75  eDP-1"
            let Some(colon_idx) = trimmed.find(':') else {
                continue;
            };
            if trimmed[..colon_idx].parse::<usize>().is_err() {
                continue;
            }
            let parts: Vec<&str> = trimmed[colon_idx + 1..].split_whitespace().collect();
            if parts.len() < 2 {
                continue;
            }
            let raw_name = parts[0];
            let is_primary = raw_name.contains('*');
            let clean_name = raw_name.trim_start_matches('+').trim_start_matches('*');
            let geom = parts[1];

            // Parse "<w>/<mm>x<h>/<mm>+<x>+<y>" or "<w>x<h>+<x>+<y>"
            let plus_parts: Vec<&str> = geom.split('+').collect();
            if plus_parts.len() < 3 {
                continue;
            }
            let x: i32 = plus_parts[1].parse().unwrap_or(0);
            let y: i32 = plus_parts[2].parse().unwrap_or(0);
            let wh_parts: Vec<&str> = plus_parts[0].split('x').collect();
            if wh_parts.len() != 2 {
                continue;
            }
            let width: u32 = wh_parts[0]
                .split('/')
                .next()
                .and_then(|s| s.parse().ok())
                .unwrap_or(1920);
            let height: u32 = wh_parts[1]
                .split('/')
                .next()
                .and_then(|s| s.parse().ok())
                .unwrap_or(1080);

            monitors.push(MonitorInfo {
                id: clean_name.to_string(),
                name: clean_name.to_string(),
                width,
                height,
                x,
                y,
                is_primary,
            });
        }
        monitors
    }

    pub fn parse_windows_monitors(output: &str) -> Vec<MonitorInfo> {
        let mut monitors = Vec::new();
        for line in output.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            // Format: "<index>|<True|False>|<width>|<height>|<x>|<y>|<device_name>"
            let cols: Vec<&str> = trimmed.split('|').collect();
            if cols.len() < 6 {
                continue;
            }
            let Ok(idx) = cols[0].trim().parse::<usize>() else {
                continue;
            };
            let is_primary = cols[1].trim().eq_ignore_ascii_case("true");
            let width: u32 = cols[2].trim().parse().unwrap_or(1920);
            let height: u32 = cols[3].trim().parse().unwrap_or(1080);
            let x: i32 = cols[4].trim().parse().unwrap_or(0);
            let y: i32 = cols[5].trim().parse().unwrap_or(0);
            let device = cols
                .get(6)
                .map(|s| s.trim().trim_start_matches("\\\\.\\"))
                .filter(|s| !s.is_empty())
                .map(|s| format!("Monitor {} ({})", idx + 1, s))
                .unwrap_or_else(|| format!("Monitor {}", idx + 1));

            monitors.push(MonitorInfo {
                id: idx.to_string(),
                name: device,
                width,
                height,
                x,
                y,
                is_primary,
            });
        }
        monitors
    }

    pub fn list_monitors() -> Vec<MonitorInfo> {
        #[cfg(target_os = "windows")]
        {
            let ps_cmd = "Add-Type -AssemblyName System.Windows.Forms; $i=0; foreach ($s in [System.Windows.Forms.Screen]::AllScreens) { Write-Output \"$i|$($s.Primary)|$($s.Bounds.Width)|$($s.Bounds.Height)|$($s.Bounds.X)|$($s.Bounds.Y)|$($s.DeviceName)\"; $i++ }";
            if let Ok(out) = Self::system_command("powershell")
                .args(["-NoProfile", "-Command", ps_cmd])
                .output()
            {
                if out.status.success() {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    let parsed = Self::parse_windows_monitors(&stdout);
                    if !parsed.is_empty() {
                        return parsed;
                    }
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(out) = Self::system_command("xrandr")
                .arg("--listmonitors")
                .output()
            {
                if out.status.success() {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    let parsed = Self::parse_xrandr_monitors(&stdout);
                    if !parsed.is_empty() {
                        return parsed;
                    }
                }
            }
        }
        vec![MonitorInfo {
            id: "0".into(),
            name: "Monitor Principal".into(),
            width: 1920,
            height: 1080,
            x: 0,
            y: 0,
            is_primary: true,
        }]
    }

    fn resolve_monitor<'a>(
        monitors: &'a [MonitorInfo],
        selected_id: Option<&str>,
    ) -> Option<&'a MonitorInfo> {
        if let Some(id) = selected_id {
            if id == "all" {
                return None;
            }
            if id != "primary" {
                if let Some(m) = monitors.iter().find(|m| m.id == id) {
                    return Some(m);
                }
            }
        }
        monitors
            .iter()
            .find(|m| m.is_primary)
            .or_else(|| monitors.first())
    }

    pub fn is_gstreamer_installed() -> bool {
        Self::system_command("gst-launch-1.0")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    pub fn has_gst_element(element: &str) -> bool {
        Self::system_command("gst-inspect-1.0")
            .arg(element)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    /// Detects the available GPU hardware encoder on the user's system via GStreamer.
    pub fn detect_hardware_encoder() -> HardwareEncoder {
        #[cfg(target_os = "windows")]
        {
            if Self::has_gst_element("nvh264enc") {
                return HardwareEncoder::NvidiaNvenc;
            }
            if Self::has_gst_element("amfh264enc") {
                return HardwareEncoder::AmdAmf;
            }
            if Self::has_gst_element("qsvh264enc") {
                return HardwareEncoder::IntelQsv;
            }
            HardwareEncoder::SoftwareFallback
        }
        #[cfg(not(target_os = "windows"))]
        {
            if Self::has_gst_element("nvh264enc") {
                return HardwareEncoder::NvidiaNvenc;
            }
            if Self::has_gst_element("qsvh264enc") {
                return HardwareEncoder::IntelQsv;
            }
            HardwareEncoder::SoftwareFallback
        }
    }

    /// Constructs the GStreamer pipeline string for zero-copy Direct3D11 capture on Windows,
    /// or a live capture/test pipeline for non-Windows platforms.
    pub fn build_gst_pipeline_string(&self, hwnd: usize, encoder: &HardwareEncoder) -> String {
        #[cfg(target_os = "windows")]
        {
            let encoder_elem = match encoder {
                HardwareEncoder::NvidiaNvenc => {
                    "nvh264enc preset=low-latency-hq rc-mode=cbr bitrate=12000 gop-size=60 bframes=0 zerolatency=true"
                }
                HardwareEncoder::AmdAmf => {
                    "amfh264enc usage=lowlatency rate-control=cbr bitrate=12000 gop-size=60 b-frames=0"
                }
                HardwareEncoder::IntelQsv => {
                    "qsvh264enc rate-control=cbr bitrate=12000 gop-size=60"
                }
                HardwareEncoder::SoftwareFallback => {
                    "x264enc speed-preset=ultrafast tune=zerolatency bitrate=8000 key-int-max=60"
                }
            };

            format!(
                "d3d11screencapturesrc window-handle={} show-cursor=false ! \
                 video/x-raw(memory:D3D11Memory),framerate={}/1 ! \
                 d3d11convert ! \
                 d3d11scale ! \
                 video/x-raw(memory:D3D11Memory),width={},height={},format=NV12 ! \
                 {} ! \
                 h264parse config-interval=-1 ! \
                 appsink name=gop_sink emit-signals=true sync=false max-buffers=120 drop=true",
                hwnd, self.config.target_fps, self.config.width, self.config.height, encoder_elem
            )
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = (hwnd, encoder);
            format!(
                "videotestsrc is-live=true ! \
                 video/x-raw,framerate={}/1,width={},height={} ! \
                 x264enc speed-preset=ultrafast tune=zerolatency bitrate={} key-int-max=60 ! \
                 h264parse config-interval=-1 ! \
                 appsink name=gop_sink emit-signals=true sync=false max-buffers=120 drop=true",
                self.config.target_fps,
                self.config.width,
                self.config.height,
                self.config.bitrate_kbps
            )
        }
    }

    fn resolve_live_pipeline_args(&self) -> Result<(Vec<String>, &'static str, String), String> {
        let fps = self.config.target_fps.clamp(15, 60);
        let width = self.config.width.clamp(640, 3840);
        let height = self.config.height.clamp(360, 2160);
        let bitrate = self.config.bitrate_kbps.clamp(1000, 25000);
        let max_files = self.config.ring_buffer_seconds.clamp(5, 120);

        let use_mp4 = Self::has_gst_element("h264parse")
            && Self::has_gst_element("mp4mux")
            && (Self::has_gst_element("x264enc")
                || Self::has_gst_element("nvh264enc")
                || Self::has_gst_element("amfh264enc")
                || Self::has_gst_element("qsvh264enc"));

        let use_webm =
            !use_mp4 && Self::has_gst_element("vp8enc") && Self::has_gst_element("webmmux");

        if !use_mp4 && !use_webm {
            return Err(
                "Nenhum encoder/muxer GStreamer compatível encontrado (x264enc+h264parse+mp4mux ou vp8enc+webmmux)."
                    .into(),
            );
        }

        let ext = if use_mp4 { "mp4" } else { "webm" };
        let muxer = if use_mp4 { "mp4mux" } else { "webmmux" };
        let pattern = self
            .buffer_dir
            .join(format!("seg_%05d.{}", ext))
            .to_string_lossy()
            .into_owned();

        let mut args: Vec<String> = vec!["-e".into()];
        let source_label: String;

        #[cfg(target_os = "windows")]
        {
            let monitors = Self::list_monitors();
            let selected_monitor =
                Self::resolve_monitor(&monitors, self.config.selected_monitor_id.as_deref());

            if Self::has_gst_element("d3d11screencapturesrc") && use_mp4 {
                source_label = selected_monitor
                    .map(|m| format!("Direct3D11 {} ({}x{})", m.name, m.width, m.height))
                    .unwrap_or_else(|| "Windows.Graphics.Capture (Direct3D11)".into());
                args.push("d3d11screencapturesrc".into());
                args.push("show-cursor=true".into());
                if let Some(m) = selected_monitor {
                    if let Ok(idx) = m.id.parse::<usize>() {
                        args.push(format!("monitor-index={}", idx));
                    }
                }
                args.extend([
                    "!".into(),
                    format!("video/x-raw(memory:D3D11Memory),framerate={}/1", fps),
                    "!".into(),
                    "d3d11convert".into(),
                    "!".into(),
                    "d3d11scale".into(),
                    "!".into(),
                    format!(
                        "video/x-raw(memory:D3D11Memory),width={},height={},format=NV12",
                        width, height
                    ),
                    "!".into(),
                ]);
            } else if Self::has_gst_element("gdiscreencapsrc") {
                source_label = "Windows GDI Screen Capture".into();
                args.extend([
                    "gdiscreencapsrc".into(),
                    "!".into(),
                    "videoconvert".into(),
                    "!".into(),
                    "videoscale".into(),
                    "!".into(),
                    format!(
                        "video/x-raw,width={},height={},framerate={}/1",
                        width, height, fps
                    ),
                    "!".into(),
                ]);
            } else {
                source_label = "GStreamer Test Fallback".into();
                args.extend([
                    "videotestsrc".into(),
                    "is-live=true".into(),
                    "!".into(),
                    format!(
                        "video/x-raw,width={},height={},framerate={}/1",
                        width, height, fps
                    ),
                    "!".into(),
                    "videoconvert".into(),
                    "!".into(),
                ]);
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let has_wayland = std::env::var_os("WAYLAND_DISPLAY").is_some();
            let has_x11 = std::env::var_os("DISPLAY").is_some();
            let monitors = Self::list_monitors();
            let selected_monitor =
                Self::resolve_monitor(&monitors, self.config.selected_monitor_id.as_deref());

            if has_wayland && Self::has_gst_element("pipewiresrc") {
                source_label = "Linux PipeWire Screen Capture".into();
                args.extend([
                    "pipewiresrc".into(),
                    "do-timestamp=true".into(),
                    "!".into(),
                    "videorate".into(),
                    "!".into(),
                    "videoconvert".into(),
                    "!".into(),
                    "videoscale".into(),
                    "!".into(),
                    format!(
                        "video/x-raw,width={},height={},framerate={}/1",
                        width, height, fps
                    ),
                    "!".into(),
                ]);
            } else if has_x11 && Self::has_gst_element("ximagesrc") {
                let needs_scale = match selected_monitor {
                    Some(m) => {
                        let endx = m.x + (m.width as i32) - 1;
                        let endy = m.y + (m.height as i32) - 1;
                        source_label = format!("X11 {} ({}x{})", m.name, m.width, m.height);
                        args.extend([
                            "ximagesrc".into(),
                            "use-damage=false".into(),
                            "show-pointer=true".into(),
                            format!("startx={}", m.x),
                            format!("starty={}", m.y),
                            format!("endx={}", endx),
                            format!("endy={}", endy),
                            "!".into(),
                        ]);
                        m.width != width || m.height != height
                    }
                    None => {
                        source_label = "X11 Todos os Monitores".into();
                        args.extend([
                            "ximagesrc".into(),
                            "use-damage=false".into(),
                            "show-pointer=true".into(),
                            "!".into(),
                        ]);
                        true
                    }
                };
                args.extend([
                    "queue".into(),
                    "max-size-buffers=4".into(),
                    "leaky=downstream".into(),
                    "!".into(),
                    "videorate".into(),
                    "drop-only=true".into(),
                    "!".into(),
                    "videoconvert".into(),
                    "n-threads=2".into(),
                    "!".into(),
                ]);
                if needs_scale {
                    args.extend(["videoscale".into(), "!".into()]);
                }
                args.extend([
                    format!(
                        "video/x-raw,width={},height={},framerate={}/1",
                        width, height, fps
                    ),
                    "!".into(),
                ]);
            } else {
                source_label = "GStreamer Live Test Source (Headless)".into();
                args.extend([
                    "videotestsrc".into(),
                    "is-live=true".into(),
                    "!".into(),
                    format!(
                        "video/x-raw,width={},height={},framerate={}/1",
                        width, height, fps
                    ),
                    "!".into(),
                    "videoconvert".into(),
                    "!".into(),
                ]);
            }
        }

        if use_mp4 {
            match self.encoder {
                HardwareEncoder::NvidiaNvenc if Self::has_gst_element("nvh264enc") => {
                    args.extend([
                        "nvh264enc".into(),
                        "preset=low-latency-hq".into(),
                        "rc-mode=cbr".into(),
                        format!("bitrate={}", bitrate),
                        format!("gop-size={}", fps),
                        "zerolatency=true".into(),
                    ]);
                }
                HardwareEncoder::AmdAmf if Self::has_gst_element("amfh264enc") => {
                    args.extend([
                        "amfh264enc".into(),
                        "usage=lowlatency".into(),
                        "rate-control=cbr".into(),
                        format!("bitrate={}", bitrate),
                        format!("gop-size={}", fps),
                    ]);
                }
                HardwareEncoder::IntelQsv if Self::has_gst_element("qsvh264enc") => {
                    args.extend([
                        "qsvh264enc".into(),
                        "rate-control=cbr".into(),
                        format!("bitrate={}", bitrate),
                        format!("gop-size={}", fps),
                    ]);
                }
                _ => {
                    args.extend([
                        "x264enc".into(),
                        "speed-preset=ultrafast".into(),
                        "tune=zerolatency".into(),
                        format!("bitrate={}", bitrate),
                        format!("key-int-max={}", fps),
                    ]);
                }
            }
            args.extend(["!".into(), "h264parse".into(), "config-interval=-1".into()]);
        } else {
            args.extend([
                "vp8enc".into(),
                "deadline=1".into(),
                "cpu-used=8".into(),
                "lag-in-frames=0".into(),
                "end-usage=cbr".into(),
                "threads=4".into(),
                format!("target-bitrate={}", bitrate * 1000),
                format!("keyframe-max-dist={}", fps),
            ]);
        }

        args.extend([
            "!".into(),
            "splitmuxsink".into(),
            format!("location={}", pattern),
            "max-size-time=1000000000".into(),
            format!("max-files={}", max_files),
            format!("muxer={}", muxer),
        ]);

        Ok((args, ext, source_label))
    }

    pub fn update_config(&mut self, config: CaptureEngineConfig) -> Result<(), String> {
        let was_running = self.is_active();
        if was_running {
            self.stop();
        }
        self.ring_buffer = GopRingBuffer::new(config.ring_buffer_seconds.clamp(5, 120));
        let monitors = Self::list_monitors();
        self.active_monitor_label = if config.selected_monitor_id.as_deref() == Some("all") {
            "Todos os Monitores".into()
        } else {
            Self::resolve_monitor(&monitors, config.selected_monitor_id.as_deref())
                .map(|m| format!("{} ({}x{})", m.name, m.width, m.height))
                .unwrap_or_else(|| "Tela Principal".into())
        };
        self.config = config;
        if was_running {
            self.start()?;
        }
        Ok(())
    }

    pub fn start(&mut self) -> Result<(), String> {
        if self.is_active() {
            return Ok(());
        }

        self.gstreamer_available = Self::is_gstreamer_installed();
        if !self.gstreamer_available {
            let msg = "gst-launch-1.0 não encontrado no sistema.".to_string();
            self.last_error = Some(msg.clone());
            return Err(msg);
        }

        let _ = fs::remove_dir_all(&self.buffer_dir);
        fs::create_dir_all(&self.buffer_dir).map_err(|e| e.to_string())?;
        fs::create_dir_all(&self.clips_dir).map_err(|e| e.to_string())?;

        let (args, ext, source_label) = self.resolve_live_pipeline_args().inspect_err(|e| {
            self.last_error = Some(e.clone());
        })?;

        self.container_ext = ext;
        self.capture_source_label = source_label;
        self.ring_buffer = GopRingBuffer::new(self.config.ring_buffer_seconds);
        self.next_gop_index = 0;

        let log_path = self.buffer_dir.join("gst.log");
        let stderr_cfg = fs::File::create(&log_path)
            .map(Stdio::from)
            .unwrap_or_else(|_| Stdio::null());

        let mut child = Self::system_command("gst-launch-1.0")
            .args(&args)
            .stdout(Stdio::null())
            .stderr(stderr_cfg)
            .spawn()
            .map_err(|e| {
                let err = format!("Falha ao iniciar GStreamer: {}", e);
                self.last_error = Some(err.clone());
                err
            })?;

        // Give gst-launch-1.0 a brief moment to initialize plugins/source and catch immediate startup failures
        std::thread::sleep(std::time::Duration::from_millis(180));
        if let Ok(Some(exit_status)) = child.try_wait() {
            let log_detail = fs::read_to_string(&log_path).unwrap_or_default();
            let detail_line = log_detail
                .lines()
                .rev()
                .find(|l| !l.trim().is_empty())
                .unwrap_or("erro desconhecido no pipeline GStreamer")
                .trim()
                .to_string();
            let err = format!(
                "GStreamer encerrou ao iniciar ({}): {}",
                exit_status, detail_line
            );
            self.last_error = Some(err.clone());
            self.is_running.store(false, Ordering::SeqCst);
            return Err(err);
        }

        self.child_process = Some(child);
        self.last_error = None;
        self.is_running.store(true, Ordering::SeqCst);
        info!(
            "NativeCapturePipeline started ({}, {}x{} @ {}fps, ring={}s).",
            self.capture_source_label,
            self.config.width,
            self.config.height,
            self.config.target_fps,
            self.config.ring_buffer_seconds
        );
        Ok(())
    }

    pub fn stop(&mut self) {
        if let Some(mut child) = self.child_process.take() {
            #[cfg(unix)]
            {
                let pid = child.id().to_string();
                let _ = Command::new("kill")
                    .args(["-INT", &pid])
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status();
                for _ in 0..20 {
                    if let Ok(Some(_)) = child.try_wait() {
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
            }
            let _ = child.kill();
            let _ = child.wait();
        }
        self.is_running.store(false, Ordering::SeqCst);
        self.sync_ring_buffer_from_disk();
        info!("NativeCapturePipeline stopped.");
    }

    pub fn is_active(&mut self) -> bool {
        if let Some(child) = self.child_process.as_mut() {
            match child.try_wait() {
                Ok(Some(status)) => {
                    self.is_running.store(false, Ordering::SeqCst);
                    if !status.success() {
                        self.last_error = Some(format!(
                            "Processo GStreamer encerrou com status: {}",
                            status
                        ));
                    }
                    self.child_process = None;
                    return false;
                }
                Ok(None) => return true,
                Err(_) => return false,
            }
        }
        self.is_running.load(Ordering::SeqCst)
    }

    fn collect_segment_files(&self, include_newest: bool) -> Vec<PathBuf> {
        let Ok(entries) = fs::read_dir(&self.buffer_dir) else {
            return Vec::new();
        };
        let mut files: Vec<PathBuf> = entries
            .filter_map(|e| e.ok().map(|ent| ent.path()))
            .filter(|p| {
                p.is_file()
                    && p.extension()
                        .and_then(|e| e.to_str())
                        .map(|e| e == "mp4" || e == "webm")
                        .unwrap_or(false)
            })
            .collect();
        files.sort();
        if !include_newest && files.len() > 1 {
            files.pop();
        }
        files
    }

    pub fn sync_ring_buffer_from_disk(&mut self) {
        let running = self.is_active();
        let files = self.collect_segment_files(!running);
        let max_gops = self.config.ring_buffer_seconds.max(1);
        let start_idx = files.len().saturating_sub(max_gops);

        let rebuilt = GopRingBuffer::new(max_gops);
        for (i, path) in files[start_idx..].iter().enumerate() {
            if let Ok(bytes) = fs::read(path) {
                if !bytes.is_empty() {
                    rebuilt.push_gop(EncodedGop {
                        gop_index: i as u64,
                        timestamp: Instant::now(),
                        data: bytes,
                        is_keyframe: true,
                        duration_ms: 1000,
                        kill_events_count: 0,
                    });
                }
            }
        }
        self.ring_buffer = rebuilt;
    }

    pub fn disk_buffer_stats(&mut self) -> (usize, f64) {
        let running = self.is_active();
        let files = self.collect_segment_files(!running);
        let max_gops = self.config.ring_buffer_seconds.max(1);
        let start_idx = files.len().saturating_sub(max_gops);
        let selected = &files[start_idx..];

        let total_bytes: u64 = selected
            .iter()
            .filter_map(|p| fs::metadata(p).ok().map(|m| m.len()))
            .sum();

        let count = if selected.is_empty() {
            self.ring_buffer.len()
        } else {
            selected.len()
        };
        let mb = if total_bytes == 0 {
            (self.ring_buffer.memory_usage_bytes() as f64) / (1024.0 * 1024.0)
        } else {
            (total_bytes as f64) / (1024.0 * 1024.0)
        };
        (count, (mb * 100.0).round() / 100.0)
    }

    pub fn status_payload(&mut self) -> CaptureStatusPayload {
        let active = self.is_active();
        let (buffered_seconds, memory_usage_mb) = self.disk_buffer_stats();

        CaptureStatusPayload {
            is_active: active,
            gstreamer_available: self.gstreamer_available,
            encoder: self.encoder.label().to_string(),
            capture_source: self.capture_source_label.clone(),
            active_monitor: self.active_monitor_label.clone(),
            container_format: self.container_ext.to_uppercase(),
            ring_buffer_seconds: self.config.ring_buffer_seconds,
            buffered_seconds,
            memory_usage_mb,
            last_error: self.last_error.clone(),
        }
    }

    /// Flushes the last `requested_seconds` from the GStreamer GOP ring buffer into a single playable clip file.
    pub fn flush_highlight_clip(
        &mut self,
        requested_seconds: usize,
    ) -> Result<FlushedClipResult, String> {
        let was_running = self.is_active();
        let mut segments = self.collect_segment_files(!was_running);

        // If buffer is still warming up (< 2 segments), stop cleanly so the active segment finalizes
        if segments.is_empty() && was_running {
            self.stop();
            segments = self.collect_segment_files(true);
        }

        if segments.is_empty() {
            return Err("Nenhum segmento gravado disponível no buffer ainda. Aguarde 1-2s após iniciar a captura.".into());
        }

        let target_count = requested_seconds.clamp(1, self.config.ring_buffer_seconds.max(1));
        let start = segments.len().saturating_sub(target_count);
        let selected: Vec<PathBuf> = segments[start..].to_vec();
        let actual_duration = selected.len();

        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        fs::create_dir_all(&self.clips_dir).map_err(|e| e.to_string())?;
        let out_path = self
            .clips_dir
            .join(format!("wespace_clip_{}.{}", stamp, self.container_ext));

        if selected.len() == 1 {
            fs::copy(&selected[0], &out_path).map_err(|e| e.to_string())?;
        } else {
            let merge_dir = std::env::temp_dir().join(format!("wespace_merge_{}", stamp));
            fs::create_dir_all(&merge_dir).map_err(|e| e.to_string())?;
            for (idx, src) in selected.iter().enumerate() {
                let dst = merge_dir.join(format!("part_{:05}.{}", idx, self.container_ext));
                fs::copy(src, &dst).map_err(|e| e.to_string())?;
            }

            let glob_pattern = merge_dir
                .join(format!("part_*.{}", self.container_ext))
                .to_string_lossy()
                .into_owned();
            let muxer = if self.container_ext == "mp4" {
                "mp4mux"
            } else {
                "webmmux"
            };
            let out_str = out_path.to_string_lossy().into_owned();

            let status = Self::system_command("gst-launch-1.0")
                .args([
                    "-e",
                    "splitmuxsrc",
                    &format!("location={}", glob_pattern),
                    "name=src",
                    "src.video_0",
                    "!",
                    "queue",
                    "!",
                    muxer,
                    "!",
                    "filesink",
                    &format!("location={}", out_str),
                ])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .map_err(|e| format!("Falha ao concatenar clipe GStreamer: {}", e))?;

            let _ = fs::remove_dir_all(&merge_dir);

            if !status.success() {
                // Fallback to the latest complete segment if muxer refused stream copy
                if let Some(last) = selected.last() {
                    warn!("splitmuxsrc concat fallback: copying latest complete GOP segment");
                    fs::copy(last, &out_path).map_err(|e| e.to_string())?;
                } else {
                    return Err("Falha ao finalizar arquivo de vídeo.".into());
                }
            }
        }

        // Restart continuous capture if we had to flush-stop on a tiny buffer
        if was_running && !self.is_active() {
            let _ = self.start();
        }

        let bytes = fs::read(&out_path).map_err(|e| e.to_string())?;
        let sha256 = ClipIntegrity::compute_sha256_hex(&bytes);
        let size_bytes = bytes.len();
        let data_base64 = if size_bytes <= 40 * 1024 * 1024 {
            encode_base64(&bytes)
        } else {
            String::new()
        };

        let mime_type = if self.container_ext == "mp4" {
            "video/mp4"
        } else {
            "video/webm"
        }
        .to_string();

        Ok(FlushedClipResult {
            file_path: out_path.to_string_lossy().into_owned(),
            mime_type,
            sha256,
            duration_seconds: actual_duration,
            size_bytes,
            encoder: self.encoder.label().to_string(),
            data_base64,
        })
    }

    pub fn get_ring_buffer(&self) -> GopRingBuffer {
        self.ring_buffer.clone()
    }

    pub fn buffer_dir(&self) -> &Path {
        &self.buffer_dir
    }

    pub fn clips_dir(&self) -> &Path {
        &self.clips_dir
    }

    pub fn set_clips_dir(&mut self, dir: PathBuf) {
        self.clips_dir = dir;
    }
}

impl Drop for NativeCapturePipeline {
    fn drop(&mut self) {
        self.stop();
    }
}

pub fn encode_base64(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;

        out.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        out.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(TABLE[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

pub fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    let clean = input.trim();
    if clean.is_empty() {
        return Ok(Vec::new());
    }
    let mut out = Vec::with_capacity((clean.len() / 4) * 3);
    let mut buf: u32 = 0;
    let mut bits: u8 = 0;

    for b in clean.bytes() {
        if b == b'=' {
            break;
        }
        if b.is_ascii_whitespace() {
            continue;
        }
        let val = match b {
            b'A'..=b'Z' => b - b'A',
            b'a'..=b'z' => b - b'a' + 26,
            b'0'..=b'9' => b - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            _ => return Err("Invalid base64 character".into()),
        };
        buf = (buf << 6) | (val as u32);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(((buf >> bits) & 0xFF) as u8);
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64_encoding_roundtrip_lengths() {
        assert_eq!(encode_base64(b""), "");
        assert_eq!(encode_base64(b"f"), "Zg==");
        assert_eq!(encode_base64(b"fo"), "Zm8=");
        assert_eq!(encode_base64(b"foo"), "Zm9v");
        assert_eq!(encode_base64(b"foobar"), "Zm9vYmFy");
        assert_eq!(decode_base64("Zm9vYmFy").unwrap(), b"foobar");
        assert_eq!(decode_base64("Zg==").unwrap(), b"f");
    }

    #[test]
    fn test_parse_xrandr_two_monitors() {
        let sample = "Monitors: 2\n 0: +*eDP-1 1920/344x1080/194+0+75  eDP-1\n 1: +HDMI-1 1920/479x1080/260+1920+0  HDMI-1\n";
        let monitors = NativeCapturePipeline::parse_xrandr_monitors(sample);
        assert_eq!(monitors.len(), 2);
        assert_eq!(monitors[0].id, "eDP-1");
        assert!(monitors[0].is_primary);
        assert_eq!(
            (
                monitors[0].width,
                monitors[0].height,
                monitors[0].x,
                monitors[0].y
            ),
            (1920, 1080, 0, 75)
        );
        assert_eq!(monitors[1].id, "HDMI-1");
        assert!(!monitors[1].is_primary);
        assert_eq!(
            (
                monitors[1].width,
                monitors[1].height,
                monitors[1].x,
                monitors[1].y
            ),
            (1920, 1080, 1920, 0)
        );
    }

    #[test]
    fn test_parse_windows_monitors() {
        let sample =
            "0|True|1920|1080|0|0|\\\\.\\DISPLAY1\r\n1|False|2560|1440|1920|0|\\\\.\\DISPLAY2\r\n";
        let monitors = NativeCapturePipeline::parse_windows_monitors(sample);
        assert_eq!(monitors.len(), 2);
        assert_eq!(monitors[0].id, "0");
        assert!(monitors[0].is_primary);
        assert_eq!(monitors[0].name, "Monitor 1 (DISPLAY1)");
        assert_eq!(
            (
                monitors[1].id.as_str(),
                monitors[1].width,
                monitors[1].height
            ),
            ("1", 2560, 1440)
        );
    }

    #[test]
    fn test_gstreamer_real_capture_and_flush_if_installed() {
        if !NativeCapturePipeline::is_gstreamer_installed() {
            return;
        }
        let mut pipeline = NativeCapturePipeline::new(CaptureEngineConfig {
            target_fps: 30,
            width: 640,
            height: 360,
            bitrate_kbps: 1500,
            ring_buffer_seconds: 10,
            selected_monitor_id: None,
        });
        pipeline.start().expect("GStreamer capture should start");
        std::thread::sleep(std::time::Duration::from_millis(2400));
        assert!(pipeline.is_active());

        let status = pipeline.status_payload();
        assert!(status.gstreamer_available);

        let flushed = pipeline
            .flush_highlight_clip(5)
            .expect("Flush should produce a real video file");
        assert!(flushed.size_bytes > 1000);
        assert_eq!(flushed.sha256.len(), 64);
        assert!(!flushed.data_base64.is_empty());
        assert!(Path::new(&flushed.file_path).exists());

        pipeline.stop();
        assert!(!pipeline.is_active());
        let _ = fs::remove_file(&flushed.file_path);
    }
}
