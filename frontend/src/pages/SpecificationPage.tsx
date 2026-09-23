import { FileSpreadsheet, Upload } from "lucide-react";

export default function SpecificationPage() {
  return (
    <section className="container page-shell">
      <span className="page-eyebrow">СПЕЦИФИКАЦИЯ</span>
      <h1>Подбор по спецификации</h1>

      <p>
        Загрузите список оборудования, чтобы сопоставить
        позиции с каталогом.
      </p>

      <div className="upload-zone">
        <FileSpreadsheet size={38} />

        <strong>Перетащите файл сюда</strong>

        <span>Excel, PDF или Word</span>

        <button>
          <Upload size={17} />
          Выбрать файл
        </button>
      </div>
    </section>
  );
}