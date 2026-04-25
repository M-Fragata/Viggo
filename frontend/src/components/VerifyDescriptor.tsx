
import * as faceapi from 'face-api.js';

export async function verificarPonto(faceDescriptor: number[],
  videoRef: React.RefObject<HTMLVideoElement | null>, setMessage: (msg: string) => void) {

  if (!videoRef.current) return { success: false }

  try {
    setMessage("Buscando rosto...")

    let tentativas = 0;
    let sucessoFacial = false;

    while (tentativas < 10 && !sucessoFacial) {

      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage("rosto não detectado, posicione-se ao centro");
      } else {
        setMessage("Verificando identidade...")

        const descriptorSalvo = new Float32Array(Object.values(faceDescriptor));

        // 3. Calcular a distância entre o rosto da câmera e o salvo
        const distance = faceapi.euclideanDistance(detection.descriptor, descriptorSalvo);

        if (distance < 0.5) { // Usando 0.5 para ser um pouco mais rigoroso que o 0.6
          setMessage("Identidade confirmada!")
          console.log({ success: true }, distance);
          return { success: true }

        } else {
          console.log({ success: false }, distance);
          setMessage("Identidade não reconhecida. Tente novamente.")
        }
      }

      // Espera 500ms antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 2000));
      tentativas++;
    }

    setMessage("Não foi possível confirmar sua identidade.");
    return { success: false };

  } catch (error) {
    setMessage("Erro no sensor de biometria.");
    return { success: false }
  }

}
