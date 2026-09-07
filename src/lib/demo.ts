import type { AnalysisResult } from "./types";

/**
 * Sabit örnek çıktı — API anahtarı olmadan arayüzü görmek ve demo sunumu için.
 * Sayfada `?demo=1` ile yüklenir.
 */
export const DEMO_RESULT: AnalysisResult = {
  title: "Mobil uygulamada fon alım emri iptali",
  summary:
    "Müşteriler, TEFAS işlem saatleri içinde ve emir henüz gerçekleşmemişken fon alım emirlerini mobil uygulamadan kendileri iptal edebilmeli. İptalde bloke bakiye anında serbest bırakılır; günlük iptal hakkı 5 ile sınırlıdır.",
  assumptions: [
    "İşlem saatleri TEFAS için 09:00–13:30 olarak alınmıştır.",
    "Günlük 5 iptal limiti takvim günü bazında ve müşteri bazında sıfırlanır.",
    "Bildirim mevcut push/e-posta altyapısı üzerinden gönderilir.",
  ],
  openQuestions: [
    "Limit aşımında müşteriye gösterilecek mesaj metni nedir?",
    "Yarı-tatil / erken kapanış günlerinde işlem saati nasıl belirlenecek?",
    "İptal hakkı hafta sonu verilen emirler için nasıl işleyecek?",
  ],
  stories: [
    {
      id: "US-01",
      title: "Beklemedeki fon alım emrini iptal etme",
      priority: "Yüksek",
      role: "bireysel yatırımcı (müşteri)",
      feature: "mobil uygulamadan beklemedeki fon alım emrimi iptal etmek",
      benefit: "çağrı merkezini aramadan işlemimi kendim yönetebileyim",
      acceptanceCriteria: [
        {
          name: "İşlem saatleri içinde beklemedeki emri iptal etme",
          given: [
            "müşterinin 'beklemede' statüsünde bir fon alım emri var",
            "saat 09:00–13:30 aralığında",
            "müşterinin bugün 5'ten az iptal işlemi var",
          ],
          when: ["müşteri emir detayında 'Emri İptal Et' seçeneğini onaylar"],
          then: [
            "emrin statüsü 'iptal edildi' olur",
            "emir için bloke edilen bakiye anında kullanılabilir bakiyeye eklenir",
            "müşteriye iptal onayı bildirimi gönderilir",
          ],
        },
        {
          name: "İşlem saatleri dışında iptal denemesi",
          given: ["müşterinin 'beklemede' statüsünde bir emri var", "saat 13:30'dan sonra"],
          when: ["müşteri emri iptal etmeye çalışır"],
          then: [
            "iptal işlemi reddedilir",
            "müşteriye 'İşlem saatleri dışında iptal yapılamaz' mesajı gösterilir",
            "emrin statüsü değişmez",
          ],
        },
      ],
      edgeCases: [
        "Emir iptal anında 'gerçekleşti' statüsüne geçerse (yarış durumu) iptal reddedilmeli ve güncel statü gösterilmeli.",
        "Günlük 5 iptal hakkı dolduğunda buton pasif olmalı ve kalan hak bilgisi gösterilmeli.",
        "Bloke bakiye serbest bırakma işlemi başarısız olursa iptal geri alınmalı (atomik işlem).",
        "Aynı emre çift dokunuş / çift istek tek iptal olarak işlenmeli (idempotency).",
      ],
      businessRules: [
        "Sadece 'beklemede' statüsündeki emirler iptal edilebilir.",
        "İptal yalnızca TEFAS işlem saatleri (09:00–13:30) içinde yapılabilir.",
        "Müşteri başına günlük en fazla 5 iptal işlemi yapılabilir.",
        "İptal sonrası bloke tutar = emir tutarı, kullanılabilir bakiyeye eksiksiz iade edilir.",
        "Her iptal işlemi audit log'a (müşteri, emir no, zaman) yazılır.",
      ],
    },
  ],
};
