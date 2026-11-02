import { Box3, Vector3, type Object3D } from "three";

const sizeScratch = new Vector3();

/** Turn the fitted model so the nose points toward +Z. Front, side, and rear cameras then match every file. */
export function alignNoseToPositiveZ(root: Object3D) {
  root.updateWorldMatrix(true, true);
  const forward = detectForward(root);
  if (forward.lengthSq() < 1e-8) return;
  const yaw = Math.atan2(forward.x, forward.z);
  if (Math.abs(yaw) < 0.02) return;
  root.rotateY(-yaw);
  root.updateMatrixWorld(true);
}

function detectForward(root: Object3D) {
  const head = new Vector3();
  const tail = new Vector3();
  const frontWheel = new Vector3();
  const rearWheel = new Vector3();
  let heads = 0;
  let tails = 0;
  let fronts = 0;
  let rears = 0;
  const pos = new Vector3();

  root.traverse((object) => {
    const name = object.name.toLowerCase();
    if (!name) return;
    object.getWorldPosition(pos);
    if (/headlight|head-light|head_light|front_light|foglight/.test(name)) {
      head.add(pos);
      heads += 1;
    } else if (/taillight|tail-light|tail_light|rear_light|brake-light|reverse-light/.test(name)) {
      tail.add(pos);
      tails += 1;
    }
    if (isFrontWheel(name)) {
      frontWheel.add(pos);
      fronts += 1;
    } else if (isRearWheel(name)) {
      rearWheel.add(pos);
      rears += 1;
    }
  });

  if (heads > 0 && tails > 0) {
    return head.multiplyScalar(1 / heads).sub(tail.multiplyScalar(1 / tails)).setY(0);
  }
  if (fronts > 0 && rears > 0) {
    return frontWheel.multiplyScalar(1 / fronts).sub(rearWheel.multiplyScalar(1 / rears)).setY(0);
  }

  const box = new Box3().setFromObject(root);
  const size = box.getSize(sizeScratch);
  return size.x > size.z ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
}

function isFrontWheel(name: string) {
  return /wheel|tire|tyre/.test(name) && (/front/.test(name) || /(?:^|_)f(?:_|$)/.test(name) || /_fl|_fr|_lf|_rf/.test(name));
}

function isRearWheel(name: string) {
  return /wheel|tire|tyre/.test(name) && (/rear|back/.test(name) || /(?:^|_)b(?:_|$)/.test(name) || /_bl|_br|_lr|_rr/.test(name));
}
