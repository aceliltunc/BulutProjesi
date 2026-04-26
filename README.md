# Restoran menü yönetim sistemi

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=fff)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=fff)](https://docs.docker.com/compose/)

REST API + React arayüz + PostgreSQL ile çalışan, Docker Compose ile tek komutta ayağa kalkan restoran menü yönetim uygulaması. Bulut hedefi: **Azure** (ACR, Container Apps, Esnek sunucu).

**Depo:** [github.com/aceliltunc/BulutProjesi](https://github.com/aceliltunc/BulutProjesi)

---

## İçindekiler

- [Teknolojiler](#teknolojiler)
- [Özellikler](#özellikler)
- [Hızlı başlangıç](#hızlı-başlangıç)
- [Proje yapısı](#proje-yapısı)
- [API uç noktaları](#api-uç-noktaları)
- [cURL örnekleri](#curl-örnekleri)
- [PostgreSQL (Docker)](#postgresql-docker)
- [Cloud: Azure](#cloud-azure)
- [Durum ve yol haritası](#durum-ve-yol-haritası)

---

## Teknolojiler

| Katman        | Araçlar |
|---------------|---------|
| **API**       | ASP.NET Core 8, Entity Framework Core, Npgsql, Swagger |
| **Veritabanı** | PostgreSQL (container) |
| **Arayüz**    | React 19, Vite, nginx (reverse proxy) |
| **Orkestrasyon** | Docker Compose (`frontend`, `api`, `db`, `adminer`) |

## Özellikler

- **Model:** `MenuItem` — `Id`, `Baslik`, `Aciklama`, `Kategori`, `TarihSaat`, `Fiyat`
- **REST:** `GET /list`, `POST /add`, `PUT /update/{id}`, `DELETE /delete/{id}`, `GET /info`, `GET /health`
- **Arayüz:** Arama, kategori filtreleme, sıralama, kart görünümü, düzenleme modal’ı
- **Docker:** Ortak ağ (`app-network`), kalıcı volume (`db-data`), `depends_on` + veritabanı healthcheck, nginx **reverse proxy** ile tek public giriş (UI + API, **aynı origin**)

## Hızlı başlangıç

### Gereksinimler

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- (İsteğe bağlı) [.NET 8 SDK](https://dotnet.microsoft.com/download) — yalnızca API’yi Docker dışında geliştirmek için

### Çalıştırma

Proje kökünde:

```bash
docker-compose up -d --build
```

### Servis adresleri (lokal)

| Amaç | URL |
|------|-----|
| Arayüz | http://localhost:3000 (API, nginx **reverse proxy** ile aynı origin) |
| API health | http://localhost:8080/health |
| API info / list | http://localhost:8080/info , http://localhost:8080/list |
| Veritabanı (Adminer) | http://localhost:8081 |

**Adminer:** System `PostgreSQL`, Server `db`, kullanıcı/şifre `postgres` / `postgres`, veritabanı `restaurantdb`.

> Docker Compose ile **ayrıca makineye PostgreSQL kurmanız gerekmez**; `db` servisi ilk açılışta kalkar. Docker kullanmadan çalıştıracaksanız PostgreSQL’i siz kurup `appsettings.json` bağlantısını güncellemelisiniz.

## Proje yapısı

| Yol | Açıklama |
|-----|----------|
| `RestoranMenuYonetimSistemi/` | API kaynak kodu |
| `RestoranMenuYonetimSistemi/Dockerfile` | API **image** (Dockerfile) |
| `frontend/` | React (Vite) arayüzü |
| `frontend/Dockerfile` | Frontend **image** (Dockerfile) |
| `frontend/nginx.app.conf` + `frontend/docker-entrypoint-nginx.sh` | Container içi API **reverse proxy** (nginx); tek dış URL |
| `docker-compose.yml` | Tüm servislerin orkestrasyonu |
| `frontend/.env.example` | `VITE_API_BASE_URL` (lokal) ve üretim FQDN notları |

## API uç noktaları

| Yöntem | Yol | Açıklama |
|--------|-----|----------|
| `GET` | `/list` | Menü öğelerini listele |
| `POST` | `/add` | Yeni öğe ekle (JSON body) |
| `PUT` | `/update/{id}` | Öğe güncelle |
| `DELETE` | `/delete/{id}` | Öğe sil |
| `GET` | `/info` | API bilgisi |
| `GET` | `/health` | Health check — DB yokken 503 |

## cURL örnekleri

Yeni ürün ekleme:

```bash
curl -X POST http://localhost:8080/add \
  -H "Content-Type: application/json" \
  -d "{\"baslik\":\"Iskender\",\"aciklama\":\"Yogurtlu doner\",\"kategori\":\"Ana Yemek\",\"fiyat\":220}"
```

Listeleme:

```bash
curl http://localhost:8080/list
```

Silme (`<GUID>` yerine gerçek id):

```bash
curl -X DELETE http://localhost:8080/delete/<GUID>
```

## PostgreSQL (Docker)

`docker-compose up -d --build` komutu `db` servisini ayağa kaldırdığı için ayrı bir kurulum adımı yok. İlk kez tüm yığını o komutla çalıştırdığınız an veritabanı da hazırdır.

## Cloud: Azure

Hedef: **ACR** + **Azure Container Apps (tercih)** + **Azure Database for PostgreSQL (Flexible Server)**. AWS/ECS karşılığı: ACA + ACR + Esnek sunucu.

### 1) Neden Container Apps (özet)

| Bileşen | Azure hizmeti |
|---------|------------------|
| Kaynak gruplaması | Resource Group (ör. `swedencentral` / `westeurope`) |
| **Image** registry | ACR |
| **Workload** | **Container Apps (ACA)** |
| Veritabanı | **Esnek sunucu (PostgreSQL)** |
| **Secrets** | ACA gizlileri / ileride Key Vault |

Uygulamayı **tek FQDN** altında toplamak (nginx’in arka planda API’ye **reverse proxy** olması) çoğu senaryoda **tek ACA revision, birden çok container** ve tek **ingress** ile uyumludur. İki ayrı App Service de mümkündür; fakat iki yönetim noktası, iki public URL ve gateway/Vite kararları genelde daha fazla uğraş demektir.

**Önerilen ACR repoları (küçük harf):** `restaurant-api`, `restaurant-frontend`

### 2) ACR: **tag** ve **push**

`MYACR`, `1.0.0` ve **image** adlarını kendi ortamınıza göre değiştirin (`docker image ls`).

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

### 3) API container: **environment variables**

| Değişken | Örnek |
|----------|--------|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_URLS` | `http://+:8080` |
| `ConnectionStrings__DefaultConnection` | Npgsql tek satır (aşağıdaki gibi) |

**Esnek sunucu (SSL) örnek string:**

`Host=<ad>.postgres.database.azure.com;Port=5432;Database=restaurantdb;Username=<kullanici>;Password=<sifre>;Ssl Mode=Require;Trust Server Certificate=true`

(Parolayı repoya koymayın; Azure portal’daki “Connection string” pratik yoldur.)

### 4) Frontend: URL bilinmeden üretim

Üretim build’i, VITE tanımsızken göreli yollar (`/list` …) + **nginx reverse proxy**. Compose’da: `API_UPSTREAM=http://api:8080`. **Aynı ACA revision kapsamında iki container** ise: arka uç `http://127.0.0.1:8080`, frontend `API_UPSTREAM=http://127.0.0.1:8080`. İki ayrı public uç için `docker build --build-arg VITE_API_BASE_URL=...` — ayrıntı `frontend/.env.example`.

### 5) Esnek sunucu firewall

- Daha temiz: **VNet + private** erişim. Kısa süre/ödev: public + kural. “**Allow Azure services**” (veya eşdeğeri) geniş bir ayrıcalıktır; paylaşımlı/üretimde **özel IP / private** tercih edilir. Container/App Service çıkış IP’leri değişebilir; sabit IP firewall’ı sık zorlar; ileri adım **NAT** veya private endpoint.
- Sadece ofis: mevcut çıkış IP’nize kural; uygulama + yönetim trafiğini düşünün.

### 6) Health probe (Azure)

- Yol: `GET /health`, port **8080** (liveness / readiness; DB yokken 503).
- İlk açılışta başarısız olmaması için gecikme / düşük sıklık; EF + Esnek bağlantı hazır olana kadar.
