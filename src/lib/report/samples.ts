export interface ReportSample {
  label: string;
  template: string;
  notes: string;
}

export const REPORT_SAMPLES: ReportSample[] = [
  {
    label: "Örnek: Gereksinim Analizi Raporu",
    template: `# Gereksinim Analizi Raporu

## 1. Genel Bilgiler
- **Proje adı:** {{proje_adi}}
- **Talep eden birim:** {{birim}}
- **Tarih:** {{tarih}}
- **Hazırlayan:** {{analist}}

## 2. Amaç ve Kapsam
{{amac_kapsam}}

## 3. Mevcut Durum
[Mevcut sürecin nasıl işlediği]

## 4. Talep Edilen Değişiklik
[İş biriminin istediği yeni davranış]

## 5. İş Kuralları ve Kısıtlar
-

## 6. Kabul Kriterleri
-

## 7. Riskler ve Açık Konular
-

## 8. Tahmini Etki
| Alan | Etki |
| --- | --- |
| Ekranlar | {{ekran_etkisi}} |
| Servisler | {{servis_etkisi}} |
| Veri | {{veri_etkisi}} |`,
    notes: `Toplantı: Fon iptal akışı - 09.09
Katılımcılar: Ebrar (analist), Enes (PM), Furkan (dev lead)
Talep eden: Dijital Kanallar birimi.

Enes: Müşteriler mobilden verdikleri fon alım emrini iptal edemiyor, çağrı merkezini arıyorlar. Aylık ~1200 çağrı bundan.
İstenen: emir "beklemede" ise müşteri kendi iptal edebilsin.
Kısıt: TEFAS işlem saatleri 09:00-13:30 dışında iptal olmasın. Emir "gerçekleşti" ise iptal yok.
İptal edilince bloke bakiye anında açılsın.
Furkan: günde 5 iptal limiti koyalım, kötüye kullanım olmasın. Audit log şart.
İptal sonrası push bildirim gitsin.
Mevcut durumda: müşteri çağrı merkezini arıyor, operasyon ekibi core bankacılıktan manuel iptal ediyor, 2-4 saat sürüyor.
Ekran tarafında emir detay sayfasına "İptal Et" butonu eklenecek. Yeni bir servis lazım (iptal + bloke çözüm). Veri tarafında iptal geçmişi tablosu.
Proje kodu henüz belli değil. Hedef sürüm: Q4.`,
  },
  {
    label: "Örnek: Toplantı Özeti (kısa şablon)",
    template: `## Toplantı Özeti

**Konu:** {{konu}}
**Tarih / Katılımcılar:** {{tarih_katilimcilar}}

### Alınan Kararlar
-

### Aksiyonlar
| Aksiyon | Sorumlu | Termin |
| --- | --- | --- |
|  |  |  |

### Açık Sorular
- `,
    notes: `Rebalance ekranı toplantısı, 5 Eylül. Katılan: Ebrar, portföy yönetimi ekibinden Selin ve Kaya.
Karar: PM panelinden toplu rebalance yapılacak. Model portföy seçilecek, sapması %5 üzeri portföyler listelenecek.
Karar: tek üründe %20 üzeri ağırlık oluşan işlemlerde ikinci onay gerekli.
Selin action alacak: mevcut sapma raporunu paylaşacak, 8 Eylül'e kadar.
Kaya: ikinci onay yetkisi kimde olacak netleştirecek.
Açık: hafta sonu girilen emirler nasıl ele alınacak? Audit log formatı?`,
  },
];
