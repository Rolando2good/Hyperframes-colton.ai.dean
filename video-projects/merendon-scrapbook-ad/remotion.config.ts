import {Config} from '@remotion/cli/config';

// Final encode: H.264, CRF 18, x264 preset veryfast (scripts/render.mjs passes the same).
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setX264Preset('veryfast');
Config.setPixelFormat('yuv420p');
