use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::Instant;

/// Encoded GOP (Group of Pictures) representation in RAM.
/// Each GOP covers exactly 1.0s at 60 FPS (60 frames), starting with an IDR frame.
#[derive(Debug, Clone)]
pub struct EncodedGop {
    pub gop_index: u64,
    pub timestamp: Instant,
    pub data: Vec<u8>,
    pub is_keyframe: bool,
    pub duration_ms: u32,
    pub kill_events_count: u8,
}

/// Thread-safe GOP Ring Buffer in RAM.
/// Keeps up to `max_gops` (default 45s = 45 GOPs ≈ 60MB).
/// Eliminates raw frame overhead and replaces FFmpeg WASM.
#[derive(Clone)]
pub struct GopRingBuffer {
    buffer: Arc<Mutex<VecDeque<EncodedGop>>>,
    max_gops: usize,
}

impl GopRingBuffer {
    pub fn new(max_seconds: usize) -> Self {
        Self {
            buffer: Arc::new(Mutex::new(VecDeque::with_capacity(max_seconds + 5))),
            max_gops: max_seconds,
        }
    }

    /// Pushes a newly encoded 1s GOP from the GStreamer hardware pipeline.
    pub fn push_gop(&self, gop: EncodedGop) {
        let mut queue = self.buffer.lock().unwrap();
        if queue.len() >= self.max_gops {
            queue.pop_front();
        }
        queue.push_back(gop);
    }

    /// Flushes the highlight slice (e.g., -40s before trigger to +5s after trigger).
    pub fn extract_highlight(&self, pre_seconds: usize, post_seconds: usize) -> Vec<EncodedGop> {
        let queue = self.buffer.lock().unwrap();
        let total_needed = pre_seconds + post_seconds;
        let count = queue.len().min(total_needed);
        queue.iter().rev().take(count).rev().cloned().collect()
    }

    /// Returns estimated memory usage in bytes.
    pub fn memory_usage_bytes(&self) -> usize {
        let queue = self.buffer.lock().unwrap();
        queue.iter().map(|g| g.data.len()).sum()
    }

    /// Returns current number of buffered seconds/GOPs.
    pub fn len(&self) -> usize {
        self.buffer.lock().unwrap().len()
    }

    pub fn is_empty(&self) -> bool {
        self.buffer.lock().unwrap().is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_gop(index: u64, size: usize) -> EncodedGop {
        EncodedGop {
            gop_index: index,
            timestamp: Instant::now(),
            data: vec![0u8; size],
            is_keyframe: true,
            duration_ms: 1000,
            kill_events_count: 0,
        }
    }

    #[test]
    fn test_ring_buffer_push_and_rotation() {
        let ring = GopRingBuffer::new(3);
        assert!(ring.is_empty());
        assert_eq!(ring.len(), 0);

        ring.push_gop(dummy_gop(0, 100));
        ring.push_gop(dummy_gop(1, 100));
        ring.push_gop(dummy_gop(2, 100));
        assert_eq!(ring.len(), 3);

        // Push 4th GOP -> 0 should be evicted, keeping 1, 2, 3
        ring.push_gop(dummy_gop(3, 100));
        assert_eq!(ring.len(), 3);

        // Push 5th GOP -> 1 should be evicted, keeping 2, 3, 4
        ring.push_gop(dummy_gop(4, 100));
        assert_eq!(ring.len(), 3);

        let highlight = ring.extract_highlight(2, 1);
        assert_eq!(highlight.len(), 3);
        let indices: Vec<u64> = highlight.into_iter().map(|g| g.gop_index).collect();
        assert_eq!(indices, vec![2, 3, 4]);
    }

    #[test]
    fn test_ring_buffer_memory_usage() {
        let ring = GopRingBuffer::new(5);
        ring.push_gop(dummy_gop(0, 1024));
        ring.push_gop(dummy_gop(1, 2048));

        assert_eq!(ring.memory_usage_bytes(), 3072);
    }

    #[test]
    fn test_extract_highlight_partial_when_buffer_small() {
        let ring = GopRingBuffer::new(45);
        ring.push_gop(dummy_gop(0, 100));
        ring.push_gop(dummy_gop(1, 100));

        // Request 40s pre + 5s post, but only 2s are buffered
        let highlight = ring.extract_highlight(40, 5);
        assert_eq!(highlight.len(), 2);
        assert_eq!(highlight[0].gop_index, 0);
        assert_eq!(highlight[1].gop_index, 1);
    }
}
