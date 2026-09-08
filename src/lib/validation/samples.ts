import type { Schema } from "./types";

export interface ValidationSample {
  label: string;
  data: string;
  schema?: Schema;
}

export const VALIDATION_SAMPLES: ValidationSample[] = [
  {
    label: "Örnek: Müşteri açılış verisi (şemalı)",
    data: `musteri_no;tckn;ad_soyad;eposta;telefon;bakiye;kayit_tarihi;durum
1001;10000000146;Ayşe Yıldız;ayse.yildiz@ornek.com;+905321234567;15000,00;2025-11-03;AKTIF
1002;12345678900;Mehmet Kaya;mehmet.kaya[at]ornek.com;0532 111 22 33;-250,00;2026/01/15;aktif
1003;10000000146;Fatma Demir;fatma@ornek;5321112233;8200,50;2027-05-20;PASIF
1004;;Ali Vural;ali.vural@ornek.com;+905321234599;;03.02.2026;BILINMIYOR`,
    schema: {
      name: "Müşteri açılış şeması",
      fields: [
        { column: "musteri_no", type: "integer", required: true, unique: true },
        { column: "tckn", type: "tckn", required: true, unique: true },
        { column: "ad_soyad", type: "text", required: true, min: 3 },
        { column: "eposta", type: "email", required: true },
        { column: "telefon", type: "phone" },
        { column: "bakiye", type: "money", min: 0 },
        { column: "kayit_tarihi", type: "date", dateFormat: "iso", notFuture: true },
        {
          column: "durum",
          allowed: ["AKTIF", "PASIF", "BEKLEMEDE"],
          ignoreCase: true,
          required: true,
        },
      ],
    },
  },
  {
    label: "Örnek: Ham çıktı (şemasız, otomatik çıkarım)",
    data: `islem_id,fon_kodu,adet,birim_fiyat,islem_tarihi
5001,AFT,100,15.4321,2026-03-12
5002,TYH,,16.1000,2026-03-12
5003,AFT,50,ERR,2026/03/13
5004,GBQ,-25,14.9,2026-03-14
5001,AFT,100,15.4321,2026-03-12`,
  },
  {
    label: "Örnek: Temiz veri",
    data: `kod\tad\taktif\tguncelleme
K01\tPortföy A\ttrue\t2026-02-01
K02\tPortföy B\tfalse\t2026-02-03
K03\tPortföy C\ttrue\t2026-02-04`,
  },
];
