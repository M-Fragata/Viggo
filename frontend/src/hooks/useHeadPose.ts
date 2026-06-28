import { useCallback } from 'react';
import type * as faceapi from 'face-api.js';

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface LandmarkPoints {
  x: number;
  y: number;
}

const NOSE_TIP = 30;
const LEFT_EYE_CORNER = 36;
const RIGHT_EYE_CORNER = 45;
const CHIN = 8;
const LEFT_EYEBROW_INNER = 17;
const RIGHT_EYEBROW_INNER = 26;

export function useHeadPose() {
  const getHeadPose = useCallback((landmarks: faceapi.FaceLandmarks68): HeadPose => {
    const positions = landmarks.positions;

    const noseTip = positions[NOSE_TIP];
    const leftEye = positions[LEFT_EYE_CORNER];
    const rightEye = positions[RIGHT_EYE_CORNER];
    const chin = positions[CHIN];
    const leftBrow = positions[LEFT_EYEBROW_INNER];
    const rightBrow = positions[RIGHT_EYEBROW_INNER];

    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
    };

    const browCenter = {
      x: (leftBrow.x + rightBrow.x) / 2,
      y: (leftBrow.y + rightBrow.y) / 2,
    };

    const faceWidth = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const faceHeight = Math.hypot(chin.x - browCenter.x, chin.y - browCenter.y);

    const noseOffsetX = (noseTip.x - eyeCenter.x) / faceWidth;
    const noseOffsetY = (noseTip.y - eyeCenter.y) / faceHeight;

    const yaw = Math.asin(Math.max(-1, Math.min(1, noseOffsetX * 2))) * (180 / Math.PI);
    const pitch = Math.asin(Math.max(-1, Math.min(1, noseOffsetY * 1.5))) * (180 / Math.PI);

    const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
    const roll = eyeAngle;

    return { yaw, pitch, roll };
  }, []);

  const isLookingFront = useCallback((pose: HeadPose, threshold = YAW_THRESHOLD_FRONT): boolean => {
    return Math.abs(pose.yaw) < threshold && Math.abs(pose.pitch) < PITCH_THRESHOLD;
  }, []);

  const isLookingLeft = useCallback((pose: HeadPose, threshold = YAW_THRESHOLD_SIDE): boolean => {
    return pose.yaw < -threshold && Math.abs(pose.pitch) < PITCH_THRESHOLD;
  }, []);

  const isLookingRight = useCallback((pose: HeadPose, threshold = YAW_THRESHOLD_SIDE): boolean => {
    return pose.yaw > threshold && Math.abs(pose.pitch) < PITCH_THRESHOLD;
  }, []);

  return { getHeadPose, isLookingFront, isLookingLeft, isLookingRight };
}

export function calculateEAR(landmarks: faceapi.FaceLandmarks68): number {
  const positions = landmarks.positions;
  
  const leftEye = [
    positions[36], positions[37], positions[38],
    positions[39], positions[40], positions[41]
  ];
  const rightEye = [
    positions[42], positions[43], positions[44],
    positions[45], positions[46], positions[47]
  ];

  const getEyeEAR = (eye: typeof leftEye) => {
    const vertical1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
    const vertical2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
    const horizontal = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
    return (vertical1 + vertical2) / (2 * horizontal);
  };

  return (getEyeEAR(leftEye) + getEyeEAR(rightEye)) / 2;
}

export const BLINK_THRESHOLD = 0.25;
export const BLINK_THRESHOLD_FRONT = 0.30;
export const YAW_THRESHOLD_FRONT = 30; // Angulo minimo para validação frontal
export const YAW_THRESHOLD_SIDE = 35; // Angulo mínimo para validação lateral
export const PITCH_THRESHOLD = 25;
export const FRONT_TIMEOUT_MS = 10000;