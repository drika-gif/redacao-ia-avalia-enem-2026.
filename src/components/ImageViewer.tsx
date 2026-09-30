import React, { useRef, useState } from 'react';
import { Camera, Upload, RotateCw, ZoomIn, Trash2, FileText, Image as ImageIcon, X } from 'lucide-react';
import { ImagemFolha } from '../types';

interface ImageViewerProps {
  imagens: ImagemFolha[];
  onAddImages: (novas: ImagemFolha[]) => void;
  onUpdateImage: (index: number, atualizada: ImagemFolha) => void;
  onRemoveImage: (index: number) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  imagens,
  onAddImages,
  onUpdateImage,
  onRemoveImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [zoomRotation, setZoomRotation] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1);

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const novas: ImagemFolha[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        novas.push({
          id: 'img_' + Math.random().toString(36).substring(2, 9),
          dataUrl,
          rotation: 0,
          name: file.name,
        });
        if (novas.length === files.length) {
          onAddImages(novas);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRotate = (index: number) => {
    const img = imagens[index];
    const newRot = (img.rotation + 90) % 360;
    onUpdateImage(index, { ...img, rotation: newRot });
  };

  const handleOpenZoom = (img: ImagemFolha) => {
    setZoomUrl(img.dataUrl);
    setZoomRotation(img.rotation);
    setZoomScale(1);
  };

  return (
    <div className="space-y-4">
      {/* Botões de Ação de Captura e Upload */}
      <div className="flex flex-wrap gap-2.5">
        {/* Tirar Foto (Câmera Mobile) */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 min-w-[140px] bg-brand-700 hover:bg-brand-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition shadow-sm"
        >
          <Camera className="w-4 h-4" />
          <span>Tirar Foto</span>
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />

        {/* Escolher Foto / Arquivo (JPG, PNG, PDF) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-w-[140px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition shadow-sm"
        >
          <Upload className="w-4 h-4 text-brand-600" />
          <span>Enviar Arquivo (JPG / PNG / PDF)</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
      </div>

      {/* Grid de Imagens Carregadas */}
      {imagens.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma imagem carregada</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Fotografe a folha de redação oficial do Avalia ENEM ou anexe as fotos das páginas (frente e verso se houver).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {imagens.map((img, idx) => (
            <div
              key={img.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col group"
            >
              <div className="relative aspect-[3/4] bg-slate-900 flex items-center justify-center overflow-hidden">
                <img
                  src={img.dataUrl}
                  alt={`Folha ${idx + 1}`}
                  style={{
                    transform: `rotate(${img.rotation}deg)`,
                    transition: 'transform 0.2s',
                  }}
                  className="max-h-full max-w-full object-contain cursor-pointer"
                  onClick={() => handleOpenZoom(img)}
                />
                <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                  Página {idx + 1}
                </span>
              </div>

              {/* Barra de Controles da Imagem */}
              <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => handleRotate(idx)}
                  className="p-1.5 text-slate-600 hover:text-brand-700 hover:bg-white rounded-lg transition"
                  title="Girar 90 graus"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenZoom(img)}
                  className="p-1.5 text-slate-600 hover:text-brand-700 hover:bg-white rounded-lg transition"
                  title="Ampliar imagem"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveImage(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                  title="Excluir imagem"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Zoom Ampliado */}
      {zoomUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden border border-slate-800 shadow-2xl">
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-semibold">Visualização Detalhada da Redação</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.2))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded font-bold"
                >
                  ➖
                </button>
                <button
                  onClick={() => setZoomScale((s) => Math.min(3, s + 0.2))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded font-bold"
                >
                  ➕
                </button>
                <button
                  onClick={() => setZoomRotation((r) => (r + 90) % 360)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded font-bold flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>90°</span>
                </button>
                <button
                  onClick={() => setZoomUrl(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <img
                src={zoomUrl}
                alt="Ampliação"
                style={{
                  transform: `scale(${zoomScale}) rotate(${zoomRotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
