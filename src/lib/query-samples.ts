export interface QuerySample {
  label: string;
  sql: string;
  output: string;
}

export const QUERY_SAMPLES: QuerySample[] = [
  {
    label: "Örnek: Fon işlemleri (hatalı satırlar)",
    sql: `SELECT * FROM fon_islem
WHERE musteri_no = 100234 AND durum = NULL`,
    output: `islem_no;musteri_no;fon_kodu;tutar;durum;islem_tarihi
100001;100234;AFT;15000,00;GERCEKLESTI;2026-03-12
100002;100234;TYH;-500,00;BEKLEMEDE;2026-03-12
100003;100234;;25000,00;BEKLEMEDE;2026/03/13
100004;100234;IPB;NULL;IPTAL;2026-03-13
100001;100234;AFT;15000,00;GERCEKLESTI;#REF!
100006;100234;GBQ;abc;BEKLEMEDE;2026-03-14`,
  },
  {
    label: "Örnek: Boş sonuç kümesi",
    sql: `SELECT musteri_no, ad_soyad, bakiye
FROM portfoy
WHERE bakiye > 1000000 AND sube_kodu = '999'`,
    output: `musteri_no,ad_soyad,bakiye`,
  },
  {
    label: "Örnek: Temiz çıktı",
    sql: `SELECT musteri_no, ad_soyad, risk_profili, guncel_deger
FROM v_portfoy_ozet
WHERE portfoy_yoneticisi = 'EBRAR'
ORDER BY guncel_deger DESC`,
    output: `musteri_no\tad_soyad\trisk_profili\tguncel_deger
200145\tAyşe Yıldız\tDENGELI\t845200.50
200146\tMehmet Kaya\tAGRESIF\t1204750.00
200147\tFatma Demir\tKORUMACI\t332100.75`,
  },
];
