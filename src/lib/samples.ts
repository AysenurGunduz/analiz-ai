import type { ProjectType, AudienceRole } from "./types";

export interface Sample {
  label: string;
  projectType?: ProjectType;
  audienceRole?: AudienceRole;
  rawText: string;
}

export const SAMPLES: Sample[] = [
  {
    label: "Örnek 1: Fon Alım-Satım İptal Akışı",
    projectType: "Finans/Portföy",
    audienceRole: "Müşteri",
    rawText: `Toplantı notu (Ürün ekibi - 12.03):
Müşteriler mobil uygulamadan verdikleri fon alım emrini iptal edemiyor, çağrı merkezini aramak zorunda kalıyorlar. İş birimi diyor ki: emir "beklemede" statüsündeyse müşteri kendisi iptal edebilmeli. Ama işlem saatleri (TEFAS için 09:00-13:30) dışında ya da emir zaten "gerçekleşti" ise iptal olmamalı. İptal edilince bloke edilen bakiye hemen geri açılsın. Bir de günde en fazla 5 iptal hakkı olsun, kötüye kullanımı engellemek için. İptal sonrası müşteriye bildirim gitsin.`,
  },
  {
    label: "Örnek 2: Portföy Yöneticisi Toplu Rebalance",
    projectType: "Web",
    audienceRole: "Portföy Yöneticisi",
    rawText: `E-posta (PM ekibi):
Yönetici panelinde birden fazla müşteri portföyünü aynı anda hedef dağılıma çekmek istiyoruz. Model portföy seçilecek, sapması %5'in üzerinde olan portföyler listelenecek, PM onaylayınca emirler oluşturulacak. Riskli işlemlerde (tek üründe %20'den fazla ağırlık) ikinci onay gerekli. İşlem geçmişi audit log'a yazılmalı.`,
  },
  {
    label: "Örnek 3: API - Kimlik Doğrulama Token Yenileme",
    projectType: "API",
    audienceRole: "Geliştirici",
    rawText: `Refresh token endpoint'i lazım. Access token 15 dk, refresh token 7 gün geçerli. Refresh token tek kullanımlık olsun (rotation), kullanılınca eskisi geçersiz. Çalınma şüphesinde tüm oturumları kapatabilelim. Rate limit: IP başına dakikada 10 istek.`,
  },
  {
    label: "Örnek 4: Kısa/Belirsiz Talep (edge)",
    projectType: "Mobil",
    rawText: `bildirimler daha iyi olsun kullanıcılar şikayet ediyor`,
  },
];
