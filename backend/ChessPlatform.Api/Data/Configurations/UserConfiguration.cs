using ChessPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChessPlatform.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id)
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        builder.Property(u => u.Provider)
            .HasColumnName("provider")
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(u => u.ProviderId)
            .HasColumnName("provider_id")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(u => u.DisplayName)
            .HasColumnName("display_name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(u => u.AvatarUrl)
            .HasColumnName("avatar_url")
            .HasMaxLength(500);

        builder.Property(u => u.RatingBullet)
            .HasColumnName("rating_bullet")
            .IsRequired()
            .HasDefaultValue(1200);

        builder.Property(u => u.RatingBlitz)
            .HasColumnName("rating_blitz")
            .IsRequired()
            .HasDefaultValue(1200);

        builder.Property(u => u.RatingRapid)
            .HasColumnName("rating_rapid")
            .IsRequired()
            .HasDefaultValue(1200);

        builder.Property(u => u.GamesPlayedBullet)
            .HasColumnName("games_played_bullet")
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(u => u.GamesPlayedBlitz)
            .HasColumnName("games_played_blitz")
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(u => u.GamesPlayedRapid)
            .HasColumnName("games_played_rapid")
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(u => u.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(u => u.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        builder.HasIndex(u => new { u.Provider, u.ProviderId })
            .IsUnique();
    }
}
