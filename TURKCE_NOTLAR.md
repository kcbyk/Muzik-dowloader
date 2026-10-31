# Music Downloader — Türkçe sürüm

Bu çalışma, Ten1O0/YouTube-Music-Downloader projesinin yerel olarak değiştirilmiş bir kopyasıdır. Orijinal lisans ve kaynaklar projede korunmuştur.

## Yapılan değişiklikler
- Türkçe dil seçeneği, Türkçe tarayıcı dilinin algılanması ve hesap senkronizasyonu için `tr` desteği eklendi. Mevcut diller korunur.
- Ana arayüz siyah ve gri tonlarına getirildi; kapak görsellerinin renkleri korunur.
- Mobilde ana sayfa, kitaplık ve çalma listeleri arasında sola/sağa kaydırma eklendi. Açık pencereler ve yatay kaydırılabilir alanlar korunur.
- Yeni kullanımda MP3 varsayılandır; kullanıcı M4A seçebilir.
- Metinlerin büyük bölümü otomatik çeviriden oluşturulmuş, temel arayüz metinleri gözden geçirilmiştir. Özellikle gizlilik metni dahil bütün metinler yayımlanmadan önce Türkçe ve hukuki doğruluk açısından gözden geçirilmelidir.

## Çalıştırma

Node.js kuruluysa proje kökünde:

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Varsayılan Vite ayarı `/api` isteklerini yerel `localhost:5000` arka ucuna iletir. Yerel arka ucun kurulumu için ana README.md dosyasına bakın.

Önizleme/test için, dış servisi kullanmaya izinliyseniz aşağıdaki komut kullanılabilir:

```bash
MUSIC_API_TARGET=https://music.dannarita.es npm run dev -- --host 0.0.0.0
```

Bu ayarda aramalar, indirme bağlantıları ve diğer API istekleri üçüncü taraf Music Downloader sunucusuna gider. Sunucunun kullanılabilirliği, kullanım izni ve limitleri projenin kontrolü dışındadır. Bu seçenek sadece geliştirme proxy'sidir; üretim dağıtımı için kendi arka ucunuzu yapılandırın. Hesap senkronizasyonunda Türkçe desteği için bu projedeki değiştirilmiş arka uç gereklidir; orijinal canlı sunucuda bu değişiklik bulunmayabilir.

## Denetimler

```bash
npm run build
npm run lint
node --test test/frontend/test_turkce.mjs
```

Bu paket kaynak koddur, hazır veya imzalanmış bir Android APK değildir. Android uygulaması için projenin Capacitor/Android derleme yönergeleri izlenmelidir.

## GitHub Actions ile test APK'sı

`.github/workflows/android-apk.yml`, `main` dalına push yapılınca veya Actions sayfasından elle başlatılınca Android debug APK oluşturmayı dener ve 30 gün saklanan `Music-Downloader-Turkce-debug-apk` isimli artifact olarak yükler. Workflow GitHub üzerinde henüz çalıştırılmadı; ilk çalışmada sonuç ve loglar kontrol edilmelidir.

APK, debug anahtarıyla imzalanır; orijinal uygulamanın resmi sürümü değildir. Paket kimliği orijinal uygulamayla aynı olduğundan imza uyuşmazlığında üzerine kurulamaz. Mevcut uygulamayı kaldırmak yerel verileri silebilir; önce yedekleyin. Yayımlanacak kalıcı bir APK için ayrı bir sürüm kimliği ve güvenli, kalıcı imzalama anahtarı düzeni gerekir.

## Keşfet ve performans güncellemesi

Ana ekranda sanatçı ve şarkı araması, büyük görselli kartlar ve aşağı kaydırdıkça yüklenen sonuçlar bulunur. Karttaki nota ön dinleme, indirme simgesi MP3 isteğidir. Aramalar kısa bir beklemenin ardından gönderilir ve eski yanıtlar yenilerinin yerini alamaz. Bir YouTube bağlantısı yapıştırıldığında format seçeneği açılır. Mobilde sağa/sola kaydırarak Ayarlar dahil sekmeler arasında geçilebilir; sistemin hareket azaltma ayarı dikkate alınır. Mobilde maliyetli arka plan bulanıklığı ve doku azaltıldı. Bu önlemler belirli bir cihazda performans garantisi değildir.
