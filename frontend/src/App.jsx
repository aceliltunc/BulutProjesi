import { useEffect, useMemo, useState } from 'react'
import './App.css'

// Uretim: VITE_API_BASE_URL verilmezse bos => fetch('/list') (nginx ayni origin uzerinden API'ye yonlendirir)
// Lokal: npm run dev => http://localhost:8080
const rawVite = import.meta.env.VITE_API_BASE_URL
const API_BASE_URL =
  rawVite !== undefined && String(rawVite).trim() !== ''
    ? String(rawVite).replace(/\/$/, '')
    : import.meta.env.DEV
      ? 'http://localhost:8080'
      : ''
const initialForm = { baslik: '', aciklama: '', kategori: '', fiyat: '' }
const categoryPalette = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
const predefinedCategories = ['Baslangic', 'Corba', 'Ana Yemek', 'Tatli', 'Icecek', 'Salata', 'Fast Food', 'Diger']

function getCategoryIcon(category) {
  const key = (category || '').toLowerCase()
  if (key.includes('tatli') || key.includes('dessert')) return '🍰'
  if (key.includes('ana yemek') || key.includes('yemek') || key.includes('main')) return '🍽️'
  if (key.includes('icecek') || key.includes('içecek') || key.includes('drink')) return '🥤'
  if (key.includes('corba') || key.includes('çorba') || key.includes('soup')) return '🥣'
  if (key.includes('baslangic') || key.includes('başlangıç') || key.includes('starter')) return '🥗'
  if (key.includes('salata')) return '🥬'
  if (key.includes('pizza')) return '🍕'
  if (key.includes('burger')) return '🍔'
  return '🍴'
}

function getCategoryColor(category) {
  if (!category) return '#64748b'
  const sum = [...category].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return categoryPalette[sum % categoryPalette.length]
}

function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ text: '', type: '' })
  const [healthStatus, setHealthStatus] = useState({ ok: false, text: 'Bilinmiyor' })
  const [containerInfo, setContainerInfo] = useState('Bilinmiyor')
  const [form, setForm] = useState(initialForm)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Tum Kategoriler')
  const [sortBy, setSortBy] = useState('newest')
  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState(initialForm)

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.fiyat ?? 0), 0),
    [items],
  )
  const selectableCategories = useMemo(
    () =>
      [...new Set([...predefinedCategories, ...items.map((item) => item.kategori).filter(Boolean)])].sort(
        (a, b) => a.localeCompare(b, 'tr'),
      ),
    [items],
  )
  const uniqueCategories = useMemo(
    () => ['Tum Kategoriler', ...selectableCategories],
    [selectableCategories],
  )
  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filtered = items.filter((item) => {
      const searchable =
        `${item.baslik} ${item.aciklama} ${item.kategori}`.toLowerCase()
      const matchesSearch = searchable.includes(normalizedSearch)
      const matchesCategory =
        categoryFilter === 'Tum Kategoriler' || item.kategori === categoryFilter
      return matchesSearch && matchesCategory
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.fiyat) - Number(b.fiyat)
      if (sortBy === 'price-desc') return Number(b.fiyat) - Number(a.fiyat)
      if (sortBy === 'name') return a.baslik.localeCompare(b.baslik, 'tr')
      return new Date(b.tarihSaat).getTime() - new Date(a.tarihSaat).getTime()
    })
  }, [items, search, categoryFilter, sortBy])
  const categoryStats = useMemo(() => {
    const counts = items.reduce((acc, item) => {
      const key = item.kategori || 'Diger'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }, [items])
  const maxCategoryCount = useMemo(
    () => (categoryStats.length ? Math.max(...categoryStats.map((x) => x.count)) : 1),
    [categoryStats],
  )

  async function loadItems() {
    setLoading(true)
    setStatus({ text: '', type: '' })
    try {
      const response = await fetch(`${API_BASE_URL}/list`)
      if (!response.ok) {
        throw new Error('Liste getirilemedi.')
      }
      const data = await response.json()
      setItems(data)
    } catch (error) {
      setStatus({ text: error.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function loadSystemInfo() {
    try {
      const [healthResponse, infoResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/health`),
        fetch(`${API_BASE_URL}/info`),
      ])

      if (healthResponse.ok) {
        const healthText = await healthResponse.text()
        setHealthStatus({ ok: true, text: healthText || 'Sistem calisiyor' })
      } else {
        setHealthStatus({ ok: false, text: 'Sistem ulasilamaz' })
      }

      if (infoResponse.ok) {
        const infoData = await infoResponse.json()
        setContainerInfo(infoData?.hostname || infoData?.Hostname || 'Bilinmiyor')
      } else {
        setContainerInfo('Alinamadi')
      }
    } catch {
      setHealthStatus({ ok: false, text: 'Sistem ulasilamaz' })
      setContainerInfo('Alinamadi')
    }
  }

  async function refreshAll() {
    await Promise.all([loadItems(), loadSystemInfo()])
  }

  useEffect(() => {
    refreshAll()
  }, [])

  function handleInputChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }
  function handleEditInputChange(event) {
    const { name, value } = event.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus({ text: '', type: '' })
    try {
      const payload = {
        baslik: form.baslik,
        aciklama: form.aciklama,
        kategori: form.kategori,
        fiyat: Number(form.fiyat),
      }

      const response = await fetch(`${API_BASE_URL}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Urun eklenemedi.')
      }

      setForm(initialForm)
      setStatus({ text: 'Urun basariyla eklendi.', type: 'success' })
      await loadItems()
    } catch (error) {
      setStatus({ text: error.message, type: 'error' })
    }
  }

  async function handleDelete(id) {
    setStatus({ text: '', type: '' })
    try {
      const response = await fetch(`${API_BASE_URL}/delete/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Silme islemi basarisiz.')
      }
      setStatus({ text: 'Urun silindi.', type: 'success' })
      await loadItems()
    } catch (error) {
      setStatus({ text: error.message, type: 'error' })
    }
  }

  function openEditModal(item) {
    setEditingItem(item)
    setEditForm({
      baslik: item.baslik,
      aciklama: item.aciklama,
      kategori: item.kategori,
      fiyat: item.fiyat,
    })
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    if (!editingItem) return
    setStatus({ text: '', type: '' })

    try {
      const response = await fetch(`${API_BASE_URL}/update/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingItem,
          ...editForm,
          fiyat: Number(editForm.fiyat),
        }),
      })

      if (!response.ok) {
        throw new Error('Guncelleme basarisiz.')
      }

      setEditingItem(null)
      setStatus({ text: 'Urun guncellendi.', type: 'success' })
      await loadItems()
    } catch (error) {
      setStatus({ text: error.message, type: 'error' })
    }
  }

  return (
    <main className="container">
      <header className="hero">
        <div>
          <h1>Restoran Menu Yonetim Sistemi</h1>
          <p className="subtitle">API: {API_BASE_URL || 'ayni kaynak (nginx -> API proxy)'}</p>
        </div>
        <button type="button" onClick={refreshAll}>
          Veriyi Yenile
        </button>
      </header>

      <section className="stats">
        <article className="stat-card">
          <span>Toplam urun</span>
          <strong>{items.length}</strong>
        </article>
        <article className="stat-card">
          <span>Filtrelenmis urun</span>
          <strong>{filteredItems.length}</strong>
        </article>
        <article className="stat-card">
          <span>Toplam fiyat</span>
          <strong>{totalPrice.toFixed(2)} TL</strong>
        </article>
        <article className="stat-card">
          <span>Sistem Durumu (/health)</span>
          <strong className={healthStatus.ok ? 'ok-text' : 'error-text'}>{healthStatus.text}</strong>
        </article>
        <article className="stat-card">
          <span>Container Bilgisi (/info)</span>
          <strong>{containerInfo}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Kategori Bazli Urun Sayisi</h2>
        <div className="chart">
          {categoryStats.map((stat) => {
            const color = getCategoryColor(stat.category)
            const barWidth = (stat.count / maxCategoryCount) * 100
            return (
              <div className="chart-row" key={stat.category}>
                <span className="chart-label">{stat.category}</span>
                <div className="chart-track">
                  <div
                    className="chart-bar"
                    style={{ width: `${barWidth}%`, backgroundColor: color }}
                  />
                </div>
                <span className="chart-value">{stat.count}</span>
              </div>
            )
          })}
          {!categoryStats.length ? <p>Grafik icin veri yok.</p> : null}
        </div>
      </section>

      <section className="panel">
        <h2>Yeni Urun Ekle</h2>
        <form onSubmit={handleSubmit} className="grid">
          <input
            name="baslik"
            placeholder="Baslik"
            value={form.baslik}
            onChange={handleInputChange}
            required
          />
          <input
            name="aciklama"
            placeholder="Aciklama"
            value={form.aciklama}
            onChange={handleInputChange}
            required
          />
          <select
            name="kategori"
            value={form.kategori}
            onChange={handleInputChange}
            required
          >
            <option value="" disabled>
              Kategori seciniz
            </option>
            {selectableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            name="fiyat"
            type="number"
            step="0.01"
            placeholder="Fiyat"
            value={form.fiyat}
            onChange={handleInputChange}
            required
          />
          <button type="submit">Ekle</button>
        </form>
      </section>

      <section className="panel">
        <div className="row row-wrap">
          <h2>Menu Listesi</h2>
          <div className="toolbar">
            <input
              type="text"
              placeholder="Ara (baslik, aciklama, kategori)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">En yeni</option>
              <option value="name">Isme gore</option>
              <option value="price-asc">Fiyat artan</option>
              <option value="price-desc">Fiyat azalan</option>
            </select>
          </div>
        </div>
        {loading ? <p>Yukleniyor...</p> : null}
        {status.text ? <p className={`message ${status.type}`}>{status.text}</p> : null}

        <ul className="list cards">
          {filteredItems.map((item) => (
            <li key={item.id} className="item">
              <div>
                <div className="item-top">
                  <strong>{item.baslik}</strong>
                  <span
                    className="badge"
                    style={{
                      color: getCategoryColor(item.kategori),
                      backgroundColor: `${getCategoryColor(item.kategori)}22`,
                    }}
                  >
                    <span className="badge-icon" aria-hidden="true">
                      {getCategoryIcon(item.kategori)}
                    </span>
                    {item.kategori}
                  </span>
                </div>
                <p>{item.aciklama}</p>
                <small>
                  {new Date(item.tarihSaat).toLocaleString('tr-TR')} | {Number(item.fiyat).toFixed(2)} TL
                </small>
              </div>
              <div className="actions">
                <button type="button" className="secondary" onClick={() => openEditModal(item)}>
                  Duzenle
                </button>
                <button type="button" className="danger" onClick={() => handleDelete(item.id)}>
                  Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {editingItem ? (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Urun Duzenle</h3>
            <form onSubmit={handleEditSubmit} className="grid">
              <input
                name="baslik"
                placeholder="Baslik"
                value={editForm.baslik}
                onChange={handleEditInputChange}
                required
              />
              <input
                name="aciklama"
                placeholder="Aciklama"
                value={editForm.aciklama}
                onChange={handleEditInputChange}
                required
              />
              <select
                name="kategori"
                value={editForm.kategori}
                onChange={handleEditInputChange}
                required
              >
                <option value="" disabled>
                  Kategori seciniz
                </option>
                {selectableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                name="fiyat"
                type="number"
                step="0.01"
                placeholder="Fiyat"
                value={editForm.fiyat}
                onChange={handleEditInputChange}
                required
              />
              <div className="actions">
                <button type="button" className="secondary" onClick={() => setEditingItem(null)}>
                  Vazgec
                </button>
                <button type="submit">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
