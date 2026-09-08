import type { AnalysisResult } from "./types";

/**
 * Sabit örnek çıktı — API anahtarı olmadan arayüzü görmek ve demo sunumu için.
 * Sayfada `?demo=1` ile yüklenir. (gemini-3.6-flash ile üretilmiş gerçek çıktı)
 */
export const DEMO_RESULT: AnalysisResult = {
  "title": "Mobil Fon Alım Emri İptal Yönetimi",
  "summary": "Müşterilerin çağrı merkezine ihtiyaç duymadan mobil uygulama üzerinden bekleyen fon alım emirlerini iptal edebilmesi, bloke bakiyenin anında çözülmesi, günlük limit kontrolü ve bildirim süreçlerinin yönetilmesi.",
  "assumptions": [
    "Bloke bakiye kaldırma işlemi ana bankacılık veya portföy yönetim sistemi servisleri ile eşzamanlı (real-time) çalışmaktadır.",
    "Bildirimler öncelikli olarak mobil Push Notification kanalı üzerinden, ulaşılamaması durumunda SMS ile gönderilmektedir.",
    "İşlem saatleri TEFAS takvimine uygun olarak iş günlerinde 09:00 - 13:30 arasını kapsamaktadır."
  ],
  "openQuestions": [
    "Hafta sonu veya resmi tatillerde girilen emirlerin iptal kuralları ve zaman pencereleri nasıl olacaktır?",
    "Günlük 5 adet iptal hakkı kısıtı müşteri bazlı mı, yoksa hesap/fon bazlı mı uygulanacaktır?",
    "İptal sonrası gönderilecek bildirim metninin şablonu ve standart içeriği nedir?"
  ],
  "stories": [
    {
      "id": "US-001",
      "title": "Bekleyen Fon Alım Emrinin İptal Edilmesi ve Bloke Bakiye Çözümü",
      "priority": "Yüksek",
      "role": "Yatırımcı Müşteri",
      "feature": "Mobil uygulama üzerinden 'Beklemede' statüsündeki fon alım emirlerimi iptal edebilmek",
      "benefit": "Çağrı merkezini aramama gerek kalmadan işlemlerimi hızlıca yönetebilmek ve bloke bakiyeme anında erişebilmek",
      "acceptanceCriteria": [
        {
          "name": "Başarılı Fon Alım Emri İptali",
          "given": [
            "Müşteri mobil uygulamaya giriş yapmıştır",
            "09:00 - 13:30 saatleri arasında 'Beklemede' statüsünde fon alım emri bulunmaktadır",
            "Müşterinin günlük kalan iptal hakkı en az 1'dir"
          ],
          "when": [
            "Müşteri ilgili emri seçip 'Emri İptal Et' butonuna basar ve onaylar"
          ],
          "then": [
            "Emir statüsü 'İptal Edildi' olarak güncellenir",
            "Tutar üzerindeki bloke anında kaldırılır ve bakiye kullanılabilir hale gelir",
            "Müşteriye ekranda başarılı iptal konfirmasyon mesajı gösterilir"
          ]
        },
        {
          "name": "İşlem Saatleri Dışında İptal Engeli",
          "given": [
            "Müşterinin 'Beklemede' statüsünde fon alım emri bulunmaktadır",
            "Sistem saati 09:00 - 13:30 aralığı dışındadır"
          ],
          "when": [
            "Müşteri emri iptal etmeyi dener"
          ],
          "then": [
            "İptal butonuna basıldığında işlem gerçekleştirilmez",
            "Müşteriye 'TEFAS işlem saatleri (09:00-13:30) dışında iptal işlemi yapılamaz.' hata mesajı gösterilir"
          ]
        },
        {
          "name": "Gerçekleşmiş Emrin İptal Edilememesi",
          "given": [
            "Seçilen fon alım emrinin statüsü 'Gerçekleşti' durumundadır"
          ],
          "when": [
            "Müşteri emir detay sayfasını inceler"
          ],
          "then": [
            "'Emri İptal Et' butonu pasif görünür veya gizlenir",
            "İptal talebi oluşturulamaz"
          ]
        }
      ],
      "edgeCases": [
        "Müşteri iptal butonuna bastığı anda emrin TEFAS tarafında gerçekleşmiş statüsüne geçmesi (Eşzamanlılık riski).",
        "Bloke bakiye çözümü sırasında ana bankacılık servisinde yaşanacak zaman aşımı (Timeout) veya ağ kesintisi.",
        "İptal talebi iletilirken mobil cihazın internet bağlantısının kopması."
      ],
      "businessRules": [
        "Sadece 'Beklemede' statüsündeki fon alım emirleri iptal edilebilir.",
        "İptal işlemleri sadece TEFAS işlem saatleri olan 09:00 - 13:30 arasında gerçekleştirilebilir.",
        "İptal edilen emrin tutar blokesi real-time (anlık) olarak çözülmelidir."
      ]
    },
    {
      "id": "US-002",
      "title": "Günlük İptal Limiti Kontrolü ve Müşteri Bildirimleri",
      "priority": "Orta",
      "role": "Yatırımcı Müşteri",
      "feature": "Günlük iptal limitimin kontrol edilmesini ve iptal işlemi sonrası anlık bildirim almayı",
      "benefit": "İptal haklarımı takip edebilmek ve gerçekleşen iptal işleminden anında haberdar olarak hesap güvenliğimi doğrulamak",
      "acceptanceCriteria": [
        {
          "name": "Günlük İptal Limitinin Aşılması",
          "given": [
            "Müşteri aynı gün içinde 5 adet fon alım emri iptali gerçekleştirmiştir"
          ],
          "when": [
            "Müşteri 6. fon alım emrini iptal etmek istediğinde"
          ],
          "then": [
            "İptal işlemi engellenir",
            "Müşteriye 'Günlük maksimum 5 adet iptal hakkınızı tamamladınız. Bugün başka iptal işlemi yapamazsınız.' uyarısı gösterilir"
          ]
        },
        {
          "name": "Başarılı İptal Bildirimi Gönderimi",
          "given": [
            "Müşterinin fon alım emri iptal işlemi başarıyla tamamlanmıştır"
          ],
          "when": [
            "İptal işlemi sistemde onaylandığında"
          ],
          "then": [
            "Müşteriye anlık bildirim (Push Notification) gönderilir",
            "Bildirim içeriğinde iptal edilen fon adı, emrin tutarı ve bakiyenin iade edildiği bilgisi yer alır"
          ]
        }
      ],
      "edgeCases": [
        "Push notification servisinin (FCM/APNS) yanıt vermemesi durumunda bildirimin SMS kanalına fallback olması.",
        "Gece 00:00 itibarıyla günlük 5 iptal hakkı sayacının sıfırlanması anında yapılan iptal denemeleri."
      ],
      "businessRules": [
        "Bir müşteri bir takvim günü (00:00 - 23:59) içerisinde en fazla 5 başarılı iptal işlemi yapabilir.",
        "Her başarılı iptal işleminden sonra müşteriye otomatik olarak bilgilendirme yapılmalıdır."
      ]
    }
  ]
};
