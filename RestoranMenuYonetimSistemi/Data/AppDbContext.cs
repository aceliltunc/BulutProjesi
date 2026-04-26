using Microsoft.EntityFrameworkCore;
using RestoranMenuYonetimSistemi.Models;

namespace RestoranMenuYonetimSistemi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
}
