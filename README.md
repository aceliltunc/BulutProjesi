# Restoran Menu Yonetim Sistemi

Bu proje, ASP.NET Core Web API + React + Entity Framework Core + PostgreSQL + Docker Compose kullanilarak hazirlanmis bir restoran menu yonetim sistemidir.

## Proje Durumu

Evet, proje gereksinimlerinin uygulama tarafi tamamlandi:

- `MenuItem` veri modeli olusturuldu (`Id`, `Baslik`, `Aciklama`, `Kategori`, `TarihSaat`, `Fiyat`).
- Zorunlu endpointler eklendi:
  - `GET /list`
  - `POST /add`
  - `DELETE /delete/{id}`
  - `GET /info`
  - `GET /health`
- Ek gelistirme:
  - `PUT /update/{id}` ile urun guncelleme
  - UI tarafinda arama, kategori filtreleme, siralama, kart gorunumu ve duzenleme modal'i
- Docker yapisi kuruldu:
  - `frontend`, `api`, `db` ve `adminer` olmak uzere 4 container
  - ortak network (`app-network`)
  - kalici veri icin volume (`db-data`)
  - `depends_on` + db healthcheck

## Klasor Yapisi

- `RestoranMenuYonetimSistemi/` -> API kaynak kodu
- `frontend/` -> React UI kaynak kodu
- `RestoranMenuYonetimSistemi/Dockerfile` -> API image build dosyasi
- `frontend/Dockerfile` -> React UI image build dosyasi
- `frontend/nginx.app.conf` + `frontend/docker-entrypoint-nginx.sh` -> UI container icinde API reverse proxy (tek public URL)
- `docker-compose.yml` -> Frontend + API + PostgreSQL orkestrasyonu
- `frontend/.env.example` -> `VITE_API_BASE_URL` (lokal) ve ayrin FQDN uretim notu

## Calistirma Adimlari (Lokal)

### 1) Gereksinimler

- Docker Desktop
- .NET 8 SDK (gelistirme icin)

### 2) Projeyi Ayaga Kaldirma

Proje kok dizininde calistir:

```bash
docker-compose up -d --build
```

### 3) Servis Kontrolu

- Health: `http://localhost:8080/health`
- Info: `http://localhost:8080/info`
- List: `http://localhost:8080/list`
- UI: `http://localhost:3000` (API cagrilari ayni origin: nginx, `api` servisine proxy)
- DB UI (Adminer): `http://localhost:8081`

### 4) Adminer ile tablolari goruntuleme

`http://localhost:8081` adresine girip su bilgileri kullan:

- System: `PostgreSQL`
- Server: `db`
- Username: `postgres`
- Password: `postgres`
- Database: `restaurantdb`

## Endpoint Ornekleri

### Yeni urun ekleme

```bash
curl -X POST http://localhost:8080/add \
  -H "Content-Type: application/json" \
  -d "{\"baslik\":\"Iskender\",\"aciklama\":\"Yogurtlu doner\",\"kategori\":\"Ana Yemek\",\"fiyat\":220}"
```

### Urunleri listeleme

```bash
curl http://localhost:8080/list
```

### Urun silme

```bash
curl -X DELETE http://localhost:8080/delete/<GUID>
```

## PostgreSQL Kurulumunu Ne Zaman Yapacagim?

Docker Compose kullandigin icin ayrica sistemine PostgreSQL kurman zorunlu degil.

- `docker-compose up -d --build` dediginde `db` servisi PostgreSQL container olarak otomatik kalkar.
- Yani PostgreSQL kurulum asamasi, uygulamayi ilk kez ayağa kaldirdigin an.

Eger "Docker kullanmadan local calistiracagim" dersen, o zaman ayrica PostgreSQL kurup `appsettings.json` baglanti bilgisini elle vermen gerekir.

## Cloud: Azure (Hedef)

Azure hedefi: **ACR** + **Container Apps (tercih)** + **Azure Database for PostgreSQL (Flexible Server)**. AWS odevi ECS/RDS karsiligi: ACA + ACR + Esnek Sunucu.

### 1) Tercih: Azure Container Apps (gerekce)

| Parca | Azure servisi |
|--------|----------------|
| Grup (blge) | **Resource Group** (or. `swedencentral` / `westeurope`) |
| Image | **ACR** |
| Is yuku | **Container Apps (ACA)** |
| Veritabani | **Esnek Sunucu (PostgreSQL)** |
| Sifre | ACA secret / env (ileri: Key Vault) |

**Neden bu projede App Service’e gore genelde daha az surtunme?** Uygulamayi **tek FQDN** altinda toplamak (nginx’in arka tarafta API’ye proxy etmesi) dogal olarak **cok container’li tek ACA** ve tek ingress ile uyumludur. Iki ayrin **App Service (Linux) Web App for Containers** da yapilir, fakat cogu senaryoda **iki yonetim noktasi, iki public URL, VITE/build veya gateway karari** sizi daha cok yorar. (App Service, ekibin tercih ettigi platform ise uygundur; mimari ayni kalir, env ve adimlar paraleldir.)

**ACR repolari (oneri, kucuk harf):** `restaurant-api`, `restaurant-frontend`

### 2) ACR: imaj etiketle + push (net komutlar)

`MYACR`, `1.0.0` ve lokal imaj isimlerini gercek degerlere cevirip calistir (`docker image ls`).

```bash
az login
az account set --subscription "<abonelik-adi-veya-guid>"
# Gerekirse: az acr create -g <rg-adi> -n MYACR --sku Basic --location swedencentral
az acr login --name MYACR

docker tag bulutprojesi-api:latest MYACR.azurecr.io/restaurant-api:1.0.0
docker tag bulutprojesi-frontend:latest MYACR.azurecr.io/restaurant-frontend:1.0.0
docker push MYACR.azurecr.io/restaurant-api:1.0.0
docker push MYACR.azurecr.io/restaurant-frontend:1.0.0
```

### 3) API container: ortam degiskenleri

| Degisken | Ornek |
|----------|--------|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_URLS` | `http://+:8080` |
| `ConnectionStrings__DefaultConnection` | Npgsql, tek satir; asagidaki form |

**Ornek (Esnek Sunucu, Ssl gerekli):**

`Host=<ad>.postgres.database.azure.com;Port=5432;Database=restaurantdb;Username=<kullanici>;Password=<sifre>;Ssl Mode=Require;Trust Server Certificate=true`

(Parolayi repoya koyma; Azure portal "Connection string" ciktisini kopyalama pratik yoldur.)

### 4) Frontend: URL bilinmeden uretim

Uygulanan yol: uretim build’i **VITE yok** iken goreli URL (`/list` …) + **nginx** reverse proxy. Compose’da: `API_UPSTREAM=http://api:8080`. **ACA, ayni revision’da iki container:** ayni pod’da arka API `http://127.0.0.1:8080` — frontend container env: `API_UPSTREAM=http://127.0.0.1:8080`. Iki ayrin public uygulama: `docker build --build-arg VITE_API_BASE_URL=...` (bkz. `frontend/.env.example`).

### 5) Esnek Sunucu firewall (pratik not)

- En temiz: **VNet + private** erisim. Kisa/odev: public + kural; “**Allow Azure services**” (veya karsiligi) **genis** bir ayricaliktir, paylasimli / uretimde **ozel IP / private** tercih edilir. Container/ App Service cikis IP’leri **degisebilir**; tek sabit IP firewall cogu kez yorar, **NAT** veya private endpoint ileri adim.
- Sadece kendi ofisiniz: mevcut genel cikis IP’nize izin; uygulama trafigi + yonetim trafigini dusun.

### 6) Health probe (Azure)

- **Yol ve port:** `GET /health`, port **8080** (liveness/ readiness; DB yokken 503).
- Ilk basta basarisiz olabilsin diye *initial delay* veya dusuk siklik verin; EF + Esnek baglanti hazir olsun.

## Not (genel)

Bu repo lokalde calisir; bulut tarafta **Azure** ile ilerleme odagidir. Teslimde: kisa test (endpoint + UI) + yukaridaki Azure eslestirme / komut / guvenlik ozetleri yeterlidir.

## Proje Durum Ozeti (Guncel)

### Tamamlanan (gelistirme + lokal)

- Backend: `/list`, `/add`, `/update/{id}`, `/delete/{id}`, `/info`, `/health` hazir.
- Frontend: CRUD, ayni origin proxy ile Docker icinde.
- `docker-compose`: `frontend`, `api`, `db`, `adminer`.

### Gecmiste (AWS, blokaj)

ECR’ya push, RDS hazirlik; canli **ECS** hesap/aktivasyon gecikmesi nedeniyle tamamlanmadi. Ayni imajlar **ACR**’ya etiketlenerek kullanilabilir.

### Sirada: Azure (adim adim, uygulayin)

1. **Hazirlik:** `docker-compose up -d --build` ile lokal uctan uca dogrulayin; `http://localhost:3000` uzerinden CRUD, `http://localhost:8080/health` ayri dene.
2. **Grup + bolge:** `az group create` (or. `swedencentral`); tum kaynaklarda ayni bolge/ RG tutarliligi.
3. **ACR:** `az acr create` (Basic yeter); `az acr login`; `docker tag` + `push` (yukaridaki 2. baslik; repolar `restaurant-api` / `restaurant-frontend`).
4. **Esnek Sunucu:** PostgreSQL olustur; `restaurantdb` ve yonetim kullanici/parolayi kaydet; **Networking + firewall** kuralini planlayin; baglanti string’i (Ssl) API env’e hazirlayin.
5. **Container Apps Ortami:** `az containerapp env create` (Log Analytics gerekir); ACR’yi `az acr update --admin-enabled true` veya *managed identity* ile ACA’ya cekir erisim (tercih: MI + `acrPull`).
6. **Uygulama (oneri: tek app, iki container):** API imaji (port 8080, env: `ASPNETCORE_*`, `ConnectionStrings__DefaultConnection`); frontend imaji (port 80, `API_UPSTREAM=http://127.0.0.1:8080`); yalnizca **frontend** ingress 80/443; API **dis ingress kapali** veya ici kalabilir. HTTP probe: `/health`, 8080.
7. **Test:** FQDN uzerinden UI; menu ekleme/silme; gerekirse Log stream.
8. **Rapor:** Mimari, bolge, guvenlik (firewall), gerekirse maliyet; AWS gecmisi kisa gerekce (hesap gecikmesi).

Bu liste README ile ayni yonde tutulacak sekilde isaretlenebilir; ek otomasyon (Bicep/ARM) bu repoda zorunlu degildir.
