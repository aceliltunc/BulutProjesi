using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestoranMenuYonetimSistemi.Data;
using RestoranMenuYonetimSistemi.Models;

namespace RestoranMenuYonetimSistemi.Controllers;

[ApiController]
[Route("/")]
public class MenuController : ControllerBase
{
    private readonly AppDbContext _context;

    public MenuController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("list")]
    public async Task<ActionResult<IEnumerable<MenuItem>>> List()
    {
        var items = await _context.MenuItems
            .OrderByDescending(x => x.TarihSaat)
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("add")]
    public async Task<ActionResult<MenuItem>> Add([FromBody] MenuItem menuItem)
    {
        menuItem.Id = menuItem.Id == Guid.Empty ? Guid.NewGuid() : menuItem.Id;
        menuItem.TarihSaat = menuItem.TarihSaat == default ? DateTime.UtcNow : menuItem.TarihSaat;

        _context.MenuItems.Add(menuItem);
        await _context.SaveChangesAsync();

        return Created($"/list/{menuItem.Id}", menuItem);
    }

    [HttpDelete("delete/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var item = await _context.MenuItems.FindAsync(id);
        if (item is null)
        {
            return NotFound($"ID={id} icin menu ogesi bulunamadi.");
        }

        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync();
        return Ok("Silme islemi basarili.");
    }

    [HttpPut("update/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] MenuItem updatedItem)
    {
        var item = await _context.MenuItems.FindAsync(id);
        if (item is null)
        {
            return NotFound($"ID={id} icin menu ogesi bulunamadi.");
        }

        item.Baslik = updatedItem.Baslik;
        item.Aciklama = updatedItem.Aciklama;
        item.Kategori = updatedItem.Kategori;
        item.Fiyat = updatedItem.Fiyat;

        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpGet("info")]
    public IActionResult Info()
    {
        return Ok(new
        {
            Hostname = Environment.MachineName
        });
    }

    [HttpGet("health")]
    public async Task<IActionResult> Health()
    {
        var canConnect = await _context.Database.CanConnectAsync();
        if (!canConnect)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Veritabani baglantisi kurulamadi.");
        }

        return Ok("Sistem calisiyor");
    }
}
