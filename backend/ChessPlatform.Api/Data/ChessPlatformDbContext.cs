using ChessPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ChessPlatform.Api.Data;

public class ChessPlatformDbContext : DbContext
{
    public ChessPlatformDbContext(DbContextOptions<ChessPlatformDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Game> Games => Set<Game>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ChessPlatformDbContext).Assembly);
    }
}
