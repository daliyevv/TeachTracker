export interface AudioController {
  pause: () => void;
  resume: () => void;
  setSpeed: (speed: number) => void;
  stop: () => void;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createWavBlob(pcmData: Uint8Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (PCM = 1)
  view.setUint16(20, 1, true);
  // channel count (Mono = 1)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample (16)
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, pcmData.length, true);

  return new Blob([header, pcmData], { type: 'audio/wav' });
}

async function fetchAudio(prompt: string, voiceName: string): Promise<string | null> {
  try {
    const response = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, voiceName })
    });
    if (!response.ok) {
      console.error("TTS Server Error:", await response.text());
      return null;
    }
    const data = await response.json();
    return data.base64Audio;
  } catch (error) {
    console.error("TTS Network Error:", error);
    return null;
  }
}

function playAudioBlob(base64Audio: string, speed: number, onEnded?: () => void): AudioController | null {
  try {
    const blob = createWavBlob(decode(base64Audio), 24000);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    if ('preservesPitch' in audio) {
      (audio as any).preservesPitch = true;
    } else if ('mozPreservesPitch' in audio) {
      (audio as any).mozPreservesPitch = true;
    } else if ('webkitPreservesPitch' in audio) {
      (audio as any).webkitPreservesPitch = true;
    }

    audio.playbackRate = speed;

    const playAudio = () => {
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(e => {
          if (e.name !== 'AbortError' && !e.message.includes('interrupted')) {
            console.error("Audio play error:", e);
          }
        });
      }
    };

    if (onEnded) {
      audio.onended = () => {
        onEnded();
        URL.revokeObjectURL(url);
      };
    }

    playAudio();

    return {
      pause: () => audio.pause(),
      resume: () => playAudio(),
      setSpeed: (newSpeed: number) => {
        audio.playbackRate = newSpeed;
      },
      stop: () => {
        audio.onended = null;
        audio.pause();
        audio.currentTime = 0;
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    };
  } catch (error) {
    console.error("Audio playback error:", error);
    return null;
  }
}

export const speakText = async (text: string, speed: number = 1.0, onEnded?: () => void): Promise<AudioController | null> => {
  let speedInstruction = "Tabiiy tezlikda o'qing.";
  if (speed < 0.9) speedInstruction = "Sekinroq, har bir so'zni aniq talaffuz qilib o'qing.";
  if (speed > 1.1) speedInstruction = "Tezroq, lekin tushunarli qilib o'qing.";

  const prompt = `O'qituvchi sifatida shirin ohangda o'qing. ${speedInstruction} Matn: ${text}`;
  const base64Audio = await fetchAudio(prompt, 'Kore');
  if (base64Audio) {
    return playAudioBlob(base64Audio, speed, onEnded);
  }
  return null;
};

export const dictateText = async (text: string, speed: number = 1.0, onEnded?: () => void): Promise<AudioController | null> => {
  let speedInstruction = "Tabiiy tezlikda o'qi.";
  if (speed < 0.7) {
    speedInstruction = "O'ta sekin o'qi. Har bir so'zdan keyin 2 soniya to'xta. Bo'g'inlab talaffuz qil.";
  } else if (speed < 0.9) {
    speedInstruction = "Sekin o'qi. Tinish belgilarida uzoqroq pauza qil. Bolalar ulgurishi uchun har bir gapni bo'laklab o'qi.";
  } else if (speed > 1.2) {
    speedInstruction = "Tezroq o'qi. Pauzalarni qisqartir, lekin so'zlarni aniq ayt.";
  }

  const prompt = `
    Sen 1-5 sinf o'quvchilari uchun diktant o'qib berayotgan tajribali o'qituvchisan.
    ${speedInstruction}
    
    O'qilishi kerak bo'lgan matn:
    "${text}"
  `;

  const base64Audio = await fetchAudio(prompt, 'Zephyr');
  if (base64Audio) {
    return playAudioBlob(base64Audio, speed, onEnded);
  }
  return null;
};
