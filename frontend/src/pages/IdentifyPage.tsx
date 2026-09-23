import { Camera, Upload } from "lucide-react";

export default function IdentifyPage() {
  return (
    <section className="container page-shell">
      <span className="page-eyebrow">ПОИСК ПО ФОТО</span>
      <h1>Найти оборудование по фотографии</h1>

      <p>
        Загрузите фотографию оборудования или маркировки.
      </p>

      <div className="upload-zone">
        <Camera size={38} />

        <strong>Перетащите фотографию сюда</strong>

        <span>JPG, JPEG или PNG</span>

        <button>
          <Upload size={17} />
          Выбрать фотографию
        </button>
      </div>
    </section>
  );
}