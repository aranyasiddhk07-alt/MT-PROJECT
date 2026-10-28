#!/usr/bin/env bash
# Encode rendered frames + final mix into the deliverable MP4 (H.264 High, 1920x1080, 30 fps, AAC, -16 LUFS).
# usage: 07_encode.sh <frames_dir>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRAMES="$1"
OUT="$ROOT/output/hand_cranked_fan_animation_180s.mp4"
test "$(ls "$FRAMES" | grep -c '^f[0-9]\{5\}\.jpg$')" -eq 5400
ffmpeg -y -hide_banner -loglevel warning \
  -framerate 30 -i "$FRAMES/f%05d.jpg" \
  -i "$ROOT/animation/audio/final_mix.wav" \
  -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 23 -tune animation -profile:v high -pix_fmt yuv420p -r 30 -g 60 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000" -c:a aac -b:a 192k -ar 48000 \
  -t 180 -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration:stream=codec_name,profile,width,height,r_frame_rate,nb_frames,duration -of compact "$OUT"
