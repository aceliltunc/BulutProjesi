namespace RestoranMenuYonetimSistemi.Models;

public class MenuItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Baslik { get; set; } = string.Empty;
    public string Aciklama { get; set; } = string.Empty;
    public string Kategori { get; set; } = string.Empty;
    public DateTime TarihSaat { get; set; } = DateTime.UtcNow;
    public decimal Fiyat { get; set; }
}
