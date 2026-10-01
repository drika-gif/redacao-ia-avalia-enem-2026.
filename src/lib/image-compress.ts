/**
 * Otimiza e redimensiona fotos tiradas com o celular para envio seguro ao Gemini pela API.
 * Evita o limite de 4.5MB da Vercel Serverless Function enquanto preserva nitidez máxima (2048px).
 */
export async function optimizeImageForAi(
  dataUrl: string,
  maxDimension = 2048,
  quality = 0.85
): Promise<{ dataUrl: string; mimeType: string; base64: string }> {
  // Se for PDF ou se estiver fora do navegador, retorna os dados originais
  if (typeof window === 'undefined' || typeof document === 'undefined' || dataUrl.startsWith('data:application/pdf')) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    return {
      dataUrl,
      mimeType: match ? match[1] : 'application/pdf',
      base64: match ? match[2] : dataUrl,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Se a imagem for menor que o limite e já estiver em tamanho moderado, não redimensiona
      if (width <= maxDimension && height <= maxDimension && dataUrl.length < 2_000_000) {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        return resolve({
          dataUrl,
          mimeType: match ? match[1] : 'image/jpeg',
          base64: match ? match[2] : dataUrl,
        });
      }

      // Calcula proporção para manter legibilidade máxima da caligrafia
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        return resolve({
          dataUrl,
          mimeType: match ? match[1] : 'image/jpeg',
          base64: match ? match[2] : dataUrl,
        });
      }

      // Fundo branco para garantir contraste de contraste e evitar transparências em PNG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const match = optimizedDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      resolve({
        dataUrl: optimizedDataUrl,
        mimeType: 'image/jpeg',
        base64: match ? match[2] : optimizedDataUrl,
      });
    };

    img.onerror = () => {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      resolve({
        dataUrl,
        mimeType: match ? match[1] : 'image/jpeg',
        base64: match ? match[2] : dataUrl,
      });
    };

    img.src = dataUrl;
  });
}
